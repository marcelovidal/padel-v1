-- ============================================================================
-- Lectura anonima de canchas y settings de reserva — perfil publico del club
-- ============================================================================
-- APLICAR MANUALMENTE EN SUPABASE. Este archivo no se ejecuta solo.
-- No depende de ninguna migracion anterior: solo agrega policies y grants
-- sobre tablas que existen desde 20260303_q3_reservas_mvp.sql.
--
-- El bug
-- ------
-- /clubs/[slug] abierto en incognito muestra "0 para reservar" y el cartel
-- "Este club todavia no publico canchas para reservar online", aunque el club
-- tenga canchas con active = true. Nuevo Palau tiene 4 y no se ve ninguna.
--
-- La causa
-- --------
-- La pagina lee club_courts con el cliente de sesion
-- (app/(public)/(site)/clubs/[slug]/page.tsx -> BookingService.listActiveClubCourts
-- -> BookingRepository, que usa lib/supabase/server.ts). Sin sesion ese cliente
-- pega con la anon key, o sea con el rol `anon`.
--
-- La unica policy SELECT de club_courts es
-- "club_courts_select_all_authenticated", declarada TO authenticated en
-- 20260303_q3_reservas_mvp.sql. Para `anon` no hay ninguna policy, y con RLS
-- habilitado eso no es un error: son cero filas. La query devuelve [] y la
-- pagina pinta el estado vacio. No hay nada en los logs.
--
-- Por que policy y no admin client
-- --------------------------------
-- El resto de la pagina publica (perfil del club, torneos, ligas) se sirve con
-- service role desde lib/clubs/publicClub.ts y lib/clubs/publicEvent.ts. Ahi
-- hacia falta: esas tablas tienen datos que NO son publicos (borradores,
-- clubes archivados, columnas personales de players), y el filtro de
-- visibilidad va explicito en cada query.
--
-- club_courts es otra cosa. La condicion `active = true` ya la ve hoy
-- cualquier usuario autenticado, y crear una cuenta es gratis: abrirla a `anon`
-- no expone ni un dato que hoy este protegido. Con una policy el filtro queda
-- en la base y no depende de que nadie se acuerde de escribirlo en la query —
-- que es exactamente el riesgo que arrastra el service role.
--
-- El criterio, entonces: paridad con lo que ya ve `authenticated`, ni un
-- permiso mas. Por eso la condicion de abajo es `active = true` — la misma
-- primera rama de la policy de authenticated — y no una version propia.
--
-- Las policies existentes NO se tocan. Se agregan policies nuevas, separadas y
-- acotadas a `anon`: PostgreSQL combina las policies de SELECT con OR, asi que
-- un usuario autenticado sigue entrando por la suya (dueno y admin ven tambien
-- las canchas inactivas).
--
-- Alcance
-- -------
-- Se revisaron todas las lecturas de las rutas publicas:
--
--   club_courts            ROTO   -> lo arregla esta migracion
--   club_booking_settings  RIESGO -> lo cubre esta migracion, ver abajo
--   clubs                  OK     -> admin client (lib/clubs/publicClub.ts)
--   club_tournaments       OK     -> admin client (lib/clubs/publicEvent.ts)
--   club_leagues           OK     -> admin client
--   tournament_*/league_*  OK     -> admin client
--   players                OK     -> admin client, proyeccion recortada
--   storage avatars        OK     -> firma con service role si no hay sesion
--                                    (lib/avatar-server.utils.ts)
--
-- Fuera de alcance por tener gate de sesion propio: /clubs/[slug]/book
-- (requirePlayer) y /clubs/[slug]/ligas (redirect a /player/login).
--
-- club_booking_settings hoy solo la lee /clubs/[slug]/book, que exige sesion,
-- asi que no esta rota. Va igual porque es la tabla hermana de la misma
-- pantalla: alcanza con abrir la reserva a visitantes sin cuenta para que la
-- duracion del turno vuelva vacia y el formulario caiga al default de 90
-- minutos sin avisar. Su policy de authenticated es USING (true) y las
-- columnas son horarios comerciales — timezone, duracion, buffer,
-- opening_hours. Cero datos personales.
--
-- Idempotencia
-- ------------
-- DROP POLICY IF EXISTS antes de cada CREATE, y GRANT es idempotente. Se puede
-- correr dos veces sin efecto adicional.
-- ============================================================================


-- ─── 1. club_courts: canchas activas visibles sin sesion ────────────────────
-- Espeja la primera rama de "club_courts_select_all_authenticated". Las otras
-- dos ramas de esa policy (dueno del club, admin) no se replican: dependen de
-- auth.uid(), que para anon es NULL.

DROP POLICY IF EXISTS "club_courts_select_active_anon" ON public.club_courts;
CREATE POLICY "club_courts_select_active_anon"
  ON public.club_courts
  FOR SELECT
  TO anon
  USING (active = true);


-- ─── 2. club_booking_settings: settings visibles sin sesion ─────────────────
-- Misma condicion que "club_booking_settings_select_authenticated": USING (true).

DROP POLICY IF EXISTS "club_booking_settings_select_anon" ON public.club_booking_settings;
CREATE POLICY "club_booking_settings_select_anon"
  ON public.club_booking_settings
  FOR SELECT
  TO anon
  USING (true);


-- ─── 3. Grants ──────────────────────────────────────────────────────────────
-- En un proyecto Supabase los default privileges del schema public ya le dan
-- SELECT a anon, asi que lo mas probable es que esto sea un no-op. Va explicito
-- igual: sin el GRANT la policy no alcanza, y el sintoma seria el mismo cero
-- filas silencioso que se esta arreglando. Es el mismo par policy+grant que usa
-- 20260407_q5_coach_profiles.sql para los perfiles publicos de entrenador.
-- Solo SELECT: escribir sigue siendo del dueno del club.

GRANT SELECT ON public.club_courts           TO anon;
GRANT SELECT ON public.club_booking_settings TO anon;

NOTIFY pgrst, 'reload schema';


-- ============================================================================
-- VERIFICACION (correr aparte, despues de aplicar)
-- ============================================================================
--
-- 1) Las policies quedaron declaradas para anon:
--
-- SELECT tablename, policyname, roles, cmd, qual
--   FROM pg_policies
--  WHERE schemaname = 'public'
--    AND tablename IN ('club_courts', 'club_booking_settings')
--    AND cmd = 'SELECT'
--  ORDER BY tablename, policyname;
--
-- Esperado: dos filas por tabla — la de {authenticated} que ya estaba y la
-- nueva de {anon}. Si alguna de las viejas desaparecio, algo se piso.
--
-- 2) Lo que ve un visitante sin sesion (reemplazar el id del club):
--
-- SET LOCAL ROLE anon;
-- SELECT count(*) FROM public.club_courts
--  WHERE club_id = '<club_id>' AND active = true;
-- RESET ROLE;
--
-- Esperado: 4 para Nuevo Palau. Antes de esta migracion: 0.
--
-- 3) Que no se filtren canchas inactivas:
--
-- SET LOCAL ROLE anon;
-- SELECT count(*) FROM public.club_courts WHERE active = false;
-- RESET ROLE;
--
-- Esperado: 0.
--
-- 4) En la app: abrir /clubs/<slug> en una ventana de incognito. El chip tiene
--    que decir "N para reservar" con N > 0 y la lista de canchas aparecer.
--    No hay que tocar codigo: la pagina ya hace la query correcta.
-- ============================================================================

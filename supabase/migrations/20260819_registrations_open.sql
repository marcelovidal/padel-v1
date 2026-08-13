-- ============================================================================
-- Control manual de inscripciones — torneos y ligas
--
-- Problema
-- --------
-- El formulario de inscripcion de la pagina publica aparece con la sola
-- condicion de que el evento este 'active'. No hay forma de cortar las
-- inscripciones sin finalizar el evento, asi que una liga con el fixture ya
-- generado y los partidos jugandose sigue recibiendo parejas nuevas — que
-- entran a league_teams pero NO al fixture, que ya esta cerrado.
--
-- Decision
-- --------
-- El control es MANUAL y reversible, del administrador. No se deriva de
-- fechas: en padel las inscripciones se cierran cuando se llena el cupo o
-- cuando el club decide armar los grupos, no cuando llega una fecha. El club
-- puede cerrar y volver a abrir.
--
-- Y se separan dos cosas que hoy comparten el mismo par de columnas:
--
--   * start_date / end_date son las fechas DEL EVENTO. Asi las muestra la
--     pagina publica (formatDateRange en el header) y asi las manda
--     q6_notify_event_open al mensaje de difusion. Ese uso es correcto y no
--     cambia. Lo que estaba mal eran los rotulos del wizard y de la seccion
--     de difusion, que las llamaban "inicio/cierre de inscripciones".
--
--   * registration_start_date / registration_end_date son las de inscripcion.
--     Son INFORMATIVAS: se le muestran al jugador ("las inscripciones cierran
--     el 31/08") pero no deciden nada. Quien decide es registrations_open.
--
-- Alcance
-- -------
-- Esta migracion NO toca club_update_tournament_status ni
-- club_update_league_status: finalizar un evento no cierra sus inscripciones
-- automaticamente, por la misma razon por la que el control es manual.
-- ============================================================================

BEGIN;


-- ─── 1. Columnas ────────────────────────────────────────────────────────────

-- El default es `true` pensando en los eventos NUEVOS: un torneo recien creado
-- nace en 'draft', no es visible para nadie, y cuando el club lo publica lo
-- que quiere es justamente recibir inscripciones. Que arranque cerrado
-- obligaria a un segundo clic que nadie va a entender.

ALTER TABLE public.club_tournaments
  ADD COLUMN IF NOT EXISTS registrations_open       boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS registration_start_date  date    NULL,
  ADD COLUMN IF NOT EXISTS registration_end_date    date    NULL;

ALTER TABLE public.club_leagues
  ADD COLUMN IF NOT EXISTS registrations_open       boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS registration_start_date  date    NULL,
  ADD COLUMN IF NOT EXISTS registration_end_date    date    NULL;

COMMENT ON COLUMN public.club_tournaments.registrations_open IS
  'Control manual del club. Unica condicion que decide si la pagina publica muestra el formulario de inscripcion. Reversible.';
COMMENT ON COLUMN public.club_tournaments.registration_start_date IS
  'Informativa. Se le muestra al jugador; no habilita ni bloquea nada.';
COMMENT ON COLUMN public.club_tournaments.registration_end_date IS
  'Informativa. Se le muestra al jugador; no cierra las inscripciones — eso lo hace registrations_open.';

COMMENT ON COLUMN public.club_leagues.registrations_open IS
  'Control manual del club. Unica condicion que decide si la pagina publica muestra el formulario de inscripcion. Reversible.';
COMMENT ON COLUMN public.club_leagues.registration_start_date IS
  'Informativa. Se le muestra al jugador; no habilita ni bloquea nada.';
COMMENT ON COLUMN public.club_leagues.registration_end_date IS
  'Informativa. Se le muestra al jugador; no cierra las inscripciones — eso lo hace registrations_open.';


-- ─── 2. Backfill ────────────────────────────────────────────────────────────

-- Las fechas nuevas quedan en NULL a proposito. Las que hay cargadas hoy son
-- fechas del evento, no de inscripcion: copiarlas seria propagar la confusion
-- que esta migracion viene a deshacer.

-- registrations_open arranca en `true` por el default, y se cierra donde
-- mostrar el formulario hoy seria un error:
--
--   a) status = 'finished' — el evento termino.
--   b) el fixture ya esta generado — una pareja que se anote ahora entra a la
--      tabla de equipos pero no a ningun cruce. Es exactamente el caso de la
--      Liga de prueba.
--
-- Un evento 'draft' o 'active' sin fixture queda abierto, que es lo que hace
-- hoy: para esos el comportamiento no cambia.

UPDATE public.club_tournaments t
SET registrations_open = false
WHERE t.status = 'finished'
   OR EXISTS (
     SELECT 1
     FROM public.tournament_matches tm
     JOIN public.tournament_groups tg ON tg.id = tm.group_id
     WHERE tg.tournament_id = t.id
   );

UPDATE public.club_leagues l
SET registrations_open = false
WHERE l.status = 'finished'
   OR EXISTS (
     SELECT 1
     FROM public.league_matches lm
     JOIN public.league_groups lg    ON lg.id = lm.group_id
     JOIN public.league_divisions ld ON ld.id = lg.division_id
     WHERE ld.league_id = l.id
   );


-- ─── 3. RPC: abrir / cerrar inscripciones ───────────────────────────────────

-- Un solo RPC por entidad con un booleano, no dos. Es un toggle: abrir y
-- cerrar son la misma operacion con distinto valor, y partirlo en dos duplica
-- el guardian sin ganar nada.

CREATE OR REPLACE FUNCTION public.club_set_tournament_registrations_open(
  p_tournament_id uuid,
  p_open          boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid;
  v_club_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF p_open IS NULL THEN RAISE EXCEPTION 'INVALID_REGISTRATIONS_STATE'; END IF;

  SELECT club_id INTO v_club_id FROM public.club_tournaments WHERE id = p_tournament_id;
  IF v_club_id IS NULL THEN RAISE EXCEPTION 'TOURNAMENT_NOT_FOUND'; END IF;
  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  UPDATE public.club_tournaments
  SET registrations_open = p_open,
      updated_at         = now()
  WHERE id = p_tournament_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.club_set_league_registrations_open(
  p_league_id uuid,
  p_open      boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid;
  v_club_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF p_open IS NULL THEN RAISE EXCEPTION 'INVALID_REGISTRATIONS_STATE'; END IF;

  SELECT club_id INTO v_club_id FROM public.club_leagues WHERE id = p_league_id;
  IF v_club_id IS NULL THEN RAISE EXCEPTION 'LEAGUE_NOT_FOUND'; END IF;
  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  UPDATE public.club_leagues
  SET registrations_open = p_open,
      updated_at         = now()
  WHERE id = p_league_id;
END;
$$;


-- ─── 4. club_update_*_info: las cuatro fechas ───────────────────────────────

-- Van DROP + CREATE, no CREATE OR REPLACE: agregar parametros con DEFAULT no
-- reemplaza la funcion, crea una sobrecarga. Con las dos vivas, una llamada
-- con los 4 argumentos viejos matchea contra ambas y PostgREST corta con
-- "function is not unique".
--
-- El cuerpo es copia verbatim del vigente (20260308_q6_3_registrations.sql,
-- unica definicion en el repo; firma confirmada contra el OpenAPI de
-- produccion) mas las dos columnas nuevas en el UPDATE.
--
-- Se conserva el COALESCE(p_x, x): un NULL no pisa el valor guardado. Eso
-- significa que desde este RPC una fecha se puede cargar y cambiar, pero no
-- borrar. Es el comportamiento que ya tenia; queda anotado como limitacion
-- conocida, no se cambia aca.

DROP FUNCTION IF EXISTS public.club_update_tournament_info(uuid, date, date, text[]);

CREATE FUNCTION public.club_update_tournament_info(
  p_tournament_id          uuid,
  p_start_date             date    DEFAULT NULL,
  p_end_date               date    DEFAULT NULL,
  p_target_city_ids        text[]  DEFAULT NULL,
  p_registration_start_date date   DEFAULT NULL,
  p_registration_end_date   date   DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid;
  v_club_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT club_id INTO v_club_id FROM public.club_tournaments WHERE id = p_tournament_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'TOURNAMENT_NOT_FOUND'; END IF;
  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  UPDATE public.club_tournaments SET
    start_date              = COALESCE(p_start_date, start_date),
    end_date                = COALESCE(p_end_date, end_date),
    target_city_ids         = COALESCE(p_target_city_ids, target_city_ids),
    registration_start_date = COALESCE(p_registration_start_date, registration_start_date),
    registration_end_date   = COALESCE(p_registration_end_date, registration_end_date)
  WHERE id = p_tournament_id;
END;
$$;

DROP FUNCTION IF EXISTS public.club_update_league_info(uuid, date, date, text[]);

CREATE FUNCTION public.club_update_league_info(
  p_league_id              uuid,
  p_start_date             date   DEFAULT NULL,
  p_end_date               date   DEFAULT NULL,
  p_target_city_ids        text[] DEFAULT NULL,
  p_registration_start_date date  DEFAULT NULL,
  p_registration_end_date   date  DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid;
  v_club_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT club_id INTO v_club_id FROM public.club_leagues WHERE id = p_league_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'LEAGUE_NOT_FOUND'; END IF;
  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  UPDATE public.club_leagues SET
    start_date              = COALESCE(p_start_date, start_date),
    end_date                = COALESCE(p_end_date, end_date),
    target_city_ids         = COALESCE(p_target_city_ids, target_city_ids),
    registration_start_date = COALESCE(p_registration_start_date, registration_start_date),
    registration_end_date   = COALESCE(p_registration_end_date, registration_end_date)
  WHERE id = p_league_id;
END;
$$;


-- ─── 5. Grants ──────────────────────────────────────────────────────────────

-- Los cuatro son de administracion: solo `authenticated`, y adentro decide
-- q6_can_manage_club. `anon` no ejecuta ninguno.

GRANT EXECUTE ON FUNCTION public.club_set_tournament_registrations_open(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_set_league_registrations_open(uuid, boolean)     TO authenticated;

-- El DROP se llevo los grants viejos, hay que re-otorgarlos.
GRANT EXECUTE ON FUNCTION public.club_update_tournament_info(uuid, date, date, text[], date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_update_league_info(uuid, date, date, text[], date, date)     TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;

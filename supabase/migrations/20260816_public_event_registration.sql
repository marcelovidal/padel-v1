-- ============================================================================
-- Inscripcion publica a torneos y ligas — sin cuenta
-- ============================================================================
-- APLICAR MANUALMENTE EN SUPABASE. Este archivo no se ejecuta solo.
-- APLICAR DESPUES de 20260814_phone_normalization.sql: usa pasala_phone_key.
--
-- Por que funciones nuevas y no las que ya existen
-- -----------------------------------------------
-- player_request_tournament_registration y su par de liga exigen que los DOS
-- jugadores tengan cuenta: el inscriptor sale de auth.uid() y el compañero
-- falla con TEAMMATE_NOT_ELIGIBLE si su user_id es NULL. Sirven para el flujo
-- de un jugador logueado y siguen intactas — esto no las toca.
--
-- El flujo publico es otro: la persona llega de un link de WhatsApp, no tiene
-- cuenta, y ademas carga los datos de su compañero, que tampoco esta. Las dos
-- premisas de las funciones viejas se caen, asi que van funciones aparte.
--
-- Lo que SI se reutiliza es todo lo de abajo: la misma tabla de registrations,
-- el mismo estado 'pending', la misma notificacion al club. El panel de
-- solicitudes no se entera de que la inscripcion vino de afuera y funciona sin
-- ningun cambio.
--
-- El telefono NO es clave unica
-- -----------------------------
-- Dos personas pueden compartir linea — en produccion ya hay un caso. Por eso
-- el matching devuelve CANDIDATOS y nunca adivina:
--   0 candidatos → se crea un jugador sin reclamar
--   1 candidato  → se usa ese
--   2 o mas      → AMBIGUOUS_PHONE_A / _B, y la UI hace elegir
--
-- Se exige que el telefono sea normalizable. Ademas de ser mejor UX que
-- aceptar cualquier cosa, cierra un agujero: players.phone tiene un UNIQUE
-- parcial sobre el TEXTO CRUDO, y si se aceptaran telefonos ilegibles (clave
-- NULL, que no matchea con nada) se podria intentar insertar un texto que ya
-- existe y romper con violacion de indice.
--
-- Superficie anonima
-- ------------------
-- Estas funciones se pueden llamar sin cuenta, asi que crean filas en players
-- sin ningun humano identificado detras. Las defensas son: el evento tiene que
-- estar 'active', los nombres no pueden venir vacios y el telefono tiene que
-- ser un numero real. No hay rate limiting — si aparece abuso, el lugar para
-- ponerlo es delante de estas dos funciones.
-- ============================================================================

BEGIN;

-- ─── 1. De donde vino el jugador ─────────────────────────────────────────────
-- created_by referencia auth.users y en el alta publica no hay usuario, asi que
-- queda NULL. Sin una marca explicita, un jugador creado desde el formulario
-- publico seria indistinguible de uno viejo con created_by perdido.

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS created_source text NULL;

COMMENT ON COLUMN public.players.created_source IS
  'De donde salio la fila. NULL = alta historica o por onboarding. public_event_registration = alta anonima desde el formulario publico de inscripcion.';

-- ─── 2. Buscar candidatos por telefono ───────────────────────────────────────
-- Publica y anonima. La proyeccion es deliberadamente minima: nombre, si tiene
-- cuenta y cuantos partidos jugo. NUNCA el telefono ni el email — si devolviera
-- el telefono, esto seria un oraculo para enumerar la base probando numeros.
--
-- El conteo de partidos es el gancho de decisiones.md: "encontramos un perfil
-- con partidos ya cargados, ¿sos vos?".

CREATE OR REPLACE FUNCTION public.public_find_players_by_phone(p_phone text)
RETURNS TABLE (
  player_id     uuid,
  display_name  text,
  has_account   boolean,
  played        bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
BEGIN
  v_key := public.pasala_phone_key(p_phone);
  IF v_key IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    COALESCE(
      NULLIF(TRIM(p.display_name), ''),
      NULLIF(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''),
      'Jugador'
    ),
    p.user_id IS NOT NULL,
    (SELECT count(*) FROM public.match_players mp WHERE mp.player_id = p.id)
  FROM public.players p
  WHERE p.deleted_at IS NULL
    AND p.phone IS NOT NULL
    AND btrim(p.phone) <> ''
    AND public.pasala_phone_key(p.phone) = v_key
  ORDER BY (p.user_id IS NOT NULL) DESC, p.display_name;
END;
$$;

-- ─── 3. Resolver un jugador del formulario ───────────────────────────────────
-- Interna: NO se le da EXECUTE a anon. Las dos funciones de abajo la llaman
-- como owner.
--
-- Devuelve jsonb en vez de levantar excepcion en el caso ambiguo porque quien
-- llama necesita saber si el ambiguo fue el jugador A o el B para decirselo a
-- la persona.

CREATE OR REPLACE FUNCTION public.public_resolve_registration_player(
  p_first_name text,
  p_last_name  text,
  p_phone      text,
  p_player_id  uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first     text;
  v_last      text;
  v_display   text;
  v_key       text;
  v_count     int;
  v_player_id uuid;
  v_has_acct  boolean;
BEGIN
  v_first := NULLIF(TRIM(COALESCE(p_first_name, '')), '');
  v_last  := NULLIF(TRIM(COALESCE(p_last_name, '')), '');

  IF v_first IS NULL OR v_last IS NULL THEN
    RETURN jsonb_build_object('outcome', 'invalid_name');
  END IF;

  v_key := public.pasala_phone_key(p_phone);
  IF v_key IS NULL THEN
    RETURN jsonb_build_object('outcome', 'invalid_phone');
  END IF;

  -- Si la persona eligio un candidato, se respeta — pero se verifica que ese
  -- jugador tenga de verdad ese telefono. Sin este chequeo, un cliente
  -- malicioso podria mandar el id de cualquier jugador y anotarlo al torneo.
  IF p_player_id IS NOT NULL THEN
    SELECT p.id, p.user_id IS NOT NULL
      INTO v_player_id, v_has_acct
    FROM public.players p
    WHERE p.id = p_player_id
      AND p.deleted_at IS NULL
      AND p.phone IS NOT NULL
      AND public.pasala_phone_key(p.phone) = v_key;

    IF v_player_id IS NULL THEN
      RETURN jsonb_build_object('outcome', 'invalid_selection');
    END IF;

    RETURN jsonb_build_object(
      'outcome', 'matched', 'player_id', v_player_id, 'has_account', v_has_acct
    );
  END IF;

  SELECT count(*) INTO v_count
  FROM public.players p
  WHERE p.deleted_at IS NULL
    AND p.phone IS NOT NULL
    AND btrim(p.phone) <> ''
    AND public.pasala_phone_key(p.phone) = v_key;

  -- Dos personas pueden compartir linea. No se adivina cual es.
  IF v_count > 1 THEN
    RETURN jsonb_build_object('outcome', 'ambiguous', 'candidates', v_count);
  END IF;

  IF v_count = 1 THEN
    SELECT p.id, p.user_id IS NOT NULL
      INTO v_player_id, v_has_acct
    FROM public.players p
    WHERE p.deleted_at IS NULL
      AND p.phone IS NOT NULL
      AND btrim(p.phone) <> ''
      AND public.pasala_phone_key(p.phone) = v_key;

    RETURN jsonb_build_object(
      'outcome', 'matched', 'player_id', v_player_id, 'has_account', v_has_acct
    );
  END IF;

  -- Nadie tiene ese numero: jugador nuevo, sin reclamar.
  --
  -- El telefono se guarda TAL COMO SE TIPEO, igual que en todo el resto del
  -- sistema. La forma canonica es un derivado para comparar, no un reemplazo.
  -- No puede colisionar con el UNIQUE parcial: si algun jugador tuviera ese
  -- texto, su clave normalizada seria la misma y habria matcheado arriba.
  v_display := v_first || ' ' || v_last;

  INSERT INTO public.players (
    user_id, display_name, normalized_name, first_name, last_name,
    phone, position, is_guest, created_by, created_source
  )
  VALUES (
    NULL, v_display, LOWER(v_display), v_first, v_last,
    NULLIF(TRIM(p_phone), ''), 'cualquiera', true, NULL, 'public_event_registration'
  )
  RETURNING id INTO v_player_id;

  RETURN jsonb_build_object(
    'outcome', 'created', 'player_id', v_player_id, 'has_account', false
  );
END;
$$;

-- ─── 4. Inscripcion publica a torneo ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.public_request_tournament_registration(
  p_tournament_id uuid,
  p_a_first_name  text,
  p_a_last_name   text,
  p_a_phone       text,
  p_b_first_name  text,
  p_b_last_name   text,
  p_b_phone       text,
  p_a_player_id   uuid DEFAULT NULL,
  p_b_player_id   uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status       text;
  v_club_id      uuid;
  v_name         text;
  v_a            jsonb;
  v_b            jsonb;
  v_a_id         uuid;
  v_b_id         uuid;
  v_a_label      text;
  v_b_label      text;
  v_reg_id       uuid;
  v_requested_at timestamptz;
BEGIN
  SELECT ct.status, ct.club_id, ct.name
    INTO v_status, v_club_id, v_name
  FROM public.club_tournaments ct
  WHERE ct.id = p_tournament_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TOURNAMENT_NOT_FOUND';
  END IF;
  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'TOURNAMENT_NOT_OPEN';
  END IF;

  v_a := public.public_resolve_registration_player(
    p_a_first_name, p_a_last_name, p_a_phone, p_a_player_id
  );
  IF v_a->>'outcome' = 'ambiguous'         THEN RAISE EXCEPTION 'AMBIGUOUS_PHONE_A'; END IF;
  IF v_a->>'outcome' = 'invalid_phone'     THEN RAISE EXCEPTION 'INVALID_PHONE_A'; END IF;
  IF v_a->>'outcome' = 'invalid_name'      THEN RAISE EXCEPTION 'INVALID_NAME_A'; END IF;
  IF v_a->>'outcome' = 'invalid_selection' THEN RAISE EXCEPTION 'INVALID_SELECTION_A'; END IF;

  v_b := public.public_resolve_registration_player(
    p_b_first_name, p_b_last_name, p_b_phone, p_b_player_id
  );
  IF v_b->>'outcome' = 'ambiguous'         THEN RAISE EXCEPTION 'AMBIGUOUS_PHONE_B'; END IF;
  IF v_b->>'outcome' = 'invalid_phone'     THEN RAISE EXCEPTION 'INVALID_PHONE_B'; END IF;
  IF v_b->>'outcome' = 'invalid_name'      THEN RAISE EXCEPTION 'INVALID_NAME_B'; END IF;
  IF v_b->>'outcome' = 'invalid_selection' THEN RAISE EXCEPTION 'INVALID_SELECTION_B'; END IF;

  v_a_id := (v_a->>'player_id')::uuid;
  v_b_id := (v_b->>'player_id')::uuid;

  -- Puede pasar de verdad: dos personas que comparten linea y eligen el mismo
  -- candidato, o alguien que se carga a si mismo dos veces por error.
  IF v_a_id = v_b_id THEN
    RAISE EXCEPTION 'SAME_PLAYER_TWICE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.tournament_registrations tr
    WHERE tr.tournament_id = p_tournament_id
      AND tr.status IN ('pending', 'confirmed')
      AND (tr.player_id = v_a_id OR tr.teammate_player_id = v_a_id)
  ) THEN
    RAISE EXCEPTION 'PLAYER_A_ALREADY_REGISTERED';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.tournament_registrations tr
    WHERE tr.tournament_id = p_tournament_id
      AND tr.status IN ('pending', 'confirmed')
      AND (tr.player_id = v_b_id OR tr.teammate_player_id = v_b_id)
  ) THEN
    RAISE EXCEPTION 'PLAYER_B_ALREADY_REGISTERED';
  END IF;

  -- Mismo ON CONFLICT que el flujo con cuenta: una inscripcion rechazada se
  -- puede volver a pedir, una pendiente o confirmada no se pisa.
  INSERT INTO public.tournament_registrations (tournament_id, player_id, teammate_player_id)
  VALUES (p_tournament_id, v_a_id, v_b_id)
  ON CONFLICT (tournament_id, player_id) DO UPDATE
    SET status = CASE
          WHEN tournament_registrations.status = 'rejected' THEN 'pending'
          ELSE tournament_registrations.status END,
        requested_at = CASE
          WHEN tournament_registrations.status = 'rejected' THEN now()
          ELSE tournament_registrations.requested_at END,
        resolved_at = CASE
          WHEN tournament_registrations.status = 'rejected' THEN NULL
          ELSE tournament_registrations.resolved_at END,
        resolved_by = CASE
          WHEN tournament_registrations.status = 'rejected' THEN NULL
          ELSE tournament_registrations.resolved_by END,
        teammate_player_id = CASE
          WHEN tournament_registrations.status = 'rejected' THEN EXCLUDED.teammate_player_id
          ELSE tournament_registrations.teammate_player_id END
  RETURNING id, requested_at INTO v_reg_id, v_requested_at;

  SELECT display_name INTO v_a_label FROM public.players WHERE id = v_a_id;
  SELECT display_name INTO v_b_label FROM public.players WHERE id = v_b_id;

  -- Misma notificacion al club que el flujo con cuenta, con el mismo tipo y el
  -- mismo link. El panel de solicitudes no distingue el origen.
  INSERT INTO public.notifications (club_id, type, entity_id, payload, priority, dedupe_key)
  VALUES (
    v_club_id,
    'tournament_registration_requested',
    p_tournament_id,
    jsonb_build_object(
      'schema_version', 1,
      'title', 'Nueva inscripcion solicitada',
      'message', COALESCE(v_a_label, 'Un jugador') || ' solicito inscribirse con ' ||
                 COALESCE(v_b_label, 'companero') || ' al torneo "' || v_name || '".',
      'cta_label', 'Revisar solicitudes',
      'link', '/player/mi-club/dashboard/tournaments/' || p_tournament_id::text || '#registrations'
    ),
    2,
    'tournament_registration_requested:' || v_reg_id::text || ':' ||
      to_char(v_requested_at, 'YYYYMMDDHH24MISS')
  )
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'registration_id', v_reg_id,
    'player_a', v_a,
    'player_b', v_b
  );
END;
$$;

-- ─── 5. Inscripcion publica a liga ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.public_request_league_registration(
  p_league_id     uuid,
  p_a_first_name  text,
  p_a_last_name   text,
  p_a_phone       text,
  p_b_first_name  text,
  p_b_last_name   text,
  p_b_phone       text,
  p_a_player_id   uuid DEFAULT NULL,
  p_b_player_id   uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status       text;
  v_club_id      uuid;
  v_name         text;
  v_a            jsonb;
  v_b            jsonb;
  v_a_id         uuid;
  v_b_id         uuid;
  v_a_label      text;
  v_b_label      text;
  v_reg_id       uuid;
  v_requested_at timestamptz;
BEGIN
  SELECT cl.status, cl.club_id, cl.name
    INTO v_status, v_club_id, v_name
  FROM public.club_leagues cl
  WHERE cl.id = p_league_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LEAGUE_NOT_FOUND';
  END IF;
  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'LEAGUE_NOT_OPEN';
  END IF;

  v_a := public.public_resolve_registration_player(
    p_a_first_name, p_a_last_name, p_a_phone, p_a_player_id
  );
  IF v_a->>'outcome' = 'ambiguous'         THEN RAISE EXCEPTION 'AMBIGUOUS_PHONE_A'; END IF;
  IF v_a->>'outcome' = 'invalid_phone'     THEN RAISE EXCEPTION 'INVALID_PHONE_A'; END IF;
  IF v_a->>'outcome' = 'invalid_name'      THEN RAISE EXCEPTION 'INVALID_NAME_A'; END IF;
  IF v_a->>'outcome' = 'invalid_selection' THEN RAISE EXCEPTION 'INVALID_SELECTION_A'; END IF;

  v_b := public.public_resolve_registration_player(
    p_b_first_name, p_b_last_name, p_b_phone, p_b_player_id
  );
  IF v_b->>'outcome' = 'ambiguous'         THEN RAISE EXCEPTION 'AMBIGUOUS_PHONE_B'; END IF;
  IF v_b->>'outcome' = 'invalid_phone'     THEN RAISE EXCEPTION 'INVALID_PHONE_B'; END IF;
  IF v_b->>'outcome' = 'invalid_name'      THEN RAISE EXCEPTION 'INVALID_NAME_B'; END IF;
  IF v_b->>'outcome' = 'invalid_selection' THEN RAISE EXCEPTION 'INVALID_SELECTION_B'; END IF;

  v_a_id := (v_a->>'player_id')::uuid;
  v_b_id := (v_b->>'player_id')::uuid;

  IF v_a_id = v_b_id THEN
    RAISE EXCEPTION 'SAME_PLAYER_TWICE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.league_registrations lr
    WHERE lr.league_id = p_league_id
      AND lr.status IN ('pending', 'confirmed')
      AND (lr.player_id = v_a_id OR lr.teammate_player_id = v_a_id)
  ) THEN
    RAISE EXCEPTION 'PLAYER_A_ALREADY_REGISTERED';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.league_registrations lr
    WHERE lr.league_id = p_league_id
      AND lr.status IN ('pending', 'confirmed')
      AND (lr.player_id = v_b_id OR lr.teammate_player_id = v_b_id)
  ) THEN
    RAISE EXCEPTION 'PLAYER_B_ALREADY_REGISTERED';
  END IF;

  INSERT INTO public.league_registrations (league_id, player_id, teammate_player_id)
  VALUES (p_league_id, v_a_id, v_b_id)
  ON CONFLICT (league_id, player_id) DO UPDATE
    SET status = CASE
          WHEN league_registrations.status = 'rejected' THEN 'pending'
          ELSE league_registrations.status END,
        requested_at = CASE
          WHEN league_registrations.status = 'rejected' THEN now()
          ELSE league_registrations.requested_at END,
        resolved_at = CASE
          WHEN league_registrations.status = 'rejected' THEN NULL
          ELSE league_registrations.resolved_at END,
        resolved_by = CASE
          WHEN league_registrations.status = 'rejected' THEN NULL
          ELSE league_registrations.resolved_by END,
        teammate_player_id = CASE
          WHEN league_registrations.status = 'rejected' THEN EXCLUDED.teammate_player_id
          ELSE league_registrations.teammate_player_id END
  RETURNING id, requested_at INTO v_reg_id, v_requested_at;

  SELECT display_name INTO v_a_label FROM public.players WHERE id = v_a_id;
  SELECT display_name INTO v_b_label FROM public.players WHERE id = v_b_id;

  INSERT INTO public.notifications (club_id, type, entity_id, payload, priority, dedupe_key)
  VALUES (
    v_club_id,
    'league_registration_requested',
    p_league_id,
    jsonb_build_object(
      'schema_version', 1,
      'title', 'Nueva inscripcion solicitada',
      'message', COALESCE(v_a_label, 'Un jugador') || ' solicito inscribirse con ' ||
                 COALESCE(v_b_label, 'companero') || ' a la liga "' || v_name || '".',
      'cta_label', 'Revisar solicitudes',
      'link', '/player/mi-club/dashboard/leagues/' || p_league_id::text || '#registrations'
    ),
    2,
    'league_registration_requested:' || v_reg_id::text || ':' ||
      to_char(v_requested_at, 'YYYYMMDDHH24MISS')
  )
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'registration_id', v_reg_id,
    'player_a', v_a,
    'player_b', v_b
  );
END;
$$;

-- ─── 6. Permisos ─────────────────────────────────────────────────────────────
-- public_resolve_registration_player NO recibe EXECUTE: es interna. Si se le
-- diera a anon, cualquiera podria crear jugadores sueltos sin pasar por la
-- validacion del evento.

REVOKE ALL ON FUNCTION public.public_resolve_registration_player(text, text, text, uuid) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.public_find_players_by_phone(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_find_players_by_phone(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.public_request_tournament_registration(uuid, text, text, text, text, text, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_request_tournament_registration(uuid, text, text, text, text, text, text, uuid, uuid) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.public_request_league_registration(uuid, text, text, text, text, text, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_request_league_registration(uuid, text, text, text, text, text, text, uuid, uuid) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================================
-- Verificacion posterior (no destructiva, correr aparte)
-- ============================================================================
-- 1) El caso ambiguo real. Con dos Vidal compartiendo numero, tiene que
--    devolver DOS filas — y ningun telefono ni email en la proyeccion.
--
-- SELECT * FROM public.public_find_players_by_phone('2984315287');
--
-- 2) Un numero que no existe devuelve cero filas, sin error.
--
-- SELECT count(*) FROM public.public_find_players_by_phone('2999000111');
--
-- 3) Que se creo desde el formulario publico, una vez que haya trafico.
--
-- SELECT id, display_name, phone, created_at
-- FROM public.players
-- WHERE created_source = 'public_event_registration'
-- ORDER BY created_at DESC;
--
-- 4) Las inscripciones publicas entran igual que las otras: mismo estado,
--    misma tabla. Esta consulta no deberia distinguirlas.
--
-- SELECT tr.status, count(*),
--        count(*) FILTER (WHERE pa.created_source = 'public_event_registration') AS desde_publico
-- FROM public.tournament_registrations tr
-- JOIN public.players pa ON pa.id = tr.player_id
-- GROUP BY tr.status;
-- ============================================================================

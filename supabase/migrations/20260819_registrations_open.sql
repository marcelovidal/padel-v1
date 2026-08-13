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
--
-- Si toca los dos public_request_*_registration, que son los que ejecuta
-- `anon` desde el formulario publico: ahi va el corte de verdad. Esconder el
-- formulario en la pagina no impide un POST directo (seccion 5).
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


-- ─── 5. El corte del lado del servidor ──────────────────────────────────────

-- Que la pagina publica esconda el formulario no alcanza: estos dos RPC los
-- ejecuta `anon` y un POST directo entraba igual con las inscripciones
-- cerradas. La condicion tiene que estar aca abajo.
--
-- Cuerpo tomado de pg_get_functiondef() sobre produccion, verbatim salvo tres
-- cambios por funcion, verificados por diff:
--   1. la declaracion de v_registrations_open
--   2. registrations_open sumado al SELECT ... INTO
--   3. el chequeo, justo despues del de status
--
-- Va DESPUES del ALTER TABLE de la seccion 1 a proposito: la columna tiene que
-- existir cuando se compila el cuerpo.
--
-- Es CREATE OR REPLACE con la misma firma, asi que conserva los GRANT a
-- anon/authenticated que puso 20260816. No hace falta re-otorgar.

CREATE OR REPLACE FUNCTION public.public_request_tournament_registration(p_tournament_id uuid, p_a_first_name text, p_a_last_name text, p_a_phone text, p_b_first_name text, p_b_last_name text, p_b_phone text, p_a_player_id uuid DEFAULT NULL::uuid, p_b_player_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_status       text;
  v_club_id      uuid;
  v_name         text;
  v_registrations_open boolean;
  v_a            jsonb;
  v_b            jsonb;
  v_a_id         uuid;
  v_b_id         uuid;
  v_a_label      text;
  v_b_label      text;
  v_reg_id       uuid;
  v_requested_at timestamptz;
BEGIN
  SELECT ct.status, ct.club_id, ct.name, ct.registrations_open
    INTO v_status, v_club_id, v_name, v_registrations_open
  FROM public.club_tournaments ct
  WHERE ct.id = p_tournament_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TOURNAMENT_NOT_FOUND';
  END IF;
  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'TOURNAMENT_NOT_OPEN';
  END IF;
  IF NOT v_registrations_open THEN
    RAISE EXCEPTION 'REGISTRATIONS_CLOSED';
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
$function$;

CREATE OR REPLACE FUNCTION public.public_request_league_registration(p_league_id uuid, p_a_first_name text, p_a_last_name text, p_a_phone text, p_b_first_name text, p_b_last_name text, p_b_phone text, p_a_player_id uuid DEFAULT NULL::uuid, p_b_player_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_status       text;
  v_club_id      uuid;
  v_name         text;
  v_registrations_open boolean;
  v_a            jsonb;
  v_b            jsonb;
  v_a_id         uuid;
  v_b_id         uuid;
  v_a_label      text;
  v_b_label      text;
  v_reg_id       uuid;
  v_requested_at timestamptz;
BEGIN
  SELECT cl.status, cl.club_id, cl.name, cl.registrations_open
    INTO v_status, v_club_id, v_name, v_registrations_open
  FROM public.club_leagues cl
  WHERE cl.id = p_league_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LEAGUE_NOT_FOUND';
  END IF;
  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'LEAGUE_NOT_OPEN';
  END IF;
  IF NOT v_registrations_open THEN
    RAISE EXCEPTION 'REGISTRATIONS_CLOSED';
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
$function$;


-- ─── 6. Grants ──────────────────────────────────────────────────────────────

-- Los cuatro son de administracion: solo `authenticated`, y adentro decide
-- q6_can_manage_club. `anon` no ejecuta ninguno.

GRANT EXECUTE ON FUNCTION public.club_set_tournament_registrations_open(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_set_league_registrations_open(uuid, boolean)     TO authenticated;

-- El DROP se llevo los grants viejos, hay que re-otorgarlos.
GRANT EXECUTE ON FUNCTION public.club_update_tournament_info(uuid, date, date, text[], date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_update_league_info(uuid, date, date, text[], date, date)     TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;

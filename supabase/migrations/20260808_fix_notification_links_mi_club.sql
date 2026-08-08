-- ============================================================================
-- Fix de links de notificacion: /club/dashboard/ -> /player/mi-club/dashboard/
-- ============================================================================
-- APLICAR MANUALMENTE EN SUPABASE. Este archivo no se ejecuta solo.
--
-- Problema
-- --------
-- En el commit a247631 se elimino app/club/(app)/ y el panel de club se migro
-- a /player/mi-club. Las notificaciones que se emiten al dueño del club cuando
-- un jugador solicita inscribirse a un torneo o liga siguen generando links a
-- /club/dashboard/..., ruta que ya no existe: cada notificacion lleva a un 404.
--
-- Alcance
-- -------
-- Solo DOS funciones emiten esos links:
--   - player_request_tournament_registration(uuid, uuid)
--   - player_request_league_registration(uuid, uuid)
--
-- Ambas aparecen redefinidas en tres migraciones (q6_3_registrations,
-- q6_3_registration_requested_notifications_fix, q6_3_registration_requested_
-- strict_insert y q6_4_duo_registration_paths). La version VIGENTE es la de
-- 20260308_q6_4_duo_registration_paths.sql — las anteriores estan sobrescritas.
-- Este archivo reproduce esa version exacta y cambia UNICAMENTE el literal del
-- link, preservando el fragmento #registrations.
--
-- NO se tocan:
--   - Los overloads de 1 argumento (delegan en estas, no contienen links)
--   - Las notificaciones al compañero, que apuntan a /player/events (correcto)
--   - q6_notify_event_open, cuyo link /player/events ya es correcto
--
-- Cambios exactos
-- ---------------
--   '/club/dashboard/tournaments/' -> '/player/mi-club/dashboard/tournaments/'
--   '/club/dashboard/leagues/'     -> '/player/mi-club/dashboard/leagues/'
-- ============================================================================

BEGIN;

-- ─── 1. Solicitud de inscripcion a torneo ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.player_request_tournament_registration(
  p_tournament_id uuid,
  p_teammate_player_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_player_id uuid;
  v_player_label text;
  v_tournament_status text;
  v_club_id uuid;
  v_tournament_name text;
  v_reg_id uuid;
  v_requested_at timestamptz;
  v_teammate_uid uuid;
  v_teammate_label text;
  v_message text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT
    p.id,
    COALESCE(
      NULLIF(TRIM(p.display_name), ''),
      NULLIF(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''),
      'Un jugador'
    )
  INTO v_player_id, v_player_label
  FROM public.players p
  WHERE p.user_id = v_uid
    AND p.deleted_at IS NULL
  LIMIT 1;

  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'PLAYER_NOT_FOUND';
  END IF;

  SELECT ct.status, ct.club_id, ct.name
    INTO v_tournament_status, v_club_id, v_tournament_name
  FROM public.club_tournaments ct
  WHERE ct.id = p_tournament_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TOURNAMENT_NOT_FOUND';
  END IF;
  IF v_tournament_status <> 'active' THEN
    RAISE EXCEPTION 'TOURNAMENT_NOT_OPEN';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.tournament_registrations tr
    WHERE tr.tournament_id = p_tournament_id
      AND tr.status IN ('pending', 'confirmed')
      AND (tr.player_id = v_player_id OR tr.teammate_player_id = v_player_id)
  ) THEN
    RAISE EXCEPTION 'PLAYER_ALREADY_REGISTERED';
  END IF;

  IF p_teammate_player_id IS NOT NULL THEN
    IF p_teammate_player_id = v_player_id THEN
      RAISE EXCEPTION 'INVALID_TEAM_PLAYERS';
    END IF;

    SELECT
      p.user_id,
      COALESCE(
        NULLIF(TRIM(p.display_name), ''),
        NULLIF(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''),
        'Tu companero'
      )
    INTO v_teammate_uid, v_teammate_label
    FROM public.players p
    WHERE p.id = p_teammate_player_id
      AND p.deleted_at IS NULL
      AND p.status = 'active';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'TEAMMATE_NOT_FOUND';
    END IF;

    IF v_teammate_uid IS NULL THEN
      RAISE EXCEPTION 'TEAMMATE_NOT_ELIGIBLE';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.tournament_registrations tr
      WHERE tr.tournament_id = p_tournament_id
        AND tr.status IN ('pending', 'confirmed')
        AND (tr.player_id = p_teammate_player_id OR tr.teammate_player_id = p_teammate_player_id)
    ) THEN
      RAISE EXCEPTION 'TEAMMATE_ALREADY_REGISTERED';
    END IF;
  END IF;

  INSERT INTO public.tournament_registrations (tournament_id, player_id, teammate_player_id)
  VALUES (p_tournament_id, v_player_id, p_teammate_player_id)
  ON CONFLICT (tournament_id, player_id) DO UPDATE
    SET status = CASE
      WHEN tournament_registrations.status = 'rejected' THEN 'pending'
      ELSE tournament_registrations.status
    END,
    requested_at = CASE
      WHEN tournament_registrations.status = 'rejected' THEN now()
      ELSE tournament_registrations.requested_at
    END,
    resolved_at = CASE
      WHEN tournament_registrations.status = 'rejected' THEN NULL
      ELSE tournament_registrations.resolved_at
    END,
    resolved_by = CASE
      WHEN tournament_registrations.status = 'rejected' THEN NULL
      ELSE tournament_registrations.resolved_by
    END,
    teammate_player_id = CASE
      WHEN tournament_registrations.status = 'rejected' THEN EXCLUDED.teammate_player_id
      ELSE tournament_registrations.teammate_player_id
    END
  RETURNING id, requested_at
  INTO v_reg_id, v_requested_at;

  v_message := CASE
    WHEN p_teammate_player_id IS NULL THEN
      v_player_label || ' solicito inscribirse al torneo "' || v_tournament_name || '".'
    ELSE
      v_player_label || ' solicito inscribirse con ' || COALESCE(v_teammate_label, 'companero') ||
      ' al torneo "' || v_tournament_name || '".'
  END;

  INSERT INTO public.notifications (club_id, type, entity_id, payload, priority, dedupe_key)
  VALUES (
    v_club_id,
    'tournament_registration_requested',
    p_tournament_id,
    jsonb_build_object(
      'schema_version', 1,
      'title', 'Nueva inscripcion solicitada',
      'message', v_message,
      'cta_label', 'Revisar solicitudes',
      -- FIX: /club/dashboard/ -> /player/mi-club/dashboard/
      'link', '/player/mi-club/dashboard/tournaments/' || p_tournament_id::text || '#registrations'
    ),
    2,
    'tournament_registration_requested:' || v_reg_id::text || ':' || to_char(v_requested_at, 'YYYYMMDDHH24MISS')
  )
  ON CONFLICT DO NOTHING;

  IF p_teammate_player_id IS NOT NULL AND v_teammate_uid IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, entity_id, payload, priority, dedupe_key)
    VALUES (
      v_teammate_uid,
      'tournament_registration_requested',
      p_tournament_id,
      jsonb_build_object(
        'schema_version', 1,
        'title', 'Te sumaron a una inscripcion',
        'message', v_player_label || ' te sumo como companero para el torneo "' || v_tournament_name || '". Queda pendiente de aprobacion del club.',
        'cta_label', 'Ver estado',
        'link', '/player/events'
      ),
      1,
      'tournament_registration_teammate_pending:' || v_reg_id::text || ':' || v_teammate_uid::text
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_reg_id;
END;
$$;

-- ─── 2. Solicitud de inscripcion a liga ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.player_request_league_registration(
  p_league_id uuid,
  p_teammate_player_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_player_id uuid;
  v_player_label text;
  v_league_status text;
  v_club_id uuid;
  v_league_name text;
  v_reg_id uuid;
  v_requested_at timestamptz;
  v_teammate_uid uuid;
  v_teammate_label text;
  v_message text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT
    p.id,
    COALESCE(
      NULLIF(TRIM(p.display_name), ''),
      NULLIF(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''),
      'Un jugador'
    )
  INTO v_player_id, v_player_label
  FROM public.players p
  WHERE p.user_id = v_uid
    AND p.deleted_at IS NULL
  LIMIT 1;

  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'PLAYER_NOT_FOUND';
  END IF;

  SELECT cl.status, cl.club_id, cl.name
    INTO v_league_status, v_club_id, v_league_name
  FROM public.club_leagues cl
  WHERE cl.id = p_league_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LEAGUE_NOT_FOUND';
  END IF;
  IF v_league_status <> 'active' THEN
    RAISE EXCEPTION 'LEAGUE_NOT_OPEN';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.league_registrations lr
    WHERE lr.league_id = p_league_id
      AND lr.status IN ('pending', 'confirmed')
      AND (lr.player_id = v_player_id OR lr.teammate_player_id = v_player_id)
  ) THEN
    RAISE EXCEPTION 'PLAYER_ALREADY_REGISTERED';
  END IF;

  IF p_teammate_player_id IS NOT NULL THEN
    IF p_teammate_player_id = v_player_id THEN
      RAISE EXCEPTION 'INVALID_TEAM_PLAYERS';
    END IF;

    SELECT
      p.user_id,
      COALESCE(
        NULLIF(TRIM(p.display_name), ''),
        NULLIF(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''),
        'Tu companero'
      )
    INTO v_teammate_uid, v_teammate_label
    FROM public.players p
    WHERE p.id = p_teammate_player_id
      AND p.deleted_at IS NULL
      AND p.status = 'active';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'TEAMMATE_NOT_FOUND';
    END IF;

    IF v_teammate_uid IS NULL THEN
      RAISE EXCEPTION 'TEAMMATE_NOT_ELIGIBLE';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.league_registrations lr
      WHERE lr.league_id = p_league_id
        AND lr.status IN ('pending', 'confirmed')
        AND (lr.player_id = p_teammate_player_id OR lr.teammate_player_id = p_teammate_player_id)
    ) THEN
      RAISE EXCEPTION 'TEAMMATE_ALREADY_REGISTERED';
    END IF;
  END IF;

  INSERT INTO public.league_registrations (league_id, player_id, teammate_player_id)
  VALUES (p_league_id, v_player_id, p_teammate_player_id)
  ON CONFLICT (league_id, player_id) DO UPDATE
    SET status = CASE
      WHEN league_registrations.status = 'rejected' THEN 'pending'
      ELSE league_registrations.status
    END,
    requested_at = CASE
      WHEN league_registrations.status = 'rejected' THEN now()
      ELSE league_registrations.requested_at
    END,
    resolved_at = CASE
      WHEN league_registrations.status = 'rejected' THEN NULL
      ELSE league_registrations.resolved_at
    END,
    resolved_by = CASE
      WHEN league_registrations.status = 'rejected' THEN NULL
      ELSE league_registrations.resolved_by
    END,
    teammate_player_id = CASE
      WHEN league_registrations.status = 'rejected' THEN EXCLUDED.teammate_player_id
      ELSE league_registrations.teammate_player_id
    END
  RETURNING id, requested_at
  INTO v_reg_id, v_requested_at;

  v_message := CASE
    WHEN p_teammate_player_id IS NULL THEN
      v_player_label || ' solicito inscribirse a la liga "' || v_league_name || '".'
    ELSE
      v_player_label || ' solicito inscribirse con ' || COALESCE(v_teammate_label, 'companero') ||
      ' a la liga "' || v_league_name || '".'
  END;

  INSERT INTO public.notifications (club_id, type, entity_id, payload, priority, dedupe_key)
  VALUES (
    v_club_id,
    'league_registration_requested',
    p_league_id,
    jsonb_build_object(
      'schema_version', 1,
      'title', 'Nueva inscripcion solicitada',
      'message', v_message,
      'cta_label', 'Revisar solicitudes',
      -- FIX: /club/dashboard/ -> /player/mi-club/dashboard/
      'link', '/player/mi-club/dashboard/leagues/' || p_league_id::text || '#registrations'
    ),
    2,
    'league_registration_requested:' || v_reg_id::text || ':' || to_char(v_requested_at, 'YYYYMMDDHH24MISS')
  )
  ON CONFLICT DO NOTHING;

  IF p_teammate_player_id IS NOT NULL AND v_teammate_uid IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, entity_id, payload, priority, dedupe_key)
    VALUES (
      v_teammate_uid,
      'league_registration_requested',
      p_league_id,
      jsonb_build_object(
        'schema_version', 1,
        'title', 'Te sumaron a una inscripcion',
        'message', v_player_label || ' te sumo como companero para la liga "' || v_league_name || '". Queda pendiente de aprobacion del club.',
        'cta_label', 'Ver estado',
        'link', '/player/events'
      ),
      1,
      'league_registration_teammate_pending:' || v_reg_id::text || ':' || v_teammate_uid::text
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_reg_id;
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;

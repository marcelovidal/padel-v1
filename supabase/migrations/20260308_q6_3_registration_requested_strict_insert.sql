-- Q6.3 HOTFIX: enforce club notification insert on player registration request
-- Removes silent swallow behavior by inserting directly into notifications.

BEGIN;

CREATE OR REPLACE FUNCTION public.player_request_tournament_registration(
  p_tournament_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid              uuid;
  v_player_id        uuid;
  v_player_label     text;
  v_status           text;
  v_reg_id           uuid;
  v_requested_at     timestamptz;
  v_club_id          uuid;
  v_tournament_name  text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

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

  IF v_player_id IS NULL THEN RAISE EXCEPTION 'PLAYER_NOT_FOUND'; END IF;

  SELECT status, club_id, name
    INTO v_status, v_club_id, v_tournament_name
  FROM public.club_tournaments
  WHERE id = p_tournament_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'TOURNAMENT_NOT_FOUND'; END IF;
  IF v_status NOT IN ('active') THEN RAISE EXCEPTION 'TOURNAMENT_NOT_OPEN'; END IF;

  INSERT INTO public.tournament_registrations (tournament_id, player_id)
  VALUES (p_tournament_id, v_player_id)
  ON CONFLICT (tournament_id, player_id) DO UPDATE
    SET status = CASE
      WHEN tournament_registrations.status = 'rejected' THEN 'pending'
      ELSE tournament_registrations.status
    END,
    requested_at = CASE
      WHEN tournament_registrations.status = 'rejected' THEN now()
      ELSE tournament_registrations.requested_at
    END
  RETURNING id, requested_at INTO v_reg_id, v_requested_at;

  INSERT INTO public.notifications (club_id, type, entity_id, payload, priority, dedupe_key)
  VALUES (
    v_club_id,
    'tournament_registration_requested',
    p_tournament_id,
    jsonb_build_object(
      'schema_version', 1,
      'title', 'Nueva inscripcion solicitada',
      'message', v_player_label || ' solicito inscribirse al torneo "' || v_tournament_name || '".',
      'cta_label', 'Revisar solicitudes',
      'link', '/club/dashboard/tournaments/' || p_tournament_id::text || '#registrations'
    ),
    2,
    'tournament_registration_requested:' || v_reg_id::text || ':' ||
    to_char(v_requested_at, 'YYYYMMDDHH24MISS')
  )
  ON CONFLICT DO NOTHING;

  RETURN v_reg_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.player_request_league_registration(
  p_league_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid          uuid;
  v_player_id    uuid;
  v_player_label text;
  v_status       text;
  v_reg_id       uuid;
  v_requested_at timestamptz;
  v_club_id      uuid;
  v_league_name  text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

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

  IF v_player_id IS NULL THEN RAISE EXCEPTION 'PLAYER_NOT_FOUND'; END IF;

  SELECT status, club_id, name
    INTO v_status, v_club_id, v_league_name
  FROM public.club_leagues
  WHERE id = p_league_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'LEAGUE_NOT_FOUND'; END IF;
  IF v_status NOT IN ('active') THEN RAISE EXCEPTION 'LEAGUE_NOT_OPEN'; END IF;

  INSERT INTO public.league_registrations (league_id, player_id)
  VALUES (p_league_id, v_player_id)
  ON CONFLICT (league_id, player_id) DO UPDATE
    SET status = CASE
      WHEN league_registrations.status = 'rejected' THEN 'pending'
      ELSE league_registrations.status
    END,
    requested_at = CASE
      WHEN league_registrations.status = 'rejected' THEN now()
      ELSE league_registrations.requested_at
    END
  RETURNING id, requested_at INTO v_reg_id, v_requested_at;

  INSERT INTO public.notifications (club_id, type, entity_id, payload, priority, dedupe_key)
  VALUES (
    v_club_id,
    'league_registration_requested',
    p_league_id,
    jsonb_build_object(
      'schema_version', 1,
      'title', 'Nueva inscripcion solicitada',
      'message', v_player_label || ' solicito inscribirse a la liga "' || v_league_name || '".',
      'cta_label', 'Revisar solicitudes',
      'link', '/club/dashboard/leagues/' || p_league_id::text || '#registrations'
    ),
    2,
    'league_registration_requested:' || v_reg_id::text || ':' ||
    to_char(v_requested_at, 'YYYYMMDDHH24MISS')
  )
  ON CONFLICT DO NOTHING;

  RETURN v_reg_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.player_request_tournament_registration(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.player_request_league_registration(uuid) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

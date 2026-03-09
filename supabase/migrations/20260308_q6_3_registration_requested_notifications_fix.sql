-- Q6.3 HOTFIX: notify club on player registration requests (tournament/league)
-- Adds notification types:
-- - tournament_registration_requested
-- - league_registration_requested

BEGIN;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS chk_notifications_type;

ALTER TABLE public.notifications
  ADD CONSTRAINT chk_notifications_type CHECK (
    type IN (
      'player_match_result_ready',
      'player_claim_success',
      'club_claim_requested',
      'club_match_created',
      'tournament_open_for_registration',
      'league_open_for_registration',
      'tournament_registration_requested',
      'league_registration_requested',
      'tournament_registration_confirmed',
      'league_registration_confirmed'
    )
  ) NOT VALID;

CREATE OR REPLACE FUNCTION public.notification_create(
  p_user_id    uuid    DEFAULT NULL,
  p_club_id    uuid    DEFAULT NULL,
  p_type       text    DEFAULT NULL,
  p_entity_id  uuid    DEFAULT NULL,
  p_payload    jsonb   DEFAULT '{}'::jsonb,
  p_priority   smallint DEFAULT 0,
  p_dedupe_key text    DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      uuid;
  v_is_admin boolean;
  v_id       uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = v_uid AND pr.role = 'admin'
  ) INTO v_is_admin;

  IF ((CASE WHEN p_user_id IS NULL THEN 0 ELSE 1 END) +
      (CASE WHEN p_club_id  IS NULL THEN 0 ELSE 1 END)) <> 1 THEN
    RAISE EXCEPTION 'INVALID_NOTIFICATION_TARGET';
  END IF;

  IF p_type IS NULL OR p_type NOT IN (
    'player_match_result_ready',
    'player_claim_success',
    'club_claim_requested',
    'club_match_created',
    'tournament_open_for_registration',
    'league_open_for_registration',
    'tournament_registration_requested',
    'league_registration_requested',
    'tournament_registration_confirmed',
    'league_registration_confirmed'
  ) THEN
    RAISE EXCEPTION 'INVALID_NOTIFICATION_TYPE';
  END IF;

  IF p_club_id IS NOT NULL THEN
    PERFORM 1 FROM public.clubs c WHERE c.id = p_club_id AND c.deleted_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'CLUB_NOT_FOUND'; END IF;
  END IF;

  IF p_type IN ('player_match_result_ready', 'player_claim_success') THEN
    IF p_user_id IS DISTINCT FROM v_uid THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  ELSIF p_type = 'club_match_created' THEN
    IF p_club_id IS NULL THEN RAISE EXCEPTION 'INVALID_NOTIFICATION_TARGET'; END IF;
    PERFORM 1 FROM public.clubs c
    WHERE c.id = p_club_id AND c.deleted_at IS NULL
      AND c.claim_status = 'claimed' AND c.claimed_by = v_uid;
    IF NOT FOUND THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  ELSIF p_type = 'club_claim_requested' THEN
    IF p_user_id IS NULL THEN RAISE EXCEPTION 'INVALID_NOTIFICATION_TARGET'; END IF;
    IF NOT v_is_admin THEN
      PERFORM 1 FROM public.club_claim_requests r
      WHERE r.id = p_entity_id AND r.requested_by = v_uid;
      IF NOT FOUND THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
    END IF;
  END IF;

  INSERT INTO public.notifications (user_id, club_id, type, entity_id, payload, priority, dedupe_key)
  VALUES (
    p_user_id, p_club_id, p_type, p_entity_id,
    COALESCE(p_payload, '{}'::jsonb),
    COALESCE(p_priority, 0),
    NULLIF(TRIM(COALESCE(p_dedupe_key, '')), '')
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL AND p_dedupe_key IS NOT NULL THEN
    SELECT n.id INTO v_id
    FROM public.notifications n
    WHERE n.user_id IS NOT DISTINCT FROM p_user_id
      AND n.club_id IS NOT DISTINCT FROM p_club_id
      AND n.dedupe_key = p_dedupe_key
    ORDER BY n.created_at DESC LIMIT 1;
  END IF;

  RETURN v_id;
END;
$$;

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

  BEGIN
    PERFORM public.notification_create(
      p_club_id    => v_club_id,
      p_type       => 'tournament_registration_requested',
      p_entity_id  => p_tournament_id,
      p_payload    => jsonb_build_object(
        'schema_version', 1,
        'title', 'Nueva inscripcion solicitada',
        'message', v_player_label || ' solicito inscribirse al torneo "' || v_tournament_name || '".',
        'cta_label', 'Revisar solicitudes',
        'link', '/club/dashboard/tournaments/' || p_tournament_id::text || '#registrations'
      ),
      p_priority   => 2,
      p_dedupe_key => 'tournament_registration_requested:' || v_reg_id::text || ':' ||
                      to_char(v_requested_at, 'YYYYMMDDHH24MISS')
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

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

  BEGIN
    PERFORM public.notification_create(
      p_club_id    => v_club_id,
      p_type       => 'league_registration_requested',
      p_entity_id  => p_league_id,
      p_payload    => jsonb_build_object(
        'schema_version', 1,
        'title', 'Nueva inscripcion solicitada',
        'message', v_player_label || ' solicito inscribirse a la liga "' || v_league_name || '".',
        'cta_label', 'Revisar solicitudes',
        'link', '/club/dashboard/leagues/' || p_league_id::text || '#registrations'
      ),
      p_priority   => 2,
      p_dedupe_key => 'league_registration_requested:' || v_reg_id::text || ':' ||
                      to_char(v_requested_at, 'YYYYMMDDHH24MISS')
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN v_reg_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notification_create(uuid, uuid, text, uuid, jsonb, smallint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.player_request_tournament_registration(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.player_request_league_registration(uuid) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

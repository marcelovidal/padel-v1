-- Already applied in Supabase on 2026-04-15
-- Documentation only

-- Actualizar notification_create para incluir los 22 tipos
-- (agrega booking_*, coach_booking_cancelled, club_owner_request_*)

CREATE OR REPLACE FUNCTION public.notification_create(
  p_user_id    uuid     DEFAULT NULL,
  p_club_id    uuid     DEFAULT NULL,
  p_type       text     DEFAULT NULL,
  p_entity_id  uuid     DEFAULT NULL,
  p_payload    jsonb    DEFAULT '{}'::jsonb,
  p_priority   smallint DEFAULT 0,
  p_dedupe_key text     DEFAULT NULL
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
    'league_registration_confirmed',
    'coach_invitation',
    'coach_invitation_accepted',
    'coach_challenge_assigned',
    'coach_booking_request',
    'coach_booking_confirmed',
    'booking_confirmed',
    'booking_cancelled',
    'booking_requested',
    'training_session_scheduled',
    'coach_booking_cancelled',
    'club_owner_request_approved',
    'club_owner_request_rejected'
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
      AND c.claim_status = 'claimed'
      AND (c.claimed_by = v_uid OR c.owner_player_id IN (
        SELECT p.id FROM public.players p WHERE p.user_id = v_uid
      ));
    IF NOT FOUND AND NOT v_is_admin THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
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

GRANT EXECUTE ON FUNCTION public.notification_create(uuid, uuid, text, uuid, jsonb, smallint, text) TO authenticated;

NOTIFY pgrst, 'reload schema';

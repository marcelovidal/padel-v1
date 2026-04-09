-- FIX: Coach notifications
-- Problemas:
-- 1. notification_create no incluye los 5 tipos coach_* (desincronizado)
-- 2. coach_invite_player tiene payload mínimo (sin title/message/coach_name)
-- 3. coach_accept_invitation tiene payload mínimo (sin player_name)
-- Nota: los RPCs coach_* insertan directo en notifications (SECURITY DEFINER),
--       no usan notification_create. El fix en notification_create es de consistencia.

BEGIN;

-- ── 1. Actualizar notification_create para incluir tipos coach ─────────────

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
    'coach_booking_confirmed'
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

GRANT EXECUTE ON FUNCTION public.notification_create(uuid, uuid, text, uuid, jsonb, smallint, text) TO authenticated;

-- ── 2. Actualizar coach_invite_player con payload enriquecido ─────────────

CREATE OR REPLACE FUNCTION public.coach_invite_player(
  p_player_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid             uuid := auth.uid();
  v_coach_id        uuid;
  v_coach_name      text;
  v_coach_player_id uuid;
  v_target_user_id  uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT cp.id,
    COALESCE(
      NULLIF(TRIM(p.display_name), ''),
      NULLIF(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''),
      'Tu entrenador'
    )
  INTO v_coach_id, v_coach_name
  FROM public.coach_profiles cp
  JOIN public.players p ON p.id = cp.player_id
  WHERE p.user_id = v_uid AND p.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COACH_NOT_FOUND';
  END IF;

  -- Verificar que el jugador objetivo existe y tiene cuenta
  SELECT user_id INTO v_target_user_id
  FROM public.players
  WHERE id = p_player_id AND status = 'active' AND deleted_at IS NULL AND is_guest = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PLAYER_NOT_FOUND';
  END IF;

  INSERT INTO public.coach_players (coach_id, player_id, status)
  VALUES (v_coach_id, p_player_id, 'pending')
  ON CONFLICT (coach_id, player_id) DO NOTHING
  RETURNING id INTO v_coach_player_id;

  -- Notificar al jugador solo si la invitación fue creada ahora
  IF v_coach_player_id IS NOT NULL AND v_target_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, entity_id, payload, priority)
    VALUES (
      v_target_user_id,
      'coach_invitation',
      v_coach_player_id,
      jsonb_build_object(
        'schema_version', 1,
        'title',           'Invitación de entrenador',
        'message',         v_coach_name || ' te invitó a entrenar juntos',
        'coach_player_id', v_coach_player_id,
        'coach_name',      v_coach_name,
        'link',            '/player/coach'
      ),
      1
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_coach_player_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.coach_invite_player(uuid) TO authenticated;

-- ── 3. Actualizar coach_accept_invitation con payload enriquecido ─────────

CREATE OR REPLACE FUNCTION public.coach_accept_invitation(
  p_coach_player_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid           uuid := auth.uid();
  v_player_id     uuid;
  v_player_name   text;
  v_coach_user_id uuid;
  v_coach_player  coach_players%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT p.id,
    COALESCE(
      NULLIF(TRIM(p.display_name), ''),
      NULLIF(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''),
      'Un jugador'
    )
  INTO v_player_id, v_player_name
  FROM public.players p
  WHERE p.user_id = v_uid AND p.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PLAYER_NOT_FOUND';
  END IF;

  SELECT * INTO v_coach_player
  FROM public.coach_players
  WHERE id = p_coach_player_id AND player_id = v_player_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVITATION_NOT_FOUND';
  END IF;

  UPDATE public.coach_players
  SET status = 'active', accepted_at = now()
  WHERE id = p_coach_player_id;

  -- Notificar al entrenador
  SELECT p.user_id INTO v_coach_user_id
  FROM public.coach_profiles cp
  JOIN public.players p ON p.id = cp.player_id
  WHERE cp.id = v_coach_player.coach_id;

  IF v_coach_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, entity_id, payload, priority)
    VALUES (
      v_coach_user_id,
      'coach_invitation_accepted',
      p_coach_player_id,
      jsonb_build_object(
        'schema_version', 1,
        'title',           'Invitación aceptada',
        'message',         v_player_name || ' aceptó tu invitación',
        'coach_player_id', p_coach_player_id,
        'player_name',     v_player_name,
        'link',            '/player/coach'
      ),
      1
    )
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.coach_accept_invitation(uuid) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

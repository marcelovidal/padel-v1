-- STAGE Q3 HOTFIX: club creates confirmed booking + match with one assigned player

BEGIN;

CREATE OR REPLACE FUNCTION public.club_create_confirmed_booking_match(
  p_club_id uuid,
  p_court_id uuid,
  p_player_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_club record;
  v_player record;
  v_booking_id uuid;
  v_match_id uuid;
  v_status public.match_status;
  v_notes text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF p_start_at IS NULL OR p_end_at IS NULL OR p_end_at <= p_start_at THEN
    RAISE EXCEPTION 'INVALID_TIME_RANGE';
  END IF;

  SELECT c.id, c.name
    INTO v_club
  FROM public.clubs c
  WHERE c.id = p_club_id
    AND c.deleted_at IS NULL
    AND c.archived_at IS NULL
    AND c.merged_into IS NULL
    AND c.claim_status = 'claimed'
    AND c.claimed_by = v_uid
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.club_courts cc
    WHERE cc.id = p_court_id
      AND cc.club_id = p_club_id
      AND cc.active = true
  ) THEN
    RAISE EXCEPTION 'COURT_NOT_AVAILABLE';
  END IF;

  SELECT p.id, p.user_id, p.display_name
    INTO v_player
  FROM public.players p
  WHERE p.id = p_player_id
    AND p.deleted_at IS NULL
    AND p.status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PLAYER_NOT_FOUND';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.court_bookings b2
    WHERE b2.court_id = p_court_id
      AND b2.status = 'confirmed'
      AND p_start_at < b2.end_at
      AND p_end_at > b2.start_at
  ) THEN
    RAISE EXCEPTION 'BOOKING_OVERLAP';
  END IF;

  v_notes := CONCAT(
    'Partido generado por club. Pendiente completar jugadores y resultado.',
    CASE
      WHEN NULLIF(TRIM(COALESCE(p_note, '')), '') IS NULL THEN ''
      ELSE CONCAT(' Nota: ', NULLIF(TRIM(COALESCE(p_note, '')), ''))
    END
  );

  INSERT INTO public.court_bookings (
    club_id,
    court_id,
    requested_by_player_id,
    requested_by_user_id,
    start_at,
    end_at,
    status,
    note,
    updated_at
  )
  VALUES (
    p_club_id,
    p_court_id,
    p_player_id,
    v_player.user_id,
    p_start_at,
    p_end_at,
    'confirmed',
    NULLIF(TRIM(COALESCE(p_note, '')), ''),
    now()
  )
  RETURNING id INTO v_booking_id;

  v_status := CASE
    WHEN p_start_at < now() THEN 'completed'::public.match_status
    ELSE 'scheduled'::public.match_status
  END;

  INSERT INTO public.matches (
    match_at,
    club_name,
    club_name_raw,
    club_id,
    status,
    notes,
    max_players,
    created_by
  )
  VALUES (
    p_start_at,
    v_club.name,
    v_club.name,
    p_club_id,
    v_status,
    v_notes,
    4,
    v_uid
  )
  RETURNING id INTO v_match_id;

  INSERT INTO public.match_players (match_id, player_id, team)
  VALUES (v_match_id, p_player_id, 'A');

  UPDATE public.court_bookings
  SET match_id = v_match_id,
      updated_at = now()
  WHERE id = v_booking_id;

  RETURN jsonb_build_object(
    'booking_id', v_booking_id,
    'match_id', v_match_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.club_create_confirmed_booking_match(uuid, uuid, uuid, timestamptz, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_create_confirmed_booking_match(uuid, uuid, uuid, timestamptz, timestamptz, text) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

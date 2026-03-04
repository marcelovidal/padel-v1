-- STAGE Q4.2: club confirmation unified with match creation

BEGIN;

CREATE OR REPLACE FUNCTION public.club_confirm_booking_and_create_match(
  p_booking_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_booking record;
  v_owner boolean;
  v_club_name text;
  v_match_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT b.*
    INTO v_booking
  FROM public.court_bookings b
  WHERE b.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.clubs c
    WHERE c.id = v_booking.club_id
      AND c.deleted_at IS NULL
      AND c.archived_at IS NULL
      AND c.merged_into IS NULL
      AND c.claim_status = 'claimed'
      AND c.claimed_by = v_uid
  ) INTO v_owner;

  IF NOT COALESCE(v_owner, false) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  IF v_booking.status NOT IN ('requested', 'confirmed') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  IF v_booking.status = 'requested' THEN
    IF EXISTS (
      SELECT 1
      FROM public.court_bookings b2
      WHERE b2.court_id = v_booking.court_id
        AND b2.id <> v_booking.id
        AND b2.status = 'confirmed'
        AND v_booking.start_at < b2.end_at
        AND v_booking.end_at > b2.start_at
    ) THEN
      RAISE EXCEPTION 'BOOKING_OVERLAP';
    END IF;

    UPDATE public.court_bookings
    SET status = 'confirmed',
        rejection_reason = NULL,
        updated_at = now()
    WHERE id = p_booking_id;
  END IF;

  IF v_booking.match_id IS NOT NULL THEN
    RETURN v_booking.match_id;
  END IF;

  SELECT c.name
    INTO v_club_name
  FROM public.clubs c
  WHERE c.id = v_booking.club_id
    AND c.deleted_at IS NULL
    AND c.archived_at IS NULL
    AND c.merged_into IS NULL
  LIMIT 1;

  IF v_club_name IS NULL THEN
    RAISE EXCEPTION 'CLUB_NOT_FOUND';
  END IF;

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
    v_booking.start_at,
    v_club_name,
    v_club_name,
    v_booking.club_id,
    CASE
      WHEN v_booking.start_at < now() THEN 'completed'::public.match_status
      ELSE 'scheduled'::public.match_status
    END,
    CONCAT('Creado desde reserva #', v_booking.id::text),
    4,
    v_uid
  )
  RETURNING id INTO v_match_id;

  UPDATE public.court_bookings
  SET match_id = v_match_id,
      updated_at = now()
  WHERE id = p_booking_id;

  RETURN v_match_id;
END;
$$;

REVOKE ALL ON FUNCTION public.club_confirm_booking_and_create_match(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_confirm_booking_and_create_match(uuid) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

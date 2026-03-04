-- STAGE Q4.1: court-level slot schedule (opening time + slot grid)

BEGIN;

-- 1) Court schedule columns
ALTER TABLE public.club_courts
  ADD COLUMN IF NOT EXISTS opening_time time NOT NULL DEFAULT '09:00'::time;

ALTER TABLE public.club_courts
  ADD COLUMN IF NOT EXISTS closing_time time NOT NULL DEFAULT '23:00'::time;

ALTER TABLE public.club_courts
  ADD COLUMN IF NOT EXISTS slot_interval_minutes int NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_club_courts_operating_hours'
  ) THEN
    ALTER TABLE public.club_courts
      ADD CONSTRAINT chk_club_courts_operating_hours
      CHECK (closing_time > opening_time);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_club_courts_slot_interval'
  ) THEN
    ALTER TABLE public.club_courts
      ADD CONSTRAINT chk_club_courts_slot_interval
      CHECK (slot_interval_minutes IS NULL OR (slot_interval_minutes >= 30 AND slot_interval_minutes <= 240));
  END IF;
END $$;

-- 2) Club owner can set per-court schedule
CREATE OR REPLACE FUNCTION public.club_set_court_schedule(
  p_court_id uuid,
  p_opening_time time,
  p_closing_time time,
  p_slot_interval_minutes int DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_court record;
  v_owner boolean;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF p_opening_time IS NULL OR p_closing_time IS NULL OR p_closing_time <= p_opening_time THEN
    RAISE EXCEPTION 'INVALID_COURT_HOURS';
  END IF;

  IF p_slot_interval_minutes IS NOT NULL AND (p_slot_interval_minutes < 30 OR p_slot_interval_minutes > 240) THEN
    RAISE EXCEPTION 'INVALID_SLOT_DURATION';
  END IF;

  SELECT cc.id, cc.club_id
    INTO v_court
  FROM public.club_courts cc
  WHERE cc.id = p_court_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COURT_NOT_FOUND';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.clubs c
    WHERE c.id = v_court.club_id
      AND c.deleted_at IS NULL
      AND c.archived_at IS NULL
      AND c.merged_into IS NULL
      AND c.claim_status = 'claimed'
      AND c.claimed_by = v_uid
  ) INTO v_owner;

  IF NOT COALESCE(v_owner, false) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  UPDATE public.club_courts
  SET
    opening_time = p_opening_time,
    closing_time = p_closing_time,
    slot_interval_minutes = p_slot_interval_minutes,
    updated_at = now()
  WHERE id = p_court_id;

  RETURN p_court_id;
END;
$$;

-- 3) Enforce slot-grid validation for player booking requests
CREATE OR REPLACE FUNCTION public.player_request_booking(
  p_club_id uuid,
  p_court_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_player_id uuid;
  v_booking_id uuid;
  v_court_ok boolean;
  v_timezone text;
  v_opening_time time;
  v_closing_time time;
  v_slot_interval_minutes int;
  v_start_local timestamp;
  v_end_local timestamp;
  v_start_minutes int;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF p_end_at <= p_start_at THEN
    RAISE EXCEPTION 'INVALID_TIME_RANGE';
  END IF;

  IF p_start_at < now() - interval '10 minutes' THEN
    RAISE EXCEPTION 'BOOKING_MUST_BE_FUTURE';
  END IF;

  IF p_start_at > now() + interval '60 days' THEN
    RAISE EXCEPTION 'BOOKING_TOO_FAR';
  END IF;

  SELECT p.id
    INTO v_player_id
  FROM public.players p
  WHERE p.user_id = v_uid
    AND p.deleted_at IS NULL
  LIMIT 1;

  SELECT EXISTS (
    SELECT 1
    FROM public.club_courts cc
    JOIN public.clubs c
      ON c.id = cc.club_id
    WHERE cc.id = p_court_id
      AND cc.club_id = p_club_id
      AND cc.active = true
      AND c.deleted_at IS NULL
      AND c.archived_at IS NULL
      AND c.merged_into IS NULL
  ) INTO v_court_ok;

  IF NOT COALESCE(v_court_ok, false) THEN
    RAISE EXCEPTION 'COURT_NOT_AVAILABLE';
  END IF;

  SELECT
    COALESCE(cbs.timezone, 'America/Argentina/Buenos_Aires'),
    cc.opening_time,
    cc.closing_time,
    COALESCE(cc.slot_interval_minutes, cbs.slot_duration_minutes, 90)
  INTO
    v_timezone,
    v_opening_time,
    v_closing_time,
    v_slot_interval_minutes
  FROM public.club_courts cc
  LEFT JOIN public.club_booking_settings cbs
    ON cbs.club_id = cc.club_id
  WHERE cc.id = p_court_id
  LIMIT 1;

  v_start_local := p_start_at AT TIME ZONE v_timezone;
  v_end_local := p_end_at AT TIME ZONE v_timezone;

  -- Booking must stay on the same local date and inside court hours.
  IF v_start_local::date <> v_end_local::date THEN
    RAISE EXCEPTION 'BOOKING_INVALID_SLOT';
  END IF;

  IF v_start_local::time < v_opening_time OR v_end_local::time > v_closing_time THEN
    RAISE EXCEPTION 'BOOKING_OUTSIDE_HOURS';
  END IF;

  IF EXTRACT(EPOCH FROM (p_end_at - p_start_at))::int / 60 <> v_slot_interval_minutes THEN
    RAISE EXCEPTION 'BOOKING_INVALID_DURATION';
  END IF;

  v_start_minutes := FLOOR(EXTRACT(EPOCH FROM (v_start_local::time - v_opening_time)) / 60.0);
  IF v_start_minutes < 0 OR (v_start_minutes % v_slot_interval_minutes) <> 0 THEN
    RAISE EXCEPTION 'BOOKING_INVALID_SLOT';
  END IF;

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
    v_player_id,
    v_uid,
    p_start_at,
    p_end_at,
    'requested',
    NULLIF(TRIM(p_note), ''),
    now()
  )
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$;

REVOKE ALL ON FUNCTION public.club_set_court_schedule(uuid, time, time, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_set_court_schedule(uuid, time, time, int) TO authenticated;

REVOKE ALL ON FUNCTION public.player_request_booking(uuid, uuid, timestamptz, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.player_request_booking(uuid, uuid, timestamptz, timestamptz, text) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

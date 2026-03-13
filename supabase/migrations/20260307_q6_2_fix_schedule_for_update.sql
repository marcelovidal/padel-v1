-- FIX Q6.2: FOR UPDATE cannot be applied to the nullable side of an outer join
-- Ambas funciones de agendamiento usan FOR UPDATE con LEFT JOIN a club_booking_settings.
-- Solución: especificar FOR UPDATE OF <tabla_principal> para no bloquear el lado nullable.

BEGIN;

-- ─────────────────────────────────────────────
-- 1) club_schedule_tournament_match
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.club_schedule_tournament_match(
  p_tournament_match_id uuid,
  p_court_id uuid,
  p_match_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_row record;
  v_timezone text;
  v_slot_interval_minutes int;
  v_start_local timestamp;
  v_end_local timestamp;
  v_start_minutes int;
  v_end_at timestamptz;
  v_booking_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT
    tm.id,
    tm.match_id,
    t.club_id,
    cc.id AS court_id,
    cc.opening_time,
    cc.closing_time,
    COALESCE(cc.slot_interval_minutes, cbs.slot_duration_minutes, 90) AS slot_interval_minutes,
    COALESCE(cbs.timezone, 'America/Argentina/Buenos_Aires') AS timezone
  INTO v_row
  FROM public.tournament_matches tm
  JOIN public.tournament_groups tg ON tg.id = tm.group_id
  JOIN public.club_tournaments t ON t.id = tg.tournament_id
  JOIN public.club_courts cc ON cc.id = p_court_id AND cc.club_id = t.club_id AND cc.active = true
  LEFT JOIN public.club_booking_settings cbs ON cbs.club_id = t.club_id
  WHERE tm.id = p_tournament_match_id
  FOR UPDATE OF tm;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'TOURNAMENT_MATCH_NOT_FOUND'; END IF;
  IF NOT public.q6_can_manage_club(v_row.club_id, v_uid) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  v_slot_interval_minutes := v_row.slot_interval_minutes;
  v_end_at := p_match_at + make_interval(mins => v_slot_interval_minutes);
  v_start_local := p_match_at AT TIME ZONE v_row.timezone;
  v_end_local := v_end_at AT TIME ZONE v_row.timezone;

  IF v_start_local::date <> v_end_local::date THEN RAISE EXCEPTION 'BOOKING_INVALID_SLOT'; END IF;
  IF v_start_local::time < v_row.opening_time OR v_end_local::time > v_row.closing_time THEN
    RAISE EXCEPTION 'BOOKING_OUTSIDE_HOURS';
  END IF;

  v_start_minutes := FLOOR(EXTRACT(EPOCH FROM (v_start_local::time - v_row.opening_time)) / 60.0);
  IF v_start_minutes < 0 OR (v_start_minutes % v_slot_interval_minutes) <> 0 THEN
    RAISE EXCEPTION 'BOOKING_INVALID_SLOT';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.court_bookings b2
    WHERE b2.court_id = p_court_id
      AND b2.status = 'confirmed'
      AND b2.match_id IS DISTINCT FROM v_row.match_id
      AND p_match_at < b2.end_at
      AND v_end_at > b2.start_at
  ) THEN
    RAISE EXCEPTION 'BOOKING_OVERLAP';
  END IF;

  SELECT b.id INTO v_booking_id
  FROM public.court_bookings b
  WHERE b.match_id = v_row.match_id AND b.status = 'confirmed'
  ORDER BY b.created_at DESC LIMIT 1 FOR UPDATE;

  IF v_booking_id IS NULL THEN
    INSERT INTO public.court_bookings (
      club_id, court_id, requested_by_user_id, start_at, end_at,
      status, note, match_id, updated_at
    )
    VALUES (
      v_row.club_id, p_court_id, v_uid, p_match_at, v_end_at,
      'confirmed', 'Torneo - partido de grupo', v_row.match_id, now()
    )
    RETURNING id INTO v_booking_id;
  ELSE
    UPDATE public.court_bookings
    SET court_id = p_court_id, start_at = p_match_at, end_at = v_end_at, updated_at = now()
    WHERE id = v_booking_id;
  END IF;

  UPDATE public.matches
  SET match_at = p_match_at, status = 'scheduled', updated_at = now()
  WHERE id = v_row.match_id;

  UPDATE public.tournament_matches
  SET scheduled_at = p_match_at, court_id = p_court_id, updated_at = now()
  WHERE id = p_tournament_match_id;

  RETURN jsonb_build_object(
    'tournament_match_id', p_tournament_match_id,
    'match_id', v_row.match_id,
    'booking_id', v_booking_id
  );
END;
$$;

-- ─────────────────────────────────────────────
-- 2) club_schedule_tournament_playoff_match
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.club_schedule_tournament_playoff_match(
  p_playoff_match_id uuid,
  p_court_id uuid,
  p_match_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_row record;
  v_slot_interval_minutes int;
  v_start_local timestamp;
  v_end_local timestamp;
  v_start_minutes int;
  v_end_at timestamptz;
  v_booking_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT
    pm.id,
    pm.match_id,
    pm.team_a_id,
    pm.team_b_id,
    t.club_id,
    cc.opening_time,
    cc.closing_time,
    COALESCE(cc.slot_interval_minutes, cbs.slot_duration_minutes, 90) AS slot_interval_minutes,
    COALESCE(cbs.timezone, 'America/Argentina/Buenos_Aires') AS timezone
  INTO v_row
  FROM public.tournament_playoff_matches pm
  JOIN public.club_tournaments t ON t.id = pm.tournament_id
  JOIN public.club_courts cc ON cc.id = p_court_id AND cc.club_id = t.club_id AND cc.active = true
  LEFT JOIN public.club_booking_settings cbs ON cbs.club_id = t.club_id
  WHERE pm.id = p_playoff_match_id
  FOR UPDATE OF pm;

  IF v_row.id IS NULL THEN RAISE EXCEPTION 'PLAYOFF_MATCH_NOT_FOUND'; END IF;
  IF NOT public.q6_can_manage_club(v_row.club_id, v_uid) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF v_row.team_a_id IS NULL OR v_row.team_b_id IS NULL THEN RAISE EXCEPTION 'PLAYOFF_TEAMS_NOT_DEFINED'; END IF;

  v_slot_interval_minutes := v_row.slot_interval_minutes;
  v_end_at := p_match_at + make_interval(mins => v_slot_interval_minutes);
  v_start_local := p_match_at AT TIME ZONE v_row.timezone;
  v_end_local := v_end_at AT TIME ZONE v_row.timezone;

  IF v_start_local::date <> v_end_local::date THEN RAISE EXCEPTION 'BOOKING_INVALID_SLOT'; END IF;
  IF v_start_local::time < v_row.opening_time OR v_end_local::time > v_row.closing_time THEN
    RAISE EXCEPTION 'BOOKING_OUTSIDE_HOURS';
  END IF;

  v_start_minutes := FLOOR(EXTRACT(EPOCH FROM (v_start_local::time - v_row.opening_time)) / 60.0);
  IF v_start_minutes < 0 OR (v_start_minutes % v_slot_interval_minutes) <> 0 THEN
    RAISE EXCEPTION 'BOOKING_INVALID_SLOT';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.court_bookings b2
    WHERE b2.court_id = p_court_id
      AND b2.status = 'confirmed'
      AND b2.match_id IS DISTINCT FROM v_row.match_id
      AND p_match_at < b2.end_at
      AND v_end_at > b2.start_at
  ) THEN
    RAISE EXCEPTION 'BOOKING_OVERLAP';
  END IF;

  SELECT b.id INTO v_booking_id
  FROM public.court_bookings b
  WHERE b.match_id = v_row.match_id AND b.status = 'confirmed'
  ORDER BY b.created_at DESC LIMIT 1 FOR UPDATE;

  IF v_booking_id IS NULL THEN
    INSERT INTO public.court_bookings (
      club_id, court_id, requested_by_user_id, start_at, end_at,
      status, note, match_id, updated_at
    )
    VALUES (
      v_row.club_id, p_court_id, v_uid, p_match_at, v_end_at,
      'confirmed', 'Torneo - partido de playoff', v_row.match_id, now()
    )
    RETURNING id INTO v_booking_id;
  ELSE
    UPDATE public.court_bookings
    SET court_id = p_court_id, start_at = p_match_at, end_at = v_end_at, updated_at = now()
    WHERE id = v_booking_id;
  END IF;

  UPDATE public.matches
  SET match_at = p_match_at, status = 'scheduled', updated_at = now()
  WHERE id = v_row.match_id;

  UPDATE public.tournament_playoff_matches
  SET scheduled_at = p_match_at, court_id = p_court_id, updated_at = now()
  WHERE id = p_playoff_match_id;

  RETURN jsonb_build_object(
    'playoff_match_id', p_playoff_match_id,
    'match_id', v_row.match_id,
    'booking_id', v_booking_id
  );
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';

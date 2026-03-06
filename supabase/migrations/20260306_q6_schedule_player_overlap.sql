-- STAGE Q6 HOTFIX: bloquear programacion si un jugador ya tiene partido en mismo horario

BEGIN;

CREATE OR REPLACE FUNCTION public.club_schedule_league_match(
  p_league_match_id uuid,
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
  v_opening_time time;
  v_closing_time time;
  v_slot_interval_minutes int;
  v_start_local timestamp;
  v_end_local timestamp;
  v_start_minutes int;
  v_end_at timestamptz;
  v_booking_id uuid;
  v_overlap_players text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT
    lm.id,
    lm.match_id,
    lm.court_id AS prev_court_id,
    lm.scheduled_at AS prev_scheduled_at,
    l.club_id,
    cc.id AS court_id,
    cc.opening_time,
    cc.closing_time,
    COALESCE(cc.slot_interval_minutes, cbs.slot_duration_minutes, 90) AS slot_interval_minutes,
    COALESCE(cbs.timezone, 'America/Argentina/Buenos_Aires') AS timezone
  INTO v_row
  FROM public.league_matches lm
  JOIN public.league_groups g ON g.id = lm.group_id
  JOIN public.league_divisions d ON d.id = g.division_id
  JOIN public.club_leagues l ON l.id = d.league_id
  JOIN public.club_courts cc ON cc.id = p_court_id AND cc.club_id = l.club_id AND cc.active = true
  LEFT JOIN public.club_booking_settings cbs ON cbs.club_id = l.club_id
  WHERE lm.id = p_league_match_id
  FOR UPDATE OF lm;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'LEAGUE_MATCH_NOT_FOUND';
  END IF;

  IF NOT public.q6_can_manage_club(v_row.club_id, v_uid) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  v_timezone := v_row.timezone;
  v_opening_time := v_row.opening_time;
  v_closing_time := v_row.closing_time;
  v_slot_interval_minutes := v_row.slot_interval_minutes;
  v_end_at := p_match_at + make_interval(mins => v_slot_interval_minutes);

  v_start_local := p_match_at AT TIME ZONE v_timezone;
  v_end_local := v_end_at AT TIME ZONE v_timezone;

  IF v_start_local::date <> v_end_local::date THEN
    RAISE EXCEPTION 'BOOKING_INVALID_SLOT';
  END IF;

  IF v_start_local::time < v_opening_time OR v_end_local::time > v_closing_time THEN
    RAISE EXCEPTION 'BOOKING_OUTSIDE_HOURS';
  END IF;

  v_start_minutes := FLOOR(EXTRACT(EPOCH FROM (v_start_local::time - v_opening_time)) / 60.0);
  IF v_start_minutes < 0 OR (v_start_minutes % v_slot_interval_minutes) <> 0 THEN
    RAISE EXCEPTION 'BOOKING_INVALID_SLOT';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.court_bookings b2
    WHERE b2.court_id = p_court_id
      AND b2.status = 'confirmed'
      AND b2.match_id IS DISTINCT FROM v_row.match_id
      AND p_match_at < b2.end_at
      AND v_end_at > b2.start_at
  ) THEN
    RAISE EXCEPTION 'BOOKING_OVERLAP';
  END IF;

  SELECT STRING_AGG(
           DISTINCT COALESCE(p.display_name, mp_target.player_id::text),
           ', ' ORDER BY COALESCE(p.display_name, mp_target.player_id::text)
         )
    INTO v_overlap_players
  FROM public.match_players mp_target
  JOIN public.match_players mp_other
    ON mp_other.player_id = mp_target.player_id
   AND mp_other.match_id <> mp_target.match_id
  JOIN public.matches m_other ON m_other.id = mp_other.match_id
  LEFT JOIN public.players p ON p.id = mp_target.player_id
  WHERE mp_target.match_id = v_row.match_id
    AND m_other.match_at IS NOT NULL
    AND date_trunc('minute', m_other.match_at) = date_trunc('minute', p_match_at)
    AND COALESCE(m_other.status, 'scheduled') IN ('scheduled', 'open', 'full', 'confirmed');

  IF v_overlap_players IS NOT NULL THEN
    RAISE EXCEPTION 'BOOKING_PLAYER_OVERLAP'
      USING DETAIL = CONCAT('Jugadores con partido en ese horario: ', v_overlap_players),
            HINT = 'Selecciona otro horario o reprograma el otro partido primero.';
  END IF;

  SELECT b.id
    INTO v_booking_id
  FROM public.court_bookings b
  WHERE b.match_id = v_row.match_id
    AND b.status = 'confirmed'
  ORDER BY b.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_booking_id IS NULL THEN
    INSERT INTO public.court_bookings (
      club_id,
      court_id,
      requested_by_player_id,
      requested_by_user_id,
      start_at,
      end_at,
      status,
      note,
      match_id,
      updated_at
    )
    VALUES (
      v_row.club_id,
      p_court_id,
      NULL,
      v_uid,
      p_match_at,
      v_end_at,
      'confirmed',
      'Reserva generada desde Liga del Club',
      v_row.match_id,
      now()
    )
    RETURNING id INTO v_booking_id;
  ELSE
    UPDATE public.court_bookings
    SET club_id = v_row.club_id,
        court_id = p_court_id,
        start_at = p_match_at,
        end_at = v_end_at,
        status = 'confirmed',
        updated_at = now()
    WHERE id = v_booking_id;
  END IF;

  UPDATE public.matches
  SET match_at = p_match_at,
      match_source = COALESCE(match_source, 'booking'),
      updated_at = now()
  WHERE id = v_row.match_id;

  UPDATE public.league_matches
  SET scheduled_at = p_match_at,
      court_id = p_court_id,
      updated_at = now()
  WHERE id = p_league_match_id;

  RETURN jsonb_build_object(
    'league_match_id', p_league_match_id,
    'match_id', v_row.match_id,
    'booking_id', v_booking_id,
    'scheduled_at', p_match_at,
    'court_id', p_court_id
  );
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';

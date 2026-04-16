-- Already applied in Supabase on 2026-04-15
-- Documentation only

-- Fix 3 RPCs de reservas: agregar owner_player_id check
-- Affected:
--   1. club_get_agenda_slots   (claimed_by solo)
--   2. club_cancel_booking     (claimed_by solo)
--   3. club_create_confirmed_booking_match (claimed_by solo)
-- Pattern: AND (c.claimed_by = v_uid OR c.owner_player_id IN (
--            SELECT p.id FROM public.players p WHERE p.user_id = v_uid
--          ))

-- ────────────────────────────────────────────────────────────
-- 1. club_get_agenda_slots
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.club_get_agenda_slots(
  p_club_id  uuid,
  p_from     timestamptz,
  p_to       timestamptz
)
RETURNS TABLE (
  slot_id        uuid,
  slot_type      text,
  court_id       uuid,
  court_name     text,
  start_at       timestamptz,
  end_at         timestamptz,
  entity_id      uuid,
  entity_name    text,
  match_id       uuid,
  team_a         text,
  team_b         text,
  requester_name text,
  note           text,
  booking_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  -- Auth check
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- Club ownership check (claimed_by OR owner_player_id)
  PERFORM 1
  FROM public.clubs c
  WHERE c.id           = p_club_id
    AND c.deleted_at   IS NULL
    AND c.claim_status = 'claimed'
    AND (c.claimed_by = v_user_id OR c.owner_player_id IN (
      SELECT p.id FROM public.players p WHERE p.user_id = v_user_id
    ));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  RETURN QUERY

    -- ── court_bookings (solicitudes + confirmadas) ────────────────────────
    SELECT
      cb.id                                                           AS slot_id,
      CASE cb.status
        WHEN 'requested' THEN 'booking_requested'
        ELSE 'booking_confirmed'
      END                                                             AS slot_type,
      cb.court_id,
      cc.name                                                         AS court_name,
      cb.start_at,
      cb.end_at,
      cb.id                                                           AS entity_id,
      NULL::text                                                      AS entity_name,
      cb.match_id,
      NULL::text                                                      AS team_a,
      NULL::text                                                      AS team_b,
      p.display_name                                                  AS requester_name,
      cb.note,
      cb.status::text                                                 AS booking_status
    FROM public.court_bookings cb
    JOIN public.club_courts   cc ON cc.id = cb.court_id
    LEFT JOIN public.players  p  ON p.id  = cb.requested_by_player_id
    WHERE cb.club_id           = p_club_id
      AND cb.status IN ('requested', 'confirmed')
      AND cb.start_at          < p_to
      AND cb.end_at            > p_from

  UNION ALL

    -- ── league_matches con cancha y horario asignados ──────────────────────
    SELECT
      lm.id                                                           AS slot_id,
      'league_match'                                                  AS slot_type,
      lm.court_id,
      cc.name                                                         AS court_name,
      lm.scheduled_at                                                 AS start_at,
      lm.scheduled_at
        + (COALESCE(cc.slot_interval_minutes, 90) * INTERVAL '1 minute') AS end_at,
      lm.id                                                           AS entity_id,
      cl.name                                                         AS entity_name,
      lm.match_id,
      COALESCE(pa1.display_name, '?') || ' / ' || COALESCE(pa2.display_name, '?') AS team_a,
      COALESCE(pb1.display_name, '?') || ' / ' || COALESCE(pb2.display_name, '?') AS team_b,
      NULL::text                                                      AS requester_name,
      NULL::text                                                      AS note,
      NULL::text                                                      AS booking_status
    FROM public.league_matches   lm
    JOIN public.club_courts      cc  ON cc.id  = lm.court_id
    JOIN public.league_groups    lg  ON lg.id  = lm.group_id
    JOIN public.league_divisions ld  ON ld.id  = lg.division_id
    JOIN public.club_leagues     cl  ON cl.id  = ld.league_id
    JOIN public.league_teams     ta  ON ta.id  = lm.team_a_id
    JOIN public.league_teams     tb  ON tb.id  = lm.team_b_id
    LEFT JOIN public.players     pa1 ON pa1.id = ta.player_id_a
    LEFT JOIN public.players     pa2 ON pa2.id = ta.player_id_b
    LEFT JOIN public.players     pb1 ON pb1.id = tb.player_id_a
    LEFT JOIN public.players     pb2 ON pb2.id = tb.player_id_b
    WHERE cl.club_id             = p_club_id
      AND lm.court_id            IS NOT NULL
      AND lm.scheduled_at        IS NOT NULL
      AND lm.scheduled_at        < p_to
      AND (lm.scheduled_at
        + (COALESCE(cc.slot_interval_minutes, 90) * INTERVAL '1 minute')) > p_from

  UNION ALL

    -- ── tournament_matches con cancha y horario asignados ─────────────────
    SELECT
      tm.id                                                           AS slot_id,
      'tournament_match'                                              AS slot_type,
      tm.court_id,
      cc.name                                                         AS court_name,
      tm.scheduled_at                                                 AS start_at,
      tm.scheduled_at
        + (COALESCE(cc.slot_interval_minutes, 90) * INTERVAL '1 minute') AS end_at,
      tm.id                                                           AS entity_id,
      ct.name                                                         AS entity_name,
      tm.match_id,
      COALESCE(pa1.display_name, '?') || ' / ' || COALESCE(pa2.display_name, '?') AS team_a,
      COALESCE(pb1.display_name, '?') || ' / ' || COALESCE(pb2.display_name, '?') AS team_b,
      NULL::text                                                      AS requester_name,
      NULL::text                                                      AS note,
      NULL::text                                                      AS booking_status
    FROM public.tournament_matches  tm
    JOIN public.club_courts         cc  ON cc.id  = tm.court_id
    JOIN public.tournament_groups   tg  ON tg.id  = tm.group_id
    JOIN public.club_tournaments    ct  ON ct.id  = tg.tournament_id
    JOIN public.tournament_teams    ta  ON ta.id  = tm.team_a_id
    JOIN public.tournament_teams    tb  ON tb.id  = tm.team_b_id
    LEFT JOIN public.players        pa1 ON pa1.id = ta.player_id_a
    LEFT JOIN public.players        pa2 ON pa2.id = ta.player_id_b
    LEFT JOIN public.players        pb1 ON pb1.id = tb.player_id_a
    LEFT JOIN public.players        pb2 ON pb2.id = tb.player_id_b
    WHERE ct.club_id             = p_club_id
      AND tm.court_id            IS NOT NULL
      AND tm.scheduled_at        IS NOT NULL
      AND tm.scheduled_at        < p_to
      AND (tm.scheduled_at
        + (COALESCE(cc.slot_interval_minutes, 90) * INTERVAL '1 minute')) > p_from

  ORDER BY start_at, court_id;

END;
$$;

GRANT EXECUTE ON FUNCTION public.club_get_agenda_slots(uuid, timestamptz, timestamptz)
  TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 2. club_cancel_booking
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.club_cancel_booking(
  p_booking_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_booking record;
BEGIN
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

  -- Verificar que el usuario es dueño del club (claimed_by OR owner_player_id)
  PERFORM 1
  FROM public.clubs c
  WHERE c.id           = v_booking.club_id
    AND c.deleted_at   IS NULL
    AND c.claim_status = 'claimed'
    AND (c.claimed_by = v_uid OR c.owner_player_id IN (
      SELECT p.id FROM public.players p WHERE p.user_id = v_uid
    ));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  IF v_booking.status NOT IN ('requested', 'confirmed') THEN
    RAISE EXCEPTION 'BOOKING_NOT_CANCELLABLE';
  END IF;

  UPDATE public.court_bookings
     SET status     = 'cancelled',
         updated_at = now()
   WHERE id = p_booking_id;

  RETURN p_booking_id;
END;
$$;

REVOKE ALL ON FUNCTION public.club_cancel_booking(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_cancel_booking(uuid) TO authenticated;

-- ────────────────────────────────────────────────────────────
-- 3. club_create_confirmed_booking_match
-- ────────────────────────────────────────────────────────────
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
    AND (c.claimed_by = v_uid OR c.owner_player_id IN (
      SELECT p.id FROM public.players p WHERE p.user_id = v_uid
    ))
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

NOTIFY pgrst, 'reload schema';

-- Fix: todos los RPCs de gestión de club aceptan owner_player_id
-- además de claimed_by para soportar el rol club_owner en players.
--
-- Patrón aplicado en checks de autorización:
--   BEFORE: AND c.claimed_by = v_uid
--   AFTER:  AND (c.claimed_by = v_uid OR c.owner_player_id IN (
--             SELECT p.id FROM public.players p WHERE p.user_id = v_uid
--           ))

-- ─── 1. club_get_dashboard_stats ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.club_get_dashboard_stats(
  p_club_id uuid DEFAULT NULL
)
RETURNS TABLE (
  club_id uuid,
  matches_last_7_days integer,
  matches_last_30_days integer,
  unique_players_last_30_days integer,
  matches_by_weekday jsonb,
  matches_by_hour jsonb,
  top_players jsonb,
  matches_by_category jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_club_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF p_club_id IS NULL THEN
    SELECT c.id
      INTO v_club_id
    FROM public.clubs c
    WHERE c.deleted_at IS NULL
      AND c.claim_status = 'claimed'
      AND (c.claimed_by = v_uid OR c.owner_player_id IN (
        SELECT p.id FROM public.players p WHERE p.user_id = v_uid
      ))
    ORDER BY c.claimed_at DESC NULLS LAST, c.created_at DESC
    LIMIT 1;
  ELSE
    SELECT c.id
      INTO v_club_id
    FROM public.clubs c
    WHERE c.id = p_club_id
      AND c.deleted_at IS NULL
      AND c.claim_status = 'claimed'
      AND (c.claimed_by = v_uid OR c.owner_player_id IN (
        SELECT p.id FROM public.players p WHERE p.user_id = v_uid
      ))
    LIMIT 1;
  END IF;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'CLUB_NOT_FOUND';
  END IF;

  RETURN QUERY
  WITH club_matches_base AS (
    SELECT m.id, m.match_at
    FROM public.matches m
    WHERE m.deleted_at IS NULL
      AND m.club_id = v_club_id
      AND EXISTS (
        SELECT 1
        FROM public.match_results mr
        WHERE mr.match_id = m.id
      )
  ),
  club_matches_30 AS (
    SELECT *
    FROM club_matches_base
    WHERE match_at >= now() - interval '30 days'
  ),
  player_activity_30 AS (
    SELECT
      mp.player_id,
      p.display_name,
      p.category,
      COUNT(DISTINCT m30.id)::int AS matches_count
    FROM club_matches_30 m30
    JOIN public.match_players mp ON mp.match_id = m30.id
    JOIN public.players p ON p.id = mp.player_id AND p.deleted_at IS NULL
    GROUP BY mp.player_id, p.display_name, p.category
  ),
  weekday_counts AS (
    SELECT EXTRACT(DOW FROM m30.match_at)::int AS dow, COUNT(*)::int AS matches_count
    FROM club_matches_30 m30
    GROUP BY 1
  ),
  hour_counts AS (
    SELECT EXTRACT(HOUR FROM (m30.match_at AT TIME ZONE 'America/Argentina/Buenos_Aires'))::int AS hour_of_day,
           COUNT(*)::int AS matches_count
    FROM club_matches_30 m30
    GROUP BY 1
  ),
  category_counts AS (
    SELECT COALESCE(NULLIF(TRIM(pa.category), ''), 'Sin categoria') AS category_label,
           SUM(pa.matches_count)::int AS appearances
    FROM player_activity_30 pa
    GROUP BY 1
  )
  SELECT
    v_club_id AS club_id,
    (SELECT COUNT(*)::int FROM club_matches_base WHERE match_at >= now() - interval '7 days'),
    (SELECT COUNT(*)::int FROM club_matches_30),
    (SELECT COUNT(DISTINCT mp.player_id)::int FROM club_matches_30 m30 JOIN public.match_players mp ON mp.match_id = m30.id),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('dow',d.dow,'label',d.label,'count',COALESCE(wc.matches_count,0)) ORDER BY d.dow) FROM (VALUES(0,'Dom'),(1,'Lun'),(2,'Mar'),(3,'Mie'),(4,'Jue'),(5,'Vie'),(6,'Sab')) AS d(dow,label) LEFT JOIN weekday_counts wc ON wc.dow=d.dow),'[]'::jsonb),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('hour',h.hour_of_day,'count',COALESCE(hc.matches_count,0)) ORDER BY h.hour_of_day) FROM generate_series(0,23) AS h(hour_of_day) LEFT JOIN hour_counts hc ON hc.hour_of_day=h.hour_of_day),'[]'::jsonb),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('player_id',t.player_id,'display_name',t.display_name,'matches_count',t.matches_count) ORDER BY t.matches_count DESC,t.display_name ASC) FROM (SELECT pa.player_id,pa.display_name,pa.matches_count FROM player_activity_30 pa ORDER BY pa.matches_count DESC,pa.display_name ASC LIMIT 10) t),'[]'::jsonb),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('category',cc.category_label,'count',cc.appearances) ORDER BY cc.appearances DESC,cc.category_label ASC) FROM category_counts cc),'[]'::jsonb);
END;
$$;

-- ─── 2. club_upsert_booking_settings ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.club_upsert_booking_settings(
  p_club_id uuid,
  p_timezone text DEFAULT 'America/Argentina/Buenos_Aires',
  p_slot_duration_minutes int DEFAULT 90,
  p_buffer_minutes int DEFAULT 0,
  p_opening_hours jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_owner boolean;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = p_club_id AND c.deleted_at IS NULL AND c.archived_at IS NULL
      AND c.merged_into IS NULL AND c.claim_status = 'claimed'
      AND (c.claimed_by = v_uid OR c.owner_player_id IN (
        SELECT p.id FROM public.players p WHERE p.user_id = v_uid
      ))
  ) INTO v_owner;

  IF NOT COALESCE(v_owner, false) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  IF COALESCE(p_slot_duration_minutes, 0) <= 0 OR p_slot_duration_minutes > 240 THEN
    RAISE EXCEPTION 'INVALID_SLOT_DURATION';
  END IF;
  IF COALESCE(p_buffer_minutes, -1) < 0 OR p_buffer_minutes > 120 THEN
    RAISE EXCEPTION 'INVALID_BUFFER';
  END IF;

  INSERT INTO public.club_booking_settings (
    club_id, timezone, slot_duration_minutes, buffer_minutes, opening_hours, updated_at
  ) VALUES (
    p_club_id,
    COALESCE(NULLIF(TRIM(p_timezone), ''), 'America/Argentina/Buenos_Aires'),
    p_slot_duration_minutes, p_buffer_minutes,
    COALESCE(p_opening_hours, '{}'::jsonb), now()
  )
  ON CONFLICT (club_id) DO UPDATE
    SET timezone = EXCLUDED.timezone,
        slot_duration_minutes = EXCLUDED.slot_duration_minutes,
        buffer_minutes = EXCLUDED.buffer_minutes,
        opening_hours = EXCLUDED.opening_hours,
        updated_at = now();

  RETURN p_club_id;
END;
$$;

-- ─── 3. club_create_court ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.club_create_court(
  p_club_id uuid,
  p_name text,
  p_surface_type text DEFAULT 'synthetic',
  p_is_indoor boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_owner boolean;
  v_name text;
  v_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = p_club_id AND c.deleted_at IS NULL AND c.archived_at IS NULL
      AND c.merged_into IS NULL AND c.claim_status = 'claimed'
      AND (c.claimed_by = v_uid OR c.owner_player_id IN (
        SELECT p.id FROM public.players p WHERE p.user_id = v_uid
      ))
  ) INTO v_owner;

  IF NOT COALESCE(v_owner, false) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  v_name := NULLIF(TRIM(p_name), '');
  IF v_name IS NULL THEN RAISE EXCEPTION 'COURT_NAME_REQUIRED'; END IF;

  IF COALESCE(p_surface_type, '') NOT IN ('synthetic', 'hard', 'clay', 'other') THEN
    RAISE EXCEPTION 'INVALID_SURFACE_TYPE';
  END IF;

  INSERT INTO public.club_courts (club_id, name, surface_type, is_indoor, active, updated_at)
  VALUES (p_club_id, v_name, p_surface_type, COALESCE(p_is_indoor, false), true, now())
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ─── 4. club_update_court ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.club_update_court(
  p_court_id uuid,
  p_name text DEFAULT NULL,
  p_surface_type text DEFAULT NULL,
  p_is_indoor boolean DEFAULT NULL,
  p_active boolean DEFAULT NULL
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
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT cc.id, cc.club_id INTO v_court
  FROM public.club_courts cc WHERE cc.id = p_court_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'COURT_NOT_FOUND'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = v_court.club_id AND c.deleted_at IS NULL AND c.archived_at IS NULL
      AND c.merged_into IS NULL AND c.claim_status = 'claimed'
      AND (c.claimed_by = v_uid OR c.owner_player_id IN (
        SELECT p.id FROM public.players p WHERE p.user_id = v_uid
      ))
  ) INTO v_owner;

  IF NOT COALESCE(v_owner, false) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  IF p_surface_type IS NOT NULL AND p_surface_type NOT IN ('synthetic', 'hard', 'clay', 'other') THEN
    RAISE EXCEPTION 'INVALID_SURFACE_TYPE';
  END IF;

  UPDATE public.club_courts
  SET name = COALESCE(NULLIF(TRIM(p_name), ''), name),
      surface_type = COALESCE(p_surface_type, surface_type),
      is_indoor = COALESCE(p_is_indoor, is_indoor),
      active = COALESCE(p_active, active),
      updated_at = now()
  WHERE id = p_court_id;

  RETURN p_court_id;
END;
$$;

-- ─── 5. club_confirm_booking ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.club_confirm_booking(
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
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT b.* INTO v_booking FROM public.court_bookings b WHERE b.id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = v_booking.club_id AND c.deleted_at IS NULL AND c.archived_at IS NULL
      AND c.merged_into IS NULL AND c.claim_status = 'claimed'
      AND (c.claimed_by = v_uid OR c.owner_player_id IN (
        SELECT p.id FROM public.players p WHERE p.user_id = v_uid
      ))
  ) INTO v_owner;

  IF NOT COALESCE(v_owner, false) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  IF v_booking.status <> 'requested' THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.court_bookings b2
    WHERE b2.court_id = v_booking.court_id AND b2.id <> v_booking.id
      AND b2.status = 'confirmed'
      AND v_booking.start_at < b2.end_at AND v_booking.end_at > b2.start_at
  ) THEN
    RAISE EXCEPTION 'BOOKING_OVERLAP';
  END IF;

  UPDATE public.court_bookings
  SET status = 'confirmed', rejection_reason = NULL, updated_at = now()
  WHERE id = p_booking_id;

  RETURN p_booking_id;
END;
$$;

-- ─── 6. club_reject_booking ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.club_reject_booking(
  p_booking_id uuid,
  p_reason text DEFAULT NULL
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
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT b.* INTO v_booking FROM public.court_bookings b WHERE b.id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = v_booking.club_id AND c.deleted_at IS NULL AND c.archived_at IS NULL
      AND c.merged_into IS NULL AND c.claim_status = 'claimed'
      AND (c.claimed_by = v_uid OR c.owner_player_id IN (
        SELECT p.id FROM public.players p WHERE p.user_id = v_uid
      ))
  ) INTO v_owner;

  IF NOT COALESCE(v_owner, false) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  IF v_booking.status <> 'requested' THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;

  UPDATE public.court_bookings
  SET status = 'rejected',
      rejection_reason = NULLIF(TRIM(p_reason), ''),
      updated_at = now()
  WHERE id = p_booking_id;

  RETURN p_booking_id;
END;
$$;

-- ─── 7. club_confirm_booking_and_create_match ─────────────────────────────────

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
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT b.* INTO v_booking FROM public.court_bookings b WHERE b.id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = v_booking.club_id AND c.deleted_at IS NULL AND c.archived_at IS NULL
      AND c.merged_into IS NULL AND c.claim_status = 'claimed'
      AND (c.claimed_by = v_uid OR c.owner_player_id IN (
        SELECT p.id FROM public.players p WHERE p.user_id = v_uid
      ))
  ) INTO v_owner;

  IF NOT COALESCE(v_owner, false) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  IF v_booking.status NOT IN ('requested', 'confirmed') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;

  IF v_booking.status = 'requested' THEN
    IF EXISTS (
      SELECT 1 FROM public.court_bookings b2
      WHERE b2.court_id = v_booking.court_id AND b2.id <> v_booking.id
        AND b2.status = 'confirmed'
        AND v_booking.start_at < b2.end_at AND v_booking.end_at > b2.start_at
    ) THEN
      RAISE EXCEPTION 'BOOKING_OVERLAP';
    END IF;
    UPDATE public.court_bookings
    SET status = 'confirmed', rejection_reason = NULL, updated_at = now()
    WHERE id = p_booking_id;
  END IF;

  IF v_booking.match_id IS NOT NULL THEN RETURN v_booking.match_id; END IF;

  SELECT c.name INTO v_club_name
  FROM public.clubs c
  WHERE c.id = v_booking.club_id AND c.deleted_at IS NULL
    AND c.archived_at IS NULL AND c.merged_into IS NULL
  LIMIT 1;

  IF v_club_name IS NULL THEN RAISE EXCEPTION 'CLUB_NOT_FOUND'; END IF;

  INSERT INTO public.matches (
    match_at, club_name, club_name_raw, club_id, status, notes, max_players, created_by
  ) VALUES (
    v_booking.start_at, v_club_name, v_club_name, v_booking.club_id,
    CASE WHEN v_booking.start_at < now() THEN 'completed'::public.match_status
         ELSE 'scheduled'::public.match_status END,
    CONCAT('Creado desde reserva #', v_booking.id::text),
    4, v_uid
  )
  RETURNING id INTO v_match_id;

  UPDATE public.court_bookings SET match_id = v_match_id, updated_at = now() WHERE id = p_booking_id;

  RETURN v_match_id;
END;
$$;

-- ─── 8. club_set_court_schedule ───────────────────────────────────────────────

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
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  IF p_opening_time IS NULL OR p_closing_time IS NULL OR p_closing_time <= p_opening_time THEN
    RAISE EXCEPTION 'INVALID_COURT_HOURS';
  END IF;
  IF p_slot_interval_minutes IS NOT NULL AND (p_slot_interval_minutes < 30 OR p_slot_interval_minutes > 240) THEN
    RAISE EXCEPTION 'INVALID_SLOT_DURATION';
  END IF;

  SELECT cc.id, cc.club_id INTO v_court
  FROM public.club_courts cc WHERE cc.id = p_court_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'COURT_NOT_FOUND'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = v_court.club_id AND c.deleted_at IS NULL AND c.archived_at IS NULL
      AND c.merged_into IS NULL AND c.claim_status = 'claimed'
      AND (c.claimed_by = v_uid OR c.owner_player_id IN (
        SELECT p.id FROM public.players p WHERE p.user_id = v_uid
      ))
  ) INTO v_owner;

  IF NOT COALESCE(v_owner, false) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  UPDATE public.club_courts
  SET opening_time = p_opening_time, closing_time = p_closing_time,
      slot_interval_minutes = p_slot_interval_minutes, updated_at = now()
  WHERE id = p_court_id;

  RETURN p_court_id;
END;
$$;

-- ─── 9. club_recalculate_rankings ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.club_recalculate_rankings(
  p_club_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_is_owner boolean;
  v_is_admin boolean;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = p_club_id AND c.deleted_at IS NULL
      AND c.archived_at IS NULL AND c.merged_into IS NULL
  ) THEN
    RAISE EXCEPTION 'CLUB_NOT_FOUND';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = p_club_id AND c.claim_status = 'claimed'
      AND c.deleted_at IS NULL AND c.archived_at IS NULL AND c.merged_into IS NULL
      AND (c.claimed_by = v_uid OR c.owner_player_id IN (
        SELECT p.id FROM public.players p WHERE p.user_id = v_uid
      ))
  ) INTO v_is_owner;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v_uid AND p.role = 'admin'
  ) INTO v_is_admin;

  IF NOT COALESCE(v_is_owner, false) AND NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  DELETE FROM public.player_club_stats WHERE club_id = p_club_id;

  INSERT INTO public.player_club_stats (
    club_id, player_id, matches_played, wins, losses,
    sets_won, sets_lost, points, last_match_at, updated_at
  )
  WITH valid_matches AS (
    SELECT m.id AS match_id, m.club_id, m.match_at, mr.winner_team, mr.sets
    FROM public.matches m
    JOIN public.match_results mr ON mr.match_id = m.id
    WHERE m.club_id = p_club_id AND m.status = 'completed'
      AND mr.winner_team IS NOT NULL AND mr.sets IS NOT NULL
      AND jsonb_typeof(mr.sets) = 'array' AND jsonb_array_length(mr.sets) > 0
  ),
  participant_rows AS (
    SELECT vm.club_id, vm.match_id, vm.match_at, mp.player_id, mp.team, vm.winner_team, vm.sets
    FROM valid_matches vm
    JOIN public.match_players mp ON mp.match_id = vm.match_id
  ),
  set_rows AS (
    SELECT pr.club_id, pr.match_id, pr.player_id, pr.team, pr.match_at, pr.winner_team,
      NULLIF(regexp_replace(COALESCE(s.set_json->>'team_a_games', s.set_json->>'a', ''), '[^0-9-]', '', 'g'), '')::int AS team_a_games,
      NULLIF(regexp_replace(COALESCE(s.set_json->>'team_b_games', s.set_json->>'b', ''), '[^0-9-]', '', 'g'), '')::int AS team_b_games
    FROM participant_rows pr
    CROSS JOIN LATERAL jsonb_array_elements(pr.sets) AS s(set_json)
  ),
  set_stats AS (
    SELECT sr.club_id, sr.match_id, sr.player_id,
      SUM(CASE WHEN sr.team_a_games IS NULL OR sr.team_b_games IS NULL THEN 0
               WHEN sr.team = 'A' AND sr.team_a_games > sr.team_b_games THEN 1
               WHEN sr.team = 'B' AND sr.team_b_games > sr.team_a_games THEN 1 ELSE 0 END)::bigint AS sets_won,
      SUM(CASE WHEN sr.team_a_games IS NULL OR sr.team_b_games IS NULL THEN 0
               WHEN sr.team = 'A' AND sr.team_a_games < sr.team_b_games THEN 1
               WHEN sr.team = 'B' AND sr.team_b_games < sr.team_a_games THEN 1 ELSE 0 END)::bigint AS sets_lost
    FROM set_rows sr
    GROUP BY sr.club_id, sr.match_id, sr.player_id
  ),
  aggregated AS (
    SELECT pr.club_id, pr.player_id,
      COUNT(*)::bigint AS matches_played,
      SUM(CASE WHEN pr.team = pr.winner_team THEN 1 ELSE 0 END)::bigint AS wins,
      SUM(CASE WHEN pr.team <> pr.winner_team THEN 1 ELSE 0 END)::bigint AS losses,
      COALESCE(SUM(ss.sets_won), 0)::bigint AS sets_won,
      COALESCE(SUM(ss.sets_lost), 0)::bigint AS sets_lost,
      MAX(pr.match_at) AS last_match_at
    FROM participant_rows pr
    LEFT JOIN set_stats ss ON ss.club_id = pr.club_id AND ss.match_id = pr.match_id AND ss.player_id = pr.player_id
    GROUP BY pr.club_id, pr.player_id
  )
  SELECT a.club_id, a.player_id, a.matches_played, a.wins, a.losses,
         a.sets_won, a.sets_lost, (a.wins * 3 + a.losses * 1)::bigint AS points,
         a.last_match_at, now() AS updated_at
  FROM aggregated a
  WHERE a.matches_played > 0;
END;
$$;

-- ─── 10. club_create_match (Patrón B — resolución interna) ───────────────────

DROP FUNCTION IF EXISTS public.club_create_match(timestamptz, int, text);

CREATE OR REPLACE FUNCTION public.club_create_match(
  p_match_at timestamptz,
  p_max_players int DEFAULT 4,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_club record;
  v_match_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  IF p_match_at IS NULL THEN RAISE EXCEPTION 'INVALID_MATCH_AT'; END IF;
  IF p_max_players IS NULL OR p_max_players < 2 OR p_max_players > 4 THEN
    RAISE EXCEPTION 'INVALID_MAX_PLAYERS';
  END IF;

  SELECT c.id, c.name INTO v_club
  FROM public.clubs c
  WHERE c.deleted_at IS NULL AND c.claim_status = 'claimed'
    AND (c.claimed_by = v_uid OR c.owner_player_id IN (
      SELECT p.id FROM public.players p WHERE p.user_id = v_uid
    ))
  ORDER BY c.claimed_at DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN RAISE EXCEPTION 'CLUB_NOT_FOUND'; END IF;

  INSERT INTO public.matches (match_at, club_name, club_id, max_players, notes, status, created_by)
  VALUES (p_match_at, v_club.name, v_club.id, p_max_players,
          NULLIF(TRIM(COALESCE(p_notes, '')), ''), 'scheduled', v_uid)
  RETURNING id INTO v_match_id;

  RETURN v_match_id;
END;
$$;

REVOKE ALL ON FUNCTION public.club_create_match(timestamptz, int, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_create_match(timestamptz, int, text) TO authenticated;

-- ─── 11. club_create_match_with_players (Patrón B — resolución interna) ──────

DROP FUNCTION IF EXISTS public.club_create_match_with_players(timestamptz, uuid, uuid, uuid, uuid, text, integer);

CREATE OR REPLACE FUNCTION public.club_create_match_with_players(
  p_match_at timestamptz,
  p_player_a1_id uuid,
  p_player_a2_id uuid,
  p_player_b1_id uuid,
  p_player_b2_id uuid,
  p_notes text DEFAULT NULL,
  p_max_players integer DEFAULT 4
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_club record;
  v_match_id uuid;
  v_ids uuid[];
  v_status public.match_status;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  IF p_match_at IS NULL THEN RAISE EXCEPTION 'INVALID_MATCH_AT'; END IF;
  IF p_max_players IS NULL OR p_max_players < 2 OR p_max_players > 4 THEN
    RAISE EXCEPTION 'INVALID_MAX_PLAYERS';
  END IF;

  SELECT c.id, c.name INTO v_club
  FROM public.clubs c
  WHERE c.deleted_at IS NULL AND c.claim_status = 'claimed'
    AND (c.claimed_by = v_uid OR c.owner_player_id IN (
      SELECT p.id FROM public.players p WHERE p.user_id = v_uid
    ))
  ORDER BY c.claimed_at DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN RAISE EXCEPTION 'CLUB_NOT_FOUND'; END IF;

  v_ids := ARRAY[p_player_a1_id, p_player_a2_id, p_player_b1_id, p_player_b2_id];
  IF (SELECT count(DISTINCT x) FROM unnest(v_ids) AS x) <> 4 THEN
    RAISE EXCEPTION 'DUPLICATE_PLAYERS';
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(v_ids) AS pid
    LEFT JOIN public.players p ON p.id = pid
    WHERE p.id IS NULL OR p.deleted_at IS NOT NULL OR p.status <> 'active'
  ) THEN
    RAISE EXCEPTION 'PLAYER_NOT_FOUND';
  END IF;

  v_status := CASE WHEN p_match_at < now() THEN 'completed'::public.match_status
                   ELSE 'scheduled'::public.match_status END;

  INSERT INTO public.matches (match_at, club_name, club_id, status, notes, max_players, created_by)
  VALUES (p_match_at, v_club.name, v_club.id, v_status,
          NULLIF(TRIM(COALESCE(p_notes, '')), ''), p_max_players, v_uid)
  RETURNING id INTO v_match_id;

  INSERT INTO public.match_players (match_id, player_id, team) VALUES
    (v_match_id, p_player_a1_id, 'A'),
    (v_match_id, p_player_a2_id, 'A'),
    (v_match_id, p_player_b1_id, 'B'),
    (v_match_id, p_player_b2_id, 'B');

  RETURN v_match_id;
END;
$$;

REVOKE ALL ON FUNCTION public.club_create_match_with_players(timestamptz, uuid, uuid, uuid, uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_create_match_with_players(timestamptz, uuid, uuid, uuid, uuid, text, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- STAGE Q6.1: Playoffs for leagues (quarter/semi/final)
-- Generates bracket from group standings and allows scheduling/result workflow.

BEGIN;

CREATE TABLE IF NOT EXISTS public.league_playoff_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id uuid NOT NULL REFERENCES public.league_divisions(id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN ('quarterfinal', 'semifinal', 'final')),
  stage_order int NOT NULL,
  match_order int NOT NULL,
  team_a_id uuid NULL REFERENCES public.league_teams(id) ON DELETE SET NULL,
  team_b_id uuid NULL REFERENCES public.league_teams(id) ON DELETE SET NULL,
  winner_team_id uuid NULL REFERENCES public.league_teams(id) ON DELETE SET NULL,
  source_match_a_id uuid NULL REFERENCES public.league_playoff_matches(id) ON DELETE SET NULL,
  source_match_b_id uuid NULL REFERENCES public.league_playoff_matches(id) ON DELETE SET NULL,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  scheduled_at timestamptz NULL,
  court_id uuid NULL REFERENCES public.club_courts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_league_playoff_div_stage_order
  ON public.league_playoff_matches(division_id, stage, match_order);

CREATE UNIQUE INDEX IF NOT EXISTS uq_league_playoff_match_id
  ON public.league_playoff_matches(match_id);

CREATE INDEX IF NOT EXISTS idx_league_playoff_div_stage
  ON public.league_playoff_matches(division_id, stage_order, match_order, created_at);

ALTER TABLE public.league_playoff_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS league_playoff_matches_select_authenticated ON public.league_playoff_matches;
CREATE POLICY league_playoff_matches_select_authenticated
  ON public.league_playoff_matches
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.league_divisions d
      JOIN public.club_leagues l ON l.id = d.league_id
      WHERE d.id = league_playoff_matches.division_id
        AND (
          l.status = 'active'
          OR public.q6_can_manage_club(l.club_id, auth.uid())
        )
    )
  );

CREATE OR REPLACE FUNCTION public.club_sync_playoff_match_players(
  p_playoff_match_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_playoff record;
BEGIN
  SELECT
    pm.id,
    pm.match_id,
    pm.team_a_id,
    pm.team_b_id
  INTO v_playoff
  FROM public.league_playoff_matches pm
  WHERE pm.id = p_playoff_match_id;

  IF v_playoff.id IS NULL THEN
    RAISE EXCEPTION 'PLAYOFF_MATCH_NOT_FOUND';
  END IF;

  DELETE FROM public.match_players
  WHERE match_id = v_playoff.match_id;

  IF v_playoff.team_a_id IS NOT NULL THEN
    INSERT INTO public.match_players (match_id, player_id, team)
    SELECT v_playoff.match_id, t.player_id_a, 'A'
    FROM public.league_teams t
    WHERE t.id = v_playoff.team_a_id;

    INSERT INTO public.match_players (match_id, player_id, team)
    SELECT v_playoff.match_id, t.player_id_b, 'A'
    FROM public.league_teams t
    WHERE t.id = v_playoff.team_a_id;
  END IF;

  IF v_playoff.team_b_id IS NOT NULL THEN
    INSERT INTO public.match_players (match_id, player_id, team)
    SELECT v_playoff.match_id, t.player_id_a, 'B'
    FROM public.league_teams t
    WHERE t.id = v_playoff.team_b_id;

    INSERT INTO public.match_players (match_id, player_id, team)
    SELECT v_playoff.match_id, t.player_id_b, 'B'
    FROM public.league_teams t
    WHERE t.id = v_playoff.team_b_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.club_generate_division_playoffs(
  p_division_id uuid
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_club_id uuid;
  v_league_status text;
  v_group_orders int[];
  v_group_count int;
  v_created int := 0;
  v_group record;
  v_total_matches int;
  v_completed_matches int;
  v_added int;
  v_match_id uuid;
  v_playoff_id uuid;
  v_qf1 uuid;
  v_qf2 uuid;
  v_qf3 uuid;
  v_qf4 uuid;
  v_sf1 uuid;
  v_sf2 uuid;
  v_final uuid;
  v_g1_r1 uuid;
  v_g1_r2 uuid;
  v_g2_r1 uuid;
  v_g2_r2 uuid;
  v_g3_r1 uuid;
  v_g3_r2 uuid;
  v_g4_r1 uuid;
  v_g4_r2 uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT l.club_id, l.status
    INTO v_club_id, v_league_status
  FROM public.league_divisions d
  JOIN public.club_leagues l ON l.id = d.league_id
  WHERE d.id = p_division_id;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'DIVISION_NOT_FOUND';
  END IF;

  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  IF v_league_status = 'finished' THEN
    RAISE EXCEPTION 'LEAGUE_ALREADY_FINISHED';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.league_playoff_matches pm
    WHERE pm.division_id = p_division_id
  ) THEN
    RAISE EXCEPTION 'PLAYOFF_ALREADY_EXISTS';
  END IF;

  SELECT ARRAY_AGG(g.sort_order ORDER BY g.sort_order)
    INTO v_group_orders
  FROM public.league_groups g
  WHERE g.division_id = p_division_id;

  v_group_count := COALESCE(array_length(v_group_orders, 1), 0);
  IF v_group_count NOT IN (1, 2, 4) THEN
    RAISE EXCEPTION 'UNSUPPORTED_GROUP_COUNT_FOR_PLAYOFF'
      USING DETAIL = CONCAT('Cantidad de grupos detectada: ', v_group_count::text),
            HINT = 'Playoffs MVP soporta divisiones con 1, 2 o 4 grupos.';
  END IF;

  CREATE TEMP TABLE tmp_q6_playoff_qualifiers (
    group_sort int NOT NULL,
    group_name text NOT NULL,
    rank_in_group int NOT NULL,
    team_id uuid NOT NULL
  ) ON COMMIT DROP;

  FOR v_group IN
    SELECT g.id, g.name, g.sort_order
    FROM public.league_groups g
    WHERE g.division_id = p_division_id
    ORDER BY g.sort_order
  LOOP
    SELECT COUNT(*)::int
      INTO v_total_matches
    FROM public.league_matches lm
    WHERE lm.group_id = v_group.id;

    IF COALESCE(v_total_matches, 0) = 0 THEN
      RAISE EXCEPTION 'NO_FIXTURE_FOR_GROUP'
        USING DETAIL = CONCAT('Grupo ', v_group.name, ' sin fixture.');
    END IF;

    SELECT COUNT(*)::int
      INTO v_completed_matches
    FROM public.league_matches lm
    JOIN public.matches m ON m.id = lm.match_id
    JOIN public.match_results mr ON mr.match_id = m.id
    WHERE lm.group_id = v_group.id
      AND m.status = 'completed';

    IF COALESCE(v_completed_matches, 0) < v_total_matches THEN
      RAISE EXCEPTION 'GROUP_STAGE_INCOMPLETE'
        USING DETAIL = CONCAT(
          'Grupo ', v_group.name, ': ', v_completed_matches::text, '/', v_total_matches::text, ' resultados cargados.'
        ),
        HINT = 'Carga todos los resultados de fase de grupos antes de generar playoffs.';
    END IF;

    INSERT INTO tmp_q6_playoff_qualifiers (group_sort, group_name, rank_in_group, team_id)
    SELECT
      v_group.sort_order,
      v_group.name,
      q.rn,
      q.team_id
    FROM (
      SELECT
        t.team_id,
        ROW_NUMBER() OVER (
          ORDER BY t.points DESC, t.wins DESC, t.sets_won DESC, t.sets_lost ASC, t.last_match_at DESC NULLS LAST
        ) AS rn
      FROM public.club_get_group_table(v_group.id) t
    ) q
    WHERE q.rn <= 2;

    GET DIAGNOSTICS v_added = ROW_COUNT;
    IF v_added < 2 THEN
      RAISE EXCEPTION 'NOT_ENOUGH_QUALIFIED_TEAMS'
        USING DETAIL = CONCAT('Grupo ', v_group.name, ' no tiene 2 clasificados.');
    END IF;
  END LOOP;

  IF v_group_count = 1 THEN
    SELECT q.team_id INTO v_g1_r1
    FROM tmp_q6_playoff_qualifiers q
    WHERE q.group_sort = v_group_orders[1] AND q.rank_in_group = 1;
    SELECT q.team_id INTO v_g1_r2
    FROM tmp_q6_playoff_qualifiers q
    WHERE q.group_sort = v_group_orders[1] AND q.rank_in_group = 2;

    INSERT INTO public.matches (
      match_at, club_name, club_name_raw, club_id, status, notes, max_players, created_by, match_source, updated_at
    )
    SELECT now(), c.name, c.name, v_club_id, 'scheduled', 'Playoff - Final', 4, v_uid, 'direct', now()
    FROM public.clubs c
    WHERE c.id = v_club_id
    RETURNING id INTO v_match_id;

    INSERT INTO public.league_playoff_matches (
      division_id, stage, stage_order, match_order, team_a_id, team_b_id, match_id, updated_at
    )
    VALUES (p_division_id, 'final', 3, 1, v_g1_r1, v_g1_r2, v_match_id, now())
    RETURNING id INTO v_final;

    PERFORM public.club_sync_playoff_match_players(v_final);
    v_created := 1;
    RETURN v_created;
  END IF;

  IF v_group_count = 2 THEN
    SELECT q.team_id INTO v_g1_r1 FROM tmp_q6_playoff_qualifiers q WHERE q.group_sort = v_group_orders[1] AND q.rank_in_group = 1;
    SELECT q.team_id INTO v_g1_r2 FROM tmp_q6_playoff_qualifiers q WHERE q.group_sort = v_group_orders[1] AND q.rank_in_group = 2;
    SELECT q.team_id INTO v_g2_r1 FROM tmp_q6_playoff_qualifiers q WHERE q.group_sort = v_group_orders[2] AND q.rank_in_group = 1;
    SELECT q.team_id INTO v_g2_r2 FROM tmp_q6_playoff_qualifiers q WHERE q.group_sort = v_group_orders[2] AND q.rank_in_group = 2;

    INSERT INTO public.matches (
      match_at, club_name, club_name_raw, club_id, status, notes, max_players, created_by, match_source, updated_at
    )
    SELECT now(), c.name, c.name, v_club_id, 'scheduled', 'Playoff - Semifinal 1', 4, v_uid, 'direct', now()
    FROM public.clubs c WHERE c.id = v_club_id
    RETURNING id INTO v_match_id;
    INSERT INTO public.league_playoff_matches (
      division_id, stage, stage_order, match_order, team_a_id, team_b_id, match_id, updated_at
    )
    VALUES (p_division_id, 'semifinal', 2, 1, v_g1_r1, v_g2_r2, v_match_id, now())
    RETURNING id INTO v_sf1;
    PERFORM public.club_sync_playoff_match_players(v_sf1);

    INSERT INTO public.matches (
      match_at, club_name, club_name_raw, club_id, status, notes, max_players, created_by, match_source, updated_at
    )
    SELECT now(), c.name, c.name, v_club_id, 'scheduled', 'Playoff - Semifinal 2', 4, v_uid, 'direct', now()
    FROM public.clubs c WHERE c.id = v_club_id
    RETURNING id INTO v_match_id;
    INSERT INTO public.league_playoff_matches (
      division_id, stage, stage_order, match_order, team_a_id, team_b_id, match_id, updated_at
    )
    VALUES (p_division_id, 'semifinal', 2, 2, v_g2_r1, v_g1_r2, v_match_id, now())
    RETURNING id INTO v_sf2;
    PERFORM public.club_sync_playoff_match_players(v_sf2);

    INSERT INTO public.matches (
      match_at, club_name, club_name_raw, club_id, status, notes, max_players, created_by, match_source, updated_at
    )
    SELECT now(), c.name, c.name, v_club_id, 'scheduled', 'Playoff - Final', 4, v_uid, 'direct', now()
    FROM public.clubs c WHERE c.id = v_club_id
    RETURNING id INTO v_match_id;
    INSERT INTO public.league_playoff_matches (
      division_id, stage, stage_order, match_order, team_a_id, team_b_id, source_match_a_id, source_match_b_id, match_id, updated_at
    )
    VALUES (p_division_id, 'final', 3, 1, NULL, NULL, v_sf1, v_sf2, v_match_id, now())
    RETURNING id INTO v_final;
    PERFORM public.club_sync_playoff_match_players(v_final);

    v_created := 3;
    RETURN v_created;
  END IF;

  SELECT q.team_id INTO v_g1_r1 FROM tmp_q6_playoff_qualifiers q WHERE q.group_sort = v_group_orders[1] AND q.rank_in_group = 1;
  SELECT q.team_id INTO v_g1_r2 FROM tmp_q6_playoff_qualifiers q WHERE q.group_sort = v_group_orders[1] AND q.rank_in_group = 2;
  SELECT q.team_id INTO v_g2_r1 FROM tmp_q6_playoff_qualifiers q WHERE q.group_sort = v_group_orders[2] AND q.rank_in_group = 1;
  SELECT q.team_id INTO v_g2_r2 FROM tmp_q6_playoff_qualifiers q WHERE q.group_sort = v_group_orders[2] AND q.rank_in_group = 2;
  SELECT q.team_id INTO v_g3_r1 FROM tmp_q6_playoff_qualifiers q WHERE q.group_sort = v_group_orders[3] AND q.rank_in_group = 1;
  SELECT q.team_id INTO v_g3_r2 FROM tmp_q6_playoff_qualifiers q WHERE q.group_sort = v_group_orders[3] AND q.rank_in_group = 2;
  SELECT q.team_id INTO v_g4_r1 FROM tmp_q6_playoff_qualifiers q WHERE q.group_sort = v_group_orders[4] AND q.rank_in_group = 1;
  SELECT q.team_id INTO v_g4_r2 FROM tmp_q6_playoff_qualifiers q WHERE q.group_sort = v_group_orders[4] AND q.rank_in_group = 2;

  INSERT INTO public.matches (match_at, club_name, club_name_raw, club_id, status, notes, max_players, created_by, match_source, updated_at)
  SELECT now(), c.name, c.name, v_club_id, 'scheduled', 'Playoff - Cuartos 1', 4, v_uid, 'direct', now()
  FROM public.clubs c WHERE c.id = v_club_id
  RETURNING id INTO v_match_id;
  INSERT INTO public.league_playoff_matches (division_id, stage, stage_order, match_order, team_a_id, team_b_id, match_id, updated_at)
  VALUES (p_division_id, 'quarterfinal', 1, 1, v_g1_r1, v_g4_r2, v_match_id, now())
  RETURNING id INTO v_qf1;
  PERFORM public.club_sync_playoff_match_players(v_qf1);

  INSERT INTO public.matches (match_at, club_name, club_name_raw, club_id, status, notes, max_players, created_by, match_source, updated_at)
  SELECT now(), c.name, c.name, v_club_id, 'scheduled', 'Playoff - Cuartos 2', 4, v_uid, 'direct', now()
  FROM public.clubs c WHERE c.id = v_club_id
  RETURNING id INTO v_match_id;
  INSERT INTO public.league_playoff_matches (division_id, stage, stage_order, match_order, team_a_id, team_b_id, match_id, updated_at)
  VALUES (p_division_id, 'quarterfinal', 1, 2, v_g2_r1, v_g3_r2, v_match_id, now())
  RETURNING id INTO v_qf2;
  PERFORM public.club_sync_playoff_match_players(v_qf2);

  INSERT INTO public.matches (match_at, club_name, club_name_raw, club_id, status, notes, max_players, created_by, match_source, updated_at)
  SELECT now(), c.name, c.name, v_club_id, 'scheduled', 'Playoff - Cuartos 3', 4, v_uid, 'direct', now()
  FROM public.clubs c WHERE c.id = v_club_id
  RETURNING id INTO v_match_id;
  INSERT INTO public.league_playoff_matches (division_id, stage, stage_order, match_order, team_a_id, team_b_id, match_id, updated_at)
  VALUES (p_division_id, 'quarterfinal', 1, 3, v_g3_r1, v_g2_r2, v_match_id, now())
  RETURNING id INTO v_qf3;
  PERFORM public.club_sync_playoff_match_players(v_qf3);

  INSERT INTO public.matches (match_at, club_name, club_name_raw, club_id, status, notes, max_players, created_by, match_source, updated_at)
  SELECT now(), c.name, c.name, v_club_id, 'scheduled', 'Playoff - Cuartos 4', 4, v_uid, 'direct', now()
  FROM public.clubs c WHERE c.id = v_club_id
  RETURNING id INTO v_match_id;
  INSERT INTO public.league_playoff_matches (division_id, stage, stage_order, match_order, team_a_id, team_b_id, match_id, updated_at)
  VALUES (p_division_id, 'quarterfinal', 1, 4, v_g4_r1, v_g1_r2, v_match_id, now())
  RETURNING id INTO v_qf4;
  PERFORM public.club_sync_playoff_match_players(v_qf4);

  INSERT INTO public.matches (match_at, club_name, club_name_raw, club_id, status, notes, max_players, created_by, match_source, updated_at)
  SELECT now(), c.name, c.name, v_club_id, 'scheduled', 'Playoff - Semifinal 1', 4, v_uid, 'direct', now()
  FROM public.clubs c WHERE c.id = v_club_id
  RETURNING id INTO v_match_id;
  INSERT INTO public.league_playoff_matches (
    division_id, stage, stage_order, match_order, team_a_id, team_b_id, source_match_a_id, source_match_b_id, match_id, updated_at
  )
  VALUES (p_division_id, 'semifinal', 2, 1, NULL, NULL, v_qf1, v_qf2, v_match_id, now())
  RETURNING id INTO v_sf1;
  PERFORM public.club_sync_playoff_match_players(v_sf1);

  INSERT INTO public.matches (match_at, club_name, club_name_raw, club_id, status, notes, max_players, created_by, match_source, updated_at)
  SELECT now(), c.name, c.name, v_club_id, 'scheduled', 'Playoff - Semifinal 2', 4, v_uid, 'direct', now()
  FROM public.clubs c WHERE c.id = v_club_id
  RETURNING id INTO v_match_id;
  INSERT INTO public.league_playoff_matches (
    division_id, stage, stage_order, match_order, team_a_id, team_b_id, source_match_a_id, source_match_b_id, match_id, updated_at
  )
  VALUES (p_division_id, 'semifinal', 2, 2, NULL, NULL, v_qf3, v_qf4, v_match_id, now())
  RETURNING id INTO v_sf2;
  PERFORM public.club_sync_playoff_match_players(v_sf2);

  INSERT INTO public.matches (match_at, club_name, club_name_raw, club_id, status, notes, max_players, created_by, match_source, updated_at)
  SELECT now(), c.name, c.name, v_club_id, 'scheduled', 'Playoff - Final', 4, v_uid, 'direct', now()
  FROM public.clubs c WHERE c.id = v_club_id
  RETURNING id INTO v_match_id;
  INSERT INTO public.league_playoff_matches (
    division_id, stage, stage_order, match_order, team_a_id, team_b_id, source_match_a_id, source_match_b_id, match_id, updated_at
  )
  VALUES (p_division_id, 'final', 3, 1, NULL, NULL, v_sf1, v_sf2, v_match_id, now())
  RETURNING id INTO v_final;
  PERFORM public.club_sync_playoff_match_players(v_final);

  v_created := 7;
  RETURN v_created;
END;
$$;

CREATE OR REPLACE FUNCTION public.club_schedule_playoff_match(
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
    pm.id,
    pm.match_id,
    pm.team_a_id,
    pm.team_b_id,
    l.club_id,
    cc.id AS court_id,
    cc.opening_time,
    cc.closing_time,
    COALESCE(cc.slot_interval_minutes, cbs.slot_duration_minutes, 90) AS slot_interval_minutes,
    COALESCE(cbs.timezone, 'America/Argentina/Buenos_Aires') AS timezone
  INTO v_row
  FROM public.league_playoff_matches pm
  JOIN public.league_divisions d ON d.id = pm.division_id
  JOIN public.club_leagues l ON l.id = d.league_id
  JOIN public.club_courts cc ON cc.id = p_court_id AND cc.club_id = l.club_id AND cc.active = true
  LEFT JOIN public.club_booking_settings cbs ON cbs.club_id = l.club_id
  WHERE pm.id = p_playoff_match_id
  FOR UPDATE OF pm;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'PLAYOFF_MATCH_NOT_FOUND';
  END IF;

  IF NOT public.q6_can_manage_club(v_row.club_id, v_uid) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  IF v_row.team_a_id IS NULL OR v_row.team_b_id IS NULL THEN
    RAISE EXCEPTION 'PLAYOFF_TEAMS_NOT_DEFINED';
  END IF;

  PERFORM public.club_sync_playoff_match_players(p_playoff_match_id);

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
    AND COALESCE(m_other.status, 'scheduled'::public.match_status) = 'scheduled'::public.match_status;

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
      'Reserva generada desde Playoffs de Liga',
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

  UPDATE public.league_playoff_matches
  SET scheduled_at = p_match_at,
      court_id = p_court_id,
      updated_at = now()
  WHERE id = p_playoff_match_id;

  RETURN jsonb_build_object(
    'playoff_match_id', p_playoff_match_id,
    'match_id', v_row.match_id,
    'booking_id', v_booking_id,
    'scheduled_at', p_match_at,
    'court_id', p_court_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.club_submit_playoff_match_result(
  p_playoff_match_id uuid,
  p_set1_a int,
  p_set1_b int,
  p_set2_a int,
  p_set2_b int,
  p_set3_a int DEFAULT NULL,
  p_set3_b int DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_row record;
  v_status public.match_status;
  v_match_at timestamptz;
  v_sets jsonb;
  v_team_a_sets int := 0;
  v_team_b_sets int := 0;
  v_winner_team public.team_type;
  v_winner_team_id uuid;
  v_child record;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT
    pm.id,
    pm.division_id,
    pm.stage,
    pm.team_a_id,
    pm.team_b_id,
    pm.match_id,
    l.club_id,
    m.status,
    m.match_at
  INTO v_row
  FROM public.league_playoff_matches pm
  JOIN public.league_divisions d ON d.id = pm.division_id
  JOIN public.club_leagues l ON l.id = d.league_id
  JOIN public.matches m ON m.id = pm.match_id
  WHERE pm.id = p_playoff_match_id
  FOR UPDATE OF pm, m;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'PLAYOFF_MATCH_NOT_FOUND';
  END IF;

  IF NOT public.q6_can_manage_club(v_row.club_id, v_uid) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  IF v_row.team_a_id IS NULL OR v_row.team_b_id IS NULL THEN
    RAISE EXCEPTION 'PLAYOFF_TEAMS_NOT_DEFINED';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.match_results mr
    WHERE mr.match_id = v_row.match_id
  ) THEN
    RAISE EXCEPTION 'RESULT_ALREADY_EXISTS';
  END IF;

  IF p_set1_a < 0 OR p_set1_b < 0 OR p_set2_a < 0 OR p_set2_b < 0 THEN
    RAISE EXCEPTION 'INVALID_SCORES';
  END IF;
  IF p_set1_a = p_set1_b OR p_set2_a = p_set2_b THEN
    RAISE EXCEPTION 'INVALID_SCORES';
  END IF;
  IF (p_set3_a IS NULL) <> (p_set3_b IS NULL) THEN
    RAISE EXCEPTION 'INVALID_SCORES';
  END IF;
  IF p_set3_a IS NOT NULL THEN
    IF p_set3_a < 0 OR p_set3_b < 0 OR p_set3_a = p_set3_b THEN
      RAISE EXCEPTION 'INVALID_SCORES';
    END IF;
  END IF;

  v_status := v_row.status;
  v_match_at := v_row.match_at;
  IF v_status = 'scheduled'::public.match_status AND v_match_at < now() THEN
    UPDATE public.matches
    SET status = 'completed'::public.match_status,
        updated_at = now()
    WHERE id = v_row.match_id;
    v_status := 'completed'::public.match_status;
  END IF;

  IF v_status <> 'completed'::public.match_status THEN
    RAISE EXCEPTION 'MATCH_NOT_COMPLETED';
  END IF;

  PERFORM public.club_sync_playoff_match_players(p_playoff_match_id);

  IF p_set1_a > p_set1_b THEN v_team_a_sets := v_team_a_sets + 1; ELSE v_team_b_sets := v_team_b_sets + 1; END IF;
  IF p_set2_a > p_set2_b THEN v_team_a_sets := v_team_a_sets + 1; ELSE v_team_b_sets := v_team_b_sets + 1; END IF;

  v_sets := jsonb_build_array(
    jsonb_build_object('team_a_games', p_set1_a, 'team_b_games', p_set1_b),
    jsonb_build_object('team_a_games', p_set2_a, 'team_b_games', p_set2_b)
  );

  IF p_set3_a IS NOT NULL AND p_set3_b IS NOT NULL THEN
    IF p_set3_a > p_set3_b THEN v_team_a_sets := v_team_a_sets + 1; ELSE v_team_b_sets := v_team_b_sets + 1; END IF;
    v_sets := v_sets || jsonb_build_array(
      jsonb_build_object('team_a_games', p_set3_a, 'team_b_games', p_set3_b)
    );
  END IF;

  IF v_team_a_sets = v_team_b_sets THEN
    RAISE EXCEPTION 'INVALID_SCORES';
  END IF;

  v_winner_team := CASE WHEN v_team_a_sets > v_team_b_sets THEN 'A'::public.team_type ELSE 'B'::public.team_type END;
  v_winner_team_id := CASE WHEN v_winner_team = 'A'::public.team_type THEN v_row.team_a_id ELSE v_row.team_b_id END;

  INSERT INTO public.match_results (match_id, sets, winner_team, recorded_at)
  VALUES (v_row.match_id, v_sets, v_winner_team, now());

  UPDATE public.league_playoff_matches
  SET winner_team_id = v_winner_team_id,
      updated_at = now()
  WHERE id = p_playoff_match_id;

  FOR v_child IN
    SELECT pm.id
    FROM public.league_playoff_matches pm
    WHERE pm.division_id = v_row.division_id
      AND (pm.source_match_a_id = p_playoff_match_id OR pm.source_match_b_id = p_playoff_match_id)
  LOOP
    UPDATE public.league_playoff_matches pm
    SET team_a_id = CASE WHEN pm.source_match_a_id = p_playoff_match_id THEN v_winner_team_id ELSE pm.team_a_id END,
        team_b_id = CASE WHEN pm.source_match_b_id = p_playoff_match_id THEN v_winner_team_id ELSE pm.team_b_id END,
        updated_at = now()
    WHERE pm.id = v_child.id;

    PERFORM public.club_sync_playoff_match_players(v_child.id);
  END LOOP;

  RETURN v_row.match_id;
END;
$$;

REVOKE ALL ON TABLE public.league_playoff_matches FROM PUBLIC;
GRANT SELECT ON TABLE public.league_playoff_matches TO authenticated;

REVOKE ALL ON FUNCTION public.club_sync_playoff_match_players(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.club_generate_division_playoffs(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.club_schedule_playoff_match(uuid, uuid, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.club_submit_playoff_match_result(uuid, int, int, int, int, int, int) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.club_generate_division_playoffs(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_schedule_playoff_match(uuid, uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_submit_playoff_match_result(uuid, int, int, int, int, int, int) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

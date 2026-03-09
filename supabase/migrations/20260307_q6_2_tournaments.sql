-- STAGE Q6.2: Torneos del club (grupo → playoff)
-- Modelo: torneo de una sola categoría con grupos round-robin + bracket eliminatorio.

BEGIN;

-- ─────────────────────────────────────────────
-- 1) Tablas
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.club_tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name text NOT NULL,
  season_label text NULL,
  description text NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'finished')),
  target_category_int int NOT NULL,
  allow_lower_category boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_club_tournaments_club_status
  ON public.club_tournaments(club_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.tournament_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.club_tournaments(id) ON DELETE CASCADE,
  player_id_a uuid NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
  player_id_b uuid NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
  entry_category_int int NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (player_id_a <> player_id_b)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tournament_teams_pair
  ON public.tournament_teams(tournament_id, LEAST(player_id_a, player_id_b), GREATEST(player_id_a, player_id_b));

CREATE INDEX IF NOT EXISTS idx_tournament_teams_tournament
  ON public.tournament_teams(tournament_id, created_at);

CREATE TABLE IF NOT EXISTS public.tournament_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.club_tournaments(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tournament_groups_tournament
  ON public.tournament_groups(tournament_id, sort_order, created_at);

CREATE TABLE IF NOT EXISTS public.tournament_group_teams (
  group_id uuid NOT NULL REFERENCES public.tournament_groups(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
  seed_order int NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, team_id),
  UNIQUE (team_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_group_teams_group
  ON public.tournament_group_teams(group_id, seed_order, created_at);

CREATE TABLE IF NOT EXISTS public.tournament_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.tournament_groups(id) ON DELETE CASCADE,
  round_index int NOT NULL,
  team_a_id uuid NOT NULL REFERENCES public.tournament_teams(id) ON DELETE RESTRICT,
  team_b_id uuid NOT NULL REFERENCES public.tournament_teams(id) ON DELETE RESTRICT,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  scheduled_at timestamptz NULL,
  court_id uuid NULL REFERENCES public.club_courts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (team_a_id <> team_b_id),
  UNIQUE (match_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tournament_matches_group_pair
  ON public.tournament_matches(group_id, LEAST(team_a_id, team_b_id), GREATEST(team_a_id, team_b_id));

CREATE INDEX IF NOT EXISTS idx_tournament_matches_group_round
  ON public.tournament_matches(group_id, round_index, created_at);

CREATE TABLE IF NOT EXISTS public.tournament_playoff_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.club_tournaments(id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN ('quarterfinal', 'semifinal', 'final')),
  stage_order int NOT NULL,
  match_order int NOT NULL,
  team_a_id uuid NULL REFERENCES public.tournament_teams(id) ON DELETE SET NULL,
  team_b_id uuid NULL REFERENCES public.tournament_teams(id) ON DELETE SET NULL,
  winner_team_id uuid NULL REFERENCES public.tournament_teams(id) ON DELETE SET NULL,
  source_match_a_id uuid NULL REFERENCES public.tournament_playoff_matches(id) ON DELETE SET NULL,
  source_match_b_id uuid NULL REFERENCES public.tournament_playoff_matches(id) ON DELETE SET NULL,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  scheduled_at timestamptz NULL,
  court_id uuid NULL REFERENCES public.club_courts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tournament_playoff_tournament_stage_order
  ON public.tournament_playoff_matches(tournament_id, stage, match_order);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tournament_playoff_match_id
  ON public.tournament_playoff_matches(match_id);

CREATE INDEX IF NOT EXISTS idx_tournament_playoff_tournament_stage
  ON public.tournament_playoff_matches(tournament_id, stage_order, match_order, created_at);

-- ─────────────────────────────────────────────
-- 2) RLS
-- ─────────────────────────────────────────────

ALTER TABLE public.club_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_group_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_playoff_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS club_tournaments_select_authenticated ON public.club_tournaments;
CREATE POLICY club_tournaments_select_authenticated
  ON public.club_tournaments FOR SELECT TO authenticated
  USING (
    (
      status = 'active'
      AND EXISTS (
        SELECT 1 FROM public.clubs c
        WHERE c.id = club_tournaments.club_id
          AND c.deleted_at IS NULL AND c.archived_at IS NULL AND c.merged_into IS NULL
      )
    )
    OR public.q6_can_manage_club(club_id, auth.uid())
  );

DROP POLICY IF EXISTS tournament_teams_select_authenticated ON public.tournament_teams;
CREATE POLICY tournament_teams_select_authenticated
  ON public.tournament_teams FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.club_tournaments t
      WHERE t.id = tournament_teams.tournament_id
        AND (t.status = 'active' OR public.q6_can_manage_club(t.club_id, auth.uid()))
    )
  );

DROP POLICY IF EXISTS tournament_groups_select_authenticated ON public.tournament_groups;
CREATE POLICY tournament_groups_select_authenticated
  ON public.tournament_groups FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.club_tournaments t
      WHERE t.id = tournament_groups.tournament_id
        AND (t.status = 'active' OR public.q6_can_manage_club(t.club_id, auth.uid()))
    )
  );

DROP POLICY IF EXISTS tournament_group_teams_select_authenticated ON public.tournament_group_teams;
CREATE POLICY tournament_group_teams_select_authenticated
  ON public.tournament_group_teams FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tournament_groups g
      JOIN public.club_tournaments t ON t.id = g.tournament_id
      WHERE g.id = tournament_group_teams.group_id
        AND (t.status = 'active' OR public.q6_can_manage_club(t.club_id, auth.uid()))
    )
  );

DROP POLICY IF EXISTS tournament_matches_select_authenticated ON public.tournament_matches;
CREATE POLICY tournament_matches_select_authenticated
  ON public.tournament_matches FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tournament_groups g
      JOIN public.club_tournaments t ON t.id = g.tournament_id
      WHERE g.id = tournament_matches.group_id
        AND (t.status = 'active' OR public.q6_can_manage_club(t.club_id, auth.uid()))
    )
  );

DROP POLICY IF EXISTS tournament_playoff_matches_select_authenticated ON public.tournament_playoff_matches;
CREATE POLICY tournament_playoff_matches_select_authenticated
  ON public.tournament_playoff_matches FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.club_tournaments t
      WHERE t.id = tournament_playoff_matches.tournament_id
        AND (t.status = 'active' OR public.q6_can_manage_club(t.club_id, auth.uid()))
    )
  );

-- ─────────────────────────────────────────────
-- 3) RPCs mutación
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.club_create_tournament(
  p_club_id uuid,
  p_name text,
  p_target_category_int int,
  p_allow_lower_category boolean DEFAULT false,
  p_season_label text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_status text DEFAULT 'draft'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_tournament_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF NOT public.q6_can_manage_club(p_club_id, v_uid) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF NULLIF(TRIM(COALESCE(p_name, '')), '') IS NULL THEN RAISE EXCEPTION 'INVALID_NAME'; END IF;
  IF p_status NOT IN ('draft', 'active', 'finished') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  IF p_target_category_int IS NULL OR p_target_category_int < 1 THEN RAISE EXCEPTION 'INVALID_CATEGORY_VALUE'; END IF;

  INSERT INTO public.club_tournaments (
    club_id, name, season_label, description, status,
    target_category_int, allow_lower_category, updated_at
  )
  VALUES (
    p_club_id,
    TRIM(p_name),
    NULLIF(TRIM(COALESCE(p_season_label, '')), ''),
    NULLIF(TRIM(COALESCE(p_description, '')), ''),
    p_status,
    p_target_category_int,
    COALESCE(p_allow_lower_category, false),
    now()
  )
  RETURNING id INTO v_tournament_id;

  RETURN v_tournament_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.club_update_tournament_status(
  p_tournament_id uuid,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_club_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF p_status NOT IN ('draft', 'active', 'finished') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;

  SELECT club_id INTO v_club_id FROM public.club_tournaments WHERE id = p_tournament_id;
  IF v_club_id IS NULL THEN RAISE EXCEPTION 'TOURNAMENT_NOT_FOUND'; END IF;
  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  UPDATE public.club_tournaments
  SET status = p_status, updated_at = now()
  WHERE id = p_tournament_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.club_register_tournament_team(
  p_tournament_id uuid,
  p_player_id_a uuid,
  p_player_id_b uuid,
  p_entry_category_int int DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_club_id uuid;
  v_target_category int;
  v_allow_lower boolean;
  v_team_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF p_player_id_a IS NULL OR p_player_id_b IS NULL OR p_player_id_a = p_player_id_b THEN
    RAISE EXCEPTION 'INVALID_TEAM_PLAYERS';
  END IF;

  SELECT club_id, target_category_int, allow_lower_category
    INTO v_club_id, v_target_category, v_allow_lower
  FROM public.club_tournaments
  WHERE id = p_tournament_id;

  IF v_club_id IS NULL THEN RAISE EXCEPTION 'TOURNAMENT_NOT_FOUND'; END IF;
  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = p_player_id_a AND p.deleted_at IS NULL AND p.status = 'active'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = p_player_id_b AND p.deleted_at IS NULL AND p.status = 'active'
  ) THEN
    RAISE EXCEPTION 'PLAYER_NOT_FOUND';
  END IF;

  -- Validar categoría: entry_category_int debe ser >= target (mismo nivel o menor habilidad)
  IF p_entry_category_int IS NOT NULL THEN
    IF v_allow_lower THEN
      IF p_entry_category_int < v_target_category THEN
        RAISE EXCEPTION 'CATEGORY_NOT_ALLOWED';
      END IF;
    ELSE
      IF p_entry_category_int <> v_target_category THEN
        RAISE EXCEPTION 'CATEGORY_NOT_ALLOWED';
      END IF;
    END IF;
  END IF;

  -- Verificar que no haya fixture activo
  IF EXISTS (
    SELECT 1 FROM public.tournament_matches tm
    JOIN public.tournament_groups tg ON tg.id = tm.group_id
    WHERE tg.tournament_id = p_tournament_id
  ) THEN
    RAISE EXCEPTION 'TEAM_REGISTRATION_CLOSED_BY_FIXTURE';
  END IF;

  INSERT INTO public.tournament_teams (
    tournament_id, player_id_a, player_id_b, entry_category_int, updated_at
  )
  VALUES (p_tournament_id, p_player_id_a, p_player_id_b, p_entry_category_int, now())
  RETURNING id INTO v_team_id;

  RETURN v_team_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.club_remove_tournament_team(
  p_team_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_club_id uuid;
  v_tournament_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT tt.tournament_id, t.club_id
    INTO v_tournament_id, v_club_id
  FROM public.tournament_teams tt
  JOIN public.club_tournaments t ON t.id = tt.tournament_id
  WHERE tt.id = p_team_id;

  IF v_club_id IS NULL THEN RAISE EXCEPTION 'TEAM_NOT_FOUND'; END IF;
  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.tournament_group_teams WHERE team_id = p_team_id
  ) THEN
    RAISE EXCEPTION 'TEAM_HAS_FIXTURE';
  END IF;

  DELETE FROM public.tournament_teams WHERE id = p_team_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.club_auto_create_tournament_groups(
  p_tournament_id uuid,
  p_group_count int DEFAULT NULL,
  p_target_size int DEFAULT 4
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_club_id uuid;
  v_team_count int;
  v_group_count int;
  v_target_size int;
  v_idx int;
  v_group_id uuid;
  v_group_ids uuid[] := ARRAY[]::uuid[];
  v_pos int := 0;
  v_cycle int;
  v_offset int;
  v_assign_idx int;
  r record;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT club_id INTO v_club_id FROM public.club_tournaments WHERE id = p_tournament_id;
  IF v_club_id IS NULL THEN RAISE EXCEPTION 'TOURNAMENT_NOT_FOUND'; END IF;
  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.tournament_matches tm
    JOIN public.tournament_groups tg ON tg.id = tm.group_id
    WHERE tg.tournament_id = p_tournament_id
  ) THEN
    RAISE EXCEPTION 'FIXTURE_ALREADY_EXISTS';
  END IF;

  SELECT COUNT(*)::int INTO v_team_count
  FROM public.tournament_teams WHERE tournament_id = p_tournament_id;

  IF v_team_count < 2 THEN RAISE EXCEPTION 'NOT_ENOUGH_TEAMS'; END IF;

  v_target_size := GREATEST(COALESCE(p_target_size, 4), 2);
  v_group_count := COALESCE(p_group_count, CEIL(v_team_count::numeric / v_target_size)::int);
  v_group_count := GREATEST(v_group_count, 1);

  -- Limpiar grupos anteriores sin fixture
  DELETE FROM public.tournament_group_teams
  WHERE group_id IN (SELECT id FROM public.tournament_groups WHERE tournament_id = p_tournament_id);
  DELETE FROM public.tournament_groups WHERE tournament_id = p_tournament_id;

  FOR v_idx IN 1..v_group_count LOOP
    INSERT INTO public.tournament_groups (tournament_id, name, sort_order, updated_at)
    VALUES (
      p_tournament_id,
      CASE WHEN v_idx <= 26 THEN CHR(64 + v_idx) ELSE CONCAT('G', v_idx) END,
      v_idx,
      now()
    )
    RETURNING id INTO v_group_id;
    v_group_ids := array_append(v_group_ids, v_group_id);
  END LOOP;

  FOR r IN
    SELECT id AS team_id,
           COALESCE(entry_category_int, 0)::numeric AS order_key
    FROM public.tournament_teams
    WHERE tournament_id = p_tournament_id
    ORDER BY order_key DESC, created_at ASC
  LOOP
    v_pos := v_pos + 1;
    v_cycle := FLOOR((v_pos - 1)::numeric / v_group_count)::int;
    v_offset := (v_pos - 1) % v_group_count;
    IF (v_cycle % 2) = 0 THEN
      v_assign_idx := v_offset + 1;
    ELSE
      v_assign_idx := (v_group_count - v_offset);
    END IF;
    INSERT INTO public.tournament_group_teams (group_id, team_id, seed_order)
    VALUES (v_group_ids[v_assign_idx], r.team_id, v_pos);
  END LOOP;

  RETURN v_group_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.club_assign_tournament_team_to_group(
  p_group_id uuid,
  p_team_id uuid,
  p_seed_order int DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_club_id uuid;
  v_group_tournament_id uuid;
  v_team_tournament_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT t.club_id, g.tournament_id
    INTO v_club_id, v_group_tournament_id
  FROM public.tournament_groups g
  JOIN public.club_tournaments t ON t.id = g.tournament_id
  WHERE g.id = p_group_id;

  IF v_club_id IS NULL THEN RAISE EXCEPTION 'GROUP_NOT_FOUND'; END IF;
  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  SELECT tournament_id INTO v_team_tournament_id
  FROM public.tournament_teams WHERE id = p_team_id;

  IF v_team_tournament_id IS NULL THEN RAISE EXCEPTION 'TEAM_NOT_FOUND'; END IF;
  IF v_team_tournament_id <> v_group_tournament_id THEN RAISE EXCEPTION 'TEAM_DIVISION_MISMATCH'; END IF;

  INSERT INTO public.tournament_group_teams (group_id, team_id, seed_order)
  VALUES (p_group_id, p_team_id, p_seed_order)
  ON CONFLICT (group_id, team_id) DO UPDATE SET seed_order = EXCLUDED.seed_order;
END;
$$;

CREATE OR REPLACE FUNCTION public.club_generate_tournament_group_fixture(
  p_group_id uuid
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_group record;
  v_team_count int;
  v_round int;
  v_half int;
  v_created int := 0;
  v_match_id uuid;
  v_team_a uuid;
  v_team_b uuid;
  v_arr uuid[];
  v_even_n int;
  v_i int;
  v_tmp uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT
    g.id,
    g.tournament_id,
    t.club_id,
    c.name AS club_name
  INTO v_group
  FROM public.tournament_groups g
  JOIN public.club_tournaments t ON t.id = g.tournament_id
  JOIN public.clubs c ON c.id = t.club_id
  WHERE g.id = p_group_id;

  IF v_group.id IS NULL THEN RAISE EXCEPTION 'GROUP_NOT_FOUND'; END IF;
  IF NOT public.q6_can_manage_club(v_group.club_id, v_uid) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  IF EXISTS (SELECT 1 FROM public.tournament_matches WHERE group_id = p_group_id) THEN
    RAISE EXCEPTION 'FIXTURE_ALREADY_EXISTS';
  END IF;

  SELECT ARRAY_AGG(tgt.team_id ORDER BY COALESCE(tgt.seed_order, 9999), tgt.created_at),
         COUNT(*)::int
    INTO v_arr, v_team_count
  FROM public.tournament_group_teams tgt
  WHERE tgt.group_id = p_group_id;

  IF v_team_count < 2 THEN RAISE EXCEPTION 'NOT_ENOUGH_TEAMS'; END IF;

  IF (v_team_count % 2) = 1 THEN
    v_arr := array_append(v_arr, NULL::uuid);
  END IF;

  v_even_n := array_length(v_arr, 1);
  v_half := v_even_n / 2;

  FOR v_round IN 1..(v_even_n - 1) LOOP
    FOR v_i IN 1..v_half LOOP
      v_team_a := v_arr[v_i];
      v_team_b := v_arr[v_even_n - v_i + 1];
      IF v_team_a IS NULL OR v_team_b IS NULL THEN CONTINUE; END IF;

      INSERT INTO public.matches (
        match_at, club_name, club_name_raw, club_id, status, notes,
        max_players, created_by, match_source, updated_at
      )
      VALUES (
        now(), v_group.club_name, v_group.club_name, v_group.club_id,
        'scheduled',
        CONCAT('Torneo - grupo ', p_group_id::text, ' - ronda ', v_round::text),
        4, v_uid, 'direct', now()
      )
      RETURNING id INTO v_match_id;

      INSERT INTO public.tournament_matches (
        group_id, round_index, team_a_id, team_b_id, match_id, updated_at
      )
      VALUES (p_group_id, v_round, v_team_a, v_team_b, v_match_id, now());

      INSERT INTO public.match_players (match_id, player_id, team)
      SELECT v_match_id, tt.player_id_a, 'A' FROM public.tournament_teams tt WHERE tt.id = v_team_a;
      INSERT INTO public.match_players (match_id, player_id, team)
      SELECT v_match_id, tt.player_id_b, 'A' FROM public.tournament_teams tt WHERE tt.id = v_team_a;
      INSERT INTO public.match_players (match_id, player_id, team)
      SELECT v_match_id, tt.player_id_a, 'B' FROM public.tournament_teams tt WHERE tt.id = v_team_b;
      INSERT INTO public.match_players (match_id, player_id, team)
      SELECT v_match_id, tt.player_id_b, 'B' FROM public.tournament_teams tt WHERE tt.id = v_team_b;

      v_created := v_created + 1;
    END LOOP;

    v_tmp := v_arr[v_even_n];
    FOR v_i IN REVERSE v_even_n..3 LOOP
      v_arr[v_i] := v_arr[v_i - 1];
    END LOOP;
    v_arr[2] := v_tmp;
  END LOOP;

  RETURN v_created;
END;
$$;

CREATE OR REPLACE FUNCTION public.club_reopen_tournament_fixture_for_edit(
  p_tournament_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_club_id uuid;
  v_removed_matches int;
  v_removed_bookings int;
  v_removed_mp int;
  v_removed_results int;
  v_match_ids uuid[];
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT club_id INTO v_club_id FROM public.club_tournaments WHERE id = p_tournament_id;
  IF v_club_id IS NULL THEN RAISE EXCEPTION 'TOURNAMENT_NOT_FOUND'; END IF;
  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id IN (
      SELECT tm.match_id FROM public.tournament_matches tm
      JOIN public.tournament_groups tg ON tg.id = tm.group_id
      WHERE tg.tournament_id = p_tournament_id
    )
    AND m.status = 'completed'
  ) THEN
    RAISE EXCEPTION 'COMPLETED_MATCHES_EXIST';
  END IF;

  SELECT ARRAY_AGG(tm.match_id)
    INTO v_match_ids
  FROM public.tournament_matches tm
  JOIN public.tournament_groups tg ON tg.id = tm.group_id
  WHERE tg.tournament_id = p_tournament_id;

  IF v_match_ids IS NOT NULL THEN
    DELETE FROM public.match_results WHERE match_id = ANY(v_match_ids);
    GET DIAGNOSTICS v_removed_results = ROW_COUNT;

    DELETE FROM public.court_bookings WHERE match_id = ANY(v_match_ids);
    GET DIAGNOSTICS v_removed_bookings = ROW_COUNT;

    DELETE FROM public.match_players WHERE match_id = ANY(v_match_ids);
    GET DIAGNOSTICS v_removed_mp = ROW_COUNT;

    DELETE FROM public.matches WHERE id = ANY(v_match_ids);
    GET DIAGNOSTICS v_removed_matches = ROW_COUNT;
  ELSE
    v_removed_matches := 0;
    v_removed_bookings := 0;
    v_removed_mp := 0;
    v_removed_results := 0;
  END IF;

  DELETE FROM public.tournament_group_teams
  WHERE group_id IN (SELECT id FROM public.tournament_groups WHERE tournament_id = p_tournament_id);
  DELETE FROM public.tournament_groups WHERE tournament_id = p_tournament_id;

  RETURN jsonb_build_object(
    'tournament_id', p_tournament_id,
    'removed_matches', v_removed_matches,
    'removed_bookings', v_removed_bookings,
    'removed_match_players', v_removed_mp,
    'removed_results', v_removed_results
  );
END;
$$;

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
  FOR UPDATE;

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
      'confirmed', 'Reserva generada desde Torneo del Club', v_row.match_id, now()
    )
    RETURNING id INTO v_booking_id;
  ELSE
    UPDATE public.court_bookings
    SET club_id = v_row.club_id, court_id = p_court_id,
        start_at = p_match_at, end_at = v_end_at,
        status = 'confirmed', updated_at = now()
    WHERE id = v_booking_id;
  END IF;

  UPDATE public.matches
  SET match_at = p_match_at, match_source = COALESCE(match_source, 'booking'), updated_at = now()
  WHERE id = v_row.match_id;

  UPDATE public.tournament_matches
  SET scheduled_at = p_match_at, court_id = p_court_id, updated_at = now()
  WHERE id = p_tournament_match_id;

  RETURN jsonb_build_object(
    'tournament_match_id', p_tournament_match_id,
    'match_id', v_row.match_id,
    'booking_id', v_booking_id,
    'scheduled_at', p_match_at,
    'court_id', p_court_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.club_submit_tournament_match_result(
  p_tournament_match_id uuid,
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
  v_match_id uuid;
  v_club_id uuid;
  v_status public.match_status;
  v_match_at timestamptz;
  v_sets jsonb;
  v_team_a_sets int := 0;
  v_team_b_sets int := 0;
  v_winner_team public.team_type;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT tm.match_id, t.club_id, m.status, m.match_at
    INTO v_match_id, v_club_id, v_status, v_match_at
  FROM public.tournament_matches tm
  JOIN public.tournament_groups tg ON tg.id = tm.group_id
  JOIN public.club_tournaments t ON t.id = tg.tournament_id
  JOIN public.matches m ON m.id = tm.match_id
  WHERE tm.id = p_tournament_match_id
  FOR UPDATE OF m;

  IF v_match_id IS NULL THEN RAISE EXCEPTION 'TOURNAMENT_MATCH_NOT_FOUND'; END IF;
  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  IF EXISTS (SELECT 1 FROM public.match_results WHERE match_id = v_match_id) THEN
    RAISE EXCEPTION 'RESULT_ALREADY_EXISTS';
  END IF;

  IF p_set1_a < 0 OR p_set1_b < 0 OR p_set2_a < 0 OR p_set2_b < 0 THEN RAISE EXCEPTION 'INVALID_SCORES'; END IF;
  IF p_set1_a = p_set1_b OR p_set2_a = p_set2_b THEN RAISE EXCEPTION 'INVALID_SCORES'; END IF;
  IF (p_set3_a IS NULL) <> (p_set3_b IS NULL) THEN RAISE EXCEPTION 'INVALID_SCORES'; END IF;
  IF p_set3_a IS NOT NULL AND (p_set3_a < 0 OR p_set3_b < 0 OR p_set3_a = p_set3_b) THEN
    RAISE EXCEPTION 'INVALID_SCORES';
  END IF;

  IF v_status = 'scheduled'::public.match_status AND v_match_at < now() THEN
    UPDATE public.matches SET status = 'completed'::public.match_status, updated_at = now() WHERE id = v_match_id;
    v_status := 'completed'::public.match_status;
  END IF;

  IF v_status <> 'completed'::public.match_status THEN RAISE EXCEPTION 'MATCH_NOT_COMPLETED'; END IF;

  IF p_set1_a > p_set1_b THEN v_team_a_sets := v_team_a_sets + 1; ELSE v_team_b_sets := v_team_b_sets + 1; END IF;
  IF p_set2_a > p_set2_b THEN v_team_a_sets := v_team_a_sets + 1; ELSE v_team_b_sets := v_team_b_sets + 1; END IF;

  v_sets := jsonb_build_array(
    jsonb_build_object('team_a_games', p_set1_a, 'team_b_games', p_set1_b),
    jsonb_build_object('team_a_games', p_set2_a, 'team_b_games', p_set2_b)
  );

  IF p_set3_a IS NOT NULL THEN
    IF p_set3_a > p_set3_b THEN v_team_a_sets := v_team_a_sets + 1; ELSE v_team_b_sets := v_team_b_sets + 1; END IF;
    v_sets := v_sets || jsonb_build_array(jsonb_build_object('team_a_games', p_set3_a, 'team_b_games', p_set3_b));
  END IF;

  IF v_team_a_sets = v_team_b_sets THEN RAISE EXCEPTION 'INVALID_SCORES'; END IF;

  v_winner_team := CASE WHEN v_team_a_sets > v_team_b_sets THEN 'A'::public.team_type ELSE 'B'::public.team_type END;

  INSERT INTO public.match_results (match_id, sets, winner_team, recorded_at)
  VALUES (v_match_id, v_sets, v_winner_team, now());

  RETURN v_match_id;
END;
$$;

-- Sincroniza jugadores en match_players desde los equipos del playoff
CREATE OR REPLACE FUNCTION public.club_sync_tournament_playoff_match_players(
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
  SELECT pm.id, pm.match_id, pm.team_a_id, pm.team_b_id
    INTO v_playoff
  FROM public.tournament_playoff_matches pm
  WHERE pm.id = p_playoff_match_id;

  IF v_playoff.id IS NULL THEN RAISE EXCEPTION 'PLAYOFF_MATCH_NOT_FOUND'; END IF;

  DELETE FROM public.match_players WHERE match_id = v_playoff.match_id;

  IF v_playoff.team_a_id IS NOT NULL THEN
    INSERT INTO public.match_players (match_id, player_id, team)
    SELECT v_playoff.match_id, tt.player_id_a, 'A' FROM public.tournament_teams tt WHERE tt.id = v_playoff.team_a_id;
    INSERT INTO public.match_players (match_id, player_id, team)
    SELECT v_playoff.match_id, tt.player_id_b, 'A' FROM public.tournament_teams tt WHERE tt.id = v_playoff.team_a_id;
  END IF;

  IF v_playoff.team_b_id IS NOT NULL THEN
    INSERT INTO public.match_players (match_id, player_id, team)
    SELECT v_playoff.match_id, tt.player_id_a, 'B' FROM public.tournament_teams tt WHERE tt.id = v_playoff.team_b_id;
    INSERT INTO public.match_players (match_id, player_id, team)
    SELECT v_playoff.match_id, tt.player_id_b, 'B' FROM public.tournament_teams tt WHERE tt.id = v_playoff.team_b_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.club_generate_tournament_playoffs(
  p_tournament_id uuid
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_club_id uuid;
  v_tournament_status text;
  v_group_orders int[];
  v_group_count int;
  v_created int := 0;
  v_group record;
  v_total_matches int;
  v_completed_matches int;
  v_added int;
  v_match_id uuid;
  v_playoff_id uuid;
  v_qf1 uuid; v_qf2 uuid; v_qf3 uuid; v_qf4 uuid;
  v_sf1 uuid; v_sf2 uuid;
  v_final uuid;
  v_g1_r1 uuid; v_g1_r2 uuid;
  v_g2_r1 uuid; v_g2_r2 uuid;
  v_g3_r1 uuid; v_g3_r2 uuid;
  v_g4_r1 uuid; v_g4_r2 uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT club_id, status INTO v_club_id, v_tournament_status
  FROM public.club_tournaments WHERE id = p_tournament_id;

  IF v_club_id IS NULL THEN RAISE EXCEPTION 'TOURNAMENT_NOT_FOUND'; END IF;
  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF v_tournament_status = 'finished' THEN RAISE EXCEPTION 'TOURNAMENT_ALREADY_FINISHED'; END IF;

  IF EXISTS (SELECT 1 FROM public.tournament_playoff_matches WHERE tournament_id = p_tournament_id) THEN
    RAISE EXCEPTION 'PLAYOFF_ALREADY_EXISTS';
  END IF;

  SELECT ARRAY_AGG(g.sort_order ORDER BY g.sort_order)
    INTO v_group_orders
  FROM public.tournament_groups g
  WHERE g.tournament_id = p_tournament_id;

  v_group_count := COALESCE(array_length(v_group_orders, 1), 0);
  IF v_group_count NOT IN (1, 2, 4) THEN
    RAISE EXCEPTION 'UNSUPPORTED_GROUP_COUNT_FOR_PLAYOFF'
      USING DETAIL = CONCAT('Grupos detectados: ', v_group_count::text),
            HINT = 'Playoffs soporta torneos con 1, 2 o 4 grupos.';
  END IF;

  -- Verificar que todos los grupos tienen fixture completo
  CREATE TEMP TABLE tmp_qt_qualifiers (
    group_sort int NOT NULL,
    group_name text NOT NULL,
    rank_in_group int NOT NULL,
    team_id uuid NOT NULL
  ) ON COMMIT DROP;

  FOR v_group IN
    SELECT g.id, g.name, g.sort_order
    FROM public.tournament_groups g
    WHERE g.tournament_id = p_tournament_id
    ORDER BY g.sort_order
  LOOP
    SELECT COUNT(*)::int INTO v_total_matches
    FROM public.tournament_matches WHERE group_id = v_group.id;

    IF COALESCE(v_total_matches, 0) = 0 THEN
      RAISE EXCEPTION 'NO_FIXTURE_FOR_GROUP'
        USING DETAIL = CONCAT('Grupo ', v_group.name, ' sin fixture.');
    END IF;

    SELECT COUNT(*)::int INTO v_completed_matches
    FROM public.tournament_matches tm
    JOIN public.matches m ON m.id = tm.match_id
    JOIN public.match_results mr ON mr.match_id = m.id
    WHERE tm.group_id = v_group.id AND m.status = 'completed';

    IF COALESCE(v_completed_matches, 0) < v_total_matches THEN
      RAISE EXCEPTION 'GROUP_STAGE_INCOMPLETE'
        USING DETAIL = CONCAT('Grupo ', v_group.name, ': ', v_completed_matches::text, '/', v_total_matches::text, ' resultados.'),
              HINT = 'Cargá todos los resultados de fase de grupos antes de generar playoffs.';
    END IF;

    INSERT INTO tmp_qt_qualifiers (group_sort, group_name, rank_in_group, team_id)
    SELECT v_group.sort_order, v_group.name, q.rn, q.team_id
    FROM (
      SELECT t.team_id,
             ROW_NUMBER() OVER (
               ORDER BY t.points DESC, t.wins DESC, t.sets_won DESC, t.sets_lost ASC, t.last_match_at DESC NULLS LAST
             ) AS rn
      FROM public.club_get_tournament_group_table(v_group.id) t
    ) q
    WHERE q.rn <= 2;

    GET DIAGNOSTICS v_added = ROW_COUNT;
    IF v_added < 2 THEN
      RAISE EXCEPTION 'NOT_ENOUGH_QUALIFIED_TEAMS'
        USING DETAIL = CONCAT('Grupo ', v_group.name, ' no tiene 2 clasificados.');
    END IF;
  END LOOP;

  -- Bracket con 1 grupo → final directa
  IF v_group_count = 1 THEN
    SELECT q.team_id INTO v_g1_r1 FROM tmp_qt_qualifiers q WHERE q.group_sort = v_group_orders[1] AND q.rank_in_group = 1;
    SELECT q.team_id INTO v_g1_r2 FROM tmp_qt_qualifiers q WHERE q.group_sort = v_group_orders[1] AND q.rank_in_group = 2;

    INSERT INTO public.matches (match_at, club_name, club_name_raw, club_id, status, notes, max_players, created_by, match_source, updated_at)
    SELECT now(), c.name, c.name, v_club_id, 'scheduled', 'Torneo - Final', 4, v_uid, 'direct', now()
    FROM public.clubs c WHERE c.id = v_club_id
    RETURNING id INTO v_match_id;

    INSERT INTO public.tournament_playoff_matches (tournament_id, stage, stage_order, match_order, team_a_id, team_b_id, match_id, updated_at)
    VALUES (p_tournament_id, 'final', 3, 1, v_g1_r1, v_g1_r2, v_match_id, now())
    RETURNING id INTO v_final;
    PERFORM public.club_sync_tournament_playoff_match_players(v_final);
    RETURN 1;
  END IF;

  -- Bracket con 2 grupos → semifinales + final
  IF v_group_count = 2 THEN
    SELECT q.team_id INTO v_g1_r1 FROM tmp_qt_qualifiers q WHERE q.group_sort = v_group_orders[1] AND q.rank_in_group = 1;
    SELECT q.team_id INTO v_g1_r2 FROM tmp_qt_qualifiers q WHERE q.group_sort = v_group_orders[1] AND q.rank_in_group = 2;
    SELECT q.team_id INTO v_g2_r1 FROM tmp_qt_qualifiers q WHERE q.group_sort = v_group_orders[2] AND q.rank_in_group = 1;
    SELECT q.team_id INTO v_g2_r2 FROM tmp_qt_qualifiers q WHERE q.group_sort = v_group_orders[2] AND q.rank_in_group = 2;

    -- Final placeholder
    INSERT INTO public.matches (match_at, club_name, club_name_raw, club_id, status, notes, max_players, created_by, match_source, updated_at)
    SELECT now(), c.name, c.name, v_club_id, 'scheduled', 'Torneo - Final', 4, v_uid, 'direct', now()
    FROM public.clubs c WHERE c.id = v_club_id RETURNING id INTO v_match_id;
    INSERT INTO public.tournament_playoff_matches (tournament_id, stage, stage_order, match_order, match_id, updated_at)
    VALUES (p_tournament_id, 'final', 3, 1, v_match_id, now()) RETURNING id INTO v_final;

    -- Semifinal 1: G1-1 vs G2-2
    INSERT INTO public.matches (match_at, club_name, club_name_raw, club_id, status, notes, max_players, created_by, match_source, updated_at)
    SELECT now(), c.name, c.name, v_club_id, 'scheduled', 'Torneo - Semifinal 1', 4, v_uid, 'direct', now()
    FROM public.clubs c WHERE c.id = v_club_id RETURNING id INTO v_match_id;
    INSERT INTO public.tournament_playoff_matches (tournament_id, stage, stage_order, match_order, team_a_id, team_b_id, source_match_a_id, match_id, updated_at)
    VALUES (p_tournament_id, 'semifinal', 2, 1, v_g1_r1, v_g2_r2, v_final, v_match_id, now()) RETURNING id INTO v_sf1;
    PERFORM public.club_sync_tournament_playoff_match_players(v_sf1);

    -- Semifinal 2: G2-1 vs G1-2
    INSERT INTO public.matches (match_at, club_name, club_name_raw, club_id, status, notes, max_players, created_by, match_source, updated_at)
    SELECT now(), c.name, c.name, v_club_id, 'scheduled', 'Torneo - Semifinal 2', 4, v_uid, 'direct', now()
    FROM public.clubs c WHERE c.id = v_club_id RETURNING id INTO v_match_id;
    INSERT INTO public.tournament_playoff_matches (tournament_id, stage, stage_order, match_order, team_a_id, team_b_id, source_match_b_id, match_id, updated_at)
    VALUES (p_tournament_id, 'semifinal', 2, 2, v_g2_r1, v_g1_r2, v_final, v_match_id, now()) RETURNING id INTO v_sf2;
    PERFORM public.club_sync_tournament_playoff_match_players(v_sf2);

    -- Actualizar final con fuente de semis
    UPDATE public.tournament_playoff_matches
    SET source_match_a_id = v_sf1, source_match_b_id = v_sf2, updated_at = now()
    WHERE id = v_final;

    RETURN 3;
  END IF;

  -- Bracket con 4 grupos → cuartos + semis + final
  IF v_group_count = 4 THEN
    SELECT q.team_id INTO v_g1_r1 FROM tmp_qt_qualifiers q WHERE q.group_sort = v_group_orders[1] AND q.rank_in_group = 1;
    SELECT q.team_id INTO v_g1_r2 FROM tmp_qt_qualifiers q WHERE q.group_sort = v_group_orders[1] AND q.rank_in_group = 2;
    SELECT q.team_id INTO v_g2_r1 FROM tmp_qt_qualifiers q WHERE q.group_sort = v_group_orders[2] AND q.rank_in_group = 1;
    SELECT q.team_id INTO v_g2_r2 FROM tmp_qt_qualifiers q WHERE q.group_sort = v_group_orders[2] AND q.rank_in_group = 2;
    SELECT q.team_id INTO v_g3_r1 FROM tmp_qt_qualifiers q WHERE q.group_sort = v_group_orders[3] AND q.rank_in_group = 1;
    SELECT q.team_id INTO v_g3_r2 FROM tmp_qt_qualifiers q WHERE q.group_sort = v_group_orders[3] AND q.rank_in_group = 2;
    SELECT q.team_id INTO v_g4_r1 FROM tmp_qt_qualifiers q WHERE q.group_sort = v_group_orders[4] AND q.rank_in_group = 1;
    SELECT q.team_id INTO v_g4_r2 FROM tmp_qt_qualifiers q WHERE q.group_sort = v_group_orders[4] AND q.rank_in_group = 2;

    -- Final placeholder
    INSERT INTO public.matches (match_at, club_name, club_name_raw, club_id, status, notes, max_players, created_by, match_source, updated_at)
    SELECT now(), c.name, c.name, v_club_id, 'scheduled', 'Torneo - Final', 4, v_uid, 'direct', now()
    FROM public.clubs c WHERE c.id = v_club_id RETURNING id INTO v_match_id;
    INSERT INTO public.tournament_playoff_matches (tournament_id, stage, stage_order, match_order, match_id, updated_at)
    VALUES (p_tournament_id, 'final', 3, 1, v_match_id, now()) RETURNING id INTO v_final;

    -- Semis placeholders
    INSERT INTO public.matches (match_at, club_name, club_name_raw, club_id, status, notes, max_players, created_by, match_source, updated_at)
    SELECT now(), c.name, c.name, v_club_id, 'scheduled', 'Torneo - Semifinal 1', 4, v_uid, 'direct', now()
    FROM public.clubs c WHERE c.id = v_club_id RETURNING id INTO v_match_id;
    INSERT INTO public.tournament_playoff_matches (tournament_id, stage, stage_order, match_order, source_match_a_id, match_id, updated_at)
    VALUES (p_tournament_id, 'semifinal', 2, 1, v_final, v_match_id, now()) RETURNING id INTO v_sf1;

    INSERT INTO public.matches (match_at, club_name, club_name_raw, club_id, status, notes, max_players, created_by, match_source, updated_at)
    SELECT now(), c.name, c.name, v_club_id, 'scheduled', 'Torneo - Semifinal 2', 4, v_uid, 'direct', now()
    FROM public.clubs c WHERE c.id = v_club_id RETURNING id INTO v_match_id;
    INSERT INTO public.tournament_playoff_matches (tournament_id, stage, stage_order, match_order, source_match_b_id, match_id, updated_at)
    VALUES (p_tournament_id, 'semifinal', 2, 2, v_final, v_match_id, now()) RETURNING id INTO v_sf2;

    UPDATE public.tournament_playoff_matches
    SET source_match_a_id = v_sf1, source_match_b_id = v_sf2, updated_at = now()
    WHERE id = v_final;

    -- QF1: G1-1 vs G2-2
    INSERT INTO public.matches (match_at, club_name, club_name_raw, club_id, status, notes, max_players, created_by, match_source, updated_at)
    SELECT now(), c.name, c.name, v_club_id, 'scheduled', 'Torneo - Cuartos 1', 4, v_uid, 'direct', now()
    FROM public.clubs c WHERE c.id = v_club_id RETURNING id INTO v_match_id;
    INSERT INTO public.tournament_playoff_matches (tournament_id, stage, stage_order, match_order, team_a_id, team_b_id, source_match_a_id, match_id, updated_at)
    VALUES (p_tournament_id, 'quarterfinal', 1, 1, v_g1_r1, v_g2_r2, v_sf1, v_match_id, now()) RETURNING id INTO v_qf1;
    PERFORM public.club_sync_tournament_playoff_match_players(v_qf1);

    -- QF2: G3-1 vs G4-2
    INSERT INTO public.matches (match_at, club_name, club_name_raw, club_id, status, notes, max_players, created_by, match_source, updated_at)
    SELECT now(), c.name, c.name, v_club_id, 'scheduled', 'Torneo - Cuartos 2', 4, v_uid, 'direct', now()
    FROM public.clubs c WHERE c.id = v_club_id RETURNING id INTO v_match_id;
    INSERT INTO public.tournament_playoff_matches (tournament_id, stage, stage_order, match_order, team_a_id, team_b_id, source_match_b_id, match_id, updated_at)
    VALUES (p_tournament_id, 'quarterfinal', 1, 2, v_g3_r1, v_g4_r2, v_sf1, v_match_id, now()) RETURNING id INTO v_qf2;
    PERFORM public.club_sync_tournament_playoff_match_players(v_qf2);

    UPDATE public.tournament_playoff_matches
    SET source_match_a_id = v_qf1, source_match_b_id = v_qf2, updated_at = now()
    WHERE id = v_sf1;

    -- QF3: G2-1 vs G1-2
    INSERT INTO public.matches (match_at, club_name, club_name_raw, club_id, status, notes, max_players, created_by, match_source, updated_at)
    SELECT now(), c.name, c.name, v_club_id, 'scheduled', 'Torneo - Cuartos 3', 4, v_uid, 'direct', now()
    FROM public.clubs c WHERE c.id = v_club_id RETURNING id INTO v_match_id;
    INSERT INTO public.tournament_playoff_matches (tournament_id, stage, stage_order, match_order, team_a_id, team_b_id, source_match_a_id, match_id, updated_at)
    VALUES (p_tournament_id, 'quarterfinal', 1, 3, v_g2_r1, v_g1_r2, v_sf2, v_match_id, now()) RETURNING id INTO v_qf3;
    PERFORM public.club_sync_tournament_playoff_match_players(v_qf3);

    -- QF4: G4-1 vs G3-2
    INSERT INTO public.matches (match_at, club_name, club_name_raw, club_id, status, notes, max_players, created_by, match_source, updated_at)
    SELECT now(), c.name, c.name, v_club_id, 'scheduled', 'Torneo - Cuartos 4', 4, v_uid, 'direct', now()
    FROM public.clubs c WHERE c.id = v_club_id RETURNING id INTO v_match_id;
    INSERT INTO public.tournament_playoff_matches (tournament_id, stage, stage_order, match_order, team_a_id, team_b_id, source_match_b_id, match_id, updated_at)
    VALUES (p_tournament_id, 'quarterfinal', 1, 4, v_g4_r1, v_g3_r2, v_sf2, v_match_id, now()) RETURNING id INTO v_qf4;
    PERFORM public.club_sync_tournament_playoff_match_players(v_qf4);

    UPDATE public.tournament_playoff_matches
    SET source_match_a_id = v_qf3, source_match_b_id = v_qf4, updated_at = now()
    WHERE id = v_sf2;

    RETURN 7;
  END IF;

  RETURN v_created;
END;
$$;

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
  FOR UPDATE;

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
    WHERE b2.court_id = p_court_id AND b2.status = 'confirmed'
      AND b2.match_id IS DISTINCT FROM v_row.match_id
      AND p_match_at < b2.end_at AND v_end_at > b2.start_at
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
      'confirmed', 'Reserva generada desde Playoff del Torneo', v_row.match_id, now()
    )
    RETURNING id INTO v_booking_id;
  ELSE
    UPDATE public.court_bookings
    SET court_id = p_court_id, start_at = p_match_at, end_at = v_end_at, updated_at = now()
    WHERE id = v_booking_id;
  END IF;

  UPDATE public.matches
  SET match_at = p_match_at, match_source = COALESCE(match_source, 'booking'), updated_at = now()
  WHERE id = v_row.match_id;

  UPDATE public.tournament_playoff_matches
  SET scheduled_at = p_match_at, court_id = p_court_id, updated_at = now()
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

CREATE OR REPLACE FUNCTION public.club_submit_tournament_playoff_match_result(
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
  v_pm record;
  v_club_id uuid;
  v_status public.match_status;
  v_match_at timestamptz;
  v_sets jsonb;
  v_team_a_sets int := 0;
  v_team_b_sets int := 0;
  v_winner_team public.team_type;
  v_winner_team_id uuid;
  v_parent record;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT pm.id, pm.match_id, pm.team_a_id, pm.team_b_id, pm.tournament_id,
         t.club_id, m.status, m.match_at
    INTO v_pm
  FROM public.tournament_playoff_matches pm
  JOIN public.club_tournaments t ON t.id = pm.tournament_id
  JOIN public.matches m ON m.id = pm.match_id
  WHERE pm.id = p_playoff_match_id
  FOR UPDATE OF m;

  IF v_pm.id IS NULL THEN RAISE EXCEPTION 'PLAYOFF_MATCH_NOT_FOUND'; END IF;
  IF NOT public.q6_can_manage_club(v_pm.club_id, v_uid) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  IF v_pm.team_a_id IS NULL OR v_pm.team_b_id IS NULL THEN RAISE EXCEPTION 'PLAYOFF_TEAMS_NOT_DEFINED'; END IF;

  IF EXISTS (SELECT 1 FROM public.match_results WHERE match_id = v_pm.match_id) THEN
    RAISE EXCEPTION 'RESULT_ALREADY_EXISTS';
  END IF;

  IF p_set1_a < 0 OR p_set1_b < 0 OR p_set2_a < 0 OR p_set2_b < 0 THEN RAISE EXCEPTION 'INVALID_SCORES'; END IF;
  IF p_set1_a = p_set1_b OR p_set2_a = p_set2_b THEN RAISE EXCEPTION 'INVALID_SCORES'; END IF;
  IF (p_set3_a IS NULL) <> (p_set3_b IS NULL) THEN RAISE EXCEPTION 'INVALID_SCORES'; END IF;
  IF p_set3_a IS NOT NULL AND (p_set3_a < 0 OR p_set3_b < 0 OR p_set3_a = p_set3_b) THEN
    RAISE EXCEPTION 'INVALID_SCORES';
  END IF;

  IF v_pm.status = 'scheduled'::public.match_status AND v_pm.match_at < now() THEN
    UPDATE public.matches SET status = 'completed'::public.match_status, updated_at = now() WHERE id = v_pm.match_id;
    v_pm.status := 'completed'::public.match_status;
  END IF;
  IF v_pm.status <> 'completed'::public.match_status THEN RAISE EXCEPTION 'MATCH_NOT_COMPLETED'; END IF;

  IF p_set1_a > p_set1_b THEN v_team_a_sets := v_team_a_sets + 1; ELSE v_team_b_sets := v_team_b_sets + 1; END IF;
  IF p_set2_a > p_set2_b THEN v_team_a_sets := v_team_a_sets + 1; ELSE v_team_b_sets := v_team_b_sets + 1; END IF;

  v_sets := jsonb_build_array(
    jsonb_build_object('team_a_games', p_set1_a, 'team_b_games', p_set1_b),
    jsonb_build_object('team_a_games', p_set2_a, 'team_b_games', p_set2_b)
  );

  IF p_set3_a IS NOT NULL THEN
    IF p_set3_a > p_set3_b THEN v_team_a_sets := v_team_a_sets + 1; ELSE v_team_b_sets := v_team_b_sets + 1; END IF;
    v_sets := v_sets || jsonb_build_array(jsonb_build_object('team_a_games', p_set3_a, 'team_b_games', p_set3_b));
  END IF;

  IF v_team_a_sets = v_team_b_sets THEN RAISE EXCEPTION 'INVALID_SCORES'; END IF;

  v_winner_team := CASE WHEN v_team_a_sets > v_team_b_sets THEN 'A'::public.team_type ELSE 'B'::public.team_type END;
  v_winner_team_id := CASE WHEN v_winner_team = 'A' THEN v_pm.team_a_id ELSE v_pm.team_b_id END;

  INSERT INTO public.match_results (match_id, sets, winner_team, recorded_at)
  VALUES (v_pm.match_id, v_sets, v_winner_team, now());

  UPDATE public.tournament_playoff_matches
  SET winner_team_id = v_winner_team_id, updated_at = now()
  WHERE id = p_playoff_match_id;

  -- Propagar ganador al partido siguiente (parent)
  SELECT pm2.id, pm2.source_match_a_id, pm2.source_match_b_id
    INTO v_parent
  FROM public.tournament_playoff_matches pm2
  WHERE pm2.tournament_id = v_pm.tournament_id
    AND (pm2.source_match_a_id = p_playoff_match_id OR pm2.source_match_b_id = p_playoff_match_id);

  IF v_parent.id IS NOT NULL THEN
    IF v_parent.source_match_a_id = p_playoff_match_id THEN
      UPDATE public.tournament_playoff_matches SET team_a_id = v_winner_team_id, updated_at = now() WHERE id = v_parent.id;
    ELSE
      UPDATE public.tournament_playoff_matches SET team_b_id = v_winner_team_id, updated_at = now() WHERE id = v_parent.id;
    END IF;
    PERFORM public.club_sync_tournament_playoff_match_players(v_parent.id);
  END IF;

  RETURN v_pm.match_id;
END;
$$;

-- ─────────────────────────────────────────────
-- 4) RPCs lectura
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.club_get_tournament_group_table(
  p_group_id uuid
)
RETURNS TABLE (
  team_id uuid,
  played bigint,
  wins bigint,
  losses bigint,
  points bigint,
  sets_won bigint,
  sets_lost bigint,
  last_match_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base_teams AS (
    SELECT tgt.team_id
    FROM public.tournament_group_teams tgt
    WHERE tgt.group_id = p_group_id
  ),
  matches_base AS (
    SELECT
      tm.id,
      tm.team_a_id,
      tm.team_b_id,
      m.match_at,
      mr.winner_team,
      mr.sets
    FROM public.tournament_matches tm
    JOIN public.matches m ON m.id = tm.match_id
    JOIN public.match_results mr ON mr.match_id = m.id
    WHERE tm.group_id = p_group_id
      AND m.status = 'completed'
      AND mr.winner_team IS NOT NULL
      AND mr.sets IS NOT NULL
      AND jsonb_typeof(mr.sets) = 'array'
      AND jsonb_array_length(mr.sets) > 0
  ),
  team_rows AS (
    SELECT mb.id AS tournament_match_id, mb.match_at, mb.winner_team, mb.sets,
           mb.team_a_id AS team_id, 'A'::text AS team_side
    FROM matches_base mb
    UNION ALL
    SELECT mb.id, mb.match_at, mb.winner_team, mb.sets,
           mb.team_b_id, 'B'::text
    FROM matches_base mb
  ),
  set_rows AS (
    SELECT
      tr.team_id,
      tr.tournament_match_id,
      tr.match_at,
      tr.winner_team,
      tr.team_side,
      NULLIF(regexp_replace(COALESCE(s.obj->>'team_a_games', s.obj->>'a', ''), '[^0-9-]', '', 'g'), '')::int AS ga,
      NULLIF(regexp_replace(COALESCE(s.obj->>'team_b_games', s.obj->>'b', ''), '[^0-9-]', '', 'g'), '')::int AS gb
    FROM team_rows tr
    CROSS JOIN LATERAL jsonb_array_elements(tr.sets) AS s(obj)
  ),
  sets_agg AS (
    SELECT
      sr.team_id,
      sr.tournament_match_id,
      SUM(CASE
        WHEN sr.ga IS NULL OR sr.gb IS NULL THEN 0
        WHEN sr.team_side = 'A' AND sr.ga > sr.gb THEN 1
        WHEN sr.team_side = 'B' AND sr.gb > sr.ga THEN 1
        ELSE 0
      END)::bigint AS sets_won,
      SUM(CASE
        WHEN sr.ga IS NULL OR sr.gb IS NULL THEN 0
        WHEN sr.team_side = 'A' AND sr.ga < sr.gb THEN 1
        WHEN sr.team_side = 'B' AND sr.gb < sr.ga THEN 1
        ELSE 0
      END)::bigint AS sets_lost
    FROM set_rows sr
    GROUP BY sr.team_id, sr.tournament_match_id
  ),
  team_match_agg AS (
    SELECT
      tr.team_id,
      COUNT(*)::bigint AS played,
      SUM(CASE WHEN tr.winner_team::text = tr.team_side THEN 1 ELSE 0 END)::bigint AS wins,
      SUM(CASE WHEN tr.winner_team::text <> tr.team_side THEN 1 ELSE 0 END)::bigint AS losses,
      COALESCE(SUM(sa.sets_won), 0)::bigint AS sets_won,
      COALESCE(SUM(sa.sets_lost), 0)::bigint AS sets_lost,
      MAX(tr.match_at) AS last_match_at
    FROM team_rows tr
    LEFT JOIN sets_agg sa ON sa.team_id = tr.team_id AND sa.tournament_match_id = tr.tournament_match_id
    GROUP BY tr.team_id
  )
  SELECT
    bt.team_id,
    COALESCE(a.played, 0),
    COALESCE(a.wins, 0),
    COALESCE(a.losses, 0),
    (COALESCE(a.wins, 0) * 3)::bigint AS points,
    COALESCE(a.sets_won, 0),
    COALESCE(a.sets_lost, 0),
    a.last_match_at
  FROM base_teams bt
  LEFT JOIN team_match_agg a ON a.team_id = bt.team_id
  ORDER BY points DESC, wins DESC, sets_won DESC, sets_lost ASC, last_match_at DESC NULLS LAST;
$$;

-- ─────────────────────────────────────────────
-- 5) Grants
-- ─────────────────────────────────────────────

REVOKE ALL ON TABLE public.club_tournaments FROM PUBLIC;
REVOKE ALL ON TABLE public.tournament_teams FROM PUBLIC;
REVOKE ALL ON TABLE public.tournament_groups FROM PUBLIC;
REVOKE ALL ON TABLE public.tournament_group_teams FROM PUBLIC;
REVOKE ALL ON TABLE public.tournament_matches FROM PUBLIC;
REVOKE ALL ON TABLE public.tournament_playoff_matches FROM PUBLIC;

GRANT SELECT ON TABLE public.club_tournaments TO authenticated;
GRANT SELECT ON TABLE public.tournament_teams TO authenticated;
GRANT SELECT ON TABLE public.tournament_groups TO authenticated;
GRANT SELECT ON TABLE public.tournament_group_teams TO authenticated;
GRANT SELECT ON TABLE public.tournament_matches TO authenticated;
GRANT SELECT ON TABLE public.tournament_playoff_matches TO authenticated;

REVOKE ALL ON FUNCTION public.club_create_tournament(uuid,text,int,boolean,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.club_update_tournament_status(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.club_register_tournament_team(uuid,uuid,uuid,int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.club_remove_tournament_team(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.club_auto_create_tournament_groups(uuid,int,int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.club_assign_tournament_team_to_group(uuid,uuid,int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.club_generate_tournament_group_fixture(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.club_reopen_tournament_fixture_for_edit(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.club_schedule_tournament_match(uuid,uuid,timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.club_submit_tournament_match_result(uuid,int,int,int,int,int,int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.club_sync_tournament_playoff_match_players(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.club_generate_tournament_playoffs(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.club_schedule_tournament_playoff_match(uuid,uuid,timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.club_submit_tournament_playoff_match_result(uuid,int,int,int,int,int,int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.club_get_tournament_group_table(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.club_create_tournament(uuid,text,int,boolean,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_update_tournament_status(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_register_tournament_team(uuid,uuid,uuid,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_remove_tournament_team(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_auto_create_tournament_groups(uuid,int,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_assign_tournament_team_to_group(uuid,uuid,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_generate_tournament_group_fixture(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_reopen_tournament_fixture_for_edit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_schedule_tournament_match(uuid,uuid,timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_submit_tournament_match_result(uuid,int,int,int,int,int,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_sync_tournament_playoff_match_players(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_generate_tournament_playoffs(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_schedule_tournament_playoff_match(uuid,uuid,timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_submit_tournament_playoff_match_result(uuid,int,int,int,int,int,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_get_tournament_group_table(uuid) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

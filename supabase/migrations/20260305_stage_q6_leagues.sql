-- STAGE Q6: ligas del club (MVP)

BEGIN;

-- 0) Helpers de permisos (owner/admin)
CREATE OR REPLACE FUNCTION public.q6_is_admin(
  p_uid uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_uid
      AND p.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.q6_can_manage_club(
  p_club_id uuid,
  p_uid uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clubs c
    WHERE c.id = p_club_id
      AND c.deleted_at IS NULL
      AND c.archived_at IS NULL
      AND c.merged_into IS NULL
      AND c.claim_status = 'claimed'
      AND c.claimed_by = p_uid
  )
  OR public.q6_is_admin(p_uid);
$$;

-- 1) Modelo ligas
CREATE TABLE IF NOT EXISTS public.club_leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name text NOT NULL,
  season_label text NULL,
  description text NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'finished')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_club_leagues_club_status
  ON public.club_leagues(club_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.league_divisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.club_leagues(id) ON DELETE CASCADE,
  name text NOT NULL,
  category_mode text NOT NULL
    CHECK (category_mode IN ('SINGLE', 'SUM', 'OPEN')),
  category_value_int int NULL,
  allow_override boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (category_mode IN ('SINGLE', 'SUM') AND category_value_int IS NOT NULL)
    OR (category_mode = 'OPEN')
  )
);

CREATE INDEX IF NOT EXISTS idx_league_divisions_league
  ON public.league_divisions(league_id, created_at);

CREATE TABLE IF NOT EXISTS public.league_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id uuid NOT NULL REFERENCES public.league_divisions(id) ON DELETE CASCADE,
  player_id_a uuid NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
  player_id_b uuid NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
  entry_category_int int NULL,
  seed_strength numeric(10,2) NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (player_id_a <> player_id_b)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_league_teams_division_pair
  ON public.league_teams(division_id, LEAST(player_id_a, player_id_b), GREATEST(player_id_a, player_id_b));

CREATE INDEX IF NOT EXISTS idx_league_teams_division
  ON public.league_teams(division_id, created_at);

CREATE TABLE IF NOT EXISTS public.league_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id uuid NOT NULL REFERENCES public.league_divisions(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (division_id, name)
);
CREATE INDEX IF NOT EXISTS idx_league_groups_division
  ON public.league_groups(division_id, sort_order, created_at);

CREATE TABLE IF NOT EXISTS public.league_group_teams (
  group_id uuid NOT NULL REFERENCES public.league_groups(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.league_teams(id) ON DELETE CASCADE,
  seed_order int NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, team_id),
  UNIQUE (team_id)
);

CREATE INDEX IF NOT EXISTS idx_league_group_teams_group
  ON public.league_group_teams(group_id, seed_order, created_at);

CREATE TABLE IF NOT EXISTS public.league_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.league_groups(id) ON DELETE CASCADE,
  round_index int NOT NULL,
  team_a_id uuid NOT NULL REFERENCES public.league_teams(id) ON DELETE RESTRICT,
  team_b_id uuid NOT NULL REFERENCES public.league_teams(id) ON DELETE RESTRICT,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  scheduled_at timestamptz NULL,
  court_id uuid NULL REFERENCES public.club_courts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (team_a_id <> team_b_id),
  UNIQUE (match_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_league_matches_group_pair
  ON public.league_matches(group_id, LEAST(team_a_id, team_b_id), GREATEST(team_a_id, team_b_id));

CREATE INDEX IF NOT EXISTS idx_league_matches_group_round
  ON public.league_matches(group_id, round_index, created_at);

CREATE INDEX IF NOT EXISTS idx_league_matches_match
  ON public.league_matches(match_id);

-- 2) RLS
ALTER TABLE public.club_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_group_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS club_leagues_select_authenticated ON public.club_leagues;
CREATE POLICY club_leagues_select_authenticated
  ON public.club_leagues
  FOR SELECT
  TO authenticated
  USING (
    (
      status = 'active'
      AND EXISTS (
        SELECT 1
        FROM public.clubs c
        WHERE c.id = club_leagues.club_id
          AND c.deleted_at IS NULL
          AND c.archived_at IS NULL
          AND c.merged_into IS NULL
      )
    )
    OR public.q6_can_manage_club(club_id, auth.uid())
  );

DROP POLICY IF EXISTS league_divisions_select_authenticated ON public.league_divisions;
CREATE POLICY league_divisions_select_authenticated
  ON public.league_divisions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.club_leagues l
      WHERE l.id = league_divisions.league_id
        AND (
          l.status = 'active'
          OR public.q6_can_manage_club(l.club_id, auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS league_teams_select_authenticated ON public.league_teams;
CREATE POLICY league_teams_select_authenticated
  ON public.league_teams
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.league_divisions d
      JOIN public.club_leagues l ON l.id = d.league_id
      WHERE d.id = league_teams.division_id
        AND (
          l.status = 'active'
          OR public.q6_can_manage_club(l.club_id, auth.uid())
        )
    )
  );
DROP POLICY IF EXISTS league_groups_select_authenticated ON public.league_groups;
CREATE POLICY league_groups_select_authenticated
  ON public.league_groups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.league_divisions d
      JOIN public.club_leagues l ON l.id = d.league_id
      WHERE d.id = league_groups.division_id
        AND (
          l.status = 'active'
          OR public.q6_can_manage_club(l.club_id, auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS league_group_teams_select_authenticated ON public.league_group_teams;
CREATE POLICY league_group_teams_select_authenticated
  ON public.league_group_teams
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.league_groups g
      JOIN public.league_divisions d ON d.id = g.division_id
      JOIN public.club_leagues l ON l.id = d.league_id
      WHERE g.id = league_group_teams.group_id
        AND (
          l.status = 'active'
          OR public.q6_can_manage_club(l.club_id, auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS league_matches_select_authenticated ON public.league_matches;
CREATE POLICY league_matches_select_authenticated
  ON public.league_matches
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.league_groups g
      JOIN public.league_divisions d ON d.id = g.division_id
      JOIN public.club_leagues l ON l.id = d.league_id
      WHERE g.id = league_matches.group_id
        AND (
          l.status = 'active'
          OR public.q6_can_manage_club(l.club_id, auth.uid())
        )
    )
  );

-- 3) RPCs mutación
CREATE OR REPLACE FUNCTION public.club_create_league(
  p_club_id uuid,
  p_name text,
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
  v_league_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF NOT public.q6_can_manage_club(p_club_id, v_uid) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  IF NULLIF(TRIM(COALESCE(p_name, '')), '') IS NULL THEN
    RAISE EXCEPTION 'INVALID_NAME';
  END IF;

  IF p_status NOT IN ('draft', 'active', 'finished') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  INSERT INTO public.club_leagues (
    club_id,
    name,
    season_label,
    description,
    status,
    updated_at
  )
  VALUES (
    p_club_id,
    TRIM(p_name),
    NULLIF(TRIM(COALESCE(p_season_label, '')), ''),
    NULLIF(TRIM(COALESCE(p_description, '')), ''),
    p_status,
    now()
  )
  RETURNING id INTO v_league_id;

  RETURN v_league_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.club_create_league_division(
  p_league_id uuid,
  p_name text,
  p_category_mode text,
  p_category_value_int int DEFAULT NULL,
  p_allow_override boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_club_id uuid;
  v_division_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT l.club_id
    INTO v_club_id
  FROM public.club_leagues l
  WHERE l.id = p_league_id;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'LEAGUE_NOT_FOUND';
  END IF;

  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  IF p_category_mode NOT IN ('SINGLE', 'SUM', 'OPEN') THEN
    RAISE EXCEPTION 'INVALID_CATEGORY_MODE';
  END IF;

  IF p_category_mode IN ('SINGLE', 'SUM') AND p_category_value_int IS NULL THEN
    RAISE EXCEPTION 'INVALID_CATEGORY_VALUE';
  END IF;

  INSERT INTO public.league_divisions (
    league_id,
    name,
    category_mode,
    category_value_int,
    allow_override,
    updated_at
  )
  VALUES (
    p_league_id,
    TRIM(COALESCE(p_name, 'Division')),
    p_category_mode,
    p_category_value_int,
    COALESCE(p_allow_override, false),
    now()
  )
  RETURNING id INTO v_division_id;

  RETURN v_division_id;
END;
$$;
CREATE OR REPLACE FUNCTION public.club_register_league_team(
  p_division_id uuid,
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
  v_category_mode text;
  v_category_value_int int;
  v_allow_override boolean;
  v_cat_a int;
  v_cat_b int;
  v_team_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF p_player_id_a IS NULL OR p_player_id_b IS NULL OR p_player_id_a = p_player_id_b THEN
    RAISE EXCEPTION 'INVALID_TEAM_PLAYERS';
  END IF;

  SELECT l.club_id, d.category_mode, d.category_value_int, d.allow_override
    INTO v_club_id, v_category_mode, v_category_value_int, v_allow_override
  FROM public.league_divisions d
  JOIN public.club_leagues l ON l.id = d.league_id
  WHERE d.id = p_division_id;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'DIVISION_NOT_FOUND';
  END IF;

  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.players p
    WHERE p.id = p_player_id_a
      AND p.deleted_at IS NULL
      AND p.status = 'active'
  ) OR NOT EXISTS (
    SELECT 1
    FROM public.players p
    WHERE p.id = p_player_id_b
      AND p.deleted_at IS NULL
      AND p.status = 'active'
  ) THEN
    RAISE EXCEPTION 'PLAYER_NOT_FOUND';
  END IF;

  SELECT NULLIF(regexp_replace(COALESCE(p.category::text, ''), '[^0-9-]', '', 'g'), '')::int
    INTO v_cat_a
  FROM public.players p
  WHERE p.id = p_player_id_a;

  SELECT NULLIF(regexp_replace(COALESCE(p.category::text, ''), '[^0-9-]', '', 'g'), '')::int
    INTO v_cat_b
  FROM public.players p
  WHERE p.id = p_player_id_b;

  IF v_category_mode = 'SINGLE' THEN
    IF COALESCE(v_allow_override, false) = false THEN
      IF p_entry_category_int IS NULL OR p_entry_category_int <> v_category_value_int THEN
        RAISE EXCEPTION 'CATEGORY_NOT_ALLOWED';
      END IF;
    END IF;
  ELSIF v_category_mode = 'SUM' THEN
    IF v_cat_a IS NULL OR v_cat_b IS NULL THEN
      RAISE EXCEPTION 'PLAYER_CATEGORY_REQUIRED';
    END IF;
    IF (v_cat_a + v_cat_b) <> v_category_value_int THEN
      RAISE EXCEPTION 'CATEGORY_SUM_NOT_ALLOWED';
    END IF;
  END IF;

  INSERT INTO public.league_teams (
    division_id,
    player_id_a,
    player_id_b,
    entry_category_int,
    updated_at
  )
  VALUES (
    p_division_id,
    p_player_id_a,
    p_player_id_b,
    p_entry_category_int,
    now()
  )
  RETURNING id INTO v_team_id;

  RETURN v_team_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.club_create_league_group(
  p_division_id uuid,
  p_name text,
  p_sort_order int DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_club_id uuid;
  v_group_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT l.club_id
    INTO v_club_id
  FROM public.league_divisions d
  JOIN public.club_leagues l ON l.id = d.league_id
  WHERE d.id = p_division_id;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'DIVISION_NOT_FOUND';
  END IF;

  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  INSERT INTO public.league_groups (
    division_id,
    name,
    sort_order,
    updated_at
  )
  VALUES (
    p_division_id,
    TRIM(COALESCE(p_name, 'Grupo')),
    COALESCE(p_sort_order, 0),
    now()
  )
  RETURNING id INTO v_group_id;

  RETURN v_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.club_assign_team_to_group(
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
  v_group_division_id uuid;
  v_team_division_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT l.club_id, g.division_id
    INTO v_club_id, v_group_division_id
  FROM public.league_groups g
  JOIN public.league_divisions d ON d.id = g.division_id
  JOIN public.club_leagues l ON l.id = d.league_id
  WHERE g.id = p_group_id;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'GROUP_NOT_FOUND';
  END IF;

  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  SELECT t.division_id
    INTO v_team_division_id
  FROM public.league_teams t
  WHERE t.id = p_team_id;

  IF v_team_division_id IS NULL THEN
    RAISE EXCEPTION 'TEAM_NOT_FOUND';
  END IF;

  IF v_team_division_id <> v_group_division_id THEN
    RAISE EXCEPTION 'TEAM_DIVISION_MISMATCH';
  END IF;

  INSERT INTO public.league_group_teams (
    group_id,
    team_id,
    seed_order
  )
  VALUES (
    p_group_id,
    p_team_id,
    p_seed_order
  )
  ON CONFLICT (group_id, team_id) DO UPDATE
    SET seed_order = EXCLUDED.seed_order;
END;
$$;
CREATE OR REPLACE FUNCTION public.club_auto_create_groups(
  p_division_id uuid,
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
  v_has_fixture boolean;
  r record;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT l.club_id
    INTO v_club_id
  FROM public.league_divisions d
  JOIN public.club_leagues l ON l.id = d.league_id
  WHERE d.id = p_division_id;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'DIVISION_NOT_FOUND';
  END IF;

  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.league_matches lm
    JOIN public.league_groups g ON g.id = lm.group_id
    WHERE g.division_id = p_division_id
  ) INTO v_has_fixture;

  IF COALESCE(v_has_fixture, false) THEN
    RAISE EXCEPTION 'FIXTURE_ALREADY_EXISTS';
  END IF;

  SELECT COUNT(*)::int
    INTO v_team_count
  FROM public.league_teams t
  WHERE t.division_id = p_division_id;

  IF v_team_count < 2 THEN
    RAISE EXCEPTION 'NOT_ENOUGH_TEAMS';
  END IF;

  v_target_size := GREATEST(COALESCE(p_target_size, 4), 2);
  v_group_count := COALESCE(p_group_count, CEIL(v_team_count::numeric / v_target_size)::int);
  v_group_count := GREATEST(v_group_count, 1);

  DELETE FROM public.league_group_teams
  WHERE group_id IN (
    SELECT g.id
    FROM public.league_groups g
    WHERE g.division_id = p_division_id
  );

  DELETE FROM public.league_groups
  WHERE division_id = p_division_id;

  FOR v_idx IN 1..v_group_count LOOP
    INSERT INTO public.league_groups (
      division_id,
      name,
      sort_order,
      updated_at
    )
    VALUES (
      p_division_id,
      CASE
        WHEN v_idx <= 26 THEN CHR(64 + v_idx)
        ELSE CONCAT('G', v_idx)
      END,
      v_idx,
      now()
    )
    RETURNING id INTO v_group_id;

    v_group_ids := array_append(v_group_ids, v_group_id);
  END LOOP;

  CREATE TEMP TABLE tmp_q6_team_order (
    team_id uuid PRIMARY KEY,
    order_key numeric,
    team_label text
  ) ON COMMIT DROP;

  IF to_regclass('public.player_club_stats') IS NOT NULL THEN
    EXECUTE format(
      $sql$
      INSERT INTO tmp_q6_team_order(team_id, order_key, team_label)
      SELECT
        t.id,
        COALESCE((COALESCE(psa.points, 0) + COALESCE(psb.points, 0)) / 2.0, 0)::numeric AS order_key,
        CONCAT(pa.display_name, ' / ', pb.display_name) AS team_label
      FROM public.league_teams t
      JOIN public.players pa ON pa.id = t.player_id_a
      JOIN public.players pb ON pb.id = t.player_id_b
      LEFT JOIN public.player_club_stats psa
        ON psa.club_id = %L::uuid
       AND psa.player_id = t.player_id_a
      LEFT JOIN public.player_club_stats psb
        ON psb.club_id = %L::uuid
       AND psb.player_id = t.player_id_b
      WHERE t.division_id = %L::uuid
      $sql$,
      v_club_id,
      v_club_id,
      p_division_id
    );
  ELSE
    INSERT INTO tmp_q6_team_order(team_id, order_key, team_label)
    SELECT
      t.id,
      0::numeric AS order_key,
      CONCAT(pa.display_name, ' / ', pb.display_name) AS team_label
    FROM public.league_teams t
    JOIN public.players pa ON pa.id = t.player_id_a
    JOIN public.players pb ON pb.id = t.player_id_b
    WHERE t.division_id = p_division_id;
  END IF;

  FOR r IN
    SELECT team_id, order_key, team_label
    FROM tmp_q6_team_order
    ORDER BY order_key DESC, team_label ASC
  LOOP
    v_pos := v_pos + 1;
    v_cycle := FLOOR((v_pos - 1)::numeric / v_group_count)::int;
    v_offset := (v_pos - 1) % v_group_count;

    IF (v_cycle % 2) = 0 THEN
      v_assign_idx := v_offset + 1;
    ELSE
      v_assign_idx := (v_group_count - v_offset);
    END IF;

    INSERT INTO public.league_group_teams (group_id, team_id, seed_order)
    VALUES (v_group_ids[v_assign_idx], r.team_id, v_pos);
  END LOOP;

  RETURN v_group_count;
END;
$$;
CREATE OR REPLACE FUNCTION public.club_generate_group_fixture(
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
  v_has_fixture boolean;
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
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT
    g.id,
    g.division_id,
    l.club_id,
    c.name AS club_name
  INTO v_group
  FROM public.league_groups g
  JOIN public.league_divisions d ON d.id = g.division_id
  JOIN public.club_leagues l ON l.id = d.league_id
  JOIN public.clubs c ON c.id = l.club_id
  WHERE g.id = p_group_id;

  IF v_group.id IS NULL THEN
    RAISE EXCEPTION 'GROUP_NOT_FOUND';
  END IF;

  IF NOT public.q6_can_manage_club(v_group.club_id, v_uid) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.league_matches lm
    WHERE lm.group_id = p_group_id
  ) INTO v_has_fixture;

  IF COALESCE(v_has_fixture, false) THEN
    RAISE EXCEPTION 'FIXTURE_ALREADY_EXISTS';
  END IF;

  SELECT ARRAY_AGG(lgt.team_id ORDER BY COALESCE(lgt.seed_order, 9999), lgt.created_at),
         COUNT(*)::int
    INTO v_arr, v_team_count
  FROM public.league_group_teams lgt
  WHERE lgt.group_id = p_group_id;

  IF v_team_count < 2 THEN
    RAISE EXCEPTION 'NOT_ENOUGH_TEAMS';
  END IF;

  IF (v_team_count % 2) = 1 THEN
    v_arr := array_append(v_arr, NULL::uuid);
  END IF;

  v_even_n := array_length(v_arr, 1);
  v_half := v_even_n / 2;

  FOR v_round IN 1..(v_even_n - 1) LOOP
    FOR v_i IN 1..v_half LOOP
      v_team_a := v_arr[v_i];
      v_team_b := v_arr[v_even_n - v_i + 1];

      IF v_team_a IS NULL OR v_team_b IS NULL THEN
        CONTINUE;
      END IF;

      INSERT INTO public.matches (
        match_at,
        club_name,
        club_name_raw,
        club_id,
        status,
        notes,
        max_players,
        created_by,
        match_source,
        updated_at
      )
      VALUES (
        now(),
        v_group.club_name,
        v_group.club_name,
        v_group.club_id,
        'scheduled',
        CONCAT('Liga - grupo ', p_group_id::text, ' - ronda ', v_round::text),
        4,
        v_uid,
        'direct',
        now()
      )
      RETURNING id INTO v_match_id;

      INSERT INTO public.league_matches (
        group_id,
        round_index,
        team_a_id,
        team_b_id,
        match_id,
        updated_at
      )
      VALUES (
        p_group_id,
        v_round,
        v_team_a,
        v_team_b,
        v_match_id,
        now()
      );

      INSERT INTO public.match_players (match_id, player_id, team)
      SELECT v_match_id, t.player_id_a, 'A'
      FROM public.league_teams t
      WHERE t.id = v_team_a;

      INSERT INTO public.match_players (match_id, player_id, team)
      SELECT v_match_id, t.player_id_b, 'A'
      FROM public.league_teams t
      WHERE t.id = v_team_a;

      INSERT INTO public.match_players (match_id, player_id, team)
      SELECT v_match_id, t.player_id_a, 'B'
      FROM public.league_teams t
      WHERE t.id = v_team_b;

      INSERT INTO public.match_players (match_id, player_id, team)
      SELECT v_match_id, t.player_id_b, 'B'
      FROM public.league_teams t
      WHERE t.id = v_team_b;

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
  FOR UPDATE;

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
-- 4) RPCs lectura
CREATE OR REPLACE FUNCTION public.club_get_group_table(
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
    SELECT lgt.team_id
    FROM public.league_group_teams lgt
    WHERE lgt.group_id = p_group_id
  ),
  matches_base AS (
    SELECT
      lm.id,
      lm.team_a_id,
      lm.team_b_id,
      m.match_at,
      mr.winner_team,
      mr.sets
    FROM public.league_matches lm
    JOIN public.matches m ON m.id = lm.match_id
    JOIN public.match_results mr ON mr.match_id = m.id
    WHERE lm.group_id = p_group_id
      AND m.status = 'completed'
      AND mr.winner_team IS NOT NULL
      AND mr.sets IS NOT NULL
      AND jsonb_typeof(mr.sets) = 'array'
      AND jsonb_array_length(mr.sets) > 0
  ),
  team_rows AS (
    SELECT
      mb.id AS league_match_id,
      mb.match_at,
      mb.winner_team,
      mb.sets,
      mb.team_a_id AS team_id,
      'A'::text AS team_side
    FROM matches_base mb
    UNION ALL
    SELECT
      mb.id AS league_match_id,
      mb.match_at,
      mb.winner_team,
      mb.sets,
      mb.team_b_id AS team_id,
      'B'::text AS team_side
    FROM matches_base mb
  ),
  set_rows AS (
    SELECT
      tr.team_id,
      tr.league_match_id,
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
      sr.league_match_id,
      SUM(
        CASE
          WHEN sr.ga IS NULL OR sr.gb IS NULL THEN 0
          WHEN sr.team_side = 'A' AND sr.ga > sr.gb THEN 1
          WHEN sr.team_side = 'B' AND sr.gb > sr.ga THEN 1
          ELSE 0
        END
      )::bigint AS sets_won,
      SUM(
        CASE
          WHEN sr.ga IS NULL OR sr.gb IS NULL THEN 0
          WHEN sr.team_side = 'A' AND sr.ga < sr.gb THEN 1
          WHEN sr.team_side = 'B' AND sr.gb < sr.ga THEN 1
          ELSE 0
        END
      )::bigint AS sets_lost
    FROM set_rows sr
    GROUP BY sr.team_id, sr.league_match_id
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
    LEFT JOIN sets_agg sa
      ON sa.team_id = tr.team_id
     AND sa.league_match_id = tr.league_match_id
    GROUP BY tr.team_id
  )
  SELECT
    bt.team_id,
    COALESCE(a.played, 0) AS played,
    COALESCE(a.wins, 0) AS wins,
    COALESCE(a.losses, 0) AS losses,
    (COALESCE(a.wins, 0) * 3)::bigint AS points,
    COALESCE(a.sets_won, 0) AS sets_won,
    COALESCE(a.sets_lost, 0) AS sets_lost,
    a.last_match_at
  FROM base_teams bt
  LEFT JOIN team_match_agg a ON a.team_id = bt.team_id
  ORDER BY points DESC, wins DESC, sets_won DESC, sets_lost ASC, last_match_at DESC NULLS LAST;
$$;

-- 5) Grants
REVOKE ALL ON TABLE public.club_leagues FROM PUBLIC;
REVOKE ALL ON TABLE public.league_divisions FROM PUBLIC;
REVOKE ALL ON TABLE public.league_teams FROM PUBLIC;
REVOKE ALL ON TABLE public.league_groups FROM PUBLIC;
REVOKE ALL ON TABLE public.league_group_teams FROM PUBLIC;
REVOKE ALL ON TABLE public.league_matches FROM PUBLIC;

GRANT SELECT ON TABLE public.club_leagues TO authenticated;
GRANT SELECT ON TABLE public.league_divisions TO authenticated;
GRANT SELECT ON TABLE public.league_teams TO authenticated;
GRANT SELECT ON TABLE public.league_groups TO authenticated;
GRANT SELECT ON TABLE public.league_group_teams TO authenticated;
GRANT SELECT ON TABLE public.league_matches TO authenticated;

REVOKE ALL ON FUNCTION public.q6_is_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.q6_can_manage_club(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.club_create_league(uuid, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.club_create_league_division(uuid, text, text, int, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.club_register_league_team(uuid, uuid, uuid, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.club_create_league_group(uuid, text, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.club_assign_team_to_group(uuid, uuid, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.club_auto_create_groups(uuid, int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.club_generate_group_fixture(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.club_schedule_league_match(uuid, uuid, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.club_get_group_table(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.q6_is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.q6_can_manage_club(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_create_league(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_create_league_division(uuid, text, text, int, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_register_league_team(uuid, uuid, uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_create_league_group(uuid, text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_assign_team_to_group(uuid, uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_auto_create_groups(uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_generate_group_fixture(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_schedule_league_match(uuid, uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_get_group_table(uuid) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';


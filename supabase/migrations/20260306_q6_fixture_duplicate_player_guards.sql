-- STAGE Q6 HOTFIX: guards para evitar jugadores duplicados en division/grupo

BEGIN;

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
  v_dup_players text;
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

  SELECT STRING_AGG(
           DISTINCT COALESCE(p.display_name, q.player_id::text),
           ', '
         )
    INTO v_dup_players
  FROM (
    SELECT t.player_id_a AS player_id
    FROM public.league_teams t
    WHERE t.division_id = p_division_id
      AND t.player_id_a IN (p_player_id_a, p_player_id_b)
    UNION
    SELECT t.player_id_b AS player_id
    FROM public.league_teams t
    WHERE t.division_id = p_division_id
      AND t.player_id_b IN (p_player_id_a, p_player_id_b)
  ) q
  LEFT JOIN public.players p ON p.id = q.player_id;

  IF v_dup_players IS NOT NULL THEN
    RAISE EXCEPTION 'PLAYER_ALREADY_REGISTERED_IN_DIVISION'
      USING DETAIL = CONCAT('Jugadores ya inscriptos en la division: ', v_dup_players),
            HINT = 'Cada jugador solo puede pertenecer a un equipo por division.';
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
  v_dup_players text;
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

  SELECT STRING_AGG(
           COALESCE(p.display_name, dup.player_id::text),
           ', ' ORDER BY COALESCE(p.display_name, dup.player_id::text)
         )
    INTO v_dup_players
  FROM (
    SELECT p.player_id
    FROM public.league_group_teams lgt
    JOIN public.league_teams t ON t.id = lgt.team_id
    CROSS JOIN LATERAL (
      VALUES (t.player_id_a), (t.player_id_b)
    ) AS p(player_id)
    WHERE lgt.group_id = p_group_id
    GROUP BY p.player_id
    HAVING COUNT(*) > 1
  ) dup
  LEFT JOIN public.players p ON p.id = dup.player_id;

  IF v_dup_players IS NOT NULL THEN
    RAISE EXCEPTION 'DUPLICATE_PLAYER_IN_GROUP'
      USING DETAIL = CONCAT('Jugadores repetidos en el grupo: ', v_dup_players),
            HINT = 'Corrige equipos para que cada jugador aparezca una sola vez y vuelve a generar fixture.';
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

COMMIT;

NOTIFY pgrst, 'reload schema';

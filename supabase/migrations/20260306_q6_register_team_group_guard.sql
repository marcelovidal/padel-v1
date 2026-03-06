-- STAGE Q6 HOTFIX: cerrar altas/asignaciones cuando ya existe fixture en la division

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

  IF EXISTS (
    SELECT 1
    FROM public.league_matches lm
    JOIN public.league_groups g ON g.id = lm.group_id
    WHERE g.division_id = p_division_id
  ) THEN
    RAISE EXCEPTION 'TEAM_REGISTRATION_CLOSED_BY_FIXTURE'
      USING DETAIL = 'La division ya tiene fixture generado.',
            HINT = 'Si necesitas agregar equipos, elimina fixture y vuelve a generar grupos.';
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

  IF EXISTS (
    SELECT 1
    FROM public.league_matches lm
    JOIN public.league_groups g ON g.id = lm.group_id
    WHERE g.division_id = v_group_division_id
  ) THEN
    RAISE EXCEPTION 'FIXTURE_ALREADY_EXISTS'
      USING DETAIL = 'La division ya tiene fixture generado.',
            HINT = 'No se pueden mover equipos de grupo con fixture creado.';
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

REVOKE ALL ON FUNCTION public.club_register_league_team(uuid, uuid, uuid, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.club_assign_team_to_group(uuid, uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_register_league_team(uuid, uuid, uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_assign_team_to_group(uuid, uuid, int) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Fix: permitir mover parejas de grupo en ligas y torneos.
-- Antes, el UNIQUE (team_id) en league_group_teams / tournament_group_teams
-- rechazaba el INSERT con 23505 al intentar mover de grupo.
-- Ahora se borra la asignación previa antes de insertar.

-- ============================================================
-- LIGA: club_assign_team_to_group
-- ============================================================
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

  -- Borrar asignación previa si existe (permite mover entre grupos)
  DELETE FROM public.league_group_teams
  WHERE team_id = p_team_id;

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

REVOKE ALL ON FUNCTION public.club_assign_team_to_group(uuid, uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_assign_team_to_group(uuid, uuid, int) TO authenticated;

-- ============================================================
-- TORNEO: club_assign_tournament_team_to_group
-- ============================================================
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

  -- Port de liga: bloquear si el grupo destino ya tiene fixture
  IF EXISTS (
    SELECT 1
    FROM public.tournament_matches tm
    WHERE tm.group_id = p_group_id
  ) THEN
    RAISE EXCEPTION 'FIXTURE_ALREADY_EXISTS'
      USING DETAIL = 'El grupo ya tiene fixture generado.',
            HINT = 'No se pueden mover equipos a un grupo con fixture creado.';
  END IF;

  -- Borrar asignación previa si existe (permite mover entre grupos)
  DELETE FROM public.tournament_group_teams
  WHERE team_id = p_team_id;

  INSERT INTO public.tournament_group_teams (group_id, team_id, seed_order)
  VALUES (p_group_id, p_team_id, p_seed_order)
  ON CONFLICT (group_id, team_id) DO UPDATE SET seed_order = EXCLUDED.seed_order;
END;
$$;

REVOKE ALL ON FUNCTION public.club_assign_tournament_team_to_group(uuid, uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_assign_tournament_team_to_group(uuid, uuid, int) TO authenticated;

NOTIFY pgrst, 'reload schema';

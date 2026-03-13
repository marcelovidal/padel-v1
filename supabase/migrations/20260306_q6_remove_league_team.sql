-- STAGE Q6 HOTFIX: eliminar equipo de division desde UI admin

BEGIN;

CREATE OR REPLACE FUNCTION public.club_remove_league_team(
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
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT l.club_id
    INTO v_club_id
  FROM public.league_teams t
  JOIN public.league_divisions d ON d.id = t.division_id
  JOIN public.club_leagues l ON l.id = d.league_id
  WHERE t.id = p_team_id;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'TEAM_NOT_FOUND';
  END IF;

  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.league_matches lm
    WHERE lm.team_a_id = p_team_id
       OR lm.team_b_id = p_team_id
  ) THEN
    RAISE EXCEPTION 'TEAM_HAS_FIXTURE';
  END IF;

  DELETE FROM public.league_group_teams
  WHERE team_id = p_team_id;

  DELETE FROM public.league_teams
  WHERE id = p_team_id;
END;
$$;

REVOKE ALL ON FUNCTION public.club_remove_league_team(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_remove_league_team(uuid) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

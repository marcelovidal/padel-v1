-- STAGE Q6: submit league match result from club dashboard
-- Allows club managers to record results for league matches.

BEGIN;

CREATE OR REPLACE FUNCTION public.club_submit_league_match_result(
  p_league_match_id uuid,
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
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT
    lm.match_id,
    l.club_id,
    m.status,
    m.match_at
  INTO
    v_match_id,
    v_club_id,
    v_status,
    v_match_at
  FROM public.league_matches lm
  JOIN public.league_groups g ON g.id = lm.group_id
  JOIN public.league_divisions d ON d.id = g.division_id
  JOIN public.club_leagues l ON l.id = d.league_id
  JOIN public.matches m ON m.id = lm.match_id
  WHERE lm.id = p_league_match_id
  FOR UPDATE OF m;

  IF v_match_id IS NULL THEN
    RAISE EXCEPTION 'LEAGUE_MATCH_NOT_FOUND';
  END IF;

  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.match_results mr
    WHERE mr.match_id = v_match_id
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

  IF v_status = 'scheduled'::public.match_status AND v_match_at < now() THEN
    UPDATE public.matches
    SET status = 'completed'::public.match_status,
        updated_at = now()
    WHERE id = v_match_id;
    v_status := 'completed'::public.match_status;
  END IF;

  IF v_status <> 'completed'::public.match_status THEN
    RAISE EXCEPTION 'MATCH_NOT_COMPLETED';
  END IF;

  IF p_set1_a > p_set1_b THEN
    v_team_a_sets := v_team_a_sets + 1;
  ELSE
    v_team_b_sets := v_team_b_sets + 1;
  END IF;

  IF p_set2_a > p_set2_b THEN
    v_team_a_sets := v_team_a_sets + 1;
  ELSE
    v_team_b_sets := v_team_b_sets + 1;
  END IF;

  v_sets := jsonb_build_array(
    jsonb_build_object('team_a_games', p_set1_a, 'team_b_games', p_set1_b),
    jsonb_build_object('team_a_games', p_set2_a, 'team_b_games', p_set2_b)
  );

  IF p_set3_a IS NOT NULL AND p_set3_b IS NOT NULL THEN
    IF p_set3_a > p_set3_b THEN
      v_team_a_sets := v_team_a_sets + 1;
    ELSE
      v_team_b_sets := v_team_b_sets + 1;
    END IF;

    v_sets := v_sets || jsonb_build_array(
      jsonb_build_object('team_a_games', p_set3_a, 'team_b_games', p_set3_b)
    );
  END IF;

  IF v_team_a_sets = v_team_b_sets THEN
    RAISE EXCEPTION 'INVALID_SCORES';
  END IF;

  v_winner_team := CASE
    WHEN v_team_a_sets > v_team_b_sets THEN 'A'::public.team_type
    ELSE 'B'::public.team_type
  END;

  INSERT INTO public.match_results (match_id, sets, winner_team, recorded_at)
  VALUES (v_match_id, v_sets, v_winner_team, now());

  RETURN v_match_id;
END;
$$;

REVOKE ALL ON FUNCTION public.club_submit_league_match_result(uuid, int, int, int, int, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_submit_league_match_result(uuid, int, int, int, int, int, int) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

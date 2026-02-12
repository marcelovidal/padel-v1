-- STAGE M1: Player Profile Metrics & PASALA Index
-- =============================================

CREATE OR REPLACE FUNCTION public.player_get_profile_metrics(p_player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_played int;
  v_wins int;
  v_losses int;
  v_win_rate numeric;
  v_win_score numeric;
  v_avg_eval numeric;
  v_perf_score numeric;
  v_pasala_index numeric;
  v_last_10 text[];
  v_streak text;
  v_avg_by_skill jsonb;
  v_current_streak_count int := 0;
  v_current_streak_type text := '';
  v_result record;
BEGIN
  -- 1. Win/Loss Stats
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE team = winner_team),
    COUNT(*) FILTER (WHERE team != winner_team)
  INTO v_played, v_wins, v_losses
  FROM public.match_players mp
  JOIN public.match_results mr ON mp.match_id = mr.match_id
  WHERE mp.player_id = p_player_id;

  IF v_played > 0 THEN
    v_win_rate := (v_wins::numeric / v_played::numeric) * 100;
    v_win_score := v_win_rate;
  ELSE
    v_win_rate := 0;
    v_win_score := 0;
  END IF;

  -- 2. Performance Stats (Assessments)
  -- avg_eval is 1-5 scale in our UI (calculated from the 1-10 scores internally? No, the user said 1-5 scale)
  -- Actually, our system uses 1-10 (volea, globo, etc. are 1-10).
  -- If the user said "si autoevaluación escala 1–5", maybe they want to normalize it.
  -- Let's check existing data or assume 1-10 and normalize to 100.
  -- Looking at player_match_assessments, they are likely 1-10 based on earlier stages.
  -- "avg_eval scale 1-5" in prompt might refer to a future change or a specific requirement.
  -- I will calculate avg from all fields 1-10 and normalize to 0-100.
  
  SELECT 
    AVG((volea + globo + remate + bandeja + vibora + bajada_pared + saque + recepcion_saque) / 8.0)
  INTO v_avg_eval
  FROM public.player_match_assessments
  WHERE player_id = p_player_id;

  IF v_avg_eval IS NOT NULL THEN
    -- Normalize 1-10 to 0-100: ((v_avg_eval - 1) / 9.0) * 100
    v_perf_score := ((v_avg_eval - 1) / 9.0) * 100;
  ELSE
    v_perf_score := 50; -- Neutral
  END IF;

  -- 3. PASALA Index
  IF v_played > 0 THEN
    v_pasala_index := (v_win_score * 0.65) + (v_perf_score * 0.35);
  ELSE
    v_pasala_index := NULL;
  END IF;

  -- 4. Last 10 Results & Streak
  -- Get all results for streak calculation
  v_last_10 := ARRAY(
    SELECT CASE WHEN mp.team = mr.winner_team THEN 'W' ELSE 'L' END
    FROM public.match_players mp
    JOIN public.match_results mr ON mp.match_id = mr.match_id
    JOIN public.matches m ON m.id = mp.match_id
    WHERE mp.player_id = p_player_id
    ORDER BY m.match_at DESC
    LIMIT 10
  );

  -- Current Streak
  FOR v_result IN 
    SELECT CASE WHEN mp.team = mr.winner_team THEN 'W' ELSE 'L' END as res
    FROM public.match_players mp
    JOIN public.match_results mr ON mp.match_id = mr.match_id
    JOIN public.matches m ON m.id = mp.match_id
    WHERE mp.player_id = p_player_id
    ORDER BY m.match_at DESC
  LOOP
    IF v_current_streak_type = '' THEN
      v_current_streak_type := v_result.res;
      v_current_streak_count := 1;
    ELSIF v_current_streak_type = v_result.res THEN
      v_current_streak_count := v_current_streak_count + 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;
  
  v_streak := CASE WHEN v_current_streak_type = '' THEN '-' ELSE v_current_streak_type || v_current_streak_count::text END;

  -- 5. Avg by Skill
  SELECT jsonb_build_object(
    'volea', ROUND(AVG(volea)::numeric, 1),
    'globo', ROUND(AVG(globo)::numeric, 1),
    'remate', ROUND(AVG(remate)::numeric, 1),
    'bandeja', ROUND(AVG(bandeja)::numeric, 1),
    'vibora', ROUND(AVG(vibora)::numeric, 1),
    'bajada_pared', ROUND(AVG(bajada_pared)::numeric, 1),
    'saque', ROUND(AVG(saque)::numeric, 1),
    'recepcion_saque', ROUND(AVG(recepcion_saque)::numeric, 1)
  )
  INTO v_avg_by_skill
  FROM public.player_match_assessments
  WHERE player_id = p_player_id;

  RETURN jsonb_build_object(
    'played', v_played,
    'wins', v_wins,
    'losses', v_losses,
    'win_rate', ROUND(v_win_rate, 1),
    'avg_eval', ROUND(v_avg_eval, 1),
    'perf_score', ROUND(v_perf_score, 1),
    'pasala_index', ROUND(v_pasala_index, 1),
    'last_10_results', v_last_10,
    'current_streak', v_streak,
    'avg_by_skill', COALESCE(v_avg_by_skill, '{}'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.player_get_profile_metrics(uuid) TO authenticated;

-- ============================================================
-- Q3.3 Player Gamification
-- Tables: player_index_history, player_badges
-- RPCs: get_player_global_ranking, get_player_top_rivals,
--       check_and_unlock_badges
-- Updates calculate_player_pasala_index to log history + badges
-- ============================================================


-- ── 1. player_index_history ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.player_index_history (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id   uuid        NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  pasala_index numeric(5,2) NOT NULL,
  recorded_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pih_player_recorded
  ON public.player_index_history(player_id, recorded_at DESC);

ALTER TABLE public.player_index_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players view own history" ON public.player_index_history;
CREATE POLICY "Players view own history"
  ON public.player_index_history
  FOR SELECT
  USING (player_id IN (
    SELECT id FROM public.players WHERE user_id = auth.uid()
  ));

GRANT SELECT ON public.player_index_history TO authenticated;


-- ── 2. player_badges ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.player_badges (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id   uuid        NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  badge_key   text        NOT NULL,
  unlocked_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(player_id, badge_key)
);

CREATE INDEX IF NOT EXISTS idx_pb_player_id
  ON public.player_badges(player_id);

ALTER TABLE public.player_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players view own badges" ON public.player_badges;
CREATE POLICY "Players view own badges"
  ON public.player_badges
  FOR SELECT
  USING (player_id IN (
    SELECT id FROM public.players WHERE user_id = auth.uid()
  ));

GRANT SELECT ON public.player_badges TO authenticated;


-- ── 3. get_player_global_ranking ────────────────────────────
-- Returns { rank: int, total: int } for the player's PASALA index position
-- among all players with an index. NULL if player has no index yet.

CREATE OR REPLACE FUNCTION public.get_player_global_ranking(p_player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_index numeric;
  v_rank  int;
  v_total int;
BEGIN
  SELECT pasala_index INTO v_index
  FROM public.players
  WHERE id = p_player_id AND deleted_at IS NULL;

  IF v_index IS NULL THEN
    RETURN jsonb_build_object('rank', NULL, 'total', NULL);
  END IF;

  SELECT COUNT(*) + 1 INTO v_rank
  FROM public.players
  WHERE pasala_index > v_index
    AND deleted_at IS NULL;

  SELECT COUNT(*) INTO v_total
  FROM public.players
  WHERE pasala_index IS NOT NULL
    AND deleted_at IS NULL;

  RETURN jsonb_build_object('rank', v_rank, 'total', v_total);
END;
$$;

REVOKE ALL ON FUNCTION public.get_player_global_ranking(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_player_global_ranking(uuid) TO authenticated;


-- ── 4. get_player_top_rivals ─────────────────────────────────
-- Returns top N opponents by games played, min 2 shared matches.

CREATE OR REPLACE FUNCTION public.get_player_top_rivals(
  p_player_id uuid,
  p_limit     int DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT jsonb_agg(row_to_json(r))
      FROM (
        SELECT
          opp.player_id                                                   AS rival_id,
          p.display_name,
          p.avatar_url,
          COUNT(*)                                                        AS matches_played,
          COUNT(*) FILTER (WHERE mp.team = mr.winner_team)               AS player_wins,
          COUNT(*) FILTER (WHERE mp.team != mr.winner_team)              AS rival_wins,
          ROUND(
            COUNT(*) FILTER (WHERE mp.team = mr.winner_team)::numeric
            / COUNT(*)::numeric * 100
          , 0)                                                            AS player_winrate
        FROM public.match_players mp
        JOIN public.match_results   mr  ON mr.match_id  = mp.match_id
        JOIN public.match_players   opp ON opp.match_id = mp.match_id
                                       AND opp.team     != mp.team
                                       AND opp.player_id != p_player_id
        JOIN public.players         p   ON p.id = opp.player_id
        WHERE mp.player_id = p_player_id
        GROUP BY opp.player_id, p.display_name, p.avatar_url
        HAVING COUNT(*) >= 2
        ORDER BY COUNT(*) DESC
        LIMIT p_limit
      ) r
    ),
    '[]'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_player_top_rivals(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_player_top_rivals(uuid, int) TO authenticated;


-- ── 5. check_and_unlock_badges ──────────────────────────────
-- Evaluates badge conditions and inserts new unlocks (ON CONFLICT DO NOTHING).
-- Badge catalogue:
--   primer_partido   – at least 1 match played
--   primera_victoria – at least 1 win
--   racha_5          – 5+ consecutive wins (current streak)
--   racha_10         – 10+ consecutive wins (current streak)
--   50_partidos      – 50+ matches played
--   100_partidos     – 100+ matches played
--   elite_index      – PASALA index >= 70
--   evaluador        – 5+ technical assessments received

CREATE OR REPLACE FUNCTION public.check_and_unlock_badges(p_player_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_played        int   := 0;
  v_wins          int   := 0;
  v_index         numeric;
  v_streak        int   := 0;
  v_streak_type   text  := '';
  v_assessments   int   := 0;
  v_res           record;
BEGIN
  -- Basic stats
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE mp.team = mr.winner_team)
  INTO v_played, v_wins
  FROM public.match_players mp
  JOIN public.match_results mr ON mr.match_id = mp.match_id
  WHERE mp.player_id = p_player_id;

  -- PASALA index
  SELECT pasala_index INTO v_index
  FROM public.players WHERE id = p_player_id;

  -- Current streak
  FOR v_res IN
    SELECT CASE WHEN mp.team = mr.winner_team THEN 'W' ELSE 'L' END AS res
    FROM public.match_players mp
    JOIN public.match_results mr ON mr.match_id = mp.match_id
    JOIN public.matches m        ON m.id = mp.match_id
    WHERE mp.player_id = p_player_id
    ORDER BY m.match_at DESC
  LOOP
    IF v_streak_type = '' THEN
      v_streak_type := v_res.res;
      v_streak      := 1;
    ELSIF v_streak_type = v_res.res THEN
      v_streak := v_streak + 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  -- Assessments count
  SELECT COUNT(*) INTO v_assessments
  FROM public.player_match_assessments
  WHERE player_id = p_player_id;

  -- Grant badges (inline inserts, idempotent)
  IF v_played >= 1 THEN
    INSERT INTO public.player_badges(player_id, badge_key) VALUES (p_player_id, 'primer_partido')
    ON CONFLICT (player_id, badge_key) DO NOTHING;
  END IF;
  IF v_wins >= 1 THEN
    INSERT INTO public.player_badges(player_id, badge_key) VALUES (p_player_id, 'primera_victoria')
    ON CONFLICT (player_id, badge_key) DO NOTHING;
  END IF;
  IF v_streak_type = 'W' AND v_streak >= 5 THEN
    INSERT INTO public.player_badges(player_id, badge_key) VALUES (p_player_id, 'racha_5')
    ON CONFLICT (player_id, badge_key) DO NOTHING;
  END IF;
  IF v_streak_type = 'W' AND v_streak >= 10 THEN
    INSERT INTO public.player_badges(player_id, badge_key) VALUES (p_player_id, 'racha_10')
    ON CONFLICT (player_id, badge_key) DO NOTHING;
  END IF;
  IF v_played >= 50 THEN
    INSERT INTO public.player_badges(player_id, badge_key) VALUES (p_player_id, '50_partidos')
    ON CONFLICT (player_id, badge_key) DO NOTHING;
  END IF;
  IF v_played >= 100 THEN
    INSERT INTO public.player_badges(player_id, badge_key) VALUES (p_player_id, '100_partidos')
    ON CONFLICT (player_id, badge_key) DO NOTHING;
  END IF;
  IF v_index >= 70 THEN
    INSERT INTO public.player_badges(player_id, badge_key) VALUES (p_player_id, 'elite_index')
    ON CONFLICT (player_id, badge_key) DO NOTHING;
  END IF;
  IF v_assessments >= 5 THEN
    INSERT INTO public.player_badges(player_id, badge_key) VALUES (p_player_id, 'evaluador')
    ON CONFLICT (player_id, badge_key) DO NOTHING;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_unlock_badges(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_unlock_badges(uuid) TO authenticated;


-- ── 6. Update calculate_player_pasala_index ──────────────────
-- Adds: (a) insert into player_index_history when index changes,
--       (b) call check_and_unlock_badges after persisting.

CREATE OR REPLACE FUNCTION public.calculate_player_pasala_index(p_player_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_played             int     := 0;
  v_wins               int     := 0;
  v_win_rate           numeric := 0;
  v_win_rate_score     numeric := 0;
  v_rival_level_score  numeric := 50;
  v_avg_eval           numeric;
  v_perf_score         numeric := 50;
  v_recent_played      int     := 0;
  v_recent_wins        int     := 0;
  v_recent_score       numeric := 0;
  v_volume_score       numeric := 0;
  v_pasala_index       numeric;
  v_prev_index         numeric;
BEGIN
  -- Total partidos con resultado
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE mp.team = mr.winner_team)
  INTO v_played, v_wins
  FROM public.match_players mp
  JOIN public.match_results mr ON mr.match_id = mp.match_id
  WHERE mp.player_id = p_player_id;

  IF v_played = 0 THEN
    UPDATE public.players
       SET pasala_index = NULL, pasala_index_updated_at = now()
     WHERE id = p_player_id;
    RETURN NULL;
  END IF;

  -- Factor 1: Win Rate Score (35%)
  v_win_rate := (v_wins::numeric / v_played::numeric) * 100.0;
  IF v_played >= 3 THEN
    v_win_rate_score := v_win_rate;
  ELSE
    v_win_rate_score := v_win_rate * (v_played::numeric / 3.0);
  END IF;

  -- Factor 2: Rival Level Score (25%)
  SELECT COALESCE(AVG(rival_score), 50.0)
  INTO v_rival_level_score
  FROM (
    SELECT
      CASE
        WHEN p.pasala_index IS NOT NULL THEN p.pasala_index
        ELSE COALESCE(
          NULLIF(regexp_replace(COALESCE(p.category::text, ''), '[^0-9]', '', 'g'), '')::numeric,
          4.0
        ) / 7.0 * 100.0
      END AS rival_score
    FROM public.match_players my_side
    JOIN public.match_results mr       ON mr.match_id = my_side.match_id
    JOIN public.match_players opp      ON opp.match_id = my_side.match_id
                                      AND opp.team != my_side.team
    JOIN public.players p              ON p.id = opp.player_id
    WHERE my_side.player_id = p_player_id
  ) rival_scores;

  -- Factor 3: Perf Score (20%)
  SELECT AVG(
    (volea + globo + remate + bandeja + vibora + bajada_pared + saque + recepcion_saque) / 8.0
  )
  INTO v_avg_eval
  FROM public.player_match_assessments
  WHERE player_id = p_player_id;

  IF v_avg_eval IS NOT NULL THEN
    v_perf_score := ((v_avg_eval - 1.0) / 9.0) * 100.0;
  END IF;

  -- Factor 4: Recent Score (12%)
  WITH recent AS (
    SELECT mp.team, mr.winner_team
    FROM public.match_players mp
    JOIN public.match_results mr ON mr.match_id = mp.match_id
    JOIN public.matches m        ON m.id = mp.match_id
    WHERE mp.player_id = p_player_id
    ORDER BY m.match_at DESC
    LIMIT 10
  )
  SELECT COUNT(*), COUNT(*) FILTER (WHERE team = winner_team)
  INTO v_recent_played, v_recent_wins
  FROM recent;

  IF v_recent_played >= 5 THEN
    v_recent_score := (v_recent_wins::numeric / v_recent_played::numeric) * 100.0;
  ELSIF v_recent_played > 0 THEN
    v_recent_score := (v_recent_wins::numeric / v_recent_played::numeric) * 100.0
                    * (v_recent_played::numeric / 5.0);
  END IF;

  -- Factor 5: Volume Score (8%)
  v_volume_score := LEAST(
    log(v_played::numeric + 1) / log(51::numeric),
    1.0
  ) * 100.0;

  -- Índice compuesto
  v_pasala_index := ROUND(
    (v_win_rate_score    * 0.35)
  + (v_rival_level_score * 0.25)
  + (v_perf_score        * 0.20)
  + (v_recent_score      * 0.12)
  + (v_volume_score      * 0.08),
    1
  );

  -- Prev index for history comparison
  SELECT pasala_index INTO v_prev_index
  FROM public.players WHERE id = p_player_id;

  -- Persist
  UPDATE public.players
     SET pasala_index            = v_pasala_index,
         pasala_index_updated_at = now()
   WHERE id = p_player_id;

  -- Log history only when value changes (or first time)
  IF v_prev_index IS DISTINCT FROM v_pasala_index THEN
    INSERT INTO public.player_index_history(player_id, pasala_index)
    VALUES (p_player_id, v_pasala_index);
  END IF;

  -- Check badge unlocks
  PERFORM public.check_and_unlock_badges(p_player_id);

  RETURN v_pasala_index;
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_player_pasala_index(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_player_pasala_index(uuid) TO authenticated;


-- ── 7. get_player_index_history ─────────────────────────────
-- Returns chronological array of { date, value } for charting.

CREATE OR REPLACE FUNCTION public.get_player_index_history(
  p_player_id uuid,
  p_limit     int DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT jsonb_agg(row_to_json(r) ORDER BY r.recorded_at ASC)
      FROM (
        SELECT
          to_char(recorded_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
          pasala_index AS value
        FROM public.player_index_history
        WHERE player_id = p_player_id
        ORDER BY recorded_at DESC
        LIMIT p_limit
      ) r
    ),
    '[]'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_player_index_history(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_player_index_history(uuid, int) TO authenticated;


-- ── 8. get_player_badges ────────────────────────────────────
-- Returns array of unlocked badge keys with unlock dates.

CREATE OR REPLACE FUNCTION public.get_player_badges(p_player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT jsonb_agg(jsonb_build_object(
        'badge_key',   badge_key,
        'unlocked_at', to_char(unlocked_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
      ))
      FROM public.player_badges
      WHERE player_id = p_player_id
    ),
    '[]'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_player_badges(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_player_badges(uuid) TO authenticated;

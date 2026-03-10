-- ============================================================
-- Q3.2 PasalaIndex v2
-- Algoritmo de 5 factores con persistencia en players table
--
-- Fórmula:
--   pasala_index = win_rate_score    * 0.35
--               + rival_level_score  * 0.25
--               + perf_score         * 0.20
--               + recent_score       * 0.12
--               + volume_score       * 0.08
-- ============================================================


-- ── 1. Columnas en players ──────────────────────────────────────────────────

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS pasala_index             numeric(5,2),
  ADD COLUMN IF NOT EXISTS pasala_index_updated_at  timestamptz;


-- ── 2. calculate_player_pasala_index ───────────────────────────────────────
-- Calcula el índice v2, lo persiste en players y lo retorna.
-- Llamado por recalculate_indexes_for_match y backfill_all_pasala_indexes.

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
BEGIN
  -- Total partidos con resultado cargado
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
  -- Mínimo 3 partidos para score completo; proporcional por debajo
  v_win_rate := (v_wins::numeric / v_played::numeric) * 100.0;
  IF v_played >= 3 THEN
    v_win_rate_score := v_win_rate;
  ELSE
    v_win_rate_score := v_win_rate * (v_played::numeric / 3.0);
  END IF;

  -- Factor 2: Rival Level Score (25%)
  -- Promedio del pasala_index de los rivales; si no tienen índice, usa categoría como proxy.
  -- category TEXT almacena enteros 1 (mejor) a 7 (principiante).
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

  -- Factor 3: Perf Score (20%) — evaluaciones técnicas entre compañeros
  -- 8 habilidades en escala 1-10, normalizadas a 0-100
  SELECT AVG(
    (volea + globo + remate + bandeja + vibora + bajada_pared + saque + recepcion_saque) / 8.0
  )
  INTO v_avg_eval
  FROM public.player_match_assessments
  WHERE player_id = p_player_id;

  IF v_avg_eval IS NOT NULL THEN
    v_perf_score := ((v_avg_eval - 1.0) / 9.0) * 100.0;
  END IF;

  -- Factor 4: Recent Score (12%) — win rate últimos 10 partidos
  -- Mínimo 5 partidos para score completo; proporcional por debajo
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

  -- Factor 5: Volume Score (8%) — escala logarítmica, 50 partidos = máximo
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

  -- Persistir
  UPDATE public.players
     SET pasala_index            = v_pasala_index,
         pasala_index_updated_at = now()
   WHERE id = p_player_id;

  RETURN v_pasala_index;
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_player_pasala_index(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_player_pasala_index(uuid) TO authenticated;


-- ── 3. recalculate_indexes_for_match ───────────────────────────────────────
-- Recalcula el índice de los 4 jugadores del partido.
-- Se llama desde el server action de carga de resultado.

CREATE OR REPLACE FUNCTION public.recalculate_indexes_for_match(p_match_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pid uuid;
BEGIN
  FOR v_pid IN
    SELECT DISTINCT player_id
    FROM public.match_players
    WHERE match_id = p_match_id
  LOOP
    PERFORM public.calculate_player_pasala_index(v_pid);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_indexes_for_match(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalculate_indexes_for_match(uuid) TO authenticated;


-- ── 4. backfill_all_pasala_indexes ─────────────────────────────────────────
-- Recalcula el índice para todos los jugadores con al menos 1 partido.
-- Retorna la cantidad de jugadores procesados.

CREATE OR REPLACE FUNCTION public.backfill_all_pasala_indexes()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pid   uuid;
  v_count int := 0;
BEGIN
  FOR v_pid IN
    SELECT DISTINCT mp.player_id
    FROM public.match_players mp
    JOIN public.match_results mr ON mr.match_id = mp.match_id
  LOOP
    PERFORM public.calculate_player_pasala_index(v_pid);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_all_pasala_indexes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backfill_all_pasala_indexes() TO service_role;


-- ── 5. player_get_profile_metrics (v2) ─────────────────────────────────────
-- Actualiza el RPC existente para:
--   a) Usar el algoritmo v2 de 5 factores
--   b) Persistir el índice calculado en players.pasala_index
--   c) Agregar campos de desglose al objeto de retorno (sin romper campos existentes)

CREATE OR REPLACE FUNCTION public.player_get_profile_metrics(p_player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Campos existentes
  v_played               int;
  v_wins                 int;
  v_losses               int;
  v_win_rate             numeric;
  v_avg_eval             numeric;
  v_perf_score           numeric := 50;
  v_pasala_index         numeric;
  v_last_10              text[];
  v_streak               text;
  v_avg_by_skill         jsonb;
  v_current_streak_count int    := 0;
  v_current_streak_type  text   := '';
  v_result               record;
  -- Nuevos factores
  v_win_rate_score       numeric := 0;
  v_rival_level_score    numeric := 50;
  v_recent_played        int     := 0;
  v_recent_wins          int     := 0;
  v_recent_score         numeric := 0;
  v_volume_score         numeric := 0;
BEGIN
  -- 1. Win/Loss totales (solo partidos con resultado)
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE mp.team = mr.winner_team),
    COUNT(*) FILTER (WHERE mp.team != mr.winner_team)
  INTO v_played, v_wins, v_losses
  FROM public.match_players mp
  JOIN public.match_results mr ON mr.match_id = mp.match_id
  WHERE mp.player_id = p_player_id;

  IF v_played > 0 THEN
    v_win_rate := (v_wins::numeric / v_played::numeric) * 100.0;
    v_win_rate_score := CASE
      WHEN v_played >= 3 THEN v_win_rate
      ELSE v_win_rate * (v_played::numeric / 3.0)
    END;
  ELSE
    v_win_rate := 0;
    v_win_rate_score := 0;
  END IF;

  -- 2. Rival Level Score
  IF v_played > 0 THEN
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
  END IF;

  -- 3. Perf Score (evaluaciones técnicas)
  SELECT AVG(
    (volea + globo + remate + bandeja + vibora + bajada_pared + saque + recepcion_saque) / 8.0
  )
  INTO v_avg_eval
  FROM public.player_match_assessments
  WHERE player_id = p_player_id;

  IF v_avg_eval IS NOT NULL THEN
    v_perf_score := ((v_avg_eval - 1.0) / 9.0) * 100.0;
  END IF;

  -- 4. Recent Score (últimos 10 partidos)
  IF v_played > 0 THEN
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
  END IF;

  -- 5. Volume Score
  IF v_played > 0 THEN
    v_volume_score := LEAST(
      log(v_played::numeric + 1) / log(51::numeric),
      1.0
    ) * 100.0;
  END IF;

  -- Índice compuesto v2
  IF v_played > 0 THEN
    v_pasala_index := ROUND(
      (v_win_rate_score    * 0.35)
    + (v_rival_level_score * 0.25)
    + (v_perf_score        * 0.20)
    + (v_recent_score      * 0.12)
    + (v_volume_score      * 0.08),
      1
    );
    UPDATE public.players
       SET pasala_index            = v_pasala_index,
           pasala_index_updated_at = now()
     WHERE id = p_player_id;
  ELSE
    v_pasala_index := NULL;
  END IF;

  -- 6. Últimos 10 resultados + racha actual
  v_last_10 := ARRAY(
    SELECT CASE WHEN mp.team = mr.winner_team THEN 'W' ELSE 'L' END
    FROM public.match_players mp
    JOIN public.match_results mr ON mp.match_id = mr.match_id
    JOIN public.matches m        ON m.id = mp.match_id
    WHERE mp.player_id = p_player_id
    ORDER BY m.match_at DESC
    LIMIT 10
  );

  FOR v_result IN
    SELECT CASE WHEN mp.team = mr.winner_team THEN 'W' ELSE 'L' END AS res
    FROM public.match_players mp
    JOIN public.match_results mr ON mp.match_id = mr.match_id
    JOIN public.matches m        ON m.id = mp.match_id
    WHERE mp.player_id = p_player_id
    ORDER BY m.match_at DESC
  LOOP
    IF v_current_streak_type = '' THEN
      v_current_streak_type  := v_result.res;
      v_current_streak_count := 1;
    ELSIF v_current_streak_type = v_result.res THEN
      v_current_streak_count := v_current_streak_count + 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  v_streak := CASE
    WHEN v_current_streak_type = '' THEN '-'
    ELSE v_current_streak_type || v_current_streak_count::text
  END;

  -- 7. Promedio por habilidad
  SELECT jsonb_build_object(
    'volea',           ROUND(AVG(volea)::numeric, 1),
    'globo',           ROUND(AVG(globo)::numeric, 1),
    'remate',          ROUND(AVG(remate)::numeric, 1),
    'bandeja',         ROUND(AVG(bandeja)::numeric, 1),
    'vibora',          ROUND(AVG(vibora)::numeric, 1),
    'bajada_pared',    ROUND(AVG(bajada_pared)::numeric, 1),
    'saque',           ROUND(AVG(saque)::numeric, 1),
    'recepcion_saque', ROUND(AVG(recepcion_saque)::numeric, 1)
  )
  INTO v_avg_by_skill
  FROM public.player_match_assessments
  WHERE player_id = p_player_id;

  RETURN jsonb_build_object(
    -- ── Campos existentes (backward compatible) ──
    'played',          v_played,
    'wins',            v_wins,
    'losses',          v_losses,
    'win_rate',        ROUND(v_win_rate, 1),
    'avg_eval',        ROUND(v_avg_eval, 1),
    'perf_score',      ROUND(v_perf_score, 1),
    'pasala_index',    v_pasala_index,
    'last_10_results', v_last_10,
    'current_streak',  v_streak,
    'avg_by_skill',    COALESCE(v_avg_by_skill, '{}'::jsonb),
    -- ── Nuevos: desglose de factores ──
    'win_rate_score',    ROUND(v_win_rate_score, 1),
    'rival_level_score', ROUND(v_rival_level_score, 1),
    'recent_score',      ROUND(v_recent_score, 1),
    'volume_score',      ROUND(v_volume_score, 1)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.player_get_profile_metrics(uuid) TO authenticated;

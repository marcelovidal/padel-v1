-- Q4: Player Directory RPC
-- Returns paginated, filtered, and enriched player list
-- Includes activity badge, stats, PASALA index, and city prioritization

-- Drop old signature (p_category was int, now text)
DROP FUNCTION IF EXISTS public.get_players_directory(text, text, int, text, text, int, int);

CREATE OR REPLACE FUNCTION public.get_players_directory(
  p_viewer_city_id text DEFAULT NULL,
  p_query         text DEFAULT NULL,
  p_category      text DEFAULT NULL,
  p_activity      text DEFAULT NULL,   -- 'hot' | 'active' | 'occasional' | 'inactive' | 'new'
  p_order_by      text DEFAULT 'relevance', -- 'relevance' | 'index_desc' | 'win_rate_desc' | 'recent'
  p_limit         int  DEFAULT 24,
  p_offset        int  DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_players jsonb;
  v_total   bigint;
BEGIN
  WITH stats AS (
    -- Aggregate match stats per player (only matches with results count as "played")
    SELECT
      mp.player_id,
      COUNT(mr.match_id)                                                                  AS total_played,
      COUNT(mr.match_id) FILTER (WHERE mp.team = mr.winner_team)                         AS total_wins,
      COUNT(mr.match_id) FILTER (WHERE m.match_at >= NOW() - INTERVAL '30 days')         AS recent_played
    FROM match_players mp
    JOIN match_results mr ON mr.match_id = mp.match_id
    JOIN matches       m  ON m.id         = mp.match_id
    GROUP BY mp.player_id
  ),
  base AS (
    SELECT
      p.id,
      p.display_name,
      p.avatar_url,
      p.city,
      p.city_id,
      p.region_code,
      p.region_name,
      p.category,
      p.position,
      p.pasala_index,
      p.is_guest,
      p.user_id,
      COALESCE(s.total_played,  0) AS played,
      COALESCE(s.total_wins,    0) AS wins,
      COALESCE(s.recent_played, 0) AS recent_played,
      CASE
        WHEN COALESCE(s.total_played, 0) > 0
          THEN ROUND((COALESCE(s.total_wins, 0)::numeric / s.total_played::numeric) * 100, 1)
        ELSE 0
      END AS win_rate
    FROM players p
    LEFT JOIN stats s ON s.player_id = p.id
    WHERE
      p.status     = 'active'
      AND p.deleted_at IS NULL
      AND p.is_guest   = FALSE
      AND (
        p_query IS NULL OR p_query = ''
        OR p.display_name ILIKE '%' || p_query || '%'
        OR p.city         ILIKE '%' || p_query || '%'
      )
      AND (p_category IS NULL OR p.category = p_category)
  ),
  enriched AS (
    SELECT
      b.*,
      CASE
        WHEN b.played < 5              THEN 'new'
        WHEN b.recent_played = 0       THEN 'inactive'
        WHEN b.recent_played >= 12     THEN 'hot'
        WHEN b.recent_played >= 4      THEN 'active'
        ELSE                                'occasional'
      END AS activity_badge,
      (b.city_id IS NOT NULL AND b.city_id = p_viewer_city_id) AS is_same_city
    FROM base b
  ),
  filtered AS (
    SELECT * FROM enriched
    WHERE (p_activity IS NULL OR p_activity = '' OR activity_badge = p_activity)
  ),
  counted AS (
    SELECT COUNT(*) AS cnt FROM filtered
  ),
  paged AS (
    SELECT
      f.*,
      ROW_NUMBER() OVER (
        ORDER BY
          CASE WHEN p_order_by = 'relevance' AND f.is_same_city THEN 0 ELSE 1 END ASC,
          CASE WHEN p_order_by = 'index_desc'    THEN f.pasala_index   ELSE NULL END DESC NULLS LAST,
          CASE WHEN p_order_by = 'win_rate_desc' THEN f.win_rate       ELSE NULL END DESC NULLS LAST,
          CASE WHEN p_order_by = 'recent'        THEN f.recent_played  ELSE NULL END DESC NULLS LAST,
          CASE WHEN p_order_by = 'relevance'     THEN f.pasala_index   ELSE NULL END DESC NULLS LAST,
          f.display_name ASC
      ) AS rn
    FROM filtered f
    ORDER BY
      CASE WHEN p_order_by = 'relevance' AND f.is_same_city THEN 0 ELSE 1 END ASC,
      CASE WHEN p_order_by = 'index_desc'    THEN f.pasala_index   ELSE NULL END DESC NULLS LAST,
      CASE WHEN p_order_by = 'win_rate_desc' THEN f.win_rate       ELSE NULL END DESC NULLS LAST,
      CASE WHEN p_order_by = 'recent'        THEN f.recent_played  ELSE NULL END DESC NULLS LAST,
      CASE WHEN p_order_by = 'relevance'     THEN f.pasala_index   ELSE NULL END DESC NULLS LAST,
      f.display_name ASC
    LIMIT  p_limit
    OFFSET p_offset
  )
  SELECT
    (SELECT cnt FROM counted),
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id',             p.id,
          'display_name',   p.display_name,
          'avatar_url',     p.avatar_url,
          'city',           p.city,
          'city_id',        p.city_id,
          'region_code',    p.region_code,
          'region_name',    p.region_name,
          'category',       p.category,
          'position',       p.position,
          'pasala_index',   p.pasala_index,
          'is_guest',       p.is_guest,
          'user_id',        p.user_id,
          'played',         p.played,
          'wins',           p.wins,
          'win_rate',       p.win_rate,
          'activity_badge', p.activity_badge,
          'is_same_city',   p.is_same_city
        ) ORDER BY p.rn
      ),
      '[]'::jsonb
    )
  INTO v_total, v_players
  FROM paged p;

  RETURN jsonb_build_object(
    'total',   COALESCE(v_total, 0),
    'players', COALESCE(v_players, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_players_directory TO authenticated;

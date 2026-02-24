-- STAGE C1: Club Analytics Dashboard (operational metrics)

CREATE OR REPLACE FUNCTION public.club_get_dashboard_stats(
  p_club_id uuid DEFAULT NULL
)
RETURNS TABLE (
  club_id uuid,
  matches_last_7_days integer,
  matches_last_30_days integer,
  unique_players_last_30_days integer,
  matches_by_weekday jsonb,
  matches_by_hour jsonb,
  top_players jsonb,
  matches_by_category jsonb
)
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

  IF p_club_id IS NULL THEN
    SELECT c.id
      INTO v_club_id
    FROM public.clubs c
    WHERE c.deleted_at IS NULL
      AND c.claim_status = 'claimed'
      AND c.claimed_by = v_uid
    ORDER BY c.claimed_at DESC NULLS LAST, c.created_at DESC
    LIMIT 1;
  ELSE
    SELECT c.id
      INTO v_club_id
    FROM public.clubs c
    WHERE c.id = p_club_id
      AND c.deleted_at IS NULL
      AND c.claim_status = 'claimed'
      AND c.claimed_by = v_uid
    LIMIT 1;
  END IF;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'CLUB_NOT_FOUND';
  END IF;

  RETURN QUERY
  WITH club_matches_base AS (
    SELECT m.id, m.match_at
    FROM public.matches m
    WHERE m.deleted_at IS NULL
      AND m.club_id = v_club_id
      AND EXISTS (
        SELECT 1
        FROM public.match_results mr
        WHERE mr.match_id = m.id
      )
  ),
  club_matches_30 AS (
    SELECT *
    FROM club_matches_base
    WHERE match_at >= now() - interval '30 days'
  ),
  player_activity_30 AS (
    SELECT
      mp.player_id,
      p.display_name,
      p.category,
      COUNT(DISTINCT m30.id)::int AS matches_count
    FROM club_matches_30 m30
    JOIN public.match_players mp
      ON mp.match_id = m30.id
    JOIN public.players p
      ON p.id = mp.player_id
     AND p.deleted_at IS NULL
    GROUP BY mp.player_id, p.display_name, p.category
  ),
  weekday_counts AS (
    SELECT
      EXTRACT(DOW FROM m30.match_at)::int AS dow,
      COUNT(*)::int AS matches_count
    FROM club_matches_30 m30
    GROUP BY 1
  ),
  hour_counts AS (
    SELECT
      EXTRACT(HOUR FROM (m30.match_at AT TIME ZONE 'America/Argentina/Buenos_Aires'))::int AS hour_of_day,
      COUNT(*)::int AS matches_count
    FROM club_matches_30 m30
    GROUP BY 1
  ),
  category_counts AS (
    SELECT
      COALESCE(NULLIF(TRIM(pa.category), ''), 'Sin categoria') AS category_label,
      SUM(pa.matches_count)::int AS appearances
    FROM player_activity_30 pa
    GROUP BY 1
  )
  SELECT
    v_club_id AS club_id,
    (SELECT COUNT(*)::int FROM club_matches_base WHERE match_at >= now() - interval '7 days') AS matches_last_7_days,
    (SELECT COUNT(*)::int FROM club_matches_30) AS matches_last_30_days,
    (SELECT COUNT(DISTINCT mp.player_id)::int
     FROM club_matches_30 m30
     JOIN public.match_players mp ON mp.match_id = m30.id) AS unique_players_last_30_days,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'dow', d.dow,
          'label', d.label,
          'count', COALESCE(wc.matches_count, 0)
        )
        ORDER BY d.dow
      )
      FROM (
        VALUES
          (0, 'Dom'),
          (1, 'Lun'),
          (2, 'Mar'),
          (3, 'Mie'),
          (4, 'Jue'),
          (5, 'Vie'),
          (6, 'Sab')
      ) AS d(dow, label)
      LEFT JOIN weekday_counts wc ON wc.dow = d.dow
    ), '[]'::jsonb) AS matches_by_weekday,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'hour', h.hour_of_day,
          'count', COALESCE(hc.matches_count, 0)
        )
        ORDER BY h.hour_of_day
      )
      FROM generate_series(0, 23) AS h(hour_of_day)
      LEFT JOIN hour_counts hc ON hc.hour_of_day = h.hour_of_day
    ), '[]'::jsonb) AS matches_by_hour,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'player_id', t.player_id,
          'display_name', t.display_name,
          'matches_count', t.matches_count
        )
        ORDER BY t.matches_count DESC, t.display_name ASC
      )
      FROM (
        SELECT pa.player_id, pa.display_name, pa.matches_count
        FROM player_activity_30 pa
        ORDER BY pa.matches_count DESC, pa.display_name ASC
        LIMIT 10
      ) t
    ), '[]'::jsonb) AS top_players,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'category', cc.category_label,
          'count', cc.appearances
        )
        ORDER BY cc.appearances DESC, cc.category_label ASC
      )
      FROM category_counts cc
    ), '[]'::jsonb) AS matches_by_category;
END;
$$;

REVOKE ALL ON FUNCTION public.club_get_dashboard_stats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_get_dashboard_stats(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';


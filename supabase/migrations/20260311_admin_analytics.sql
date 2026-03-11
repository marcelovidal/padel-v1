-- ═══════════════════════════════════════════════════════════════════════════
-- Admin Analytics Dashboard RPCs
-- Created: 2026-03-11
-- Sections: KPIs | Crecimiento | Activación Serie | Funnel | Retención | Adopción | Clubes
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Shared inline admin-check pattern (same as admin_get_overview_stats) ──

-- ─────────────────────────────────────────────────────────────────────────
-- 1. admin_analytics_kpis()
--    Quick KPI cards always visible at top of analytics page.
--    Returns current values + prev-period values for trend arrows.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_analytics_kpis()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      uuid;
  v_is_admin boolean;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = v_uid AND role = 'admin')
    INTO v_is_admin;
  IF NOT COALESCE(v_is_admin, false) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  RETURN (
    WITH
    bounds AS (
      SELECT
        now()                                             AS now_ts,
        now() - interval '30 days'                       AS d30,
        now() - interval '60 days'                       AS d60,
        date_trunc('month', now())                       AS month_start,
        date_trunc('month', now()) - interval '1 month'  AS prev_month_start
    ),
    completed_matches AS (
      SELECT m.id, m.club_id, COALESCE(m.match_at, m.created_at) AS ts
      FROM public.matches m
      WHERE EXISTS (SELECT 1 FROM public.match_results mr WHERE mr.match_id = m.id)
    ),
    ap_30 AS (
      SELECT COUNT(DISTINCT mp.player_id)::int AS v
      FROM completed_matches cm
      JOIN public.match_players mp ON mp.match_id = cm.id
      JOIN public.players p       ON p.id = mp.player_id AND p.deleted_at IS NULL
      WHERE cm.ts >= (SELECT d30 FROM bounds)
    ),
    ap_prev30 AS (
      SELECT COUNT(DISTINCT mp.player_id)::int AS v
      FROM completed_matches cm
      JOIN public.match_players mp ON mp.match_id = cm.id
      JOIN public.players p       ON p.id = mp.player_id AND p.deleted_at IS NULL
      WHERE cm.ts >= (SELECT d60 FROM bounds) AND cm.ts < (SELECT d30 FROM bounds)
    ),
    m_month AS (
      SELECT COUNT(*)::int AS v FROM completed_matches WHERE ts >= (SELECT month_start FROM bounds)
    ),
    m_prev_month AS (
      SELECT COUNT(*)::int AS v FROM completed_matches
      WHERE ts >= (SELECT prev_month_start FROM bounds) AND ts < (SELECT month_start FROM bounds)
    ),
    b_month AS (
      SELECT COUNT(*)::int AS v FROM public.court_bookings
      WHERE status = 'confirmed' AND created_at >= (SELECT month_start FROM bounds)
    ),
    b_prev_month AS (
      SELECT COUNT(*)::int AS v FROM public.court_bookings
      WHERE status = 'confirmed'
        AND created_at >= (SELECT prev_month_start FROM bounds)
        AND created_at <  (SELECT month_start FROM bounds)
    ),
    t_active AS (SELECT COUNT(*)::int AS v FROM public.club_tournaments WHERE status = 'active'),
    l_active AS (SELECT COUNT(*)::int AS v FROM public.club_leagues     WHERE status = 'active'),
    sh_30 AS (
      SELECT COUNT(*)::int AS v FROM public.share_events
      WHERE created_at >= (SELECT d30 FROM bounds)
    ),
    sh_prev30 AS (
      SELECT COUNT(*)::int AS v FROM public.share_events
      WHERE created_at >= (SELECT d60 FROM bounds) AND created_at < (SELECT d30 FROM bounds)
    ),
    guest_conv AS (
      SELECT
        COUNT(*)::int                                             AS total_guests,
        COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END)::int     AS converted
      FROM public.players
      WHERE is_guest = true AND deleted_at IS NULL
    )
    SELECT jsonb_build_object(
      'active_players_30d',        (SELECT v FROM ap_30),
      'active_players_30d_prev',   (SELECT v FROM ap_prev30),
      'matches_month',             (SELECT v FROM m_month),
      'matches_month_prev',        (SELECT v FROM m_prev_month),
      'bookings_month',            (SELECT v FROM b_month),
      'bookings_month_prev',       (SELECT v FROM b_prev_month),
      'active_tournaments',        (SELECT v FROM t_active),
      'active_leagues',            (SELECT v FROM l_active),
      'share_cards_30d',           (SELECT v FROM sh_30),
      'share_cards_30d_prev',      (SELECT v FROM sh_prev30),
      'guest_total',               (SELECT total_guests FROM guest_conv),
      'guest_converted',           (SELECT converted    FROM guest_conv)
    )
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. admin_analytics_growth()
--    Section 1: Growth & acquisition numbers.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_analytics_growth()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      uuid;
  v_is_admin boolean;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = v_uid AND role = 'admin')
    INTO v_is_admin;
  IF NOT COALESCE(v_is_admin, false) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  RETURN (
    WITH
    bounds AS (
      SELECT
        now() - interval '7 days'  AS d7,
        now() - interval '30 days' AS d30
    ),
    player_totals AS (
      SELECT
        COUNT(*)::int                                                          AS total,
        COUNT(CASE WHEN user_id IS NOT NULL AND (is_guest IS NULL OR is_guest = false) THEN 1 END)::int AS registered,
        COUNT(CASE WHEN is_guest = true THEN 1 END)::int                       AS guests,
        COUNT(CASE WHEN created_at >= (SELECT d7 FROM bounds) THEN 1 END)::int AS new_7d,
        COUNT(CASE WHEN created_at >= (SELECT d30 FROM bounds) THEN 1 END)::int AS new_30d,
        COUNT(CASE WHEN is_guest = true AND user_id IS NOT NULL THEN 1 END)::int AS guests_converted
      FROM public.players
      WHERE deleted_at IS NULL
    ),
    club_totals AS (
      SELECT
        COUNT(*)::int                                                                  AS total,
        COUNT(CASE WHEN claim_status = 'claimed' THEN 1 END)::int                     AS claimed,
        COUNT(CASE WHEN claim_status != 'claimed' THEN 1 END)::int                    AS unclaimed
      FROM public.clubs
      WHERE deleted_at IS NULL
    ),
    players_by_province AS (
      SELECT
        COALESCE(region_name, region_code, 'Sin provincia') AS province,
        COUNT(*)::int                                        AS player_count
      FROM public.players
      WHERE deleted_at IS NULL
        AND (region_name IS NOT NULL OR region_code IS NOT NULL)
      GROUP BY 1
      ORDER BY 2 DESC
      LIMIT 15
    )
    SELECT jsonb_build_object(
      'total_players',       (SELECT total      FROM player_totals),
      'total_registered',    (SELECT registered FROM player_totals),
      'total_guests',        (SELECT guests     FROM player_totals),
      'guests_converted',    (SELECT guests_converted FROM player_totals),
      'new_players_7d',      (SELECT new_7d     FROM player_totals),
      'new_players_30d',     (SELECT new_30d    FROM player_totals),
      'total_clubs',         (SELECT total    FROM club_totals),
      'claimed_clubs',       (SELECT claimed  FROM club_totals),
      'unclaimed_clubs',     (SELECT unclaimed FROM club_totals),
      'players_by_province', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                                'province', province,
                                'count',    player_count
                              ) ORDER BY player_count DESC), '[]'::jsonb)
                              FROM players_by_province)
    )
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. admin_analytics_activation_series(p_days int)
--    Section 2: Multi-series line chart — registered / guests / onboarding.
--    Returns one row per day with both cumulative and daily values.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_analytics_activation_series(p_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid        uuid;
  v_is_admin   boolean;
  v_start_date date;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = v_uid AND role = 'admin')
    INTO v_is_admin;
  IF NOT COALESCE(v_is_admin, false) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  -- Clamp p_days between 7 and 180
  p_days := GREATEST(7, LEAST(180, COALESCE(p_days, 30)));
  v_start_date := (now() - ((p_days - 1) * interval '1 day'))::date;

  RETURN (
    WITH
    date_series AS (
      SELECT generate_series(v_start_date, now()::date, '1 day'::interval)::date AS d
    ),
    -- Totals before the series start (for cumulative baseline)
    pre AS (
      SELECT
        SUM(CASE WHEN user_id IS NOT NULL AND (is_guest IS NULL OR is_guest = false) THEN 1 ELSE 0 END) AS reg_pre,
        SUM(CASE WHEN is_guest = true THEN 1 ELSE 0 END)                                                AS guest_pre,
        SUM(CASE WHEN onboarding_completed = true THEN 1 ELSE 0 END)                                   AS onb_pre
      FROM public.players
      WHERE deleted_at IS NULL
        AND created_at::date < v_start_date
    ),
    -- Daily new counts within the series window
    daily_new AS (
      SELECT
        created_at::date                                                                    AS day,
        SUM(CASE WHEN user_id IS NOT NULL AND (is_guest IS NULL OR is_guest = false) THEN 1 ELSE 0 END) AS reg_new,
        SUM(CASE WHEN is_guest = true THEN 1 ELSE 0 END)                                                AS guest_new,
        SUM(CASE WHEN onboarding_completed = true THEN 1 ELSE 0 END)                                   AS onb_new
      FROM public.players
      WHERE deleted_at IS NULL
        AND created_at::date >= v_start_date
      GROUP BY 1
    ),
    joined AS (
      SELECT
        ds.d,
        COALESCE(dn.reg_new,   0)::int AS reg_daily,
        COALESCE(dn.guest_new, 0)::int AS guest_daily,
        COALESCE(dn.onb_new,   0)::int AS onb_daily
      FROM date_series ds
      LEFT JOIN daily_new dn ON dn.day = ds.d
    ),
    with_cum AS (
      SELECT
        d,
        reg_daily,
        guest_daily,
        onb_daily,
        ((SELECT COALESCE(reg_pre,   0) FROM pre) + SUM(reg_daily)   OVER (ORDER BY d ROWS UNBOUNDED PRECEDING))::int AS reg_cum,
        ((SELECT COALESCE(guest_pre, 0) FROM pre) + SUM(guest_daily) OVER (ORDER BY d ROWS UNBOUNDED PRECEDING))::int AS guest_cum,
        ((SELECT COALESCE(onb_pre,   0) FROM pre) + SUM(onb_daily)   OVER (ORDER BY d ROWS UNBOUNDED PRECEDING))::int AS onb_cum
      FROM joined
    )
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'date',        to_char(d, 'YYYY-MM-DD'),
          'reg_cum',     reg_cum,
          'guest_cum',   guest_cum,
          'onb_cum',     onb_cum,
          'reg_daily',   reg_daily,
          'guest_daily', guest_daily,
          'onb_daily',   onb_daily
        ) ORDER BY d
      ),
      '[]'::jsonb
    )
    FROM with_cum
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. admin_analytics_activation_funnel()
--    Section 3: % of registered players who completed each activation step.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_analytics_activation_funnel()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      uuid;
  v_is_admin boolean;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = v_uid AND role = 'admin')
    INTO v_is_admin;
  IF NOT COALESCE(v_is_admin, false) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  RETURN (
    WITH
    registered AS (
      SELECT id
      FROM public.players
      WHERE deleted_at IS NULL
        AND user_id IS NOT NULL
    ),
    total AS (SELECT COUNT(*)::int AS n FROM registered),
    onboarded AS (
      SELECT COUNT(*)::int AS n
      FROM registered r
      JOIN public.players p ON p.id = r.id AND p.onboarding_completed = true
    ),
    played_match AS (
      SELECT COUNT(DISTINCT mp.player_id)::int AS n
      FROM public.match_players mp
      WHERE EXISTS (SELECT 1 FROM public.match_results mr WHERE mr.match_id = mp.match_id)
        AND mp.player_id IN (SELECT id FROM registered)
    ),
    has_assessment AS (
      SELECT COUNT(DISTINCT pma.player_id)::int AS n
      FROM public.player_match_assessments pma
      WHERE pma.player_id IN (SELECT id FROM registered)
    ),
    never_active AS (
      SELECT COUNT(DISTINCT r.id)::int AS n
      FROM registered r
      WHERE NOT EXISTS (
        SELECT 1 FROM public.match_players mp WHERE mp.player_id = r.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.player_match_assessments pma WHERE pma.player_id = r.id
      )
    )
    SELECT jsonb_build_object(
      'total_registered',          (SELECT n FROM total),
      'onboarding_count',          (SELECT n FROM onboarded),
      'onboarding_pct',            CASE WHEN (SELECT n FROM total) = 0 THEN 0
                                        ELSE ROUND(((SELECT n FROM onboarded)::numeric / (SELECT n FROM total)::numeric) * 100, 1)
                                   END,
      'played_match_count',        (SELECT n FROM played_match),
      'played_match_pct',          CASE WHEN (SELECT n FROM total) = 0 THEN 0
                                        ELSE ROUND(((SELECT n FROM played_match)::numeric / (SELECT n FROM total)::numeric) * 100, 1)
                                   END,
      'assessment_count',          (SELECT n FROM has_assessment),
      'assessment_pct',            CASE WHEN (SELECT n FROM total) = 0 THEN 0
                                        ELSE ROUND(((SELECT n FROM has_assessment)::numeric / (SELECT n FROM total)::numeric) * 100, 1)
                                   END,
      'never_active_count',        (SELECT n FROM never_active),
      'never_active_pct',          CASE WHEN (SELECT n FROM total) = 0 THEN 0
                                        ELSE ROUND(((SELECT n FROM never_active)::numeric / (SELECT n FROM total)::numeric) * 100, 1)
                                   END
    )
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. admin_analytics_retention()
--    Section 4: Retention & engagement — active players + weekly/monthly series.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_analytics_retention()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      uuid;
  v_is_admin boolean;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = v_uid AND role = 'admin')
    INTO v_is_admin;
  IF NOT COALESCE(v_is_admin, false) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  RETURN (
    WITH
    bounds AS (
      SELECT
        now() - interval '7 days'  AS d7,
        now() - interval '30 days' AS d30,
        now() - interval '90 days' AS d90
    ),
    completed_matches AS (
      SELECT m.id, m.club_id, COALESCE(m.match_at, m.created_at) AS ts
      FROM public.matches m
      WHERE EXISTS (SELECT 1 FROM public.match_results mr WHERE mr.match_id = m.id)
    ),
    -- Active player counts by window
    ap_7 AS (
      SELECT COUNT(DISTINCT mp.player_id)::int AS v
      FROM completed_matches cm
      JOIN public.match_players mp ON mp.match_id = cm.id
      WHERE cm.ts >= (SELECT d7 FROM bounds)
    ),
    ap_30 AS (
      SELECT COUNT(DISTINCT mp.player_id)::int AS v
      FROM completed_matches cm
      JOIN public.match_players mp ON mp.match_id = cm.id
      WHERE cm.ts >= (SELECT d30 FROM bounds)
    ),
    ap_90 AS (
      SELECT COUNT(DISTINCT mp.player_id)::int AS v
      FROM completed_matches cm
      JOIN public.match_players mp ON mp.match_id = cm.id
      WHERE cm.ts >= (SELECT d90 FROM bounds)
    ),
    -- Last 8 weeks series
    weeks AS (
      SELECT
        date_trunc('week', now())::date - ((n-1) * 7) AS week_start
      FROM generate_series(1, 8) n
    ),
    matches_weekly AS (
      SELECT
        w.week_start,
        COUNT(cm.id)::int AS match_count
      FROM weeks w
      LEFT JOIN completed_matches cm
        ON cm.ts >= w.week_start::timestamptz
       AND cm.ts <  (w.week_start + 7)::timestamptz
      GROUP BY w.week_start
      ORDER BY w.week_start
    ),
    assessments_weekly AS (
      SELECT
        w.week_start,
        COUNT(pma.id)::int AS count
      FROM weeks w
      LEFT JOIN public.player_match_assessments pma
        ON pma.created_at >= w.week_start::timestamptz
       AND pma.created_at <  (w.week_start + 7)::timestamptz
      GROUP BY w.week_start
      ORDER BY w.week_start
    ),
    bookings_weekly AS (
      SELECT
        w.week_start,
        COUNT(cb.id)::int AS count
      FROM weeks w
      LEFT JOIN public.court_bookings cb
        ON cb.created_at >= w.week_start::timestamptz
       AND cb.created_at <  (w.week_start + 7)::timestamptz
       AND cb.status = 'confirmed'
      GROUP BY w.week_start
      ORDER BY w.week_start
    ),
    -- Last 6 months series
    months AS (
      SELECT date_trunc('month', now())::date - ((n-1) * 30) AS month_start
      FROM generate_series(1, 6) n
    ),
    -- Use a more accurate month calculation
    month_series AS (
      SELECT
        date_trunc('month', now() - ((n-1) * interval '1 month'))::date AS ms
      FROM generate_series(0, 5) n
      ORDER BY ms
    ),
    tournaments_monthly AS (
      SELECT
        ms.ms AS month_start,
        COUNT(t.id)::int AS count
      FROM month_series ms
      LEFT JOIN public.club_tournaments t
        ON date_trunc('month', t.created_at) = ms.ms::timestamptz
      GROUP BY ms.ms
      ORDER BY ms.ms
    ),
    leagues_monthly AS (
      SELECT
        ms.ms AS month_start,
        COUNT(l.id)::int AS count
      FROM month_series ms
      LEFT JOIN public.club_leagues l
        ON date_trunc('month', l.created_at) = ms.ms::timestamptz
      GROUP BY ms.ms
      ORDER BY ms.ms
    )
    SELECT jsonb_build_object(
      'active_7d',  (SELECT v FROM ap_7),
      'active_30d', (SELECT v FROM ap_30),
      'active_90d', (SELECT v FROM ap_90),
      'matches_by_week', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'week', to_char(week_start, 'DD/MM'),
          'count', match_count
        ) ORDER BY week_start), '[]'::jsonb)
        FROM matches_weekly
      ),
      'assessments_by_week', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'week', to_char(week_start, 'DD/MM'),
          'count', count
        ) ORDER BY week_start), '[]'::jsonb)
        FROM assessments_weekly
      ),
      'bookings_by_week', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'week', to_char(week_start, 'DD/MM'),
          'count', count
        ) ORDER BY week_start), '[]'::jsonb)
        FROM bookings_weekly
      ),
      'tournaments_by_month', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'month', to_char(month_start, 'MM/YY'),
          'count', count
        ) ORDER BY month_start), '[]'::jsonb)
        FROM tournaments_monthly
      ),
      'leagues_by_month', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'month', to_char(month_start, 'MM/YY'),
          'count', count
        ) ORDER BY month_start), '[]'::jsonb)
        FROM leagues_monthly
      )
    )
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. admin_analytics_feature_adoption()
--    Section 5: % of active players (30d) who used each feature.
--    Returns array sorted by pct desc.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_analytics_feature_adoption()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      uuid;
  v_is_admin boolean;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = v_uid AND role = 'admin')
    INTO v_is_admin;
  IF NOT COALESCE(v_is_admin, false) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  RETURN (
    WITH
    active_players AS (
      -- Base: players who participated in at least 1 match with result in last 30d
      SELECT DISTINCT mp.player_id
      FROM public.match_players mp
      JOIN public.matches m ON m.id = mp.match_id
      JOIN public.players p ON p.id = mp.player_id AND p.deleted_at IS NULL
      WHERE EXISTS (SELECT 1 FROM public.match_results mr WHERE mr.match_id = m.id)
        AND COALESCE(m.match_at, m.created_at) >= now() - interval '30 days'
    ),
    base_count AS (SELECT COUNT(*)::int AS n FROM active_players),
    -- Each feature: count of active players who used it
    f_tournaments AS (
      SELECT COUNT(DISTINCT tr.player_id)::int AS n
      FROM public.tournament_registrations tr
      WHERE tr.player_id IN (SELECT player_id FROM active_players)
    ),
    f_leagues AS (
      SELECT COUNT(DISTINCT lr.player_id)::int AS n
      FROM public.league_registrations lr
      WHERE lr.player_id IN (SELECT player_id FROM active_players)
    ),
    f_bookings AS (
      SELECT COUNT(DISTINCT cb.requested_by_player_id)::int AS n
      FROM public.court_bookings cb
      WHERE cb.status = 'confirmed'
        AND cb.requested_by_player_id IN (SELECT player_id FROM active_players)
    ),
    f_assessment AS (
      SELECT COUNT(DISTINCT pma.player_id)::int AS n
      FROM public.player_match_assessments pma
      WHERE pma.player_id IN (SELECT player_id FROM active_players)
    ),
    f_share AS (
      -- share_events links user_id; join to players to get player_id
      SELECT COUNT(DISTINCT p.id)::int AS n
      FROM public.share_events se
      JOIN public.players p ON p.user_id = se.user_id AND p.deleted_at IS NULL
      WHERE p.id IN (SELECT player_id FROM active_players)
    ),
    f_notif AS (
      -- Notifications read by at least 1 active player
      SELECT COUNT(DISTINCT p.id)::int AS n
      FROM public.notifications ntf
      JOIN public.players p ON p.user_id = ntf.user_id AND p.deleted_at IS NULL
      WHERE ntf.read_at IS NOT NULL
        AND p.id IN (SELECT player_id FROM active_players)
    ),
    features AS (
      SELECT * FROM (VALUES
        ('Autoevaluacion',  (SELECT n FROM f_assessment)),
        ('Reservas',        (SELECT n FROM f_bookings)),
        ('Share cards',     (SELECT n FROM f_share)),
        ('Torneos',         (SELECT n FROM f_tournaments)),
        ('Ligas',           (SELECT n FROM f_leagues)),
        ('Notificaciones',  (SELECT n FROM f_notif))
      ) AS t(feature, used_count)
    )
    SELECT jsonb_build_object(
      'base_active_players', (SELECT n FROM base_count),
      'features', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'feature',    feature,
            'count',      used_count,
            'pct',        CASE WHEN (SELECT n FROM base_count) = 0 THEN 0
                               ELSE ROUND((used_count::numeric / (SELECT n FROM base_count)::numeric) * 100, 1)
                          END
          ) ORDER BY used_count DESC
        ), '[]'::jsonb)
        FROM features
      )
    )
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 7. admin_analytics_club_metrics()
--    Section 6: Per-club table with activity metrics.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_analytics_club_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      uuid;
  v_is_admin boolean;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = v_uid AND role = 'admin')
    INTO v_is_admin;
  IF NOT COALESCE(v_is_admin, false) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  RETURN (
    WITH
    completed_matches AS (
      SELECT m.id, m.club_id, COALESCE(m.match_at, m.created_at) AS ts
      FROM public.matches m
      WHERE EXISTS (SELECT 1 FROM public.match_results mr WHERE mr.match_id = m.id)
        AND m.club_id IS NOT NULL
    ),
    active_30d AS (
      SELECT cm.club_id, COUNT(DISTINCT mp.player_id)::int AS active_players
      FROM completed_matches cm
      JOIN public.match_players mp ON mp.match_id = cm.id
      WHERE cm.ts >= now() - interval '30 days'
      GROUP BY cm.club_id
    ),
    -- Matches per week avg over 8 weeks
    matches_8w AS (
      SELECT cm.club_id, COUNT(*)::numeric AS total_matches
      FROM completed_matches cm
      WHERE cm.ts >= now() - interval '56 days'
      GROUP BY cm.club_id
    ),
    active_tournaments AS (
      SELECT club_id, COUNT(*)::int AS n
      FROM public.club_tournaments
      WHERE status = 'active'
      GROUP BY club_id
    ),
    active_leagues AS (
      SELECT club_id, COUNT(*)::int AS n
      FROM public.club_leagues
      WHERE status = 'active'
      GROUP BY club_id
    ),
    last_match AS (
      SELECT club_id, MAX(ts) AS last_match_at
      FROM completed_matches
      GROUP BY club_id
    )
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id',              c.id,
          'name',            c.name,
          'city',            COALESCE(c.city, ''),
          'region',          COALESCE(c.region_name, c.region_code, ''),
          'claim_status',    c.claim_status,
          'active_players',  COALESCE(a30.active_players, 0),
          'avg_matches_week',COALESCE(ROUND(m8w.total_matches / 8.0, 1), 0),
          'active_tournaments', COALESCE(at2.n, 0),
          'active_leagues',     COALESCE(al2.n, 0),
          'last_match_at',   lm.last_match_at
        ) ORDER BY COALESCE(a30.active_players, 0) DESC, c.name ASC
      ),
      '[]'::jsonb
    )
    FROM public.clubs c
    LEFT JOIN active_30d    a30 ON a30.club_id = c.id
    LEFT JOIN matches_8w    m8w ON m8w.club_id = c.id
    LEFT JOIN active_tournaments at2 ON at2.club_id = c.id
    LEFT JOIN active_leagues     al2 ON al2.club_id = c.id
    LEFT JOIN last_match         lm  ON lm.club_id  = c.id
    WHERE c.deleted_at IS NULL
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Permissions
-- ─────────────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.admin_analytics_kpis()                        FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_analytics_growth()                      FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_analytics_activation_series(int)        FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_analytics_activation_funnel()           FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_analytics_retention()                   FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_analytics_feature_adoption()            FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_analytics_club_metrics()                FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_analytics_kpis()                     TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics_growth()                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics_activation_series(int)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics_activation_funnel()        TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics_retention()                TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics_feature_adoption()         TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics_club_metrics()             TO authenticated;

NOTIFY pgrst, 'reload schema';

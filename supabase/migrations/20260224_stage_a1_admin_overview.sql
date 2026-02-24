-- STAGE A1: Admin Strategic Dashboard (overview KPIs)

CREATE OR REPLACE FUNCTION public.admin_get_overview_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_is_admin boolean;
  v_result jsonb;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = v_uid
      AND p.role = 'admin'
  )
  INTO v_is_admin;

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  WITH
  bounds AS (
    SELECT
      now() AS now_ts,
      now() - interval '7 days' AS d7,
      now() - interval '30 days' AS d30,
      now() - interval '60 days' AS d60
  ),
  users_30 AS (
    SELECT u.id, u.created_at
    FROM auth.users u, bounds b
    WHERE u.created_at >= b.d30
  ),
  players_with_user AS (
    SELECT p.id, p.user_id, p.created_at, p.onboarding_completed, p.onboarding_completed_at
    FROM public.players p
    WHERE p.deleted_at IS NULL
      AND p.user_id IS NOT NULL
  ),
  completed_matches AS (
    SELECT m.id, m.club_id, m.created_at, m.match_at
    FROM public.matches m
    WHERE m.deleted_at IS NULL
      AND EXISTS (
        SELECT 1
        FROM public.match_results mr
        WHERE mr.match_id = m.id
      )
  ),
  matches_created_30 AS (
    SELECT m.id, m.club_id, m.created_at
    FROM public.matches m, bounds b
    WHERE m.deleted_at IS NULL
      AND m.created_at >= b.d30
  ),
  matches_created_prev30 AS (
    SELECT m.id
    FROM public.matches m, bounds b
    WHERE m.deleted_at IS NULL
      AND m.created_at >= b.d60
      AND m.created_at < b.d30
  ),
  matches_result_30 AS (
    SELECT cm.id, cm.club_id, cm.created_at, cm.match_at
    FROM completed_matches cm, bounds b
    WHERE COALESCE(cm.match_at, cm.created_at) >= b.d30
  ),
  matches_result_7 AS (
    SELECT cm.id
    FROM completed_matches cm, bounds b
    WHERE COALESCE(cm.match_at, cm.created_at) >= b.d7
  ),
  matches_result_prev30 AS (
    SELECT cm.id, cm.club_id
    FROM completed_matches cm, bounds b
    WHERE COALESCE(cm.match_at, cm.created_at) >= b.d60
      AND COALESCE(cm.match_at, cm.created_at) < b.d30
  ),
  active_players_30 AS (
    SELECT COUNT(DISTINCT mp.player_id)::int AS value
    FROM matches_result_30 m30
    JOIN public.match_players mp ON mp.match_id = m30.id
    JOIN public.players p ON p.id = mp.player_id AND p.deleted_at IS NULL
  ),
  active_players_prev30 AS (
    SELECT COUNT(DISTINCT mp.player_id)::int AS value
    FROM matches_result_prev30 mp30
    JOIN public.match_players mp ON mp.match_id = mp30.id
    JOIN public.players p ON p.id = mp.player_id AND p.deleted_at IS NULL
  ),
  active_claimed_clubs_30 AS (
    SELECT COUNT(DISTINCT c.id)::int AS value
    FROM matches_result_30 m30
    JOIN public.clubs c
      ON c.id = m30.club_id
     AND c.deleted_at IS NULL
     AND c.claim_status = 'claimed'
  ),
  active_claimed_clubs_prev30 AS (
    SELECT COUNT(DISTINCT c.id)::int AS value
    FROM matches_result_prev30 m30
    JOIN public.clubs c
      ON c.id = m30.club_id
     AND c.deleted_at IS NULL
     AND c.claim_status = 'claimed'
  ),
  claims_resolved_30 AS (
    SELECT
      EXTRACT(EPOCH FROM (r.resolved_at - r.created_at)) / 3600.0 AS resolution_hours
    FROM public.club_claim_requests r, bounds b
    WHERE r.status IN ('approved', 'rejected')
      AND r.resolved_at IS NOT NULL
      AND r.created_at IS NOT NULL
      AND r.resolved_at >= b.d30
  ),
  base AS (
    SELECT
      (SELECT COUNT(*)::int FROM auth.users u, bounds b WHERE u.created_at >= b.d7) AS new_users_7d,
      (SELECT COUNT(*)::int FROM users_30) AS new_users_30d,

      (SELECT COUNT(*)::int
       FROM players_with_user pwu, bounds b
       WHERE pwu.created_at >= b.d7
         AND pwu.onboarding_completed) AS onboarding_completed_7d,

      (SELECT COUNT(*)::int
       FROM players_with_user pwu, bounds b
       WHERE pwu.created_at >= b.d30
         AND pwu.onboarding_completed) AS onboarding_completed_30d,

      (SELECT COUNT(*)::int
       FROM players_with_user pwu, bounds b
       WHERE pwu.created_at >= b.d30) AS player_profiles_created_30d,

      (SELECT COUNT(*)::int FROM public.matches m, bounds b WHERE m.deleted_at IS NULL AND m.created_at >= b.d7) AS matches_created_7d,
      (SELECT COUNT(*)::int FROM matches_created_30) AS matches_created_30d,
      (SELECT COUNT(*)::int FROM matches_created_prev30) AS matches_created_prev_30d,
      (SELECT COUNT(*)::int FROM matches_result_7) AS matches_with_result_7d,
      (SELECT COUNT(*)::int FROM matches_result_30) AS matches_with_result_30d,
      (SELECT COUNT(*)::int FROM matches_result_prev30) AS matches_with_result_prev_30d,

      (SELECT value FROM active_players_30) AS active_players_30d,
      (SELECT value FROM active_players_prev30) AS active_players_prev_30d,
      (SELECT value FROM active_claimed_clubs_30) AS active_clubs_30d,
      (SELECT value FROM active_claimed_clubs_prev30) AS active_clubs_prev_30d,

      (SELECT COUNT(*)::int FROM public.clubs c WHERE c.deleted_at IS NULL AND c.claim_status = 'claimed') AS clubs_claimed_total,
      (SELECT COUNT(*)::int FROM public.club_claim_requests r WHERE r.status = 'pending') AS clubs_claim_pending,

      (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY cr.resolution_hours)
       FROM claims_resolved_30 cr) AS claim_resolution_median_hours_30d,

      (SELECT COUNT(*)::int
       FROM public.share_events se, bounds b
       WHERE se.created_at >= b.d30) AS match_shares_30d
  )
  SELECT jsonb_build_object(
    'window',
    jsonb_build_object(
      'days', 30,
      'generated_at', now()
    ),
    'users',
    jsonb_build_object(
      'new_7d', COALESCE(b.new_users_7d, 0),
      'new_30d', COALESCE(b.new_users_30d, 0),
      'onboarding_completed_7d', COALESCE(b.onboarding_completed_7d, 0),
      'onboarding_completed_30d', COALESCE(b.onboarding_completed_30d, 0),
      'player_profiles_created_30d', COALESCE(b.player_profiles_created_30d, 0),
      'onboarding_completion_rate_30d',
      CASE
        WHEN COALESCE(b.player_profiles_created_30d, 0) = 0 THEN NULL
        ELSE ROUND((b.onboarding_completed_30d::numeric / b.player_profiles_created_30d::numeric) * 100.0, 1)
      END,
      'active_players_30d', COALESCE(b.active_players_30d, 0)
    ),
    'matches',
    jsonb_build_object(
      'created_7d', COALESCE(b.matches_created_7d, 0),
      'created_30d', COALESCE(b.matches_created_30d, 0),
      'with_result_7d', COALESCE(b.matches_with_result_7d, 0),
      'with_result_30d', COALESCE(b.matches_with_result_30d, 0),
      'result_completion_rate_30d',
      CASE
        WHEN COALESCE(b.matches_created_30d, 0) = 0 THEN NULL
        ELSE ROUND((b.matches_with_result_30d::numeric / b.matches_created_30d::numeric) * 100.0, 1)
      END
    ),
    'clubs',
    jsonb_build_object(
      'active_30d', COALESCE(b.active_clubs_30d, 0),
      'claimed_total', COALESCE(b.clubs_claimed_total, 0),
      'pending_claims', COALESCE(b.clubs_claim_pending, 0),
      'claim_resolution_median_hours_30d', CASE
        WHEN b.claim_resolution_median_hours_30d IS NULL THEN NULL
        ELSE ROUND((b.claim_resolution_median_hours_30d)::numeric, 1)
      END
    ),
    'growth',
    jsonb_build_object(
      'matches_30d_vs_prev_30d_pct',
      CASE
        WHEN COALESCE(b.matches_with_result_prev_30d, 0) = 0 THEN NULL
        ELSE ROUND((((b.matches_with_result_30d - b.matches_with_result_prev_30d)::numeric / b.matches_with_result_prev_30d::numeric) * 100.0), 1)
      END,
      'active_players_30d_vs_prev_30d_pct',
      CASE
        WHEN COALESCE(b.active_players_prev_30d, 0) = 0 THEN NULL
        ELSE ROUND((((b.active_players_30d - b.active_players_prev_30d)::numeric / b.active_players_prev_30d::numeric) * 100.0), 1)
      END,
      'active_clubs_30d_vs_prev_30d_pct',
      CASE
        WHEN COALESCE(b.active_clubs_prev_30d, 0) = 0 THEN NULL
        ELSE ROUND((((b.active_clubs_30d - b.active_clubs_prev_30d)::numeric / b.active_clubs_prev_30d::numeric) * 100.0), 1)
      END
    ),
    'sharing',
    jsonb_build_object(
      'match_shares_30d', COALESCE(b.match_shares_30d, 0)
    )
  )
  INTO v_result
  FROM base b;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_overview_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_overview_stats() TO authenticated;

NOTIFY pgrst, 'reload schema';

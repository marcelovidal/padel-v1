-- STAGE Q5: club ranking materializado (MVP)

BEGIN;

CREATE TABLE IF NOT EXISTS public.player_club_stats (
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  matches_played bigint NOT NULL DEFAULT 0,
  wins bigint NOT NULL DEFAULT 0,
  losses bigint NOT NULL DEFAULT 0,
  sets_won bigint NOT NULL DEFAULT 0,
  sets_lost bigint NOT NULL DEFAULT 0,
  points bigint NOT NULL DEFAULT 0,
  last_match_at timestamptz NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (club_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_player_club_stats_ranking
  ON public.player_club_stats(club_id, points DESC, wins DESC, matches_played DESC);

CREATE INDEX IF NOT EXISTS idx_player_club_stats_player
  ON public.player_club_stats(player_id);

CREATE INDEX IF NOT EXISTS idx_matches_club_match_at
  ON public.matches(club_id, match_at DESC);

ALTER TABLE public.player_club_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_club_stats_select_authenticated" ON public.player_club_stats;
CREATE POLICY "player_club_stats_select_authenticated"
  ON public.player_club_stats
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clubs c
      WHERE c.id = player_club_stats.club_id
        AND c.deleted_at IS NULL
        AND c.archived_at IS NULL
        AND c.merged_into IS NULL
    )
  );

CREATE OR REPLACE FUNCTION public.club_recalculate_rankings(
  p_club_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_is_owner boolean;
  v_is_admin boolean;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.clubs c
    WHERE c.id = p_club_id
      AND c.deleted_at IS NULL
      AND c.archived_at IS NULL
      AND c.merged_into IS NULL
  ) THEN
    RAISE EXCEPTION 'CLUB_NOT_FOUND';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.clubs c
    WHERE c.id = p_club_id
      AND c.claim_status = 'claimed'
      AND c.claimed_by = v_uid
      AND c.deleted_at IS NULL
      AND c.archived_at IS NULL
      AND c.merged_into IS NULL
  )
  INTO v_is_owner;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = v_uid
      AND p.role = 'admin'
  )
  INTO v_is_admin;

  IF NOT COALESCE(v_is_owner, false) AND NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  DELETE FROM public.player_club_stats
  WHERE club_id = p_club_id;

  INSERT INTO public.player_club_stats (
    club_id,
    player_id,
    matches_played,
    wins,
    losses,
    sets_won,
    sets_lost,
    points,
    last_match_at,
    updated_at
  )
  WITH valid_matches AS (
    SELECT
      m.id AS match_id,
      m.club_id,
      m.match_at,
      mr.winner_team,
      mr.sets
    FROM public.matches m
    JOIN public.match_results mr
      ON mr.match_id = m.id
    WHERE m.club_id = p_club_id
      AND m.status = 'completed'
      AND mr.winner_team IS NOT NULL
      AND mr.sets IS NOT NULL
      AND jsonb_typeof(mr.sets) = 'array'
      AND jsonb_array_length(mr.sets) > 0
  ),
  participant_rows AS (
    SELECT
      vm.club_id,
      vm.match_id,
      vm.match_at,
      mp.player_id,
      mp.team,
      vm.winner_team,
      vm.sets
    FROM valid_matches vm
    JOIN public.match_players mp
      ON mp.match_id = vm.match_id
  ),
  set_rows AS (
    SELECT
      pr.club_id,
      pr.match_id,
      pr.player_id,
      pr.team,
      pr.match_at,
      pr.winner_team,
      NULLIF(
        regexp_replace(
          COALESCE(s.set_json->>'team_a_games', s.set_json->>'a', ''),
          '[^0-9-]',
          '',
          'g'
        ),
        ''
      )::int AS team_a_games,
      NULLIF(
        regexp_replace(
          COALESCE(s.set_json->>'team_b_games', s.set_json->>'b', ''),
          '[^0-9-]',
          '',
          'g'
        ),
        ''
      )::int AS team_b_games
    FROM participant_rows pr
    CROSS JOIN LATERAL jsonb_array_elements(pr.sets) AS s(set_json)
  ),
  set_stats AS (
    SELECT
      sr.club_id,
      sr.match_id,
      sr.player_id,
      SUM(
        CASE
          WHEN sr.team_a_games IS NULL OR sr.team_b_games IS NULL THEN 0
          WHEN sr.team = 'A' AND sr.team_a_games > sr.team_b_games THEN 1
          WHEN sr.team = 'B' AND sr.team_b_games > sr.team_a_games THEN 1
          ELSE 0
        END
      )::bigint AS sets_won,
      SUM(
        CASE
          WHEN sr.team_a_games IS NULL OR sr.team_b_games IS NULL THEN 0
          WHEN sr.team = 'A' AND sr.team_a_games < sr.team_b_games THEN 1
          WHEN sr.team = 'B' AND sr.team_b_games < sr.team_a_games THEN 1
          ELSE 0
        END
      )::bigint AS sets_lost
    FROM set_rows sr
    GROUP BY sr.club_id, sr.match_id, sr.player_id
  ),
  aggregated AS (
    SELECT
      pr.club_id,
      pr.player_id,
      COUNT(*)::bigint AS matches_played,
      SUM(CASE WHEN pr.team = pr.winner_team THEN 1 ELSE 0 END)::bigint AS wins,
      SUM(CASE WHEN pr.team <> pr.winner_team THEN 1 ELSE 0 END)::bigint AS losses,
      COALESCE(SUM(ss.sets_won), 0)::bigint AS sets_won,
      COALESCE(SUM(ss.sets_lost), 0)::bigint AS sets_lost,
      MAX(pr.match_at) AS last_match_at
    FROM participant_rows pr
    LEFT JOIN set_stats ss
      ON ss.club_id = pr.club_id
     AND ss.match_id = pr.match_id
     AND ss.player_id = pr.player_id
    GROUP BY pr.club_id, pr.player_id
  )
  SELECT
    a.club_id,
    a.player_id,
    a.matches_played,
    a.wins,
    a.losses,
    a.sets_won,
    a.sets_lost,
    (a.wins * 3 + a.losses * 1)::bigint AS points,
    a.last_match_at,
    now() AS updated_at
  FROM aggregated a
  WHERE a.matches_played > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.club_get_ranking(
  p_club_id uuid,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  player_id uuid,
  display_name text,
  category text,
  points bigint,
  wins bigint,
  losses bigint,
  matches_played bigint,
  sets_won bigint,
  sets_lost bigint,
  last_match_at timestamptz,
  rank bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT
      pcs.player_id,
      p.display_name,
      p.category::text AS category,
      pcs.points,
      pcs.wins,
      pcs.losses,
      pcs.matches_played,
      pcs.sets_won,
      pcs.sets_lost,
      pcs.last_match_at,
      ROW_NUMBER() OVER (
        ORDER BY pcs.points DESC, pcs.wins DESC, pcs.matches_played DESC, p.display_name ASC
      )::bigint AS rank
    FROM public.player_club_stats pcs
    JOIN public.players p
      ON p.id = pcs.player_id
    JOIN public.clubs c
      ON c.id = pcs.club_id
    WHERE pcs.club_id = p_club_id
      AND p.deleted_at IS NULL
      AND p.status = 'active'
      AND c.deleted_at IS NULL
      AND c.archived_at IS NULL
      AND c.merged_into IS NULL
  )
  SELECT *
  FROM ranked
  ORDER BY rank ASC
  LIMIT GREATEST(COALESCE(p_limit, 50), 1)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

CREATE OR REPLACE FUNCTION public.player_get_my_club_rankings(
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  club_id uuid,
  club_name text,
  points bigint,
  rank bigint,
  matches_played bigint,
  wins bigint,
  losses bigint,
  last_match_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_player_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT p.id
    INTO v_player_id
  FROM public.players p
  WHERE p.user_id = v_uid
    AND p.deleted_at IS NULL
    AND p.status = 'active'
  LIMIT 1;

  IF v_player_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH my_clubs AS (
    SELECT pcs.club_id
    FROM public.player_club_stats pcs
    WHERE pcs.player_id = v_player_id
  ),
  ranked AS (
    SELECT
      pcs.club_id,
      pcs.player_id,
      pcs.points,
      pcs.matches_played,
      pcs.wins,
      pcs.losses,
      pcs.last_match_at,
      ROW_NUMBER() OVER (
        PARTITION BY pcs.club_id
        ORDER BY pcs.points DESC, pcs.wins DESC, pcs.matches_played DESC, p.display_name ASC
      )::bigint AS rank
    FROM public.player_club_stats pcs
    JOIN public.players p
      ON p.id = pcs.player_id
    WHERE pcs.club_id IN (SELECT mc.club_id FROM my_clubs mc)
      AND p.deleted_at IS NULL
      AND p.status = 'active'
  )
  SELECT
    r.club_id,
    c.name AS club_name,
    r.points,
    r.rank,
    r.matches_played,
    r.wins,
    r.losses,
    r.last_match_at
  FROM ranked r
  JOIN public.clubs c
    ON c.id = r.club_id
  WHERE r.player_id = v_player_id
    AND c.deleted_at IS NULL
    AND c.archived_at IS NULL
    AND c.merged_into IS NULL
  ORDER BY r.matches_played DESC, r.last_match_at DESC NULLS LAST
  LIMIT GREATEST(COALESCE(p_limit, 10), 1);
END;
$$;

REVOKE ALL ON TABLE public.player_club_stats FROM PUBLIC;
GRANT SELECT ON TABLE public.player_club_stats TO authenticated;

REVOKE ALL ON FUNCTION public.club_recalculate_rankings(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_recalculate_rankings(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.club_get_ranking(uuid, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_get_ranking(uuid, int, int) TO authenticated;

REVOKE ALL ON FUNCTION public.player_get_my_club_rankings(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.player_get_my_club_rankings(int) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

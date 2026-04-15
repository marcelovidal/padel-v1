-- Already applied in Supabase on 2026-04-15
-- Documentation only
-- (mismo contenido que 20260415_fix_club_list_my_matches_club_id.sql)

-- Fix: club_list_my_matches ahora acepta p_club_id explícito
-- en lugar de resolver el club por claimed_by = auth.uid()
-- Necesario para club owners (owner_player_id) que no son el claimed_by original.

DROP FUNCTION IF EXISTS public.club_list_my_matches(int);

CREATE OR REPLACE FUNCTION public.club_list_my_matches(
  p_club_id uuid,
  p_limit int DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  match_at timestamptz,
  club_name text,
  club_id uuid,
  status text,
  max_players int,
  notes text,
  created_at timestamptz,
  updated_at timestamptz,
  players_count int,
  players_by_team jsonb,
  match_results jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- Verificar que el caller sea claimed_by o owner_player_id del club
  IF NOT EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = p_club_id
      AND c.deleted_at IS NULL
      AND (c.claimed_by = v_uid OR c.owner_player_id IN (
        SELECT p.id FROM public.players p WHERE p.user_id = v_uid
      ))
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.match_at,
    m.club_name,
    m.club_id,
    m.status::text,
    m.max_players,
    m.notes,
    m.created_at,
    m.updated_at,
    COALESCE(mp.players_count, 0)::int AS players_count,
    jsonb_build_object(
      'A', COALESCE(mp.team_a, '[]'::jsonb),
      'B', COALESCE(mp.team_b, '[]'::jsonb)
    ) AS players_by_team,
    mr.match_results
  FROM public.matches m
  LEFT JOIN (
    SELECT
      mp2.match_id,
      COUNT(*)::int AS players_count,
      jsonb_agg(mp2.player_id) FILTER (WHERE mp2.team = 'A') AS team_a,
      jsonb_agg(mp2.player_id) FILTER (WHERE mp2.team = 'B') AS team_b
    FROM public.match_players mp2
    GROUP BY mp2.match_id
  ) mp ON mp.match_id = m.id
  LEFT JOIN (
    SELECT
      r.match_id,
      jsonb_agg(jsonb_build_object('a', r.score_a, 'b', r.score_b) ORDER BY r.set_number) AS match_results
    FROM public.match_results r
    GROUP BY r.match_id
  ) mr ON mr.match_id = m.id
  WHERE m.club_id = p_club_id
  ORDER BY m.match_at DESC
  LIMIT GREATEST(COALESCE(p_limit, 100), 1);
END;
$$;

REVOKE ALL ON FUNCTION public.club_list_my_matches(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_list_my_matches(uuid, int) TO authenticated;

NOTIFY pgrst, 'reload schema';

BEGIN;

-- 1) RLS enabled (idempotente)
ALTER TABLE public.players       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;

-- 2) PLAYERS: el usuario autenticado puede ver SU player (por user_id)
DROP POLICY IF EXISTS players_select_owner ON public.players;
CREATE POLICY players_select_owner
ON public.players
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 3) MATCHES: el usuario puede ver partidos donde su player participa
DROP POLICY IF EXISTS matches_select_participant ON public.matches;
CREATE POLICY matches_select_participant
ON public.matches
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.match_players mp
    WHERE mp.match_id = public.matches.id
      AND mp.player_id = (
        SELECT p.id
        FROM public.players p
        WHERE p.user_id = auth.uid()
        LIMIT 1
      )
  )
);

-- 4) MATCH_PLAYERS: el usuario puede ver TODOS los participantes
-- de los partidos donde su player participa
DROP POLICY IF EXISTS match_players_select_all_in_match ON public.match_players;
CREATE POLICY match_players_select_all_in_match
ON public.match_players
FOR SELECT
TO authenticated
USING (
  public.match_players.match_id IN (
    SELECT mp2.match_id
    FROM public.match_players mp2
    WHERE mp2.player_id = (
      SELECT p.id
      FROM public.players p
      WHERE p.user_id = auth.uid()
      LIMIT 1
    )
  )
);

-- 5) MATCH_RESULTS: el usuario puede ver resultados de sus partidos
DROP POLICY IF EXISTS match_results_select_participant ON public.match_results;
CREATE POLICY match_results_select_participant
ON public.match_results
FOR SELECT
TO authenticated
USING (
  public.match_results.match_id IN (
    SELECT mp2.match_id
    FROM public.match_players mp2
    WHERE mp2.player_id = (
      SELECT p.id
      FROM public.players p
      WHERE p.user_id = auth.uid()
      LIMIT 1
    )
  )
);

COMMIT;

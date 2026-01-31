BEGIN;

-- =========================================================
-- 0) Asegurar RLS habilitado (no hace daño repetir)
-- =========================================================
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 1) BORRAR policies problemáticas
-- =========================================================

-- players
DROP POLICY IF EXISTS players_select_owner ON public.players;
DROP POLICY IF EXISTS players_select_owner_v1 ON public.players;

-- matches
DROP POLICY IF EXISTS matches_select_participant ON public.matches;
DROP POLICY IF EXISTS matches_select_participant_v1 ON public.matches;

-- match_players
DROP POLICY IF EXISTS match_players_select_all_in_match ON public.match_players;
DROP POLICY IF EXISTS match_players_select_all_in_match_v1 ON public.match_players;
DROP POLICY IF EXISTS match_players_select_all_in_my_matches ON public.match_players;

-- match_results
DROP POLICY IF EXISTS match_results_select_participant ON public.match_results;
DROP POLICY IF EXISTS match_results_select_participant_v1 ON public.match_results;

-- =========================================================
-- 2) Funciones helper (evitan recursión)
--    SECURITY DEFINER: se ejecutan con permisos del dueño
-- =========================================================

-- Devuelve el player_id del usuario autenticado
CREATE OR REPLACE FUNCTION public.current_player_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM public.players p
  WHERE p.user_id = auth.uid()
  LIMIT 1
$$;

-- Devuelve los match_id donde participa el jugador actual
CREATE OR REPLACE FUNCTION public.current_player_match_ids()
RETURNS TABLE(match_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT mp.match_id
  FROM public.match_players mp
  WHERE mp.player_id = public.current_player_id()
$$;

-- =========================================================
-- 3) Policies SELECT para jugadores (sin recursión)
-- =========================================================

-- Players: el usuario ve solo su propio registro de player
CREATE POLICY players_select_owner
ON public.players
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Matches: el usuario ve partidos donde participa
CREATE POLICY matches_select_participant
ON public.matches
FOR SELECT
TO authenticated
USING (
  public.matches.id IN (SELECT match_id FROM public.current_player_match_ids())
);

-- Match_players: ve TODOS los participantes de mis partidos
CREATE POLICY match_players_select_all_in_my_matches
ON public.match_players
FOR SELECT
TO authenticated
USING (
  public.match_players.match_id IN (SELECT match_id FROM public.current_player_match_ids())
);

-- Match_results: ve resultados de mis partidos
CREATE POLICY match_results_select_participant
ON public.match_results
FOR SELECT
TO authenticated
USING (
  public.match_results.match_id IN (SELECT match_id FROM public.current_player_match_ids())
);

COMMIT;

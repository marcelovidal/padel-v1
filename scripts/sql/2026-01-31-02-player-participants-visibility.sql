BEGIN;

-- 1) Permitir que los jugadores vean los perfiles básicos de otros participantes
-- en los partidos en los que ellos mismos participan.
DROP POLICY IF EXISTS players_select_participants ON public.players;
CREATE POLICY players_select_participants
ON public.players
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT mp.player_id
    FROM public.match_players mp
    WHERE mp.match_id IN (SELECT match_id FROM public.current_player_match_ids())
  )
);

COMMIT;

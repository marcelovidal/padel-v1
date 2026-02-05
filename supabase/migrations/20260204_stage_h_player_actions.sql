-- Stage H: Player Actions - Create Match MVP

-- Ensure RLS is enabled
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;

-- Ensure created_by exists (idempotent)
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS created_by uuid NOT NULL DEFAULT auth.uid();

-- Prevent duplicate players per match
DO $$ BEGIN
  ALTER TABLE public.match_players
    ADD CONSTRAINT uq_match_players_match_player UNIQUE (match_id, player_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Matches: allow player to insert match they created
DROP POLICY IF EXISTS "player_matches_insert_own" ON public.matches;
CREATE POLICY "player_matches_insert_own"
ON public.matches
FOR INSERT
TO authenticated
WITH CHECK (coalesce(created_by, auth.uid()) = auth.uid());

-- Match players: allow player to add players to matches they created
DROP POLICY IF EXISTS "player_match_players_insert_for_own_match" ON public.match_players;
CREATE POLICY "player_match_players_insert_for_own_match"
ON public.match_players
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.matches m
    WHERE m.id = match_players.match_id
      AND m.created_by = auth.uid()
  )
);

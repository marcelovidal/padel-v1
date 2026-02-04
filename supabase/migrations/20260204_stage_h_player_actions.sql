-- Stage H: Player Actions - Create Match MVP

-- 0) Ensure created_by exists and is safe (only if column doesn't exist)
-- (Si ya existe, NO ejecutar este bloque)
DO $$ BEGIN
  ALTER TABLE public.matches
    ADD COLUMN created_by uuid NOT NULL DEFAULT auth.uid();
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 1) Ensure match_players doesn't allow duplicates (recommended)
DO $$ BEGIN
  ALTER TABLE public.match_players
    ADD CONSTRAINT uq_match_players_match_player UNIQUE (match_id, player_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) RLS policies (do NOT drop existing ones; add new names)

-- Players can insert matches they created
DROP POLICY IF EXISTS "player_matches_insert_own" ON public.matches;
CREATE POLICY "player_matches_insert_own"
ON public.matches
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Players can add players to matches they created
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

-- Migration: Stage F - Assessments & Player Access
-- Description: Enables player self-assessments and readonly access to relevant match data.

-- 1. Ensure table exists (Safe idempotent check)
CREATE TABLE IF NOT EXISTS public.player_match_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  volea INTEGER CHECK (volea BETWEEN 1 AND 10),
  globo INTEGER CHECK (globo BETWEEN 1 AND 10),
  remate INTEGER CHECK (remate BETWEEN 1 AND 10),
  bandeja INTEGER CHECK (bandeja BETWEEN 1 AND 10),
  vibora INTEGER CHECK (vibora BETWEEN 1 AND 10),
  bajada_pared INTEGER CHECK (bajada_pared BETWEEN 1 AND 10),
  saque INTEGER CHECK (saque BETWEEN 1 AND 10),
  recepcion_saque INTEGER CHECK (recepcion_saque BETWEEN 1 AND 10),
  comments TEXT,
  submitted_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add Unique Constraint (Safe idempotent)
DO $$ BEGIN
  ALTER TABLE public.player_match_assessments
    ADD CONSTRAINT uq_assessment_match_player UNIQUE (match_id, player_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Enable RLS
ALTER TABLE public.player_match_assessments ENABLE ROW LEVEL SECURITY;

-- 4. RLS for Assessments (INSERT)
-- Rules: Player owns the record + Player in Match + Match Completed
DROP POLICY IF EXISTS "Players can insert own assessments" ON public.player_match_assessments;

CREATE POLICY "Players can insert own assessments"
  ON public.player_match_assessments
  FOR INSERT
  WITH CHECK (
    -- 1. Identify the player record associated with the current user
    EXISTS (
        SELECT 1 FROM public.players p
        WHERE p.id = player_id
        AND p.user_id = auth.uid()
    )
    AND
    -- 2. Verify match is completed
    EXISTS (
        SELECT 1 FROM public.matches m
        WHERE m.id = match_id
        AND m.status = 'completed'
    )
    AND
    -- 3. Verify player belongs to the match
    EXISTS (
        SELECT 1 FROM public.match_players mp
        WHERE mp.match_id = match_id
        AND mp.player_id = player_id
    )
  );

-- 5. RLS for Assessments (SELECT)
-- Only see own assessments
DROP POLICY IF EXISTS "Players can view own assessments" ON public.player_match_assessments;

CREATE POLICY "Players can view own assessments"
  ON public.player_match_assessments
  FOR SELECT
  USING (
    EXISTS (
        SELECT 1 FROM public.players p
        WHERE p.id = player_id
        AND p.user_id = auth.uid()
    )
  );

-- 6. RLS for Basic Player Access (Reads) needed for the profile page
-- Player needs to read: Own Player, Matches they played, Match Players of those matches

-- Players (Read Own)
DROP POLICY IF EXISTS "Players can view own profile" ON public.players;
CREATE POLICY "Players can view own profile"
  ON public.players FOR SELECT
  USING (user_id = auth.uid());

-- Matches (Read Played)
DROP POLICY IF EXISTS "Players can view matches they played" ON public.matches;
CREATE POLICY "Players can view matches they played"
  ON public.matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.match_players mp
      JOIN public.players p ON mp.player_id = p.id
      WHERE mp.match_id = matches.id
      AND p.user_id = auth.uid()
    )
  );

-- Match Results (Read for matches they played)
DROP POLICY IF EXISTS "Players can view results of matches they played" ON public.match_results;
CREATE POLICY "Players can view results of matches they played"
  ON public.match_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.match_players mp
      JOIN public.players p ON mp.player_id = p.id
      WHERE mp.match_id = match_results.match_id
      AND p.user_id = auth.uid()
    )
  );

-- Match Players (Read roster of matches they played)
DROP POLICY IF EXISTS "Players can view roster of matches they played" ON public.match_players;
CREATE POLICY "Players can view roster of matches they played"
  ON public.match_players FOR SELECT
  USING (
    EXISTS (
        SELECT 1 FROM public.match_players my_mp
        JOIN public.players p ON my_mp.player_id = p.id
        WHERE my_mp.match_id = match_players.match_id
        AND p.user_id = auth.uid()
    )
  );

-- DOWN Migration (Commented out for reversibility)
/*
DROP POLICY IF EXISTS "Players can view roster of matches they played" ON public.match_players;
DROP POLICY IF EXISTS "Players can view results of matches they played" ON public.match_results;
DROP POLICY IF EXISTS "Players can view matches they played" ON public.matches;
DROP POLICY IF EXISTS "Players can view own profile" ON public.players;
DROP POLICY IF EXISTS "Players can view own assessments" ON public.player_match_assessments;
DROP POLICY IF EXISTS "Players can insert own assessments" ON public.player_match_assessments;
ALTER TABLE public.player_match_assessments DROP CONSTRAINT IF EXISTS uq_assessment_match_player;
DROP TABLE IF EXISTS public.player_match_assessments;
*/

-- Migration: Add RLS policies to allow players to access their own row and their matches
BEGIN;

-- Enable row level security on players if not already
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Allow owners (linked via user_id) to select their own player row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid WHERE c.relname='players' AND p.polname='players_select_owner'
  ) THEN
    CREATE POLICY players_select_owner ON public.players FOR SELECT TO public USING (user_id = auth.uid());
  END IF;
END$$;

-- Allow players to select matches where they participate via match_players
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid WHERE c.relname='matches' AND p.polname='matches_select_participant'
  ) THEN
    CREATE POLICY matches_select_participant ON public.matches FOR SELECT TO public USING (
      EXISTS (
        SELECT 1 FROM public.match_players mp WHERE mp.match_id = public.matches.id AND mp.player_id = (
          SELECT id FROM public.players WHERE user_id = auth.uid()
        )
      )
    );
  END IF;
END$$;

-- Placeholder for match_results/assessments INSERT policy (restrict via service logic for now)
-- We add a SELECT policy for player_match_assessments so players can see their own assessments
ALTER TABLE public.player_match_assessments ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid WHERE c.relname='player_match_assessments' AND p.polname='assessments_select_owner'
  ) THEN
    CREATE POLICY assessments_select_owner ON public.player_match_assessments FOR SELECT TO public USING (player_id = (SELECT id FROM public.players WHERE user_id = auth.uid()));
  END IF;
END$$;

COMMIT;

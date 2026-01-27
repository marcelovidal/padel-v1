-- DEV migration: allow authenticated users to SELECT their own player row
-- Run this in Supabase SQL editor (dev/staging). Review before applying in production.

BEGIN;

-- Ensure RLS is enabled on players
ALTER TABLE IF EXISTS public.players ENABLE ROW LEVEL SECURITY;

-- Create policy only if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'players' AND policyname = 'players_select_owner'
  ) THEN
    CREATE POLICY players_select_owner ON public.players
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END$$;

COMMIT;

-- Notes:
-- - This policy allows an authenticated user (identified by JWT auth.uid())
--   to SELECT rows in public.players where players.user_id equals the authenticated uid.
-- - Do not apply blindly in production without reviewing other policies (INSERT/UPDATE/DELETE)
--   and ensuring no privilege escalation is possible.

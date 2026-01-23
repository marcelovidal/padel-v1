-- Migration: Add user_id to players to link auth.users -> public.players
-- Adds nullable unique user_id and index
BEGIN;

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS user_id uuid NULL;

-- Ensure uniqueness when not null
CREATE UNIQUE INDEX IF NOT EXISTS players_user_id_unique_idx ON public.players (user_id) WHERE user_id IS NOT NULL;

-- Foreign key to auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'players' AND c.conname = 'players_user_id_fkey'
  ) THEN
    ALTER TABLE public.players
      ADD CONSTRAINT players_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END$$;

COMMIT;

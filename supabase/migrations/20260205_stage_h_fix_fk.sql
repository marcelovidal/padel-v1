-- Fix for foreign key constraint violation (23503)
-- created_by should reference auth.users(id), not public.profiles(id)

ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_created_by_fkey;

ALTER TABLE public.matches
  ADD CONSTRAINT matches_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES auth.users(id)
  ON DELETE RESTRICT;

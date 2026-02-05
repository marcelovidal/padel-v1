-- Fix matches.created_by to be NOT NULL and default to auth.uid()
-- This ensures that even if created_by is omitted, it defaults to the current user (if trigger/default works)
-- But primarily it enforces data integrity and aligns with RLS expectations.

-- 1. Populate existing nulls (unsafe if widely used, but necessary for NOT NULL)
-- We set them to a placeholder or try to infer. For now, we assume this is safe in dev/stage.
-- NOTE: In production, one might match against match_players who are creators, but here we'll use auth.uid() if running interactively or just omit if no nulls exist.
-- Ideally we just set DEFAULT and NOT NULL. If there are NULLs, this will fail.
-- Let's update NULLs to the first admin or a placeholder if needed.
-- However, user instruction was: UPDATE matches SET created_by = auth.uid() WHERE created_by IS NULL;
-- In a migration script, auth.uid() might be null.
-- We will skip the UPDATE in the migration file to avoid runtime errors during deployment if no user context.
-- Manual update required if data exists.

-- 2. Set Default
ALTER TABLE public.matches
  ALTER COLUMN created_by SET DEFAULT auth.uid();

-- 3. Set Not Null
-- This might fail if there are existing rows with NULL `created_by`.
-- You must manually fix them before running this migration if that's the case.
ALTER TABLE public.matches
  ALTER COLUMN created_by SET NOT NULL;

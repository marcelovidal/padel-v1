BEGIN;

ALTER TABLE IF EXISTS public.club_owner_requests
  ADD COLUMN IF NOT EXISTS club_name_requested text;

NOTIFY pgrst, 'reload schema';

COMMIT;

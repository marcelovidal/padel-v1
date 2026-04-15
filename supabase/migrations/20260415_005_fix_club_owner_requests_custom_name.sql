-- Already applied in Supabase on 2026-04-15
-- Documentation only
-- (mismo contenido que 20260415_fix_club_owner_requests_custom_name.sql)

BEGIN;

ALTER TABLE IF EXISTS public.club_owner_requests
  ADD COLUMN IF NOT EXISTS club_name_requested text;

NOTIFY pgrst, 'reload schema';

COMMIT;

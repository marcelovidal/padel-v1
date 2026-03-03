-- STAGE Q3 HOTFIX: booking settings default buffer to 0 minutes

BEGIN;

ALTER TABLE public.club_booking_settings
  ALTER COLUMN buffer_minutes SET DEFAULT 0;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- FIX Q6.3: Update notifications type constraint without validating existing rows.
-- Uses NOT VALID to skip re-checking existing rows (which may have dev/test types).
-- New inserts are still validated by the constraint AND by the notification_create RPC.

BEGIN;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS chk_notifications_type;

ALTER TABLE public.notifications
  ADD CONSTRAINT chk_notifications_type CHECK (
    type IN (
      'player_match_result_ready',
      'player_claim_success',
      'club_claim_requested',
      'club_match_created',
      'tournament_open_for_registration',
      'league_open_for_registration',
      'tournament_registration_confirmed',
      'league_registration_confirmed'
    )
  ) NOT VALID;

COMMIT;

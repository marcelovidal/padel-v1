-- Already applied in Supabase on 2026-04-15
-- Documentation only

-- Ampliar constraint de notifications.type con los 22 tipos actuales
-- (agrega club_owner_request_approved y club_owner_request_rejected)

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS chk_notifications_type;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'player_match_result_ready',
    'player_claim_success',
    'club_claim_requested',
    'club_match_created',
    'tournament_open_for_registration',
    'league_open_for_registration',
    'tournament_registration_requested',
    'league_registration_requested',
    'tournament_registration_confirmed',
    'league_registration_confirmed',
    'coach_invitation',
    'coach_invitation_accepted',
    'coach_challenge_assigned',
    'coach_booking_request',
    'coach_booking_confirmed',
    'booking_confirmed',
    'booking_cancelled',
    'booking_requested',
    'training_session_scheduled',
    'coach_booking_cancelled',
    'club_owner_request_approved',
    'club_owner_request_rejected'
  ])) NOT VALID;

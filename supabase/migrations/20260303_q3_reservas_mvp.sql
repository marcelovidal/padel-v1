-- STAGE Q3: RESERVAS MVP CLUB-FIRST
-- Club-first booking requests with admin/owner confirmation and optional match creation bridge.

BEGIN;

-- 1) Tables
CREATE TABLE IF NOT EXISTS public.club_courts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name text NOT NULL,
  surface_type text NOT NULL DEFAULT 'synthetic',
  is_indoor boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_club_courts_surface_type'
  ) THEN
    ALTER TABLE public.club_courts
      ADD CONSTRAINT chk_club_courts_surface_type
      CHECK (surface_type IN ('synthetic', 'hard', 'clay', 'other'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_club_courts_club_id
  ON public.club_courts(club_id);

CREATE TABLE IF NOT EXISTS public.club_booking_settings (
  club_id uuid PRIMARY KEY REFERENCES public.clubs(id) ON DELETE CASCADE,
  timezone text NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  slot_duration_minutes int NOT NULL DEFAULT 90,
  buffer_minutes int NOT NULL DEFAULT 10,
  opening_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_booking_settings_slot_duration'
  ) THEN
    ALTER TABLE public.club_booking_settings
      ADD CONSTRAINT chk_booking_settings_slot_duration
      CHECK (slot_duration_minutes > 0 AND slot_duration_minutes <= 240);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_booking_settings_buffer'
  ) THEN
    ALTER TABLE public.club_booking_settings
      ADD CONSTRAINT chk_booking_settings_buffer
      CHECK (buffer_minutes >= 0 AND buffer_minutes <= 120);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.court_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  court_id uuid NOT NULL REFERENCES public.club_courts(id) ON DELETE CASCADE,
  requested_by_player_id uuid NULL REFERENCES public.players(id) ON DELETE SET NULL,
  requested_by_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'requested',
  note text NULL,
  rejection_reason text NULL,
  match_id uuid NULL REFERENCES public.matches(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_court_bookings_status'
  ) THEN
    ALTER TABLE public.court_bookings
      ADD CONSTRAINT chk_court_bookings_status
      CHECK (status IN ('requested', 'confirmed', 'rejected', 'cancelled'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_court_bookings_time'
  ) THEN
    ALTER TABLE public.court_bookings
      ADD CONSTRAINT chk_court_bookings_time
      CHECK (end_at > start_at);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_court_bookings_club_time
  ON public.court_bookings(club_id, start_at);

CREATE INDEX IF NOT EXISTS idx_court_bookings_court_time
  ON public.court_bookings(court_id, start_at, end_at);

CREATE INDEX IF NOT EXISTS idx_court_bookings_status
  ON public.court_bookings(status);

CREATE INDEX IF NOT EXISTS idx_court_bookings_requested_by_user
  ON public.court_bookings(requested_by_user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_court_bookings_match_id_not_null
  ON public.court_bookings(match_id)
  WHERE match_id IS NOT NULL;

-- 2) RLS
ALTER TABLE public.club_courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_booking_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.court_bookings ENABLE ROW LEVEL SECURITY;

-- club_courts SELECT
DROP POLICY IF EXISTS "club_courts_select_all_authenticated" ON public.club_courts;
CREATE POLICY "club_courts_select_all_authenticated"
  ON public.club_courts
  FOR SELECT
  TO authenticated
  USING (
    (active = true)
    OR EXISTS (
      SELECT 1
      FROM public.clubs c
      WHERE c.id = club_courts.club_id
        AND c.deleted_at IS NULL
        AND c.archived_at IS NULL
        AND c.merged_into IS NULL
        AND c.claim_status = 'claimed'
        AND c.claimed_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- club_courts write (owner only)
DROP POLICY IF EXISTS "club_courts_insert_owner" ON public.club_courts;
CREATE POLICY "club_courts_insert_owner"
  ON public.club_courts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clubs c
      WHERE c.id = club_courts.club_id
        AND c.deleted_at IS NULL
        AND c.archived_at IS NULL
        AND c.merged_into IS NULL
        AND c.claim_status = 'claimed'
        AND c.claimed_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "club_courts_update_owner" ON public.club_courts;
CREATE POLICY "club_courts_update_owner"
  ON public.club_courts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clubs c
      WHERE c.id = club_courts.club_id
        AND c.deleted_at IS NULL
        AND c.archived_at IS NULL
        AND c.merged_into IS NULL
        AND c.claim_status = 'claimed'
        AND c.claimed_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clubs c
      WHERE c.id = club_courts.club_id
        AND c.deleted_at IS NULL
        AND c.archived_at IS NULL
        AND c.merged_into IS NULL
        AND c.claim_status = 'claimed'
        AND c.claimed_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "club_courts_delete_owner" ON public.club_courts;
CREATE POLICY "club_courts_delete_owner"
  ON public.club_courts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clubs c
      WHERE c.id = club_courts.club_id
        AND c.deleted_at IS NULL
        AND c.archived_at IS NULL
        AND c.merged_into IS NULL
        AND c.claim_status = 'claimed'
        AND c.claimed_by = auth.uid()
    )
  );

-- club_booking_settings
DROP POLICY IF EXISTS "club_booking_settings_select_authenticated" ON public.club_booking_settings;
CREATE POLICY "club_booking_settings_select_authenticated"
  ON public.club_booking_settings
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "club_booking_settings_insert_owner" ON public.club_booking_settings;
CREATE POLICY "club_booking_settings_insert_owner"
  ON public.club_booking_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clubs c
      WHERE c.id = club_booking_settings.club_id
        AND c.deleted_at IS NULL
        AND c.archived_at IS NULL
        AND c.merged_into IS NULL
        AND c.claim_status = 'claimed'
        AND c.claimed_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "club_booking_settings_update_owner" ON public.club_booking_settings;
CREATE POLICY "club_booking_settings_update_owner"
  ON public.club_booking_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clubs c
      WHERE c.id = club_booking_settings.club_id
        AND c.deleted_at IS NULL
        AND c.archived_at IS NULL
        AND c.merged_into IS NULL
        AND c.claim_status = 'claimed'
        AND c.claimed_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clubs c
      WHERE c.id = club_booking_settings.club_id
        AND c.deleted_at IS NULL
        AND c.archived_at IS NULL
        AND c.merged_into IS NULL
        AND c.claim_status = 'claimed'
        AND c.claimed_by = auth.uid()
    )
  );

-- court_bookings select
DROP POLICY IF EXISTS "court_bookings_select_owner_or_requester" ON public.court_bookings;
CREATE POLICY "court_bookings_select_owner_or_requester"
  ON public.court_bookings
  FOR SELECT
  TO authenticated
  USING (
    requested_by_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.players p
      WHERE p.id = court_bookings.requested_by_player_id
        AND p.user_id = auth.uid()
        AND p.deleted_at IS NULL
    )
    OR EXISTS (
      SELECT 1
      FROM public.clubs c
      WHERE c.id = court_bookings.club_id
        AND c.deleted_at IS NULL
        AND c.archived_at IS NULL
        AND c.merged_into IS NULL
        AND c.claim_status = 'claimed'
        AND c.claimed_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- court_bookings insert by requester
DROP POLICY IF EXISTS "court_bookings_insert_requester" ON public.court_bookings;
CREATE POLICY "court_bookings_insert_requester"
  ON public.court_bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by_user_id = auth.uid()
    AND status = 'requested'
    AND EXISTS (
      SELECT 1
      FROM public.clubs c
      WHERE c.id = court_bookings.club_id
        AND c.deleted_at IS NULL
        AND c.archived_at IS NULL
        AND c.merged_into IS NULL
    )
    AND EXISTS (
      SELECT 1
      FROM public.club_courts cc
      WHERE cc.id = court_bookings.court_id
        AND cc.club_id = court_bookings.club_id
        AND cc.active = true
    )
  );

-- court_bookings update by owner (confirm/reject/assign match)
DROP POLICY IF EXISTS "court_bookings_update_owner" ON public.court_bookings;
CREATE POLICY "court_bookings_update_owner"
  ON public.court_bookings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.clubs c
      WHERE c.id = court_bookings.club_id
        AND c.deleted_at IS NULL
        AND c.archived_at IS NULL
        AND c.merged_into IS NULL
        AND c.claim_status = 'claimed'
        AND c.claimed_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.clubs c
      WHERE c.id = court_bookings.club_id
        AND c.deleted_at IS NULL
        AND c.archived_at IS NULL
        AND c.merged_into IS NULL
        AND c.claim_status = 'claimed'
        AND c.claimed_by = auth.uid()
    )
  );

-- court_bookings update by requester (cancel only)
DROP POLICY IF EXISTS "court_bookings_update_requester_cancel" ON public.court_bookings;
CREATE POLICY "court_bookings_update_requester_cancel"
  ON public.court_bookings
  FOR UPDATE
  TO authenticated
  USING (
    requested_by_user_id = auth.uid()
    AND status = 'requested'
  )
  WITH CHECK (
    requested_by_user_id = auth.uid()
    AND status = 'cancelled'
  );

-- 3) RPCs (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.club_upsert_booking_settings(
  p_club_id uuid,
  p_timezone text DEFAULT 'America/Argentina/Buenos_Aires',
  p_slot_duration_minutes int DEFAULT 90,
  p_buffer_minutes int DEFAULT 10,
  p_opening_hours jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_owner boolean;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.clubs c
    WHERE c.id = p_club_id
      AND c.deleted_at IS NULL
      AND c.archived_at IS NULL
      AND c.merged_into IS NULL
      AND c.claim_status = 'claimed'
      AND c.claimed_by = v_uid
  ) INTO v_owner;

  IF NOT COALESCE(v_owner, false) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  IF COALESCE(p_slot_duration_minutes, 0) <= 0 OR p_slot_duration_minutes > 240 THEN
    RAISE EXCEPTION 'INVALID_SLOT_DURATION';
  END IF;

  IF COALESCE(p_buffer_minutes, -1) < 0 OR p_buffer_minutes > 120 THEN
    RAISE EXCEPTION 'INVALID_BUFFER';
  END IF;

  INSERT INTO public.club_booking_settings (
    club_id,
    timezone,
    slot_duration_minutes,
    buffer_minutes,
    opening_hours,
    updated_at
  )
  VALUES (
    p_club_id,
    COALESCE(NULLIF(TRIM(p_timezone), ''), 'America/Argentina/Buenos_Aires'),
    p_slot_duration_minutes,
    p_buffer_minutes,
    COALESCE(p_opening_hours, '{}'::jsonb),
    now()
  )
  ON CONFLICT (club_id)
  DO UPDATE
  SET timezone = EXCLUDED.timezone,
      slot_duration_minutes = EXCLUDED.slot_duration_minutes,
      buffer_minutes = EXCLUDED.buffer_minutes,
      opening_hours = EXCLUDED.opening_hours,
      updated_at = now();

  RETURN p_club_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.club_create_court(
  p_club_id uuid,
  p_name text,
  p_surface_type text DEFAULT 'synthetic',
  p_is_indoor boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_owner boolean;
  v_name text;
  v_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.clubs c
    WHERE c.id = p_club_id
      AND c.deleted_at IS NULL
      AND c.archived_at IS NULL
      AND c.merged_into IS NULL
      AND c.claim_status = 'claimed'
      AND c.claimed_by = v_uid
  ) INTO v_owner;

  IF NOT COALESCE(v_owner, false) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  v_name := NULLIF(TRIM(p_name), '');
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'COURT_NAME_REQUIRED';
  END IF;

  IF COALESCE(p_surface_type, '') NOT IN ('synthetic', 'hard', 'clay', 'other') THEN
    RAISE EXCEPTION 'INVALID_SURFACE_TYPE';
  END IF;

  INSERT INTO public.club_courts (
    club_id,
    name,
    surface_type,
    is_indoor,
    active,
    updated_at
  )
  VALUES (
    p_club_id,
    v_name,
    p_surface_type,
    COALESCE(p_is_indoor, false),
    true,
    now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.club_update_court(
  p_court_id uuid,
  p_name text DEFAULT NULL,
  p_surface_type text DEFAULT NULL,
  p_is_indoor boolean DEFAULT NULL,
  p_active boolean DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_court record;
  v_owner boolean;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT cc.id, cc.club_id
    INTO v_court
  FROM public.club_courts cc
  WHERE cc.id = p_court_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COURT_NOT_FOUND';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.clubs c
    WHERE c.id = v_court.club_id
      AND c.deleted_at IS NULL
      AND c.archived_at IS NULL
      AND c.merged_into IS NULL
      AND c.claim_status = 'claimed'
      AND c.claimed_by = v_uid
  ) INTO v_owner;

  IF NOT COALESCE(v_owner, false) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  IF p_surface_type IS NOT NULL AND p_surface_type NOT IN ('synthetic', 'hard', 'clay', 'other') THEN
    RAISE EXCEPTION 'INVALID_SURFACE_TYPE';
  END IF;

  UPDATE public.club_courts
  SET
    name = COALESCE(NULLIF(TRIM(p_name), ''), name),
    surface_type = COALESCE(p_surface_type, surface_type),
    is_indoor = COALESCE(p_is_indoor, is_indoor),
    active = COALESCE(p_active, active),
    updated_at = now()
  WHERE id = p_court_id;

  RETURN p_court_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.player_request_booking(
  p_club_id uuid,
  p_court_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_player_id uuid;
  v_booking_id uuid;
  v_court_ok boolean;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF p_end_at <= p_start_at THEN
    RAISE EXCEPTION 'INVALID_TIME_RANGE';
  END IF;

  IF p_start_at < now() - interval '10 minutes' THEN
    RAISE EXCEPTION 'BOOKING_MUST_BE_FUTURE';
  END IF;

  IF p_start_at > now() + interval '60 days' THEN
    RAISE EXCEPTION 'BOOKING_TOO_FAR';
  END IF;

  SELECT p.id
    INTO v_player_id
  FROM public.players p
  WHERE p.user_id = v_uid
    AND p.deleted_at IS NULL
  LIMIT 1;

  SELECT EXISTS (
    SELECT 1
    FROM public.club_courts cc
    JOIN public.clubs c
      ON c.id = cc.club_id
    WHERE cc.id = p_court_id
      AND cc.club_id = p_club_id
      AND cc.active = true
      AND c.deleted_at IS NULL
      AND c.archived_at IS NULL
      AND c.merged_into IS NULL
  ) INTO v_court_ok;

  IF NOT COALESCE(v_court_ok, false) THEN
    RAISE EXCEPTION 'COURT_NOT_AVAILABLE';
  END IF;

  INSERT INTO public.court_bookings (
    club_id,
    court_id,
    requested_by_player_id,
    requested_by_user_id,
    start_at,
    end_at,
    status,
    note,
    updated_at
  )
  VALUES (
    p_club_id,
    p_court_id,
    v_player_id,
    v_uid,
    p_start_at,
    p_end_at,
    'requested',
    NULLIF(TRIM(p_note), ''),
    now()
  )
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.club_confirm_booking(
  p_booking_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_booking record;
  v_owner boolean;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT b.*
    INTO v_booking
  FROM public.court_bookings b
  WHERE b.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.clubs c
    WHERE c.id = v_booking.club_id
      AND c.deleted_at IS NULL
      AND c.archived_at IS NULL
      AND c.merged_into IS NULL
      AND c.claim_status = 'claimed'
      AND c.claimed_by = v_uid
  ) INTO v_owner;

  IF NOT COALESCE(v_owner, false) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  IF v_booking.status <> 'requested' THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.court_bookings b2
    WHERE b2.court_id = v_booking.court_id
      AND b2.id <> v_booking.id
      AND b2.status = 'confirmed'
      AND v_booking.start_at < b2.end_at
      AND v_booking.end_at > b2.start_at
  ) THEN
    RAISE EXCEPTION 'BOOKING_OVERLAP';
  END IF;

  UPDATE public.court_bookings
  SET status = 'confirmed',
      rejection_reason = NULL,
      updated_at = now()
  WHERE id = p_booking_id;

  RETURN p_booking_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.club_reject_booking(
  p_booking_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_booking record;
  v_owner boolean;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT b.*
    INTO v_booking
  FROM public.court_bookings b
  WHERE b.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.clubs c
    WHERE c.id = v_booking.club_id
      AND c.deleted_at IS NULL
      AND c.archived_at IS NULL
      AND c.merged_into IS NULL
      AND c.claim_status = 'claimed'
      AND c.claimed_by = v_uid
  ) INTO v_owner;

  IF NOT COALESCE(v_owner, false) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  IF v_booking.status <> 'requested' THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  UPDATE public.court_bookings
  SET status = 'rejected',
      rejection_reason = NULLIF(TRIM(p_reason), ''),
      updated_at = now()
  WHERE id = p_booking_id;

  RETURN p_booking_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.player_cancel_booking(
  p_booking_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_booking record;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT b.*
    INTO v_booking
  FROM public.court_bookings b
  WHERE b.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND';
  END IF;

  IF v_booking.requested_by_user_id <> v_uid THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  IF v_booking.status <> 'requested' THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  UPDATE public.court_bookings
  SET status = 'cancelled',
      updated_at = now()
  WHERE id = p_booking_id;

  RETURN p_booking_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.booking_create_match(
  p_booking_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_booking record;
  v_club record;
  v_is_owner boolean;
  v_is_requester boolean;
  v_match_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT b.*
    INTO v_booking
  FROM public.court_bookings b
  WHERE b.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND';
  END IF;

  IF v_booking.status <> 'confirmed' THEN
    RAISE EXCEPTION 'BOOKING_NOT_CONFIRMED';
  END IF;

  IF v_booking.match_id IS NOT NULL THEN
    RETURN v_booking.match_id;
  END IF;

  SELECT c.id, c.name,
         (c.claim_status = 'claimed' AND c.claimed_by = v_uid) AS is_owner
    INTO v_club
  FROM public.clubs c
  WHERE c.id = v_booking.club_id
    AND c.deleted_at IS NULL
    AND c.archived_at IS NULL
    AND c.merged_into IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CLUB_NOT_FOUND';
  END IF;

  v_is_owner := COALESCE(v_club.is_owner, false);
  v_is_requester := (v_booking.requested_by_user_id = v_uid);

  IF NOT v_is_owner AND NOT v_is_requester THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  INSERT INTO public.matches (
    match_at,
    club_name,
    club_name_raw,
    club_id,
    status,
    notes,
    max_players,
    created_by
  )
  VALUES (
    v_booking.start_at,
    v_club.name,
    v_club.name,
    v_booking.club_id,
    CASE WHEN v_booking.start_at < now() THEN 'completed'::public.match_status ELSE 'scheduled'::public.match_status END,
    CONCAT('Creado desde reserva #', v_booking.id::text),
    4,
    v_uid
  )
  RETURNING id INTO v_match_id;

  UPDATE public.court_bookings
  SET match_id = v_match_id,
      updated_at = now()
  WHERE id = p_booking_id;

  RETURN v_match_id;
END;
$$;

-- 4) Grants
REVOKE ALL ON FUNCTION public.club_upsert_booking_settings(uuid, text, int, int, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_upsert_booking_settings(uuid, text, int, int, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.club_create_court(uuid, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_create_court(uuid, text, text, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.club_update_court(uuid, text, text, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_update_court(uuid, text, text, boolean, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.player_request_booking(uuid, uuid, timestamptz, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.player_request_booking(uuid, uuid, timestamptz, timestamptz, text) TO authenticated;

REVOKE ALL ON FUNCTION public.club_confirm_booking(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_confirm_booking(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.club_reject_booking(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_reject_booking(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.player_cancel_booking(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.player_cancel_booking(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.booking_create_match(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.booking_create_match(uuid) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- STAGE Q4: UNIFIED MATCH FLOW (match-centric with optional booking link)

BEGIN;

-- 1) Match source for traceability (idempotent)
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS match_source text NOT NULL DEFAULT 'direct';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_matches_match_source'
  ) THEN
    ALTER TABLE public.matches
      ADD CONSTRAINT chk_matches_match_source
      CHECK (match_source IN ('direct', 'booking'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_matches_match_source
  ON public.matches(match_source);

-- 2) Ensure booking->match link index exists (idempotent, non-breaking)
CREATE INDEX IF NOT EXISTS idx_court_bookings_match_id
  ON public.court_bookings(match_id)
  WHERE match_id IS NOT NULL;

-- 3) Unified player RPC: direct match OR match linked to booking
CREATE OR REPLACE FUNCTION public.player_create_match_unified(
  p_match_at timestamptz,
  p_player_ids uuid[],
  p_club_id uuid DEFAULT NULL,
  p_club_name text DEFAULT NULL,
  p_court_id uuid DEFAULT NULL,
  p_booking_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_source text DEFAULT 'direct'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_creator_player_id uuid;
  v_match_id uuid;
  v_status public.match_status;
  v_club_name text;
  v_source text;
  v_booking record;
  v_is_owner boolean;
  v_is_admin boolean;
  v_has_access boolean;
  v_exists_count int;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT p.id
    INTO v_creator_player_id
  FROM public.players p
  WHERE p.user_id = v_uid
    AND p.deleted_at IS NULL
    AND p.status = 'active'
  LIMIT 1;

  IF v_creator_player_id IS NULL THEN
    RAISE EXCEPTION 'PLAYER_PROFILE_NOT_FOUND';
  END IF;

  IF p_player_ids IS NULL OR array_length(p_player_ids, 1) <> 4 THEN
    RAISE EXCEPTION 'INVALID_PLAYERS_COUNT';
  END IF;

  IF (SELECT count(DISTINCT x) FROM unnest(p_player_ids) AS x) <> 4 THEN
    RAISE EXCEPTION 'DUPLICATE_PLAYERS';
  END IF;

  IF NOT (v_creator_player_id = ANY(p_player_ids)) THEN
    RAISE EXCEPTION 'CREATOR_NOT_IN_MATCH';
  END IF;

  SELECT count(*)
    INTO v_exists_count
  FROM public.players p
  WHERE p.id = ANY(p_player_ids)
    AND p.deleted_at IS NULL
    AND p.status = 'active';

  IF v_exists_count <> 4 THEN
    RAISE EXCEPTION 'PLAYER_NOT_FOUND';
  END IF;

  IF p_booking_id IS NOT NULL THEN
    SELECT b.*
      INTO v_booking
    FROM public.court_bookings b
    WHERE b.id = p_booking_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'BOOKING_NOT_FOUND';
    END IF;

    IF v_booking.status NOT IN ('requested', 'confirmed') THEN
      RAISE EXCEPTION 'INVALID_STATUS';
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
    ) INTO v_is_owner;

    SELECT EXISTS (
      SELECT 1
      FROM public.profiles pr
      WHERE pr.id = v_uid
        AND pr.role = 'admin'
    ) INTO v_is_admin;

    v_has_access := (
      v_booking.requested_by_user_id = v_uid
      OR v_is_owner
      OR v_is_admin
    );

    IF NOT COALESCE(v_has_access, false) THEN
      RAISE EXCEPTION 'NOT_ALLOWED';
    END IF;

    IF v_booking.match_id IS NOT NULL THEN
      RETURN v_booking.match_id;
    END IF;

    p_club_id := v_booking.club_id;
    p_court_id := v_booking.court_id;
    p_match_at := v_booking.start_at;
    v_source := 'booking';
  ELSE
    v_source := COALESCE(NULLIF(TRIM(p_source), ''), 'direct');
  END IF;

  IF v_source NOT IN ('direct', 'booking') THEN
    RAISE EXCEPTION 'INVALID_SOURCE';
  END IF;

  IF p_club_id IS NOT NULL THEN
    SELECT c.name
      INTO v_club_name
    FROM public.clubs c
    WHERE c.id = p_club_id
      AND c.deleted_at IS NULL
      AND c.archived_at IS NULL
      AND c.merged_into IS NULL
    LIMIT 1;

    IF v_club_name IS NULL THEN
      RAISE EXCEPTION 'CLUB_NOT_FOUND';
    END IF;
  ELSE
    v_club_name := COALESCE(NULLIF(TRIM(COALESCE(p_club_name, '')), ''), 'Partido sin club');
  END IF;

  v_status := CASE
    WHEN p_match_at < now() THEN 'completed'::public.match_status
    ELSE 'scheduled'::public.match_status
  END;

  INSERT INTO public.matches (
    match_at,
    club_name,
    club_name_raw,
    club_id,
    status,
    notes,
    max_players,
    created_by,
    match_source
  )
  VALUES (
    p_match_at,
    v_club_name,
    NULLIF(TRIM(COALESCE(p_club_name, '')), ''),
    p_club_id,
    v_status,
    NULLIF(TRIM(COALESCE(p_notes, '')), ''),
    4,
    v_uid,
    v_source
  )
  RETURNING id INTO v_match_id;

  INSERT INTO public.match_players (match_id, player_id, team)
  VALUES
    (v_match_id, p_player_ids[1], 'A'),
    (v_match_id, p_player_ids[2], 'A'),
    (v_match_id, p_player_ids[3], 'B'),
    (v_match_id, p_player_ids[4], 'B');

  IF p_booking_id IS NOT NULL THEN
    UPDATE public.court_bookings
    SET match_id = v_match_id,
        updated_at = now()
    WHERE id = p_booking_id;
  END IF;

  RETURN v_match_id;
END;
$$;

REVOKE ALL ON FUNCTION public.player_create_match_unified(timestamptz, uuid[], uuid, text, uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.player_create_match_unified(timestamptz, uuid[], uuid, text, uuid, uuid, text, text) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

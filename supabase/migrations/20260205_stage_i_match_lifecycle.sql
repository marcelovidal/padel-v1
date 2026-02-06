-- STAGE I: Match Lifecycle & Stage H Restoration
-- This migration ensures all player write operations use SECURITY DEFINER RPCs.

-- 1. [RESTORE/UPDATE] Atomic Match & Roster Creation
CREATE OR REPLACE FUNCTION public.player_create_match_with_players(
  p_match_at timestamptz,
  p_club_name text,
  p_partner_id uuid,
  p_opp1_id uuid,
  p_opp2_id uuid,
  p_status public.match_status DEFAULT 'scheduled',
  p_notes text DEFAULT NULL,
  p_max_players integer DEFAULT 4
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_match_id uuid;
  v_creator_player_id uuid;
  v_ids uuid[];
BEGIN
  -- Validate Auth
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- Map auth user -> players.id
  SELECT id INTO v_creator_player_id
  FROM public.players
  WHERE user_id = v_uid
  AND deleted_at IS NULL;

  IF v_creator_player_id IS NULL THEN
    RAISE EXCEPTION 'PLAYER_PROFILE_NOT_FOUND';
  END IF;

  -- Ensure unique 4 players
  v_ids := ARRAY[v_creator_player_id, p_partner_id, p_opp1_id, p_opp2_id];
  IF (SELECT count(DISTINCT x) FROM unnest(v_ids) AS x) <> 4 THEN
    RAISE EXCEPTION 'DUPLICATE_PLAYERS';
  END IF;

  -- Insert Match
  INSERT INTO public.matches (match_at, club_name, status, notes, max_players, created_by)
  VALUES (p_match_at, p_club_name, p_status, p_notes, p_max_players, v_uid)
  RETURNING id INTO v_match_id;

  -- Insert Roster
  INSERT INTO public.match_players (match_id, player_id, team)
  VALUES
    (v_match_id, v_creator_player_id, 'A'),
    (v_match_id, p_partner_id, 'A'),
    (v_match_id, p_opp1_id, 'B'),
    (v_match_id, p_opp2_id, 'B');

  RETURN v_match_id;
END;
$$;

-- 2. [NEW] Update Match (Reschedule/Edit)
CREATE OR REPLACE FUNCTION public.player_update_match(
  p_match_id uuid,
  p_match_at timestamptz,
  p_club_name text,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_status public.match_status;
  v_created_by uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT status, created_by INTO v_status, v_created_by
  FROM public.matches
  WHERE id = p_match_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MATCH_NOT_FOUND';
  END IF;

  IF v_created_by <> v_uid THEN
    RAISE EXCEPTION 'NOT_OWNER';
  END IF;

  IF v_status <> 'scheduled' THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  UPDATE public.matches
  SET 
    match_at = p_match_at,
    club_name = p_club_name,
    notes = p_notes,
    updated_at = now()
  WHERE id = p_match_id;

  RETURN p_match_id;
END;
$$;

-- 3. [NEW] Cancel Match
CREATE OR REPLACE FUNCTION public.player_cancel_match(
  p_match_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_status public.match_status;
  v_created_by uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT status, created_by INTO v_status, v_created_by
  FROM public.matches
  WHERE id = p_match_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MATCH_NOT_FOUND';
  END IF;

  IF v_created_by <> v_uid THEN
    RAISE EXCEPTION 'NOT_OWNER';
  END IF;

  IF v_status <> 'scheduled' THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  UPDATE public.matches
  SET 
    status = 'cancelled',
    updated_at = now()
  WHERE id = p_match_id;

  RETURN p_match_id;
END;
$$;

-- Permissions
REVOKE ALL ON FUNCTION public.player_create_match_with_players FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.player_create_match_with_players TO authenticated;

REVOKE ALL ON FUNCTION public.player_update_match FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.player_update_match TO authenticated;

REVOKE ALL ON FUNCTION public.player_cancel_match FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.player_cancel_match TO authenticated;

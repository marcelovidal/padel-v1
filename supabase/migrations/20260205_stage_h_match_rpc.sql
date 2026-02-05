-- RPC to create a match and its roster as a player (Atomic & Secure)
-- Uses SECURITY DEFINER to bypass RLS issues in SSR and ensure transactional integrity.

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
  -- 1. Get auth.uid()
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Map auth user -> players.id (The person creating the match must be a player)
  SELECT id INTO v_creator_player_id
  FROM public.players
  WHERE user_id = v_uid
  AND deleted_at IS NULL;

  IF v_creator_player_id IS NULL THEN
    RAISE EXCEPTION 'No active player linked to auth user';
  END IF;

  -- 3. Ensure unique 4 players
  v_ids := ARRAY[v_creator_player_id, p_partner_id, p_opp1_id, p_opp2_id];
  IF (SELECT count(DISTINCT x) FROM unnest(v_ids) AS x) <> 4 THEN
    RAISE EXCEPTION 'Players must be 4 unique IDs';
  END IF;

  -- 4. Insert Match
  INSERT INTO public.matches (
    match_at, 
    club_name, 
    status, 
    notes, 
    max_players, 
    created_by
  )
  VALUES (
    p_match_at, 
    p_club_name, 
    p_status, 
    p_notes, 
    p_max_players, 
    v_uid
  )
  RETURNING id INTO v_match_id;

  -- 5. Insert Roster
  INSERT INTO public.match_players (match_id, player_id, team)
  VALUES
    (v_match_id, v_creator_player_id, 'A'),
    (v_match_id, p_partner_id, 'A'),
    (v_match_id, p_opp1_id, 'B'),
    (v_match_id, p_opp2_id, 'B');

  RETURN v_match_id;
END;
$$;

-- Security hardening
REVOKE ALL ON FUNCTION public.player_create_match_with_players FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.player_create_match_with_players TO authenticated;

-- STAGE J: Auto-complete status + Result Entry
-- This migration automates match completion and allows players to submit results.

-- 1. Ensure Unique Constraint on match_results(match_id)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'match_results_match_id_key' 
    AND conrelid = 'public.match_results'::regclass
  ) THEN
    ALTER TABLE public.match_results ADD CONSTRAINT match_results_match_id_key UNIQUE (match_id);
  END IF;
END $$;

-- 2. [UPDATE] Atomic Match & Roster Creation (Remove p_status, handle past dates)
CREATE OR REPLACE FUNCTION public.player_create_match_with_players(
  p_match_at timestamptz,
  p_club_name text,
  p_partner_id uuid,
  p_opp1_id uuid,
  p_opp2_id uuid,
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
  v_status public.match_status;
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

  -- Logic: match_at in the past => completed
  v_status := CASE 
    WHEN p_match_at < now() THEN 'completed'::public.match_status 
    ELSE 'scheduled'::public.match_status 
  END;

  -- Ensure unique 4 players
  v_ids := ARRAY[v_creator_player_id, p_partner_id, p_opp1_id, p_opp2_id];
  IF (SELECT count(DISTINCT x) FROM unnest(v_ids) AS x) <> 4 THEN
    RAISE EXCEPTION 'DUPLICATE_PLAYERS';
  END IF;

  -- Insert Match
  INSERT INTO public.matches (match_at, club_name, status, notes, max_players, created_by)
  VALUES (p_match_at, p_club_name, v_status, p_notes, p_max_players, v_uid)
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

-- 3. [UPDATE] Update Match (Autocurate status)
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
  v_new_status public.match_status;
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

  -- Only allow editing scheduled matches
  IF v_status <> 'scheduled'::public.match_status THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  -- Autocurate: if new date is in the past, move to completed
  v_new_status := CASE 
    WHEN p_match_at < now() THEN 'completed'::public.match_status 
    ELSE 'scheduled'::public.match_status 
  END;

  UPDATE public.matches
  SET 
    match_at = p_match_at,
    club_name = p_club_name,
    notes = p_notes,
    status = v_new_status,
    updated_at = now()
  WHERE id = p_match_id;

  RETURN p_match_id;
END;
$$;

-- 4. [NEW] Submit Match Result (Player)
CREATE OR REPLACE FUNCTION public.player_submit_match_result(
  p_match_id uuid,
  p_set1_a int,
  p_set1_b int,
  p_set2_a int,
  p_set2_b int,
  p_set3_a int DEFAULT NULL,
  p_set3_b int DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_player_id uuid;
  v_match_at timestamptz;
  v_status public.match_status;
  v_sets jsonb;
  v_winner_team public.team_type;
  v_team_a_sets int := 0;
  v_team_b_sets int := 0;
BEGIN
  -- 1. Validate Auth
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- 2. Map Player
  SELECT id INTO v_player_id
  FROM public.players
  WHERE user_id = v_uid AND deleted_at IS NULL;

  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'PLAYER_PROFILE_NOT_FOUND';
  END IF;

  -- 3. Check Match & Participation
  SELECT m.status, m.match_at INTO v_status, v_match_at
  FROM public.matches m
  JOIN public.match_players mp ON m.id = mp.match_id
  WHERE m.id = p_match_id AND mp.player_id = v_player_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MATCH_NOT_FOUND_OR_NOT_PARTICIPANT';
  END IF;

  -- 4. Prevent Duplicates
  IF EXISTS (SELECT 1 FROM public.match_results WHERE match_id = p_match_id) THEN
    RAISE EXCEPTION 'RESULT_ALREADY_EXISTS';
  END IF;

  -- 5. Business Validation (Sets 1 & 2 required, no negatives)
  IF p_set1_a < 0 OR p_set1_b < 0 OR p_set2_a < 0 OR p_set2_b < 0 THEN
    RAISE EXCEPTION 'INVALID_SCORES';
  END IF;
  
  -- 6. Autocurate status if match is in the past
  IF v_status = 'scheduled'::public.match_status AND v_match_at < now() THEN
    UPDATE public.matches SET status = 'completed'::public.match_status WHERE id = p_match_id;
    v_status := 'completed';
  END IF;

  -- Only completed matches (or just updated to completed) can have results
  IF v_status <> 'completed'::public.match_status THEN
    RAISE EXCEPTION 'MATCH_NOT_COMPLETED';
  END IF;

  -- 7. Build Sets JSON and Calculate Winner
  -- Set 1
  IF p_set1_a > p_set1_b THEN v_team_a_sets := v_team_a_sets + 1; ELSE v_team_b_sets := v_team_b_sets + 1; END IF;
  -- Set 2
  IF p_set2_a > p_set2_b THEN v_team_a_sets := v_team_a_sets + 1; ELSE v_team_b_sets := v_team_b_sets + 1; END IF;
  
  v_sets := jsonb_build_array(
    jsonb_build_object('team_a_games', p_set1_a, 'team_b_games', p_set1_b),
    jsonb_build_object('team_a_games', p_set2_a, 'team_b_games', p_set2_b)
  );

  -- Set 3 (Optional)
  IF p_set3_a IS NOT NULL AND p_set3_b IS NOT NULL THEN
    IF p_set3_a < 0 OR p_set3_b < 0 THEN RAISE EXCEPTION 'INVALID_SCORES'; END IF;
    IF p_set3_a > p_set3_b THEN v_team_a_sets := v_team_a_sets + 1; ELSE v_team_b_sets := v_team_b_sets + 1; END IF;
    v_sets := v_sets || jsonb_build_array(jsonb_build_object('team_a_games', p_set3_a, 'team_b_games', p_set3_b));
  END IF;

  -- Determine Winner
  v_winner_team := CASE WHEN v_team_a_sets > v_team_b_sets THEN 'A'::public.team_type ELSE 'B'::public.team_type END;

  -- 8. Insert Result
  INSERT INTO public.match_results (match_id, sets, winner_team, recorded_at)
  VALUES (p_match_id, v_sets, v_winner_team, now());

  RETURN p_match_id;
END;
$$;

-- Permissions
REVOKE ALL ON FUNCTION public.player_create_match_with_players FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.player_create_match_with_players TO authenticated;

REVOKE ALL ON FUNCTION public.player_update_match FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.player_update_match TO authenticated;

REVOKE ALL ON FUNCTION public.player_submit_match_result FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.player_submit_match_result TO authenticated;

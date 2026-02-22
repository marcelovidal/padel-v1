-- STAGE V1.12: allow players to edit scheduled match roster (partner/rivals)

CREATE OR REPLACE FUNCTION public.player_update_match_roster(
  p_match_id uuid,
  p_partner_id uuid,
  p_opp1_id uuid,
  p_opp2_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_creator_player_id uuid;
  v_created_by uuid;
  v_status public.match_status;
  v_ids uuid[];
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT p.id
    INTO v_creator_player_id
  FROM public.players p
  WHERE p.user_id = v_uid
    AND p.deleted_at IS NULL;

  IF v_creator_player_id IS NULL THEN
    RAISE EXCEPTION 'PLAYER_PROFILE_NOT_FOUND';
  END IF;

  SELECT m.created_by, m.status
    INTO v_created_by, v_status
  FROM public.matches m
  WHERE m.id = p_match_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MATCH_NOT_FOUND';
  END IF;

  IF v_created_by <> v_uid THEN
    RAISE EXCEPTION 'NOT_OWNER';
  END IF;

  IF v_status <> 'scheduled'::public.match_status THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  v_ids := ARRAY[v_creator_player_id, p_partner_id, p_opp1_id, p_opp2_id];
  IF (SELECT count(DISTINCT x) FROM unnest(v_ids) AS x) <> 4 THEN
    RAISE EXCEPTION 'DUPLICATE_PLAYERS';
  END IF;

  DELETE FROM public.match_players
  WHERE match_id = p_match_id;

  INSERT INTO public.match_players (match_id, player_id, team)
  VALUES
    (p_match_id, v_creator_player_id, 'A'),
    (p_match_id, p_partner_id, 'A'),
    (p_match_id, p_opp1_id, 'B'),
    (p_match_id, p_opp2_id, 'B');

  UPDATE public.matches
  SET updated_at = now()
  WHERE id = p_match_id;

  RETURN p_match_id;
END;
$$;

REVOKE ALL ON FUNCTION public.player_update_match_roster(uuid, uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.player_update_match_roster(uuid, uuid, uuid, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

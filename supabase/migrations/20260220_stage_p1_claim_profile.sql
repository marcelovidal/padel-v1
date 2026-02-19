-- STAGE P1: Claim real desde link publico

CREATE OR REPLACE FUNCTION public.player_claim_profile_v2(
  p_target_player_id UUID,
  p_match_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_target_user_id UUID;
  v_user_player_id UUID;
  v_allowed_match BOOLEAN := FALSE;
  v_allowed_coparticipation BOOLEAN := FALSE;
  v_claimed_id UUID;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT p.user_id
    INTO v_target_user_id
  FROM public.players p
  WHERE p.id = p_target_player_id
    AND p.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PLAYER_NOT_FOUND';
  END IF;

  IF v_target_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'PROFILE_ALREADY_CLAIMED';
  END IF;

  SELECT p.id
    INTO v_user_player_id
  FROM public.players p
  WHERE p.user_id = v_uid
    AND p.deleted_at IS NULL
  LIMIT 1;

  IF v_user_player_id IS NOT NULL THEN
    RAISE EXCEPTION 'USER_ALREADY_HAS_PROFILE';
  END IF;

  IF p_match_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.matches m
      JOIN public.match_players mp ON mp.match_id = m.id
      WHERE m.id = p_match_id
        AND mp.player_id = p_target_player_id
    )
    INTO v_allowed_match;
  END IF;

  -- En este MVP el usuario no puede reclamar si ya tiene perfil.
  -- Esta condicion B queda para compatibilidad futura si se habilita merge.
  IF v_user_player_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.match_players me_mp
      JOIN public.match_players target_mp
        ON target_mp.match_id = me_mp.match_id
      WHERE me_mp.player_id = v_user_player_id
        AND target_mp.player_id = p_target_player_id
    )
    INTO v_allowed_coparticipation;
  END IF;

  IF NOT (v_allowed_match OR v_allowed_coparticipation) THEN
    RAISE EXCEPTION 'CLAIM_NOT_ALLOWED';
  END IF;

  UPDATE public.players
     SET user_id = v_uid,
         is_guest = FALSE,
         updated_at = NOW()
   WHERE id = p_target_player_id
     AND user_id IS NULL
     AND deleted_at IS NULL
   RETURNING id INTO v_claimed_id;

  IF v_claimed_id IS NULL THEN
    RAISE EXCEPTION 'PROFILE_ALREADY_CLAIMED';
  END IF;

  RETURN v_claimed_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.player_claim_profile_v2(UUID, UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';

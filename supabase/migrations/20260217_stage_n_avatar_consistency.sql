-- ============================================
-- STAGE N: AVATAR CONSISTENCY
-- Updated RPC: player_update_profile to handle avatar_url
-- ============================================

CREATE OR REPLACE FUNCTION public.player_update_profile(
  p_player_id uuid,
  p_display_name text,
  p_position player_position,
  p_city text,
  p_city_id text,
  p_region_code text,
  p_region_name text,
  p_country_code text,
  p_avatar_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_target record;
  v_new_display text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT *
  INTO v_target
  FROM public.players
  WHERE id = p_player_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PLAYER_NOT_FOUND';
  END IF;

  v_new_display := NULLIF(TRIM(p_display_name), '');
  IF v_new_display IS NULL THEN
    RAISE EXCEPTION 'DISPLAY_NAME_REQUIRED';
  END IF;

  -- CASE 1: Own profile
  -- CASE 2: Guest created by user (and NOT claimed by anyone else)
  IF (v_target.user_id = v_uid) OR (v_target.is_guest = true AND v_target.user_id IS NULL AND v_target.created_by = v_uid) THEN
    UPDATE public.players
    SET
      display_name = v_new_display,
      normalized_name = LOWER(v_new_display),
      position = p_position,
      city = p_city,
      city_normalized = LOWER(TRIM(p_city)),
      city_id = p_city_id,
      region_code = p_region_code,
      region_name = p_region_name,
      country_code = p_country_code,
      avatar_url = COALESCE(NULLIF(TRIM(p_avatar_url), ''), avatar_url), -- Preserve if null passed? 
                                                                       -- User might want to clear it? 
                                                                       -- Usually better to pass the new value.
      updated_at = now()
    WHERE id = p_player_id;

    RETURN p_player_id;
  END IF;

  IF v_target.user_id IS NOT NULL AND v_target.user_id <> v_uid THEN
    RAISE EXCEPTION 'NOT_ALLOWED'; -- Profile claimed by another user
  END IF;

  RAISE EXCEPTION 'NOT_ALLOWED';
END;
$$;

-- Permissions and Refresh
GRANT EXECUTE ON FUNCTION public.player_update_profile TO authenticated;
NOTIFY pgrst, 'reload schema';

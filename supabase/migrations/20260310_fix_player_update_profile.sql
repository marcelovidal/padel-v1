-- Fix: drop all overloads of player_update_profile and re-create cleanly
-- so PostgREST schema cache resolves the correct signature.

-- Drop any existing overloads (both the old one without avatar and the new one)
DROP FUNCTION IF EXISTS public.player_update_profile(uuid, text, player_position, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.player_update_profile(uuid, text, player_position, text, text, text, text, text, text);

-- Re-create with the correct signature (including p_avatar_url)
CREATE OR REPLACE FUNCTION public.player_update_profile(
  p_player_id    uuid,
  p_display_name text,
  p_position     player_position,
  p_city         text,
  p_city_id      text,
  p_region_code  text,
  p_region_name  text,
  p_country_code text,
  p_avatar_url   text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid          uuid;
  v_target       record;
  v_new_display  text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT * INTO v_target
  FROM public.players
  WHERE id = p_player_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PLAYER_NOT_FOUND';
  END IF;

  v_new_display := NULLIF(TRIM(p_display_name), '');
  IF v_new_display IS NULL THEN
    RAISE EXCEPTION 'DISPLAY_NAME_REQUIRED';
  END IF;

  IF (v_target.user_id = v_uid)
     OR (v_target.is_guest = true AND v_target.user_id IS NULL AND v_target.created_by = v_uid)
  THEN
    UPDATE public.players
    SET
      display_name     = v_new_display,
      normalized_name  = LOWER(v_new_display),
      position         = p_position,
      city             = p_city,
      city_normalized  = LOWER(TRIM(p_city)),
      city_id          = p_city_id,
      region_code      = p_region_code,
      region_name      = p_region_name,
      country_code     = p_country_code,
      avatar_url       = CASE
                           WHEN p_avatar_url IS NOT NULL AND TRIM(p_avatar_url) <> ''
                           THEN TRIM(p_avatar_url)
                           ELSE avatar_url
                         END,
      updated_at       = now()
    WHERE id = p_player_id;

    RETURN p_player_id;
  END IF;

  RAISE EXCEPTION 'NOT_ALLOWED';
END;
$$;

GRANT EXECUTE ON FUNCTION public.player_update_profile TO authenticated;

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

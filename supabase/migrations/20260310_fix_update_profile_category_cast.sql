-- Fix: COALESCE types integer and text cannot be matched in player_update_profile
-- category column is TEXT but p_category parameter is INT → cast to text in COALESCE

-- Drop all known overloads
DROP FUNCTION IF EXISTS public.player_update_profile(uuid, text, player_position, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.player_update_profile(uuid, text, player_position, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.player_update_profile(uuid, text, player_position, text, text, text, text, text, text, text, text, int, int);

CREATE OR REPLACE FUNCTION public.player_update_profile(
  p_player_id    uuid,
  p_display_name text,
  p_position     player_position,
  p_city         text         DEFAULT NULL,
  p_city_id      text         DEFAULT NULL,
  p_region_code  text         DEFAULT NULL,
  p_region_name  text         DEFAULT NULL,
  p_country_code text         DEFAULT 'AR',
  p_avatar_url   text         DEFAULT NULL,
  p_phone        text         DEFAULT NULL,
  p_email        text         DEFAULT NULL,
  p_category     int          DEFAULT NULL,
  p_birth_year   int          DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         uuid;
  v_target      record;
  v_new_display text;
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

  -- Allow own profile or guest created by this user
  IF NOT (
    v_target.user_id = v_uid
    OR (v_target.is_guest = true AND v_target.user_id IS NULL AND v_target.created_by = v_uid)
  ) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  -- Phone uniqueness check (only if changing phone)
  IF p_phone IS NOT NULL AND TRIM(p_phone) <> '' AND TRIM(p_phone) <> COALESCE(v_target.phone, '') THEN
    IF EXISTS (
      SELECT 1 FROM public.players
      WHERE phone = TRIM(p_phone) AND id <> p_player_id AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'PHONE_TAKEN';
    END IF;
  END IF;

  UPDATE public.players
  SET
    display_name     = v_new_display,
    normalized_name  = LOWER(v_new_display),
    position         = p_position,
    city             = p_city,
    city_normalized  = LOWER(TRIM(COALESCE(p_city, ''))),
    city_id          = p_city_id,
    region_code      = p_region_code,
    region_name      = p_region_name,
    country_code     = COALESCE(NULLIF(TRIM(p_country_code), ''), 'AR'),
    avatar_url       = CASE
                         WHEN p_avatar_url IS NOT NULL AND TRIM(p_avatar_url) <> ''
                         THEN TRIM(p_avatar_url)
                         ELSE avatar_url
                       END,
    phone            = CASE
                         WHEN p_phone IS NOT NULL AND TRIM(p_phone) <> ''
                         THEN TRIM(p_phone)
                         ELSE phone
                       END,
    email            = CASE
                         WHEN p_email IS NOT NULL THEN NULLIF(TRIM(p_email), '')
                         ELSE email
                       END,
    category         = COALESCE(p_category::text, category),
    birth_year       = COALESCE(p_birth_year, birth_year),
    updated_at       = now()
  WHERE id = p_player_id;

  RETURN p_player_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.player_update_profile TO authenticated;
NOTIFY pgrst, 'reload schema';

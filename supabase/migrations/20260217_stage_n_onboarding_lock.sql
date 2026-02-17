-- ============================================
-- STAGE N LOCK: ONBOARDING ONE-SHOT
-- ============================================

-- 1) Extend players table with audit fields
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS onboarding_version int NOT NULL DEFAULT 1;

-- 2) Update RPC: Complete Onboarding (Locked & Idempotent)
CREATE OR REPLACE FUNCTION public.player_complete_onboarding(
  p_display_name text,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_position player_position,
  p_category int,
  p_country_code text DEFAULT 'AR',
  p_region_code text DEFAULT NULL,
  p_region_name text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_city_id text DEFAULT NULL,
  p_birth_year int DEFAULT NULL,
  p_avatar_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player_id uuid;
  v_auth_user_id uuid;
  v_onboarding_completed boolean;
  v_display text;
  v_phone text;
  v_city text;
BEGIN
  v_auth_user_id := auth.uid();
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  v_display := NULLIF(TRIM(p_display_name), '');
  v_phone   := NULLIF(TRIM(p_phone), '');
  v_city    := NULLIF(TRIM(p_city), '');

  -- Validaciones estrictas
  IF v_display IS NULL THEN
    RAISE EXCEPTION 'DISPLAY_NAME_REQUIRED';
  END IF;

  IF v_phone IS NULL THEN
    RAISE EXCEPTION 'PHONE_REQUIRED';
  END IF;

  IF p_position IS NULL THEN
    RAISE EXCEPTION 'POSITION_REQUIRED';
  END IF;

  IF p_category IS NULL OR p_category < 1 OR p_category > 7 THEN
    RAISE EXCEPTION 'INVALID_CATEGORY';
  END IF;

  -- Buscar jugador existente y su estado de onboarding
  SELECT id, onboarding_completed INTO v_player_id, v_onboarding_completed
  FROM public.players
  WHERE user_id = v_auth_user_id AND deleted_at IS NULL
  LIMIT 1;

  -- BLOQUEO: Si ya está completado, no permitir re-ejecución
  IF v_player_id IS NOT NULL AND v_onboarding_completed = true THEN
    RAISE EXCEPTION 'ONBOARDING_ALREADY_COMPLETED';
  END IF;

  IF v_player_id IS NOT NULL THEN
    -- Update existing profile (that was not completed)
    UPDATE public.players
    SET
      display_name = v_display,
      normalized_name = LOWER(v_display),
      first_name = TRIM(p_first_name),
      last_name  = TRIM(p_last_name),
      phone = v_phone,
      position = p_position,
      category = p_category::text,
      country_code = COALESCE(NULLIF(TRIM(p_country_code), ''), 'AR'),
      region_code = NULLIF(TRIM(p_region_code), ''),
      region_name = NULLIF(TRIM(p_region_name), ''),
      city = v_city,
      city_normalized = CASE WHEN v_city IS NULL THEN NULL ELSE LOWER(v_city) END,
      city_id = NULLIF(TRIM(p_city_id), ''),
      birth_year = p_birth_year,
      avatar_url = NULLIF(TRIM(p_avatar_url), ''),
      onboarding_completed = true,
      onboarding_completed_at = now(),
      onboarding_version = 1,
      updated_at = now()
    WHERE id = v_player_id;

  ELSE
    -- Insert new player
    INSERT INTO public.players (
      user_id,
      display_name,
      normalized_name,
      first_name,
      last_name,
      phone,
      position,
      category,
      country_code,
      region_code,
      region_name,
      city,
      city_normalized,
      city_id,
      birth_year,
      avatar_url,
      onboarding_completed,
      onboarding_completed_at,
      onboarding_version,
      is_guest
    )
    VALUES (
      v_auth_user_id,
      v_display,
      LOWER(v_display),
      TRIM(p_first_name),
      TRIM(p_last_name),
      v_phone,
      p_position,
      p_category::text,
      COALESCE(NULLIF(TRIM(p_country_code), ''), 'AR'),
      NULLIF(TRIM(p_region_code), ''),
      NULLIF(TRIM(p_region_name), ''),
      v_city,
      CASE WHEN v_city IS NULL THEN NULL ELSE LOWER(v_city) END,
      NULLIF(TRIM(p_city_id), ''),
      p_birth_year,
      NULLIF(TRIM(p_avatar_url), ''),
      true,
      now(),
      1,
      false
    )
    RETURNING id INTO v_player_id;
  END IF;

  RETURN v_player_id;
END;
$$;

-- 3) Permissions (Keep current)
REVOKE ALL ON FUNCTION public.player_complete_onboarding(
  text, text, text, text, player_position, int, text, text, text, text, text, int, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.player_complete_onboarding(
  text, text, text, text, player_position, int, text, text, text, text, text, int, text
) TO authenticated;

-- 4) Refresh schema cache
NOTIFY pgrst, 'reload schema';

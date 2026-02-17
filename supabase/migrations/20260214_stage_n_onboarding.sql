-- ============================================
-- STAGE N: ONBOARDING & AVATARS (SAFE FOR CURRENT SCHEMA)
-- Assumes current players.category is TEXT (NOT NULL) as in your DB.
-- ============================================

-- 1) Extend players table (DO NOT touch category type)
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS birth_year int NULL,
  ADD COLUMN IF NOT EXISTS avatar_url text NULL,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- 2) Storage: avatars bucket (private)
INSERT INTO storage.buckets (id, name, public)
SELECT 'avatars', 'avatars', false
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'avatars'
);

-- 3) Storage policies for avatars ONLY (owner = auth.uid())
-- IMPORTANT: Avoid dropping unrelated policies globally. Drop only by name.
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- (Optional) If you want authenticated users to be able to READ their own objects via Storage API:
DROP POLICY IF EXISTS "avatars_select_own" ON storage.objects;
CREATE POLICY "avatars_select_own"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4) RPC: Complete Onboarding (SECURITY DEFINER)
-- Stores category into existing players.category TEXT.
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

  -- Buscar jugador existente por user_id
  SELECT id INTO v_player_id
  FROM public.players
  WHERE user_id = v_auth_user_id AND deleted_at IS NULL
  LIMIT 1;

  IF v_player_id IS NOT NULL THEN
    UPDATE public.players
    SET
      display_name = v_display,
      normalized_name = LOWER(v_display),
      first_name = TRIM(p_first_name),
      last_name  = TRIM(p_last_name),
      phone = v_phone,
      position = p_position,
      category = p_category::text, -- <--- keep TEXT column
      country_code = COALESCE(NULLIF(TRIM(p_country_code), ''), 'AR'),
      region_code = NULLIF(TRIM(p_region_code), ''),
      region_name = NULLIF(TRIM(p_region_name), ''),
      city = v_city,
      city_normalized = CASE WHEN v_city IS NULL THEN NULL ELSE LOWER(v_city) END,
      city_id = NULLIF(TRIM(p_city_id), ''),
      birth_year = p_birth_year,
      avatar_url = NULLIF(TRIM(p_avatar_url), ''),
      onboarding_completed = true,
      updated_at = now()
    WHERE id = v_player_id;

  ELSE
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
      p_category::text, -- <--- keep TEXT column
      COALESCE(NULLIF(TRIM(p_country_code), ''), 'AR'),
      NULLIF(TRIM(p_region_code), ''),
      NULLIF(TRIM(p_region_name), ''),
      v_city,
      CASE WHEN v_city IS NULL THEN NULL ELSE LOWER(v_city) END,
      NULLIF(TRIM(p_city_id), ''),
      p_birth_year,
      NULLIF(TRIM(p_avatar_url), ''),
      true,
      false
    )
    RETURNING id INTO v_player_id;
  END IF;

  RETURN v_player_id;
END;
$$;

-- 5) Permissions
REVOKE ALL ON FUNCTION public.player_complete_onboarding(
  text, text, text, text, player_position, int, text, text, text, text, text, int, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.player_complete_onboarding(
  text, text, text, text, player_position, int, text, text, text, text, text, int, text
) TO authenticated;

-- 6) Refresh schema cache
NOTIFY pgrst, 'reload schema';

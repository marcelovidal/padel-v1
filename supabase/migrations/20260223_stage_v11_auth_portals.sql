-- STAGE V1.11: auth normalization (player/club) + guided sign-up support

-- 1) Extend clubs with onboarding profile fields
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS address text NULL,
  ADD COLUMN IF NOT EXISTS description text NULL,
  ADD COLUMN IF NOT EXISTS access_type text NULL,
  ADD COLUMN IF NOT EXISTS courts_count int NULL,
  ADD COLUMN IF NOT EXISTS has_glass boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_synthetic_grass boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contact_first_name text NULL,
  ADD COLUMN IF NOT EXISTS contact_last_name text NULL,
  ADD COLUMN IF NOT EXISTS contact_phone text NULL,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_clubs_access_type'
  ) THEN
    ALTER TABLE public.clubs
      ADD CONSTRAINT chk_clubs_access_type
      CHECK (access_type IS NULL OR access_type IN ('abierta', 'cerrada'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_clubs_courts_count_non_negative'
  ) THEN
    ALTER TABLE public.clubs
      ADD CONSTRAINT chk_clubs_courts_count_non_negative
      CHECK (courts_count IS NULL OR courts_count >= 0);
  END IF;
END $$;

-- 2) Player candidate suggestions (post sign-up hint)
CREATE OR REPLACE FUNCTION public.player_find_claim_candidates(
  p_first_name text,
  p_last_name text,
  p_city text DEFAULT NULL,
  p_limit int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  display_name text,
  city text,
  region_name text,
  city_match boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_name text;
  v_first_name text;
  v_city text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  v_last_name := NULLIF(TRIM(LOWER(COALESCE(p_last_name, ''))), '');
  v_first_name := NULLIF(TRIM(LOWER(COALESCE(p_first_name, ''))), '');
  v_city := NULLIF(TRIM(LOWER(COALESCE(p_city, ''))), '');

  IF v_last_name IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.display_name,
    p.city,
    p.region_name,
    (v_city IS NOT NULL AND LOWER(TRIM(COALESCE(p.city, ''))) = v_city) AS city_match
  FROM public.players p
  WHERE p.deleted_at IS NULL
    AND p.user_id IS NULL
    AND LOWER(TRIM(COALESCE(p.last_name, ''))) = v_last_name
    AND (
      v_first_name IS NULL
      OR LOWER(TRIM(COALESCE(p.first_name, ''))) = v_first_name
      OR LOWER(TRIM(COALESCE(p.first_name, ''))) LIKE v_first_name || '%'
      OR LOWER(TRIM(COALESCE(p.display_name, ''))) LIKE '%' || v_first_name || '%'
    )
  ORDER BY
    CASE
      WHEN v_city IS NOT NULL AND LOWER(TRIM(COALESCE(p.city, ''))) = v_city THEN 0
      ELSE 1
    END,
    p.updated_at DESC
  LIMIT GREATEST(COALESCE(p_limit, 5), 1);
END;
$$;

-- 3) Club candidate suggestions (post sign-up hint)
CREATE OR REPLACE FUNCTION public.club_find_claim_candidates(
  p_name text,
  p_city_id text DEFAULT NULL,
  p_region_code text DEFAULT NULL,
  p_exclude_club_id uuid DEFAULT NULL,
  p_limit int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  name text,
  city text,
  region_name text,
  claim_status text,
  exact_name boolean,
  location_match boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q text;
  v_city_id text;
  v_region_code text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  v_q := NULLIF(TRIM(LOWER(COALESCE(p_name, ''))), '');
  v_city_id := NULLIF(TRIM(COALESCE(p_city_id, '')), '');
  v_region_code := NULLIF(TRIM(COALESCE(p_region_code, '')), '');

  IF v_q IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.city,
    c.region_name,
    c.claim_status,
    (c.normalized_name = v_q) AS exact_name,
    (
      (v_city_id IS NOT NULL AND c.city_id = v_city_id)
      OR (v_region_code IS NOT NULL AND c.region_code = v_region_code)
    ) AS location_match
  FROM public.clubs c
  WHERE c.deleted_at IS NULL
    AND c.claim_status <> 'claimed'
    AND (p_exclude_club_id IS NULL OR c.id <> p_exclude_club_id)
    AND (
      c.normalized_name = v_q
      OR c.normalized_name LIKE v_q || '%'
      OR c.name ILIKE '%' || p_name || '%'
    )
  ORDER BY
    CASE WHEN c.normalized_name = v_q THEN 0 ELSE 1 END,
    CASE
      WHEN v_city_id IS NOT NULL AND c.city_id = v_city_id THEN 0
      WHEN v_region_code IS NOT NULL AND c.region_code = v_region_code THEN 1
      ELSE 2
    END,
    c.updated_at DESC
  LIMIT GREATEST(COALESCE(p_limit, 5), 1);
END;
$$;

-- 4) Complete club onboarding (create/update)
CREATE OR REPLACE FUNCTION public.club_complete_onboarding(
  p_name text,
  p_country_code text DEFAULT 'AR',
  p_region_code text DEFAULT NULL,
  p_region_name text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_city_id text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_access_type text DEFAULT NULL,
  p_courts_count int DEFAULT NULL,
  p_has_glass boolean DEFAULT false,
  p_has_synthetic_grass boolean DEFAULT false,
  p_contact_first_name text DEFAULT NULL,
  p_contact_last_name text DEFAULT NULL,
  p_contact_phone text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_club_id uuid;
  v_name text;
  v_access_type text;
  v_created_by uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  v_name := NULLIF(TRIM(p_name), '');
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'CLUB_NAME_REQUIRED';
  END IF;

  v_access_type := NULLIF(TRIM(LOWER(COALESCE(p_access_type, ''))), '');
  IF v_access_type IS NOT NULL AND v_access_type NOT IN ('abierta', 'cerrada') THEN
    RAISE EXCEPTION 'INVALID_ACCESS_TYPE';
  END IF;

  IF p_courts_count IS NOT NULL AND p_courts_count < 0 THEN
    RAISE EXCEPTION 'INVALID_COURTS_COUNT';
  END IF;

  v_club_id := public.club_create(
    p_name => v_name,
    p_country_code => p_country_code,
    p_region_code => p_region_code,
    p_region_name => p_region_name,
    p_city => p_city,
    p_city_id => p_city_id
  );

  SELECT c.created_by
    INTO v_created_by
  FROM public.clubs c
  WHERE c.id = v_club_id
    AND c.deleted_at IS NULL
  FOR UPDATE;

  IF v_created_by IS NOT NULL AND v_created_by <> v_uid THEN
    RETURN v_club_id;
  END IF;

  UPDATE public.clubs
  SET
    created_by = COALESCE(created_by, v_uid),
    address = NULLIF(TRIM(p_address), ''),
    description = NULLIF(TRIM(p_description), ''),
    access_type = v_access_type,
    courts_count = p_courts_count,
    has_glass = COALESCE(p_has_glass, false),
    has_synthetic_grass = COALESCE(p_has_synthetic_grass, false),
    contact_first_name = NULLIF(TRIM(p_contact_first_name), ''),
    contact_last_name = NULLIF(TRIM(p_contact_last_name), ''),
    contact_phone = NULLIF(TRIM(p_contact_phone), ''),
    onboarding_completed = true,
    onboarding_completed_at = COALESCE(onboarding_completed_at, now()),
    updated_at = now()
  WHERE id = v_club_id;

  RETURN v_club_id;
END;
$$;

REVOKE ALL ON FUNCTION public.player_find_claim_candidates(text, text, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.player_find_claim_candidates(text, text, text, int) TO authenticated;

REVOKE ALL ON FUNCTION public.club_find_claim_candidates(text, text, text, uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_find_claim_candidates(text, text, text, uuid, int) TO authenticated;

REVOKE ALL ON FUNCTION public.club_complete_onboarding(
  text, text, text, text, text, text, text, text, text, int, boolean, boolean, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_complete_onboarding(
  text, text, text, text, text, text, text, text, text, int, boolean, boolean, text, text, text
) TO authenticated;

NOTIFY pgrst, 'reload schema';

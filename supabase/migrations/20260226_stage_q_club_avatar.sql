-- STAGE Q: club avatar/logo support

ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS avatar_url text NULL;

DROP FUNCTION IF EXISTS public.club_complete_onboarding(
  text, text, text, text, text, text, text, text, text, int, boolean, boolean, text, text, text
);

DROP FUNCTION IF EXISTS public.club_complete_onboarding(
  text, text, text, text, text, text, text, text, text, int, boolean, boolean, text, text, text, text
);

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
  p_contact_phone text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL
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
    avatar_url = NULLIF(TRIM(p_avatar_url), ''),
    onboarding_completed = true,
    onboarding_completed_at = COALESCE(onboarding_completed_at, now()),
    updated_at = now()
  WHERE id = v_club_id;

  RETURN v_club_id;
END;
$$;

REVOKE ALL ON FUNCTION public.club_complete_onboarding(
  text, text, text, text, text, text, text, text, text, int, boolean, boolean, text, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_complete_onboarding(
  text, text, text, text, text, text, text, text, text, int, boolean, boolean, text, text, text, text
) TO authenticated;

NOTIFY pgrst, 'reload schema';

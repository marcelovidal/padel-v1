-- STAGE L: Shielding Phone Field Uniqueness
-- =======================================

-- 1) Ensure phone is nullable
ALTER TABLE public.players ALTER COLUMN phone DROP NOT NULL;

-- 2) Drop any previous global unique constraints or indexes on phone
DO $$ 
BEGIN 
    -- Drop constraint if exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_players_phone') THEN
        ALTER TABLE public.players DROP CONSTRAINT uq_players_phone;
    END IF;
    
    -- Drop index if exists (nextui/supabase often creates unique indexes for UNIQUE columns)
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_players_phone_unique') THEN
        DROP INDEX idx_players_phone_unique;
    END IF;
END $$;

-- 3) Create Partial Unique Index
-- Only applies to non-null, non-empty phone numbers in active records.
CREATE UNIQUE INDEX IF NOT EXISTS uq_players_phone_not_null
ON public.players(phone)
WHERE phone IS NOT NULL AND TRIM(phone) <> '' AND deleted_at IS NULL;

-- 4) Update guest player creation to avoid '00000000' fallback
-- (Redefining the same v2 RPC from Stage K2.1 but ensuring phone logic is correct)
CREATE OR REPLACE FUNCTION public.player_create_guest_player(
  p_display_name text,
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_position player_position DEFAULT 'cualquiera',
  p_city text DEFAULT NULL,
  p_region_code text DEFAULT NULL,
  p_country_code text DEFAULT 'AR',
  p_city_id text DEFAULT NULL,
  p_region_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player_id uuid;
  v_creator_id uuid;
  v_display text;
  v_city text;
  v_phone text;
BEGIN
  v_creator_id := auth.uid();
  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  v_display := NULLIF(TRIM(p_display_name), '');
  IF v_display IS NULL THEN
    RAISE EXCEPTION 'DISPLAY_NAME_REQUIRED';
  END IF;

  v_city := NULLIF(TRIM(p_city), '');
  v_phone := NULLIF(TRIM(p_phone), '');

  INSERT INTO public.players (
    user_id,
    display_name,
    first_name,
    last_name,
    phone,
    position,
    normalized_name,
    created_by,
    is_guest,
    city,
    city_normalized,
    city_id,
    region_code,
    region_name,
    country_code
  )
  VALUES (
    NULL,
    v_display,
    COALESCE(NULLIF(TRIM(p_first_name), ''), v_display),
    COALESCE(NULLIF(TRIM(p_last_name), ''), ''),
    v_phone, -- NULL if empty, avoids uniqueness collision
    p_position,
    LOWER(TRIM(v_display)),
    v_creator_id,
    TRUE,
    v_city,
    CASE WHEN v_city IS NULL THEN NULL ELSE LOWER(v_city) END,
    NULLIF(TRIM(p_city_id), ''),
    NULLIF(TRIM(p_region_code), ''),
    NULLIF(TRIM(p_region_name), ''),
    COALESCE(NULLIF(TRIM(p_country_code), ''), 'AR')
  )
  RETURNING id INTO v_player_id;

  RETURN v_player_id;
END;
$$;

-- 5) Permissions and Cache
GRANT EXECUTE ON FUNCTION public.player_create_guest_player(
  text, text, text, text, player_position, text, text, text, text, text
) TO authenticated;

NOTIFY pgrst, 'reload schema';

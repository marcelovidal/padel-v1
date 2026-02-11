-- STAGE K2: Location-weighted player search & Schema Alignment
-- ========================================================

-- 1) Extend players table with location and meta fields
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_guest boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS country_code text NOT NULL DEFAULT 'AR',
  ADD COLUMN IF NOT EXISTS region_code text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS city_normalized text;

-- 2) Backfill and Normalization
UPDATE public.players
SET 
  is_guest = COALESCE(is_guest, false),
  country_code = COALESCE(country_code, 'AR'),
  city_normalized = CASE 
    WHEN city IS NULL THEN city_normalized 
    ELSE LOWER(TRIM(city)) 
  END
WHERE is_guest IS NULL OR country_code IS NULL OR (city IS NOT NULL AND city_normalized IS NULL);

-- 3) Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_location 
  ON public.players(country_code, region_code, city_normalized);

CREATE INDEX IF NOT EXISTS idx_players_normalized_name 
  ON public.players(normalized_name);

CREATE INDEX IF NOT EXISTS idx_players_city_normalized 
  ON public.players(city_normalized);

-- 4) RPC: Create Guest Player (Unified Signature)
CREATE OR REPLACE FUNCTION public.player_create_guest_player(
  p_display_name text,
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_position player_position DEFAULT 'cualquiera',
  p_city text DEFAULT NULL,
  p_region_code text DEFAULT NULL,
  p_country_code text DEFAULT 'AR'
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
BEGIN
  v_creator_id := auth.uid();
  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  v_display := NULLIF(TRIM(p_display_name), '');
  IF v_display IS NULL THEN
    RAISE EXCEPTION 'DISPLAY_NAME_REQUIRED';
  END IF;

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
    region_code,
    country_code
  )
  VALUES (
    NULL,
    v_display,
    COALESCE(NULLIF(TRIM(p_first_name), ''), v_display),
    COALESCE(NULLIF(TRIM(p_last_name), ''), ''),
    COALESCE(NULLIF(TRIM(p_phone), ''), '00000000'), -- Assurance for NOT NULL phone
    p_position,
    LOWER(TRIM(v_display)),
    v_creator_id,
    TRUE,
    p_city,
    LOWER(TRIM(p_city)),
    p_region_code,
    p_country_code
  )
  RETURNING id INTO v_player_id;

  RETURN v_player_id;
END;
$$;

-- 5) RPC: Weighted Search (Same City/Region/Country)
CREATE OR REPLACE FUNCTION public.player_search_players(
  p_query text,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  display_name text,
  is_guest boolean,
  city text,
  region_code text,
  score int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me record;
BEGIN
  -- Get current player location
  SELECT country_code, region_code, city_normalized 
  INTO v_me
  FROM public.players
  WHERE user_id = auth.uid() AND deleted_at IS NULL
  LIMIT 1;

  RETURN QUERY
  SELECT 
    p.id,
    p.display_name,
    p.is_guest,
    p.city,
    p.region_code,
    (
      CASE 
        WHEN p.city_normalized = v_me.city_normalized AND v_me.city_normalized IS NOT NULL THEN 100 
        ELSE 0 
      END +
      CASE 
        WHEN p.region_code = v_me.region_code AND v_me.region_code IS NOT NULL THEN 50 
        ELSE 0 
      END +
      CASE 
        WHEN p.country_code = v_me.country_code AND v_me.country_code IS NOT NULL THEN 10 
        ELSE 0 
      END +
      -- Basic relevance based on name match
      CASE 
        WHEN p.display_name ILIKE p_query THEN 20
        WHEN p.display_name ILIKE p_query || '%' THEN 10
        ELSE 0
      END
    )::int AS score
  FROM public.players p
  WHERE p.deleted_at IS NULL
    AND (
      p.display_name ILIKE '%' || p_query || '%'
      OR p.normalized_name ILIKE '%' || LOWER(TRIM(p_query)) || '%'
    )
  ORDER BY score DESC, p.display_name ASC
  LIMIT p_limit;
END;
$$;

-- 6) Permissions
GRANT EXECUTE ON FUNCTION public.player_search_players TO authenticated;
GRANT EXECUTE ON FUNCTION public.player_create_guest_player(text, text, text, text, player_position, text, text, text) TO authenticated;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

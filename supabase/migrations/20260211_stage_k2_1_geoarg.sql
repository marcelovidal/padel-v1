-- STAGE K2.1: Geodata Argentina Integration (Adjusted)
-- ====================================================
-- Ajustes incluidos:
-- 1) Índices extra para búsquedas por nombre
-- 2) Relevance scoring corregido (ILIKE con %)
-- 3) Fallback legacy de ciudad corregido (compara contra MI ciudad_normalized)
-- 4) Fix phone UNIQUE collision for guest players (permitir NULL + índice parcial)

-- 1) Extend players table with official Georef fields
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS region_name text,
  ADD COLUMN IF NOT EXISTS city_id text,
  ALTER COLUMN phone DROP NOT NULL;

-- (Opcional recomendado) asegurar city_normalized si falta
UPDATE public.players
SET city_normalized = LOWER(TRIM(city))
WHERE city IS NOT NULL AND city_normalized IS NULL;

-- 2) Indexes
CREATE INDEX IF NOT EXISTS idx_players_location_ids
  ON public.players(country_code, region_code, city_id);

CREATE INDEX IF NOT EXISTS idx_players_normalized_name
  ON public.players(normalized_name);

CREATE INDEX IF NOT EXISTS idx_players_display_name
  ON public.players(display_name);

-- 2.1) Partial Unique Index for Phone (Allows multiple NULL/empty guests)
-- Primero eliminamos el constraint antiguo si existe (podría ser uq_players_phone o similar)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_players_phone') THEN
        ALTER TABLE public.players DROP CONSTRAINT uq_players_phone;
    END IF;
END $$;

DROP INDEX IF EXISTS idx_players_phone_unique; -- Por si se creó como índice
CREATE UNIQUE INDEX IF NOT EXISTS uq_players_phone_not_null 
  ON public.players(phone)
  WHERE phone IS NOT NULL AND TRIM(phone) <> '' AND deleted_at IS NULL;

-- 3) RPC: Create Guest Player (v2 / Backward Compatible)
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
    COALESCE(NULLIF(TRIM(p_phone), ''), NULL), -- No fallback, allows NULL for uniqueness
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

-- 4) RPC: Weighted Search (Updated for city_id priority + corrected relevance + fixed legacy fallback)
CREATE OR REPLACE FUNCTION public.player_search_players(
  p_query text,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  display_name text,
  is_guest boolean,
  city text,
  city_id text,
  region_code text,
  region_name text,
  score int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me record;
  v_q text;
BEGIN
  v_q := COALESCE(NULLIF(TRIM(p_query), ''), '');
  IF v_q = '' THEN
    -- Si no hay query, devolvemos top por nombre (pero igual ponderado por ubicación)
    v_q := '';
  END IF;

  -- Get current player location (incluye city_normalized para fallback legacy)
  SELECT
    p.country_code,
    p.region_code,
    p.city_id,
    p.city_normalized
  INTO v_me
  FROM public.players p
  WHERE p.user_id = auth.uid() AND p.deleted_at IS NULL
  LIMIT 1;

  RETURN QUERY
  SELECT
    p.id,
    p.display_name,
    p.is_guest,
    p.city,
    p.city_id,
    p.region_code,
    p.region_name,
    (
      -- Priority: city_id > region_code > country_code
      CASE
        WHEN v_me.city_id IS NOT NULL AND p.city_id = v_me.city_id THEN 200
        -- Legacy fallback (sin IDs): comparar MI city_normalized con la del candidato
        WHEN v_me.city_id IS NULL
             AND v_me.city_normalized IS NOT NULL
             AND p.city_id IS NULL
             AND p.city_normalized = v_me.city_normalized THEN 100
        ELSE 0
      END
      +
      CASE
        WHEN v_me.region_code IS NOT NULL AND p.region_code = v_me.region_code THEN 50
        ELSE 0
      END
      +
      CASE
        WHEN v_me.country_code IS NOT NULL AND p.country_code = v_me.country_code THEN 10
        ELSE 0
      END
      +
      -- Basic relevance based on name match (corregido)
      CASE
        WHEN v_q <> '' AND p.display_name ILIKE '%' || v_q || '%' THEN 20
        WHEN v_q <> '' AND p.display_name ILIKE v_q || '%' THEN 10
        ELSE 0
      END
    )::int AS score
  FROM public.players p
  WHERE p.deleted_at IS NULL
    AND (
      v_q = ''
      OR p.display_name ILIKE '%' || v_q || '%'
      OR p.normalized_name ILIKE '%' || LOWER(v_q) || '%'
    )
  ORDER BY score DESC, p.display_name ASC
  LIMIT p_limit;
END;
$$;

-- 5) Permissions and Cache Reload
GRANT EXECUTE ON FUNCTION public.player_search_players(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.player_create_guest_player(
  text, text, text, text, player_position, text, text, text, text, text
) TO authenticated;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

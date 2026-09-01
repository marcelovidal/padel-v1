-- Fix bug produccion: crear invitado desde "crear partido" falla con
--   null value in column "category" of relation "players" violates not-null constraint
--
-- players.category es TEXT NOT NULL. El RPC pasa p_category::text en el INSERT,
-- asi que el default de la columna ('5') nunca se aplica: un NULL explicito
-- viola NOT NULL (un default solo actua cuando la columna se omite).
--
-- Fix (a): dentro de la funcion, COALESCE(p_category, 5) para que NULL caiga
-- al default mas comun de la base (81 de 142 jugadores tienen category '5').

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
  p_region_name text DEFAULT NULL,
  p_category int DEFAULT NULL
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
    country_code,
    category
  )
  VALUES (
    NULL,
    v_display,
    COALESCE(NULLIF(TRIM(p_first_name), ''), v_display),
    COALESCE(NULLIF(TRIM(p_last_name), ''), ''),
    v_phone,
    p_position,
    LOWER(TRIM(v_display)),
    v_creator_id,
    TRUE,
    v_city,
    CASE WHEN v_city IS NULL THEN NULL ELSE LOWER(v_city) END,
    NULLIF(TRIM(p_city_id), ''),
    NULLIF(TRIM(p_region_code), ''),
    NULLIF(TRIM(p_region_name), ''),
    COALESCE(NULLIF(TRIM(p_country_code), ''), 'AR'),
    COALESCE(p_category, 5)::text
  )
  RETURNING id INTO v_player_id;

  RETURN v_player_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.player_create_guest_player(
  text, text, text, text, player_position, text, text, text, text, text, int
) TO authenticated;

NOTIFY pgrst, 'reload schema';
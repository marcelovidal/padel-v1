-- ============================================
-- STAGE K: GUEST PLAYERS (MVP sólido)
-- ============================================

-- 1) Extend players table
ALTER TABLE public.players 
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS normalized_name text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS is_guest boolean NOT NULL DEFAULT false;

-- 2) Backfill seguro (evita NULL por concatenación)
UPDATE public.players
SET
  display_name = COALESCE(
    display_name,
    NULLIF(TRIM(concat_ws(' ', first_name, last_name)), ''),
    'Jugador'
  ),
  normalized_name = COALESCE(
    normalized_name,
    LOWER(TRIM(COALESCE(display_name, NULLIF(TRIM(concat_ws(' ', first_name, last_name)), ''), 'Jugador')))
  )
WHERE display_name IS NULL OR normalized_name IS NULL;

-- 3) Constraints (solo sobre columnas que ya backfilleamos)
ALTER TABLE public.players
  ALTER COLUMN display_name SET NOT NULL,
  ALTER COLUMN normalized_name SET NOT NULL;

-- 4) Indexes
CREATE INDEX IF NOT EXISTS idx_players_normalized_name ON public.players(normalized_name);

-- un perfil por usuario (soft-delete compatible si tenés deleted_at)
CREATE UNIQUE INDEX IF NOT EXISTS uq_players_user_id
ON public.players(user_id)
WHERE user_id IS NOT NULL AND (deleted_at IS NULL);

-- 5) RPC: Create Guest Player
CREATE OR REPLACE FUNCTION public.player_create_guest_player(
  p_display_name text,
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_position player_position DEFAULT 'cualquiera'
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
    is_guest
  )
  VALUES (
    NULL,
    v_display,
    COALESCE(NULLIF(TRIM(p_first_name), ''), v_display),
    COALESCE(NULLIF(TRIM(p_last_name), ''), ''),
    NULLIF(TRIM(p_phone), ''),
    p_position,
    LOWER(TRIM(v_display)),
    v_creator_id,
    TRUE
  )
  RETURNING id INTO v_player_id;

  RETURN v_player_id;
END;
$$;

-- 6) RPC: Find Similar Players (incluye no-guest también si querés; acá dejo todos)
CREATE OR REPLACE FUNCTION public.player_find_similar_players(p_query text)
RETURNS SETOF public.players
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.players
  WHERE deleted_at IS NULL
    AND (
      normalized_name ILIKE '%' || LOWER(TRIM(p_query)) || '%'
      OR display_name ILIKE '%' || p_query || '%'
    )
  ORDER BY
    (normalized_name = LOWER(TRIM(p_query))) DESC,
    display_name ASC
  LIMIT 10;
END;
$$;

-- 7) RPC: Claim Profile (onboarding-friendly)
-- Regla MVP:
-- - El user NO debe tener ya un player asignado
-- - El target debe ser un guest sin user_id
CREATE OR REPLACE FUNCTION public.player_claim_profile(p_target_player_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user_id uuid;
BEGIN
  v_auth_user_id := auth.uid();
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- No permitir reclamar si ya existe un player para este user
  IF EXISTS (
    SELECT 1 FROM public.players
    WHERE user_id = v_auth_user_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'USER_ALREADY_HAS_PLAYER';
  END IF;

  -- Target debe existir y ser guest no reclamado
  IF NOT EXISTS (
    SELECT 1 FROM public.players
    WHERE id = p_target_player_id
      AND user_id IS NULL
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'TARGET_NOT_FOUND_OR_ALREADY_CLAIMED';
  END IF;

  UPDATE public.players
  SET user_id = v_auth_user_id,
      is_guest = FALSE
  WHERE id = p_target_player_id
    AND user_id IS NULL;

  RETURN p_target_player_id;
END;
$$;

-- 8) Permissions hardening
REVOKE ALL ON FUNCTION public.player_create_guest_player FROM PUBLIC;
REVOKE ALL ON FUNCTION public.player_find_similar_players FROM PUBLIC;
REVOKE ALL ON FUNCTION public.player_claim_profile FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.player_create_guest_player TO authenticated;
GRANT EXECUTE ON FUNCTION public.player_find_similar_players TO authenticated;
GRANT EXECUTE ON FUNCTION public.player_claim_profile TO authenticated;

-- 9) RLS: SELECT visible para authenticated (si ya tenías otras policies, ojo con DROP)
DROP POLICY IF EXISTS "Authenticated users can see all players" ON public.players;
CREATE POLICY "Authenticated users can see all players"
  ON public.players FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

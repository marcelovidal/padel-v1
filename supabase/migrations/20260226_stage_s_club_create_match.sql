-- STAGE S: club match creation RPC (owner-safe)

DROP FUNCTION IF EXISTS public.club_create_match(timestamptz, int, text);

CREATE OR REPLACE FUNCTION public.club_create_match(
  p_match_at timestamptz,
  p_max_players int DEFAULT 4,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_club record;
  v_match_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF p_match_at IS NULL THEN
    RAISE EXCEPTION 'INVALID_MATCH_AT';
  END IF;

  IF p_max_players IS NULL OR p_max_players < 2 OR p_max_players > 4 THEN
    RAISE EXCEPTION 'INVALID_MAX_PLAYERS';
  END IF;

  SELECT c.id, c.name
    INTO v_club
  FROM public.clubs c
  WHERE c.deleted_at IS NULL
    AND c.claim_status = 'claimed'
    AND c.claimed_by = v_uid
  ORDER BY c.claimed_at DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CLUB_NOT_FOUND';
  END IF;

  INSERT INTO public.matches (
    match_at,
    club_name,
    club_id,
    max_players,
    notes,
    status,
    created_by
  )
  VALUES (
    p_match_at,
    v_club.name,
    v_club.id,
    p_max_players,
    NULLIF(TRIM(COALESCE(p_notes, '')), ''),
    'scheduled',
    v_uid
  )
  RETURNING id INTO v_match_id;

  RETURN v_match_id;
END;
$$;

REVOKE ALL ON FUNCTION public.club_create_match(timestamptz, int, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_create_match(timestamptz, int, text) TO authenticated;

NOTIFY pgrst, 'reload schema';

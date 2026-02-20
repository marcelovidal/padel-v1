-- STAGE T: club create match with players (single step, owner-safe)

DROP FUNCTION IF EXISTS public.club_create_match_with_players(
  timestamptz, uuid, uuid, uuid, uuid, text, integer
);

CREATE OR REPLACE FUNCTION public.club_create_match_with_players(
  p_match_at timestamptz,
  p_player_a1_id uuid,
  p_player_a2_id uuid,
  p_player_b1_id uuid,
  p_player_b2_id uuid,
  p_notes text DEFAULT NULL,
  p_max_players integer DEFAULT 4
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
  v_ids uuid[];
  v_status public.match_status;
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

  v_ids := ARRAY[p_player_a1_id, p_player_a2_id, p_player_b1_id, p_player_b2_id];
  IF (SELECT count(DISTINCT x) FROM unnest(v_ids) AS x) <> 4 THEN
    RAISE EXCEPTION 'DUPLICATE_PLAYERS';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(v_ids) AS pid
    LEFT JOIN public.players p ON p.id = pid
    WHERE p.id IS NULL OR p.deleted_at IS NOT NULL OR p.status <> 'active'
  ) THEN
    RAISE EXCEPTION 'PLAYER_NOT_FOUND';
  END IF;

  v_status := CASE
    WHEN p_match_at < now() THEN 'completed'::public.match_status
    ELSE 'scheduled'::public.match_status
  END;

  INSERT INTO public.matches (
    match_at,
    club_name,
    club_id,
    status,
    notes,
    max_players,
    created_by
  )
  VALUES (
    p_match_at,
    v_club.name,
    v_club.id,
    v_status,
    NULLIF(TRIM(COALESCE(p_notes, '')), ''),
    p_max_players,
    v_uid
  )
  RETURNING id INTO v_match_id;

  INSERT INTO public.match_players (match_id, player_id, team)
  VALUES
    (v_match_id, p_player_a1_id, 'A'),
    (v_match_id, p_player_a2_id, 'A'),
    (v_match_id, p_player_b1_id, 'B'),
    (v_match_id, p_player_b2_id, 'B');

  RETURN v_match_id;
END;
$$;

REVOKE ALL ON FUNCTION public.club_create_match_with_players(
  timestamptz, uuid, uuid, uuid, uuid, text, integer
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_create_match_with_players(
  timestamptz, uuid, uuid, uuid, uuid, text, integer
) TO authenticated;

NOTIFY pgrst, 'reload schema';

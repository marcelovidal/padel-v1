-- STAGE R: club portal owner profile + club matches

DROP FUNCTION IF EXISTS public.club_update_profile(
  uuid, text, text, text, text, int, boolean, boolean, text, text, text, text
);

CREATE OR REPLACE FUNCTION public.club_update_profile(
  p_club_id uuid,
  p_name text DEFAULT NULL,
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
  v_access_type text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF p_access_type IS NOT NULL THEN
    v_access_type := NULLIF(TRIM(LOWER(p_access_type)), '');
    IF v_access_type IS NOT NULL AND v_access_type NOT IN ('abierta', 'cerrada') THEN
      RAISE EXCEPTION 'INVALID_ACCESS_TYPE';
    END IF;
  ELSE
    v_access_type := NULL;
  END IF;

  IF p_courts_count IS NOT NULL AND p_courts_count < 0 THEN
    RAISE EXCEPTION 'INVALID_COURTS_COUNT';
  END IF;

  UPDATE public.clubs c
  SET
    name = COALESCE(NULLIF(TRIM(p_name), ''), c.name),
    normalized_name = LOWER(TRIM(COALESCE(NULLIF(TRIM(p_name), ''), c.name))),
    address = NULLIF(TRIM(p_address), ''),
    description = NULLIF(TRIM(p_description), ''),
    access_type = COALESCE(v_access_type, c.access_type),
    courts_count = p_courts_count,
    has_glass = COALESCE(p_has_glass, c.has_glass),
    has_synthetic_grass = COALESCE(p_has_synthetic_grass, c.has_synthetic_grass),
    contact_first_name = NULLIF(TRIM(p_contact_first_name), ''),
    contact_last_name = NULLIF(TRIM(p_contact_last_name), ''),
    contact_phone = NULLIF(TRIM(p_contact_phone), ''),
    avatar_url = COALESCE(NULLIF(TRIM(p_avatar_url), ''), c.avatar_url),
    updated_at = now()
  WHERE c.id = p_club_id
    AND c.deleted_at IS NULL
    AND c.claim_status = 'claimed'
    AND c.claimed_by = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  RETURN p_club_id;
END;
$$;

DROP FUNCTION IF EXISTS public.club_list_my_matches(int);

CREATE OR REPLACE FUNCTION public.club_list_my_matches(
  p_limit int DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  match_at timestamptz,
  club_name text,
  club_id uuid,
  status text,
  max_players int,
  notes text,
  created_at timestamptz,
  updated_at timestamptz,
  players_count int,
  players_by_team jsonb,
  match_results jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_club_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT c.id
    INTO v_club_id
  FROM public.clubs c
  WHERE c.deleted_at IS NULL
    AND c.claim_status = 'claimed'
    AND c.claimed_by = v_uid
  ORDER BY c.claimed_at DESC NULLS LAST
  LIMIT 1;

  IF v_club_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.match_at,
    m.club_name,
    m.club_id,
    m.status::text,
    m.max_players,
    m.notes,
    m.created_at,
    m.updated_at,
    COALESCE(mp.players_count, 0)::int AS players_count,
    jsonb_build_object(
      'A', COALESCE(mp.team_a, '[]'::jsonb),
      'B', COALESCE(mp.team_b, '[]'::jsonb)
    ) AS players_by_team,
    mr.match_results
  FROM public.matches m
  LEFT JOIN (
    SELECT
      mp.match_id,
      COUNT(*) AS players_count,
      jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'first_name', p.first_name,
          'last_name', p.last_name,
          'avatar_url', p.avatar_url
        )
      ) FILTER (WHERE mp.team = 'A') AS team_a,
      jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'first_name', p.first_name,
          'last_name', p.last_name,
          'avatar_url', p.avatar_url
        )
      ) FILTER (WHERE mp.team = 'B') AS team_b
    FROM public.match_players mp
    LEFT JOIN public.players p ON p.id = mp.player_id
    GROUP BY mp.match_id
  ) mp ON mp.match_id = m.id
  LEFT JOIN (
    SELECT
      r.match_id,
      jsonb_build_object(
        'sets', r.sets,
        'winner_team', r.winner_team
      ) AS match_results
    FROM public.match_results r
  ) mr ON mr.match_id = m.id
  WHERE m.club_id = v_club_id
  ORDER BY m.match_at DESC
  LIMIT GREATEST(COALESCE(p_limit, 100), 1);
END;
$$;

REVOKE ALL ON FUNCTION public.club_update_profile(
  uuid, text, text, text, text, int, boolean, boolean, text, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_update_profile(
  uuid, text, text, text, text, int, boolean, boolean, text, text, text, text
) TO authenticated;

REVOKE ALL ON FUNCTION public.club_list_my_matches(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_list_my_matches(int) TO authenticated;

NOTIFY pgrst, 'reload schema';

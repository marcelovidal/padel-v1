-- STAGE CLUB: clubs + claim requests + match integration

-- 1) Clubs table
CREATE TABLE IF NOT EXISTS public.clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  normalized_name text NOT NULL,
  country_code text NOT NULL DEFAULT 'AR',
  region_code text NULL,
  region_name text NULL,
  city text NULL,
  city_id text NULL,
  created_by uuid NULL REFERENCES auth.users(id),
  claimed_by uuid NULL REFERENCES auth.users(id),
  claim_status text NOT NULL DEFAULT 'unclaimed',
  claimed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_clubs_claim_status'
  ) THEN
    ALTER TABLE public.clubs
      ADD CONSTRAINT chk_clubs_claim_status
      CHECK (claim_status IN ('unclaimed', 'pending', 'claimed', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_clubs_normalized_name
  ON public.clubs(normalized_name);

CREATE INDEX IF NOT EXISTS idx_clubs_location_ids
  ON public.clubs(country_code, region_code, city_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_clubs_name_loc
  ON public.clubs (
    normalized_name,
    country_code,
    COALESCE(region_code, ''),
    COALESCE(city_id, '')
  )
  WHERE deleted_at IS NULL;

-- 2) Club claim requests table
CREATE TABLE IF NOT EXISTS public.club_claim_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  message text NULL,
  contact_phone text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL,
  resolved_by uuid NULL REFERENCES auth.users(id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_club_claim_requests_status'
  ) THEN
    ALTER TABLE public.club_claim_requests
      ADD CONSTRAINT chk_club_claim_requests_status
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_club_claim_pending
  ON public.club_claim_requests(club_id, requested_by)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_club_claim_requests_club_status
  ON public.club_claim_requests(club_id, status);

-- 3) Matches relation
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS club_id uuid NULL REFERENCES public.clubs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_matches_club_id
  ON public.matches(club_id);

-- 4) RLS
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_claim_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clubs_select_authenticated" ON public.clubs;
CREATE POLICY "clubs_select_authenticated"
  ON public.clubs FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "clubs_insert_authenticated" ON public.clubs;
CREATE POLICY "clubs_insert_authenticated"
  ON public.clubs FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "club_claim_requests_insert_own" ON public.club_claim_requests;
CREATE POLICY "club_claim_requests_insert_own"
  ON public.club_claim_requests FOR INSERT
  TO authenticated
  WITH CHECK (requested_by = auth.uid());

DROP POLICY IF EXISTS "club_claim_requests_select_own_or_admin" ON public.club_claim_requests;
CREATE POLICY "club_claim_requests_select_own_or_admin"
  ON public.club_claim_requests FOR SELECT
  TO authenticated
  USING (
    requested_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles pr
      WHERE pr.id = auth.uid()
        AND pr.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "club_claim_requests_update_admin" ON public.club_claim_requests;
CREATE POLICY "club_claim_requests_update_admin"
  ON public.club_claim_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles pr
      WHERE pr.id = auth.uid()
        AND pr.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles pr
      WHERE pr.id = auth.uid()
        AND pr.role = 'admin'
    )
  );

-- 5) RPC: club_create
CREATE OR REPLACE FUNCTION public.club_create(
  p_name text,
  p_country_code text DEFAULT 'AR',
  p_region_code text DEFAULT NULL,
  p_region_name text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_city_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_name text;
  v_normalized text;
  v_country text;
  v_region_code text;
  v_region_name text;
  v_city text;
  v_city_id text;
  v_club_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  v_name := NULLIF(TRIM(p_name), '');
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'CLUB_NAME_REQUIRED';
  END IF;

  v_normalized := LOWER(TRIM(v_name));
  v_country := COALESCE(NULLIF(TRIM(p_country_code), ''), 'AR');
  v_region_code := NULLIF(TRIM(p_region_code), '');
  v_region_name := NULLIF(TRIM(p_region_name), '');
  v_city := NULLIF(TRIM(p_city), '');
  v_city_id := NULLIF(TRIM(p_city_id), '');

  SELECT c.id
    INTO v_club_id
  FROM public.clubs c
  WHERE c.deleted_at IS NULL
    AND c.normalized_name = v_normalized
    AND c.country_code = v_country
    AND COALESCE(c.region_code, '') = COALESCE(v_region_code, '')
    AND COALESCE(c.city_id, '') = COALESCE(v_city_id, '')
  LIMIT 1;

  IF v_club_id IS NOT NULL THEN
    RETURN v_club_id;
  END IF;

  BEGIN
    INSERT INTO public.clubs (
      name,
      normalized_name,
      country_code,
      region_code,
      region_name,
      city,
      city_id,
      created_by,
      claim_status
    )
    VALUES (
      v_name,
      v_normalized,
      v_country,
      v_region_code,
      v_region_name,
      v_city,
      v_city_id,
      v_uid,
      'unclaimed'
    )
    RETURNING id INTO v_club_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT c.id
      INTO v_club_id
    FROM public.clubs c
    WHERE c.deleted_at IS NULL
      AND c.normalized_name = v_normalized
      AND c.country_code = v_country
      AND COALESCE(c.region_code, '') = COALESCE(v_region_code, '')
      AND COALESCE(c.city_id, '') = COALESCE(v_city_id, '')
    LIMIT 1;
  END;

  RETURN v_club_id;
END;
$$;

-- 6) RPC: club_search
CREATE OR REPLACE FUNCTION public.club_search(
  p_query text,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  name text,
  city text,
  city_id text,
  region_code text,
  region_name text,
  country_code text,
  claim_status text,
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

  SELECT p.country_code, p.region_code, p.city_id, p.city_normalized
    INTO v_me
  FROM public.players p
  WHERE p.user_id = auth.uid()
    AND p.deleted_at IS NULL
  LIMIT 1;

  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.city,
    c.city_id,
    c.region_code,
    c.region_name,
    c.country_code,
    c.claim_status,
    (
      CASE
        WHEN v_me.city_id IS NOT NULL AND c.city_id = v_me.city_id THEN 200
        WHEN v_me.city_id IS NULL
             AND v_me.city_normalized IS NOT NULL
             AND c.city_id IS NULL
             AND LOWER(TRIM(COALESCE(c.city, ''))) = v_me.city_normalized THEN 100
        ELSE 0
      END
      +
      CASE
        WHEN v_me.region_code IS NOT NULL AND c.region_code = v_me.region_code THEN 50
        ELSE 0
      END
      +
      CASE
        WHEN v_me.country_code IS NOT NULL AND c.country_code = v_me.country_code THEN 10
        ELSE 0
      END
      +
      CASE
        WHEN v_q <> '' AND c.name ILIKE '%' || v_q || '%' THEN 20
        WHEN v_q <> '' AND c.name ILIKE v_q || '%' THEN 10
        ELSE 0
      END
    )::int AS score
  FROM public.clubs c
  WHERE c.deleted_at IS NULL
    AND (
      v_q = ''
      OR c.name ILIKE '%' || v_q || '%'
      OR c.normalized_name ILIKE '%' || LOWER(v_q) || '%'
    )
  ORDER BY score DESC, c.name ASC
  LIMIT p_limit;
END;
$$;

-- 7) RPC: club_request_claim
CREATE OR REPLACE FUNCTION public.club_request_claim(
  p_club_id uuid,
  p_message text DEFAULT NULL,
  p_contact_phone text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_claim_status text;
  v_request_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT c.claim_status
    INTO v_claim_status
  FROM public.clubs c
  WHERE c.id = p_club_id
    AND c.deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CLUB_NOT_FOUND';
  END IF;

  IF v_claim_status = 'claimed' THEN
    RAISE EXCEPTION 'CLUB_ALREADY_CLAIMED';
  END IF;

  INSERT INTO public.club_claim_requests (
    club_id,
    requested_by,
    status,
    message,
    contact_phone
  )
  VALUES (
    p_club_id,
    v_uid,
    'pending',
    NULLIF(TRIM(p_message), ''),
    NULLIF(TRIM(p_contact_phone), '')
  )
  ON CONFLICT (club_id, requested_by) WHERE status = 'pending'
  DO UPDATE SET
    message = COALESCE(EXCLUDED.message, club_claim_requests.message),
    contact_phone = COALESCE(EXCLUDED.contact_phone, club_claim_requests.contact_phone)
  RETURNING id INTO v_request_id;

  IF v_claim_status = 'unclaimed' THEN
    UPDATE public.clubs
    SET claim_status = 'pending',
        updated_at = now()
    WHERE id = p_club_id;
  END IF;

  RETURN v_request_id;
END;
$$;

-- 8) Optional admin resolver
CREATE OR REPLACE FUNCTION public.club_resolve_claim(
  p_request_id uuid,
  p_decision text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_is_admin boolean;
  v_req record;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = v_uid
      AND pr.role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'INVALID_DECISION';
  END IF;

  SELECT *
    INTO v_req
  FROM public.club_claim_requests r
  WHERE r.id = p_request_id
    AND r.status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REQUEST_NOT_FOUND';
  END IF;

  UPDATE public.club_claim_requests
  SET status = p_decision,
      resolved_at = now(),
      resolved_by = v_uid
  WHERE id = p_request_id;

  IF p_decision = 'approved' THEN
    UPDATE public.clubs
    SET claimed_by = v_req.requested_by,
        claim_status = 'claimed',
        claimed_at = now(),
        updated_at = now()
    WHERE id = v_req.club_id;
  ELSE
    UPDATE public.clubs
    SET claim_status = 'unclaimed',
        updated_at = now()
    WHERE id = v_req.club_id
      AND claim_status = 'pending';
  END IF;

  RETURN p_request_id;
END;
$$;

-- 9) Update match RPCs to support club_id and keep club_name fallback
CREATE OR REPLACE FUNCTION public.player_create_match_with_players(
  p_match_at timestamptz,
  p_club_name text,
  p_partner_id uuid,
  p_opp1_id uuid,
  p_opp2_id uuid,
  p_notes text DEFAULT NULL,
  p_max_players integer DEFAULT 4,
  p_club_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_match_id uuid;
  v_creator_player_id uuid;
  v_ids uuid[];
  v_status public.match_status;
  v_final_club_name text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT id INTO v_creator_player_id
  FROM public.players
  WHERE user_id = v_uid
    AND deleted_at IS NULL;

  IF v_creator_player_id IS NULL THEN
    RAISE EXCEPTION 'PLAYER_PROFILE_NOT_FOUND';
  END IF;

  IF p_club_id IS NOT NULL THEN
    SELECT c.name INTO v_final_club_name
    FROM public.clubs c
    WHERE c.id = p_club_id
      AND c.deleted_at IS NULL;

    IF v_final_club_name IS NULL THEN
      RAISE EXCEPTION 'CLUB_NOT_FOUND';
    END IF;
  ELSE
    v_final_club_name := NULLIF(TRIM(p_club_name), '');
  END IF;

  IF v_final_club_name IS NULL THEN
    RAISE EXCEPTION 'CLUB_REQUIRED';
  END IF;

  v_status := CASE
    WHEN p_match_at < now() THEN 'completed'::public.match_status
    ELSE 'scheduled'::public.match_status
  END;

  v_ids := ARRAY[v_creator_player_id, p_partner_id, p_opp1_id, p_opp2_id];
  IF (SELECT count(DISTINCT x) FROM unnest(v_ids) AS x) <> 4 THEN
    RAISE EXCEPTION 'DUPLICATE_PLAYERS';
  END IF;

  INSERT INTO public.matches (match_at, club_name, club_id, status, notes, max_players, created_by)
  VALUES (p_match_at, v_final_club_name, p_club_id, v_status, p_notes, p_max_players, v_uid)
  RETURNING id INTO v_match_id;

  INSERT INTO public.match_players (match_id, player_id, team)
  VALUES
    (v_match_id, v_creator_player_id, 'A'),
    (v_match_id, p_partner_id, 'A'),
    (v_match_id, p_opp1_id, 'B'),
    (v_match_id, p_opp2_id, 'B');

  RETURN v_match_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.player_update_match(
  p_match_id uuid,
  p_match_at timestamptz,
  p_club_name text,
  p_notes text DEFAULT NULL,
  p_club_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_status public.match_status;
  v_new_status public.match_status;
  v_created_by uuid;
  v_final_club_name text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT status, created_by INTO v_status, v_created_by
  FROM public.matches
  WHERE id = p_match_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MATCH_NOT_FOUND';
  END IF;

  IF v_created_by <> v_uid THEN
    RAISE EXCEPTION 'NOT_OWNER';
  END IF;

  IF v_status <> 'scheduled'::public.match_status THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  IF p_club_id IS NOT NULL THEN
    SELECT c.name INTO v_final_club_name
    FROM public.clubs c
    WHERE c.id = p_club_id
      AND c.deleted_at IS NULL;

    IF v_final_club_name IS NULL THEN
      RAISE EXCEPTION 'CLUB_NOT_FOUND';
    END IF;
  ELSE
    v_final_club_name := NULLIF(TRIM(p_club_name), '');
  END IF;

  IF v_final_club_name IS NULL THEN
    RAISE EXCEPTION 'CLUB_REQUIRED';
  END IF;

  v_new_status := CASE
    WHEN p_match_at < now() THEN 'completed'::public.match_status
    ELSE 'scheduled'::public.match_status
  END;

  UPDATE public.matches
  SET
    match_at = p_match_at,
    club_name = v_final_club_name,
    club_id = p_club_id,
    notes = p_notes,
    status = v_new_status,
    updated_at = now()
  WHERE id = p_match_id;

  RETURN p_match_id;
END;
$$;

-- 10) Grants
REVOKE ALL ON FUNCTION public.club_create(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_create(text, text, text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.club_search(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_search(text, int) TO authenticated;

REVOKE ALL ON FUNCTION public.club_request_claim(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_request_claim(uuid, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.club_resolve_claim(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_resolve_claim(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.player_create_match_with_players(timestamptz, text, uuid, uuid, uuid, text, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.player_create_match_with_players(timestamptz, text, uuid, uuid, uuid, text, integer, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.player_update_match(uuid, timestamptz, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.player_update_match(uuid, timestamptz, text, text, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

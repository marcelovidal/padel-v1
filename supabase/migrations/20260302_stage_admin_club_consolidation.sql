-- STAGE ADMIN CLUB CONSOLIDATION (MVP)
-- Deduplicacion de clubes con trazabilidad, merge seguro e idempotente.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1) Clubs hardening for consolidation
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS normalized_name text;

UPDATE public.clubs
SET normalized_name = LOWER(REGEXP_REPLACE(TRIM(name), '\s+', ' ', 'g'))
WHERE normalized_name IS NULL OR TRIM(normalized_name) = '';

ALTER TABLE public.clubs
  ALTER COLUMN normalized_name SET NOT NULL;

ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS merged_into uuid NULL REFERENCES public.clubs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_clubs_merged_into ON public.clubs(merged_into);
CREATE INDEX IF NOT EXISTS idx_clubs_archived_at ON public.clubs(archived_at);

-- Hide archived clubs from regular reads
DROP POLICY IF EXISTS "clubs_select_authenticated" ON public.clubs;
CREATE POLICY "clubs_select_authenticated"
  ON public.clubs FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL AND archived_at IS NULL);

-- 2) Aliases table
CREATE TABLE IF NOT EXISTS public.club_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  alias_name text NOT NULL,
  alias_normalized text NOT NULL,
  city_id text NULL,
  region_code text NULL,
  country_code text NOT NULL DEFAULT 'AR',
  region_code_key text GENERATED ALWAYS AS (COALESCE(region_code, '')) STORED,
  city_id_key text GENERATED ALWAYS AS (COALESCE(city_id, '')) STORED,
  created_by uuid NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_club_aliases_location_name'
  ) THEN
    ALTER TABLE public.club_aliases
      ADD CONSTRAINT uq_club_aliases_location_name
      UNIQUE (country_code, region_code, city_id, alias_normalized);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_club_aliases_location_name_key'
  ) THEN
    ALTER TABLE public.club_aliases
      ADD CONSTRAINT uq_club_aliases_location_name_key
      UNIQUE (country_code, region_code_key, city_id_key, alias_normalized);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_club_aliases_club_id
  ON public.club_aliases(club_id);

CREATE INDEX IF NOT EXISTS idx_club_aliases_lookup
  ON public.club_aliases(country_code, region_code, city_id, alias_normalized);

-- 3) Merge audit log
CREATE TABLE IF NOT EXISTS public.club_merge_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_club_id uuid NOT NULL REFERENCES public.clubs(id),
  target_club_id uuid NOT NULL REFERENCES public.clubs(id),
  merged_by uuid NOT NULL REFERENCES auth.users(id),
  merged_at timestamptz NOT NULL DEFAULT now(),
  affected_matches_count int NOT NULL DEFAULT 0,
  note text NULL
);

CREATE INDEX IF NOT EXISTS idx_club_merge_log_source ON public.club_merge_log(source_club_id);
CREATE INDEX IF NOT EXISTS idx_club_merge_log_target ON public.club_merge_log(target_club_id);
CREATE INDEX IF NOT EXISTS idx_club_merge_log_merged_at ON public.club_merge_log(merged_at DESC);

-- 4) RLS for new admin tables
ALTER TABLE public.club_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_merge_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "club_aliases_admin_select" ON public.club_aliases;
CREATE POLICY "club_aliases_admin_select"
  ON public.club_aliases
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "club_aliases_admin_insert" ON public.club_aliases;
CREATE POLICY "club_aliases_admin_insert"
  ON public.club_aliases
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "club_aliases_admin_update" ON public.club_aliases;
CREATE POLICY "club_aliases_admin_update"
  ON public.club_aliases
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "club_merge_log_admin_select" ON public.club_merge_log;
CREATE POLICY "club_merge_log_admin_select"
  ON public.club_merge_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "club_merge_log_admin_insert" ON public.club_merge_log;
CREATE POLICY "club_merge_log_admin_insert"
  ON public.club_merge_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- 5) Shared normalizer
CREATE OR REPLACE FUNCTION public.club_normalize_name(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT LOWER(REGEXP_REPLACE(TRIM(COALESCE(p_name, '')), '\s+', ' ', 'g'));
$$;

-- Keep existing create/search flows consistent with archived clubs.
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

  v_normalized := public.club_normalize_name(v_name);
  v_country := COALESCE(NULLIF(TRIM(p_country_code), ''), 'AR');
  v_region_code := NULLIF(TRIM(p_region_code), '');
  v_region_name := NULLIF(TRIM(p_region_name), '');
  v_city := NULLIF(TRIM(p_city), '');
  v_city_id := NULLIF(TRIM(p_city_id), '');

  SELECT c.id
    INTO v_club_id
  FROM public.clubs c
  WHERE c.deleted_at IS NULL
    AND c.archived_at IS NULL
    AND c.merged_into IS NULL
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
      AND c.archived_at IS NULL
      AND c.merged_into IS NULL
      AND c.normalized_name = v_normalized
      AND c.country_code = v_country
      AND COALESCE(c.region_code, '') = COALESCE(v_region_code, '')
      AND COALESCE(c.city_id, '') = COALESCE(v_city_id, '')
    LIMIT 1;
  END;

  RETURN v_club_id;
END;
$$;

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
    AND c.archived_at IS NULL
    AND c.merged_into IS NULL
    AND (
      v_q = ''
      OR c.name ILIKE '%' || v_q || '%'
      OR c.normalized_name ILIKE '%' || LOWER(v_q) || '%'
    )
  ORDER BY score DESC, c.name ASC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.club_find_claim_candidates(
  p_name text,
  p_city_id text DEFAULT NULL,
  p_region_code text DEFAULT NULL,
  p_exclude_club_id uuid DEFAULT NULL,
  p_limit int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  name text,
  city text,
  region_name text,
  claim_status text,
  exact_name boolean,
  location_match boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q text;
  v_city_id text;
  v_region_code text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  v_q := NULLIF(TRIM(LOWER(COALESCE(p_name, ''))), '');
  v_city_id := NULLIF(TRIM(COALESCE(p_city_id, '')), '');
  v_region_code := NULLIF(TRIM(COALESCE(p_region_code, '')), '');

  IF v_q IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.city,
    c.region_name,
    c.claim_status,
    (c.normalized_name = v_q) AS exact_name,
    (
      (v_city_id IS NOT NULL AND c.city_id = v_city_id)
      OR (v_region_code IS NOT NULL AND c.region_code = v_region_code)
    ) AS location_match
  FROM public.clubs c
  WHERE c.deleted_at IS NULL
    AND c.archived_at IS NULL
    AND c.merged_into IS NULL
    AND c.claim_status <> 'claimed'
    AND (p_exclude_club_id IS NULL OR c.id <> p_exclude_club_id)
    AND (
      c.normalized_name = v_q
      OR c.normalized_name LIKE v_q || '%'
      OR c.name ILIKE '%' || p_name || '%'
    )
  ORDER BY
    CASE WHEN c.normalized_name = v_q THEN 0 ELSE 1 END,
    CASE
      WHEN v_city_id IS NOT NULL AND c.city_id = v_city_id THEN 0
      WHEN v_region_code IS NOT NULL AND c.region_code = v_region_code THEN 1
      ELSE 2
    END,
    c.updated_at DESC
  LIMIT GREATEST(COALESCE(p_limit, 5), 1);
END;
$$;

-- 6) RPC: attach alias
CREATE OR REPLACE FUNCTION public.admin_attach_alias_to_club(
  p_club_id uuid,
  p_alias_name text,
  p_city_id text DEFAULT NULL,
  p_region_code text DEFAULT NULL,
  p_country_code text DEFAULT 'AR'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_is_admin boolean;
  v_alias_name text;
  v_alias_normalized text;
  v_country text;
  v_region text;
  v_city text;
  v_alias_id uuid;
  v_club record;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = v_uid
      AND p.role = 'admin'
  ) INTO v_is_admin;

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  v_alias_name := NULLIF(TRIM(p_alias_name), '');
  IF v_alias_name IS NULL THEN
    RAISE EXCEPTION 'ALIAS_REQUIRED';
  END IF;

  SELECT c.id, c.city_id, c.region_code, c.country_code, c.archived_at
    INTO v_club
  FROM public.clubs c
  WHERE c.id = p_club_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CLUB_NOT_FOUND';
  END IF;

  IF v_club.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'TARGET_ARCHIVED';
  END IF;

  v_alias_normalized := public.club_normalize_name(v_alias_name);
  IF v_alias_normalized = '' THEN
    RAISE EXCEPTION 'ALIAS_REQUIRED';
  END IF;

  v_country := COALESCE(NULLIF(TRIM(p_country_code), ''), v_club.country_code, 'AR');
  v_region := COALESCE(NULLIF(TRIM(p_region_code), ''), v_club.region_code);
  v_city := COALESCE(NULLIF(TRIM(p_city_id), ''), v_club.city_id);

  BEGIN
    INSERT INTO public.club_aliases (
      club_id,
      alias_name,
      alias_normalized,
      city_id,
      region_code,
      country_code,
      created_by
    )
    VALUES (
      p_club_id,
      v_alias_name,
      v_alias_normalized,
      v_city,
      v_region,
      v_country,
      v_uid
    )
    ON CONFLICT (country_code, region_code_key, city_id_key, alias_normalized)
    DO UPDATE
    SET club_id = EXCLUDED.club_id
    RETURNING id INTO v_alias_id;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT a.id
        INTO v_alias_id
      FROM public.club_aliases a
      WHERE a.country_code = v_country
        AND COALESCE(a.region_code, '') = COALESCE(v_region, '')
        AND COALESCE(a.city_id, '') = COALESCE(v_city, '')
        AND a.alias_normalized = v_alias_normalized
      LIMIT 1;
  END;

  RETURN v_alias_id;
END;
$$;

-- 7) RPC: duplicates clusters
CREATE OR REPLACE FUNCTION public.admin_find_club_duplicates(
  p_query text DEFAULT NULL,
  p_limit int DEFAULT 50
)
RETURNS TABLE (
  cluster_key text,
  country_code text,
  region_code text,
  city_id text,
  city text,
  region_name text,
  clubs jsonb,
  confidence numeric,
  clubs_count int,
  total_matches int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_is_admin boolean;
  v_q text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = v_uid
      AND p.role = 'admin'
  ) INTO v_is_admin;

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  v_q := NULLIF(TRIM(p_query), '');

  RETURN QUERY
  WITH base AS (
    SELECT
      c.id,
      c.name,
      c.normalized_name,
      c.country_code,
      c.region_code,
      c.city_id,
      c.city,
      c.region_name,
      c.claim_status,
      c.claimed_by,
      SUBSTRING(public.club_normalize_name(c.name) FROM 1 FOR 8) AS bucket
    FROM public.clubs c
    WHERE c.deleted_at IS NULL
      AND c.archived_at IS NULL
      AND c.merged_into IS NULL
      AND (
        v_q IS NULL
        OR c.name ILIKE '%' || v_q || '%'
        OR c.normalized_name ILIKE '%' || public.club_normalize_name(v_q) || '%'
      )
  ),
  grouped AS (
    SELECT
      b.country_code,
      b.region_code,
      b.city_id,
      MAX(b.city) AS city,
      MAX(b.region_name) AS region_name,
      b.bucket,
      COUNT(*)::int AS clubs_count
    FROM base b
    GROUP BY b.country_code, b.region_code, b.city_id, b.bucket
    HAVING COUNT(*) > 1
  ),
  pair_scores AS (
    SELECT
      g.country_code,
      g.region_code,
      g.city_id,
      g.bucket,
      AVG(similarity(b1.normalized_name, b2.normalized_name))::numeric AS avg_similarity
    FROM grouped g
    JOIN base b1
      ON b1.country_code = g.country_code
     AND COALESCE(b1.region_code, '') = COALESCE(g.region_code, '')
     AND COALESCE(b1.city_id, '') = COALESCE(g.city_id, '')
     AND b1.bucket = g.bucket
    JOIN base b2
      ON b2.country_code = g.country_code
     AND COALESCE(b2.region_code, '') = COALESCE(g.region_code, '')
     AND COALESCE(b2.city_id, '') = COALESCE(g.city_id, '')
     AND b2.bucket = g.bucket
     AND b1.id < b2.id
    GROUP BY g.country_code, g.region_code, g.city_id, g.bucket
  ),
  per_club_matches AS (
    SELECT
      m.club_id,
      COUNT(*)::int AS matches_count
    FROM public.matches m
    WHERE m.club_id IS NOT NULL
    GROUP BY m.club_id
  )
  SELECT
    CONCAT_WS('|', g.country_code, COALESCE(g.region_code, ''), COALESCE(g.city_id, ''), g.bucket) AS cluster_key,
    g.country_code,
    g.region_code,
    g.city_id,
    g.city,
    g.region_name,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'name', b.name,
          'normalized_name', b.normalized_name,
          'claim_status', b.claim_status,
          'claimed', (b.claimed_by IS NOT NULL),
          'matches_count', COALESCE(pm.matches_count, 0)
        )
        ORDER BY COALESCE(pm.matches_count, 0) DESC, b.name ASC
      )
      FROM base b
      LEFT JOIN per_club_matches pm ON pm.club_id = b.id
      WHERE b.country_code = g.country_code
        AND COALESCE(b.region_code, '') = COALESCE(g.region_code, '')
        AND COALESCE(b.city_id, '') = COALESCE(g.city_id, '')
        AND b.bucket = g.bucket
    ) AS clubs,
    ROUND(COALESCE(ps.avg_similarity, 1.0) * 100.0, 1) AS confidence,
    g.clubs_count,
    (
      SELECT COALESCE(SUM(COALESCE(pm.matches_count, 0)), 0)::int
      FROM base b
      LEFT JOIN per_club_matches pm ON pm.club_id = b.id
      WHERE b.country_code = g.country_code
        AND COALESCE(b.region_code, '') = COALESCE(g.region_code, '')
        AND COALESCE(b.city_id, '') = COALESCE(g.city_id, '')
        AND b.bucket = g.bucket
    ) AS total_matches
  FROM grouped g
  LEFT JOIN pair_scores ps
    ON ps.country_code = g.country_code
   AND COALESCE(ps.region_code, '') = COALESCE(g.region_code, '')
   AND COALESCE(ps.city_id, '') = COALESCE(g.city_id, '')
   AND ps.bucket = g.bucket
  ORDER BY confidence DESC, total_matches DESC, clubs_count DESC
  LIMIT GREATEST(COALESCE(p_limit, 50), 1);
END;
$$;

-- 8) RPC: merge clubs
CREATE OR REPLACE FUNCTION public.admin_merge_clubs(
  p_source_club_id uuid,
  p_target_club_id uuid,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_is_admin boolean;
  v_source record;
  v_target record;
  v_affected_matches int := 0;
  v_now timestamptz := now();
  v_log_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = v_uid
      AND p.role = 'admin'
  ) INTO v_is_admin;

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  IF p_source_club_id IS NULL OR p_target_club_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_CLUB_IDS';
  END IF;

  IF p_source_club_id = p_target_club_id THEN
    RAISE EXCEPTION 'SAME_CLUB';
  END IF;

  SELECT c.id, c.name, c.merged_into, c.archived_at, c.country_code, c.region_code, c.city_id
    INTO v_source
  FROM public.clubs c
  WHERE c.id = p_source_club_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SOURCE_NOT_FOUND';
  END IF;

  SELECT c.id, c.name, c.archived_at, c.country_code, c.region_code, c.city_id
    INTO v_target
  FROM public.clubs c
  WHERE c.id = p_target_club_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TARGET_NOT_FOUND';
  END IF;

  IF v_target.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'TARGET_ARCHIVED';
  END IF;

  IF v_source.archived_at IS NOT NULL THEN
    IF v_source.merged_into = p_target_club_id THEN
      RETURN jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'source_club_id', p_source_club_id,
        'target_club_id', p_target_club_id,
        'affected_matches_count', 0
      );
    ELSE
      RAISE EXCEPTION 'SOURCE_ALREADY_MERGED';
    END IF;
  END IF;

  UPDATE public.matches
  SET club_id = p_target_club_id
  WHERE club_id = p_source_club_id;

  GET DIAGNOSTICS v_affected_matches = ROW_COUNT;

  -- Move existing aliases from source to target, resolving collisions deterministically.
  INSERT INTO public.club_aliases (
    club_id,
    alias_name,
    alias_normalized,
    city_id,
    region_code,
    country_code,
    created_by
  )
  SELECT
    p_target_club_id,
    a.alias_name,
    a.alias_normalized,
    a.city_id,
    a.region_code,
    a.country_code,
    v_uid
  FROM public.club_aliases a
  WHERE a.club_id = p_source_club_id
  ON CONFLICT (country_code, region_code_key, city_id_key, alias_normalized)
  DO UPDATE
  SET club_id = EXCLUDED.club_id;

  -- Ensure source official name is retained as alias on target.
  INSERT INTO public.club_aliases (
    club_id,
    alias_name,
    alias_normalized,
    city_id,
    region_code,
    country_code,
    created_by
  )
  SELECT
    p_target_club_id,
    v_source.name,
    public.club_normalize_name(v_source.name),
    v_source.city_id,
    v_source.region_code,
    v_source.country_code,
    v_uid
  ON CONFLICT (country_code, region_code_key, city_id_key, alias_normalized)
  DO UPDATE
  SET club_id = EXCLUDED.club_id;

  UPDATE public.clubs
  SET merged_into = p_target_club_id,
      archived_at = v_now,
      claim_status = 'unclaimed',
      claimed_by = NULL,
      claimed_at = NULL,
      updated_at = v_now
  WHERE id = p_source_club_id;

  INSERT INTO public.club_merge_log (
    source_club_id,
    target_club_id,
    merged_by,
    merged_at,
    affected_matches_count,
    note
  )
  VALUES (
    p_source_club_id,
    p_target_club_id,
    v_uid,
    v_now,
    v_affected_matches,
    NULLIF(TRIM(p_note), '')
  )
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'source_club_id', p_source_club_id,
    'target_club_id', p_target_club_id,
    'affected_matches_count', v_affected_matches,
    'merge_log_id', v_log_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_find_club_duplicates(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_find_club_duplicates(text, int) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_merge_clubs(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_merge_clubs(uuid, uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_attach_alias_to_club(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_attach_alias_to_club(uuid, text, text, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';

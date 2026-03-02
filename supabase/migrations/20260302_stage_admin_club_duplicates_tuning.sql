-- STAGE ADMIN CLUB DUPLICATES TUNING
-- Improve duplicate clustering for variants like:
-- "Palau", "El Palau", "Nuevo Palau".

-- Shared key used by duplicate detection to reduce noise from common prefixes.
CREATE OR REPLACE FUNCTION public.club_similarity_key(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        public.club_normalize_name(p_name),
        '^((el|la|los|las|club|nuevo|nueva)\s+)+',
        '',
        'i'
      ),
      '[^a-z0-9]+',
      '',
      'g'
    ),
    ''
  );
$$;

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
      COALESCE(
        public.club_similarity_key(c.name),
        REGEXP_REPLACE(c.normalized_name, '[^a-z0-9]+', '', 'g')
      ) AS sim_key
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
      SUBSTRING(b.sim_key FROM 1 FOR 8) AS bucket,
      COUNT(*)::int AS clubs_count
    FROM base b
    GROUP BY b.country_code, b.region_code, b.city_id, SUBSTRING(b.sim_key FROM 1 FOR 8)
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
     AND SUBSTRING(b1.sim_key FROM 1 FOR 8) = g.bucket
    JOIN base b2
      ON b2.country_code = g.country_code
     AND COALESCE(b2.region_code, '') = COALESCE(g.region_code, '')
     AND COALESCE(b2.city_id, '') = COALESCE(g.city_id, '')
     AND SUBSTRING(b2.sim_key FROM 1 FOR 8) = g.bucket
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
        AND SUBSTRING(b.sim_key FROM 1 FOR 8) = g.bucket
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
        AND SUBSTRING(b.sim_key FROM 1 FOR 8) = g.bucket
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

NOTIFY pgrst, 'reload schema';

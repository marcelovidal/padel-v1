-- STAGE Q2: CLUB DATA QUALITY & ADOPTION
-- Incremental hardening for canonical club anchoring, dedup support and adoption telemetry.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1) Clubs data quality baseline (idempotent)
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS city_normalized text,
  ADD COLUMN IF NOT EXISTS merged_into_club_id uuid NULL REFERENCES public.clubs(id) ON DELETE SET NULL;

UPDATE public.clubs
SET display_name = COALESCE(NULLIF(TRIM(display_name), ''), NULLIF(TRIM(name), ''), 'Club sin nombre')
WHERE display_name IS NULL OR TRIM(display_name) = '';

UPDATE public.clubs
SET normalized_name = public.club_normalize_name(COALESCE(NULLIF(TRIM(name), ''), display_name))
WHERE normalized_name IS NULL OR TRIM(normalized_name) = '';

UPDATE public.clubs
SET city_normalized = NULLIF(public.club_normalize_name(city), '')
WHERE city IS NOT NULL
  AND (city_normalized IS NULL OR TRIM(city_normalized) = '');

UPDATE public.clubs
SET merged_into_club_id = merged_into
WHERE merged_into_club_id IS DISTINCT FROM merged_into;

ALTER TABLE public.clubs
  ALTER COLUMN display_name SET NOT NULL,
  ALTER COLUMN normalized_name SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clubs_display_name
  ON public.clubs(display_name);

CREATE INDEX IF NOT EXISTS idx_clubs_normalized_location
  ON public.clubs(country_code, region_code, city_id, normalized_name);

CREATE INDEX IF NOT EXISTS idx_clubs_city_normalized
  ON public.clubs(city_normalized);

CREATE INDEX IF NOT EXISTS idx_clubs_merged_into_club_id
  ON public.clubs(merged_into_club_id);

-- 2) Aliases compatibility hardening
ALTER TABLE public.club_aliases
  ADD COLUMN IF NOT EXISTS alias_text text;

UPDATE public.club_aliases
SET alias_text = alias_name
WHERE alias_text IS NULL OR TRIM(alias_text) = '';

ALTER TABLE public.club_aliases
  ALTER COLUMN alias_text SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_club_aliases_normalized_location
  ON public.club_aliases(country_code, region_code_key, city_id_key, alias_normalized);

-- 3) Telemetry for anchoring adoption
CREATE TABLE IF NOT EXISTS public.match_club_anchoring_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL REFERENCES auth.users(id),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  club_id uuid NULL REFERENCES public.clubs(id) ON DELETE SET NULL,
  source text NOT NULL CHECK (source IN ('selected', 'created', 'legacy', 'admin', 'backfill')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_club_anchoring_events_created_at
  ON public.match_club_anchoring_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_match_club_anchoring_events_match_id
  ON public.match_club_anchoring_events(match_id);

CREATE INDEX IF NOT EXISTS idx_match_club_anchoring_events_club_id
  ON public.match_club_anchoring_events(club_id);

ALTER TABLE public.match_club_anchoring_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "match_club_anchoring_events_admin_select" ON public.match_club_anchoring_events;
CREATE POLICY "match_club_anchoring_events_admin_select"
  ON public.match_club_anchoring_events
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

-- 4) Club search wrapper for Q2 surface area
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
  claimed boolean,
  score int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.player_search_clubs(p_query, p_limit);
END;
$$;

-- 5) Create candidate wrapper for unified API naming
CREATE OR REPLACE FUNCTION public.club_create_candidate(
  p_display_name text,
  p_country_code text DEFAULT 'AR',
  p_region_code text DEFAULT NULL,
  p_region_name text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_city_id text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_courts_count int DEFAULT NULL,
  p_surface_types jsonb DEFAULT NULL,
  p_responsible_first_name text DEFAULT NULL,
  p_responsible_last_name text DEFAULT NULL,
  p_responsible_phone text DEFAULT NULL,
  p_responsible_email text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_club_id uuid;
BEGIN
  v_club_id := public.player_create_club_candidate(
    p_name => p_display_name,
    p_country_code => p_country_code,
    p_region_code => p_region_code,
    p_region_name => p_region_name,
    p_city => p_city,
    p_city_id => p_city_id,
    p_address => p_address,
    p_courts_count => p_courts_count,
    p_surface_types => p_surface_types,
    p_responsible_first_name => p_responsible_first_name,
    p_responsible_last_name => p_responsible_last_name,
    p_responsible_phone => p_responsible_phone,
    p_responsible_email => p_responsible_email
  );

  RETURN v_club_id;
END;
$$;

-- 6) Alias registration RPC (idempotent)
CREATE OR REPLACE FUNCTION public.club_register_alias(
  p_club_id uuid,
  p_alias_text text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_alias text;
  v_alias_normalized text;
  v_club record;
  v_alias_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  v_alias := NULLIF(TRIM(p_alias_text), '');
  IF v_alias IS NULL THEN
    RAISE EXCEPTION 'ALIAS_REQUIRED';
  END IF;

  SELECT c.id, c.country_code, c.region_code, c.city_id, c.archived_at
    INTO v_club
  FROM public.clubs c
  WHERE c.id = p_club_id
    AND c.deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND OR v_club.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'CLUB_NOT_FOUND';
  END IF;

  v_alias_normalized := public.club_normalize_name(v_alias);
  IF v_alias_normalized = '' THEN
    RAISE EXCEPTION 'ALIAS_REQUIRED';
  END IF;

  INSERT INTO public.club_aliases (
    club_id,
    alias_name,
    alias_text,
    alias_normalized,
    city_id,
    region_code,
    country_code,
    created_by
  )
  VALUES (
    p_club_id,
    v_alias,
    v_alias,
    v_alias_normalized,
    v_club.city_id,
    v_club.region_code,
    v_club.country_code,
    v_uid
  )
  ON CONFLICT (country_code, region_code_key, city_id_key, alias_normalized)
  DO UPDATE
  SET club_id = EXCLUDED.club_id,
      alias_name = EXCLUDED.alias_name,
      alias_text = EXCLUDED.alias_text
  RETURNING id INTO v_alias_id;

  RETURN v_alias_id;
END;
$$;

-- 7) Enforce canonical anchoring and telemetry in match creation
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
  v_raw_club_name text;
  v_club record;
  v_anchor_source text := 'selected';
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

  IF p_club_id IS NULL THEN
    RAISE EXCEPTION 'CLUB_REQUIRED';
  END IF;

  v_raw_club_name := NULLIF(TRIM(p_club_name), '');

  SELECT c.id, c.name, c.normalized_name, c.country_code, c.region_code, c.city_id
    INTO v_club
  FROM public.clubs c
  WHERE c.id = p_club_id
    AND c.deleted_at IS NULL
    AND c.archived_at IS NULL
    AND c.merged_into IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CLUB_NOT_FOUND';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.clubs c
    WHERE c.id = p_club_id
      AND c.created_by = v_uid
      AND c.created_at >= now() - interval '30 minutes'
  ) THEN
    v_anchor_source := 'created';
  END IF;

  v_final_club_name := v_club.name;

  v_status := CASE
    WHEN p_match_at < now() THEN 'completed'::public.match_status
    ELSE 'scheduled'::public.match_status
  END;

  v_ids := ARRAY[v_creator_player_id, p_partner_id, p_opp1_id, p_opp2_id];
  IF (SELECT count(DISTINCT x) FROM unnest(v_ids) AS x) <> 4 THEN
    RAISE EXCEPTION 'DUPLICATE_PLAYERS';
  END IF;

  INSERT INTO public.matches (match_at, club_name, club_name_raw, club_id, status, notes, max_players, created_by)
  VALUES (
    p_match_at,
    v_final_club_name,
    v_raw_club_name,
    p_club_id,
    v_status,
    p_notes,
    p_max_players,
    v_uid
  )
  RETURNING id INTO v_match_id;

  INSERT INTO public.match_players (match_id, player_id, team)
  VALUES
    (v_match_id, v_creator_player_id, 'A'),
    (v_match_id, p_partner_id, 'A'),
    (v_match_id, p_opp1_id, 'B'),
    (v_match_id, p_opp2_id, 'B');

  IF v_raw_club_name IS NOT NULL
     AND public.club_normalize_name(v_raw_club_name) <> COALESCE(v_club.normalized_name, '') THEN
    INSERT INTO public.club_aliases (
      club_id,
      alias_name,
      alias_text,
      alias_normalized,
      city_id,
      region_code,
      country_code,
      created_by
    )
    VALUES (
      p_club_id,
      v_raw_club_name,
      v_raw_club_name,
      public.club_normalize_name(v_raw_club_name),
      v_club.city_id,
      v_club.region_code,
      v_club.country_code,
      v_uid
    )
    ON CONFLICT (country_code, region_code_key, city_id_key, alias_normalized)
    DO UPDATE
    SET club_id = EXCLUDED.club_id,
        alias_name = EXCLUDED.alias_name,
        alias_text = EXCLUDED.alias_text;
  END IF;

  INSERT INTO public.match_club_anchoring_events (
    user_id,
    match_id,
    club_id,
    source
  )
  VALUES (
    v_uid,
    v_match_id,
    p_club_id,
    v_anchor_source
  );

  RETURN v_match_id;
END;
$$;

-- 8) Keep update flow strict on canonical club
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
  v_raw_club_name text;
  v_club record;
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

  IF p_club_id IS NULL THEN
    RAISE EXCEPTION 'CLUB_REQUIRED';
  END IF;

  v_raw_club_name := NULLIF(TRIM(p_club_name), '');

  SELECT c.id, c.name, c.normalized_name, c.country_code, c.region_code, c.city_id
    INTO v_club
  FROM public.clubs c
  WHERE c.id = p_club_id
    AND c.deleted_at IS NULL
    AND c.archived_at IS NULL
    AND c.merged_into IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CLUB_NOT_FOUND';
  END IF;

  v_final_club_name := v_club.name;

  v_new_status := CASE
    WHEN p_match_at < now() THEN 'completed'::public.match_status
    ELSE 'scheduled'::public.match_status
  END;

  UPDATE public.matches
  SET
    match_at = p_match_at,
    club_name = v_final_club_name,
    club_name_raw = v_raw_club_name,
    club_id = p_club_id,
    notes = p_notes,
    status = v_new_status,
    updated_at = now()
  WHERE id = p_match_id;

  IF v_raw_club_name IS NOT NULL
     AND public.club_normalize_name(v_raw_club_name) <> COALESCE(v_club.normalized_name, '') THEN
    INSERT INTO public.club_aliases (
      club_id,
      alias_name,
      alias_text,
      alias_normalized,
      city_id,
      region_code,
      country_code,
      created_by
    )
    VALUES (
      p_club_id,
      v_raw_club_name,
      v_raw_club_name,
      public.club_normalize_name(v_raw_club_name),
      v_club.city_id,
      v_club.region_code,
      v_club.country_code,
      v_uid
    )
    ON CONFLICT (country_code, region_code_key, city_id_key, alias_normalized)
    DO UPDATE
    SET club_id = EXCLUDED.club_id,
        alias_name = EXCLUDED.alias_name,
        alias_text = EXCLUDED.alias_text;
  END IF;

  RETURN p_match_id;
END;
$$;

-- 9) Enrich set-match-club with alias + telemetry
CREATE OR REPLACE FUNCTION public.player_set_match_club(
  p_match_id uuid,
  p_club_id uuid,
  p_club_name_raw text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_player_id uuid;
  v_club record;
  v_match record;
  v_raw text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT p.id INTO v_player_id
  FROM public.players p
  WHERE p.user_id = v_uid
    AND p.deleted_at IS NULL
  LIMIT 1;

  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'PLAYER_PROFILE_NOT_FOUND';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.match_players mp
    WHERE mp.match_id = p_match_id
      AND mp.player_id = v_player_id
  ) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  SELECT c.id, c.name, c.normalized_name, c.country_code, c.region_code, c.city_id
    INTO v_club
  FROM public.clubs c
  WHERE c.id = p_club_id
    AND c.deleted_at IS NULL
    AND c.archived_at IS NULL
    AND c.merged_into IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CLUB_NOT_FOUND';
  END IF;

  SELECT m.club_id, m.club_name_raw
    INTO v_match
  FROM public.matches m
  WHERE m.id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MATCH_NOT_FOUND';
  END IF;

  v_raw := NULLIF(TRIM(p_club_name_raw), '');

  UPDATE public.matches
  SET club_id = p_club_id,
      club_name = v_club.name,
      club_name_raw = v_raw,
      updated_at = now()
  WHERE id = p_match_id;

  IF v_raw IS NOT NULL
     AND public.club_normalize_name(v_raw) <> COALESCE(v_club.normalized_name, '') THEN
    INSERT INTO public.club_aliases (
      club_id,
      alias_name,
      alias_text,
      alias_normalized,
      city_id,
      region_code,
      country_code,
      created_by
    )
    VALUES (
      p_club_id,
      v_raw,
      v_raw,
      public.club_normalize_name(v_raw),
      v_club.city_id,
      v_club.region_code,
      v_club.country_code,
      v_uid
    )
    ON CONFLICT (country_code, region_code_key, city_id_key, alias_normalized)
    DO UPDATE
    SET club_id = EXCLUDED.club_id,
        alias_name = EXCLUDED.alias_name,
        alias_text = EXCLUDED.alias_text;
  END IF;

  INSERT INTO public.match_club_events (
    match_id,
    actor_user_id,
    old_club_id,
    new_club_id,
    old_club_name_raw,
    new_club_name_raw,
    source
  )
  VALUES (
    p_match_id,
    v_uid,
    v_match.club_id,
    p_club_id,
    v_match.club_name_raw,
    v_raw,
    'player'
  );

  INSERT INTO public.match_club_anchoring_events (
    user_id,
    match_id,
    club_id,
    source
  )
  VALUES (
    v_uid,
    p_match_id,
    p_club_id,
    'selected'
  );

  RETURN p_match_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_match_club(
  p_match_id uuid,
  p_club_id uuid,
  p_club_name_raw text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_is_admin boolean;
  v_club record;
  v_match record;
  v_raw text;
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

  SELECT c.id, c.name, c.normalized_name, c.country_code, c.region_code, c.city_id
    INTO v_club
  FROM public.clubs c
  WHERE c.id = p_club_id
    AND c.deleted_at IS NULL
    AND c.archived_at IS NULL
    AND c.merged_into IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CLUB_NOT_FOUND';
  END IF;

  SELECT m.club_id, m.club_name_raw
    INTO v_match
  FROM public.matches m
  WHERE m.id = p_match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MATCH_NOT_FOUND';
  END IF;

  v_raw := NULLIF(TRIM(p_club_name_raw), '');

  UPDATE public.matches
  SET club_id = p_club_id,
      club_name = v_club.name,
      club_name_raw = v_raw,
      updated_at = now()
  WHERE id = p_match_id;

  IF v_raw IS NOT NULL
     AND public.club_normalize_name(v_raw) <> COALESCE(v_club.normalized_name, '') THEN
    INSERT INTO public.club_aliases (
      club_id,
      alias_name,
      alias_text,
      alias_normalized,
      city_id,
      region_code,
      country_code,
      created_by
    )
    VALUES (
      p_club_id,
      v_raw,
      v_raw,
      public.club_normalize_name(v_raw),
      v_club.city_id,
      v_club.region_code,
      v_club.country_code,
      v_uid
    )
    ON CONFLICT (country_code, region_code_key, city_id_key, alias_normalized)
    DO UPDATE
    SET club_id = EXCLUDED.club_id,
        alias_name = EXCLUDED.alias_name,
        alias_text = EXCLUDED.alias_text;
  END IF;

  INSERT INTO public.match_club_events (
    match_id,
    actor_user_id,
    old_club_id,
    new_club_id,
    old_club_name_raw,
    new_club_name_raw,
    source
  )
  VALUES (
    p_match_id,
    v_uid,
    v_match.club_id,
    p_club_id,
    v_match.club_name_raw,
    v_raw,
    'admin'
  );

  INSERT INTO public.match_club_anchoring_events (
    user_id,
    match_id,
    club_id,
    source
  )
  VALUES (
    v_uid,
    p_match_id,
    p_club_id,
    'admin'
  );

  RETURN p_match_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_backfill_match_clubs(
  p_dry_run boolean DEFAULT true
)
RETURNS TABLE (
  match_id uuid,
  club_name_raw text,
  suggested_club_id uuid,
  suggested_club_name text,
  confidence int,
  action text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_is_admin boolean;
  v_row record;
  v_match record;
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

  FOR v_row IN
    WITH mbase AS (
      SELECT
        m.id AS match_id,
        NULLIF(TRIM(m.club_name_raw), '') AS club_name_raw,
        public.club_normalize_name(NULLIF(TRIM(m.club_name_raw), '')) AS club_name_norm
      FROM public.matches m
      WHERE m.club_id IS NULL
        AND NULLIF(TRIM(m.club_name_raw), '') IS NOT NULL
    ),
    ranked AS (
      SELECT
        mb.match_id,
        mb.club_name_raw,
        c.id AS suggested_club_id,
        c.name AS suggested_club_name,
        (
          CASE
            WHEN c.normalized_name = mb.club_name_norm THEN 100
            WHEN c.name ILIKE mb.club_name_raw THEN 90
            WHEN EXISTS (
              SELECT 1
              FROM public.club_aliases a
              WHERE a.club_id = c.id
                AND a.alias_normalized = mb.club_name_norm
            ) THEN 95
            WHEN EXISTS (
              SELECT 1
              FROM public.club_aliases a
              WHERE a.club_id = c.id
                AND a.alias_name ILIKE mb.club_name_raw
            ) THEN 85
            ELSE 0
          END
        )::int AS confidence,
        ROW_NUMBER() OVER (
          PARTITION BY mb.match_id
          ORDER BY
            CASE
              WHEN c.normalized_name = mb.club_name_norm THEN 1
              WHEN EXISTS (
                SELECT 1 FROM public.club_aliases a
                WHERE a.club_id = c.id
                  AND a.alias_normalized = mb.club_name_norm
              ) THEN 2
              WHEN c.name ILIKE mb.club_name_raw THEN 3
              ELSE 4
            END,
            c.updated_at DESC
        ) AS rn,
        COUNT(*) OVER (PARTITION BY mb.match_id) AS candidates_count
      FROM mbase mb
      JOIN public.clubs c
        ON c.deleted_at IS NULL
       AND c.archived_at IS NULL
       AND c.merged_into IS NULL
       AND (
         c.normalized_name = mb.club_name_norm
         OR c.name ILIKE mb.club_name_raw
         OR EXISTS (
           SELECT 1
           FROM public.club_aliases a
           WHERE a.club_id = c.id
             AND (
               a.alias_normalized = mb.club_name_norm
               OR a.alias_name ILIKE mb.club_name_raw
             )
         )
       )
    )
    SELECT
      r.match_id,
      r.club_name_raw,
      r.suggested_club_id,
      r.suggested_club_name,
      r.confidence
    FROM ranked r
    WHERE r.rn = 1
      AND r.candidates_count = 1
      AND r.confidence >= 90
  LOOP
    IF p_dry_run THEN
      match_id := v_row.match_id;
      club_name_raw := v_row.club_name_raw;
      suggested_club_id := v_row.suggested_club_id;
      suggested_club_name := v_row.suggested_club_name;
      confidence := v_row.confidence;
      action := 'would_update';
      RETURN NEXT;
    ELSE
      SELECT m.club_id, m.club_name_raw
        INTO v_match
      FROM public.matches m
      WHERE m.id = v_row.match_id
      FOR UPDATE;

      UPDATE public.matches
      SET club_id = v_row.suggested_club_id,
          club_name = v_row.suggested_club_name,
          club_name_raw = v_row.club_name_raw,
          updated_at = now()
      WHERE id = v_row.match_id;

      INSERT INTO public.match_club_events (
        match_id,
        actor_user_id,
        old_club_id,
        new_club_id,
        old_club_name_raw,
        new_club_name_raw,
        source
      )
      VALUES (
        v_row.match_id,
        v_uid,
        v_match.club_id,
        v_row.suggested_club_id,
        v_match.club_name_raw,
        v_row.club_name_raw,
        'backfill'
      );

      INSERT INTO public.match_club_anchoring_events (
        user_id,
        match_id,
        club_id,
        source
      )
      VALUES (
        v_uid,
        v_row.match_id,
        v_row.suggested_club_id,
        'backfill'
      );

      match_id := v_row.match_id;
      club_name_raw := v_row.club_name_raw;
      suggested_club_id := v_row.suggested_club_id;
      suggested_club_name := v_row.suggested_club_name;
      confidence := v_row.confidence;
      action := 'updated';
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- 10) Public minimal club profile
CREATE OR REPLACE FUNCTION public.club_get_public_profile(
  p_club_id uuid
)
RETURNS TABLE (
  id uuid,
  name text,
  city text,
  region_name text,
  region_code text,
  country_code text,
  courts_count int,
  surface_types jsonb,
  claimed boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.name,
    c.city,
    c.region_name,
    c.region_code,
    c.country_code,
    c.courts_count,
    COALESCE(c.surface_types, '{}'::jsonb),
    COALESCE(c.claimed, c.claim_status = 'claimed', false) AS claimed
  FROM public.clubs c
  WHERE c.id = p_club_id
    AND c.deleted_at IS NULL
    AND c.archived_at IS NULL
    AND c.merged_into IS NULL
  LIMIT 1;
$$;

-- 11) Owner dashboard stats enriched (still owner-only)
CREATE OR REPLACE FUNCTION public.club_get_dashboard_stats(
  p_club_id uuid DEFAULT NULL
)
RETURNS TABLE (
  club_id uuid,
  matches_last_7_days integer,
  matches_last_30_days integer,
  unique_players_last_30_days integer,
  matches_by_weekday jsonb,
  matches_by_hour jsonb,
  top_players jsonb,
  matches_by_category jsonb,
  courts_count integer,
  surface_types jsonb
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

  IF p_club_id IS NULL THEN
    SELECT c.id
      INTO v_club_id
    FROM public.clubs c
    WHERE c.deleted_at IS NULL
      AND c.claim_status = 'claimed'
      AND c.claimed_by = v_uid
    ORDER BY c.claimed_at DESC NULLS LAST, c.created_at DESC
    LIMIT 1;
  ELSE
    SELECT c.id
      INTO v_club_id
    FROM public.clubs c
    WHERE c.id = p_club_id
      AND c.deleted_at IS NULL
      AND c.claim_status = 'claimed'
      AND c.claimed_by = v_uid
    LIMIT 1;
  END IF;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'CLUB_NOT_FOUND';
  END IF;

  RETURN QUERY
  WITH club_matches_base AS (
    SELECT m.id, m.match_at
    FROM public.matches m
    WHERE m.deleted_at IS NULL
      AND m.club_id = v_club_id
      AND EXISTS (
        SELECT 1
        FROM public.match_results mr
        WHERE mr.match_id = m.id
      )
  ),
  club_matches_30 AS (
    SELECT *
    FROM club_matches_base
    WHERE match_at >= now() - interval '30 days'
  ),
  player_activity_30 AS (
    SELECT
      mp.player_id,
      p.display_name,
      p.category,
      COUNT(DISTINCT m30.id)::int AS matches_count
    FROM club_matches_30 m30
    JOIN public.match_players mp
      ON mp.match_id = m30.id
    JOIN public.players p
      ON p.id = mp.player_id
     AND p.deleted_at IS NULL
    GROUP BY mp.player_id, p.display_name, p.category
  ),
  weekday_counts AS (
    SELECT
      EXTRACT(DOW FROM m30.match_at)::int AS dow,
      COUNT(*)::int AS matches_count
    FROM club_matches_30 m30
    GROUP BY 1
  ),
  hour_counts AS (
    SELECT
      EXTRACT(HOUR FROM (m30.match_at AT TIME ZONE 'America/Argentina/Buenos_Aires'))::int AS hour_of_day,
      COUNT(*)::int AS matches_count
    FROM club_matches_30 m30
    GROUP BY 1
  ),
  category_counts AS (
    SELECT
      COALESCE(NULLIF(TRIM(pa.category), ''), 'Sin categoria') AS category_label,
      SUM(pa.matches_count)::int AS appearances
    FROM player_activity_30 pa
    GROUP BY 1
  )
  SELECT
    v_club_id AS club_id,
    (SELECT COUNT(*)::int FROM club_matches_base WHERE match_at >= now() - interval '7 days') AS matches_last_7_days,
    (SELECT COUNT(*)::int FROM club_matches_30) AS matches_last_30_days,
    (SELECT COUNT(DISTINCT mp.player_id)::int
     FROM club_matches_30 m30
     JOIN public.match_players mp ON mp.match_id = m30.id) AS unique_players_last_30_days,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'dow', d.dow,
          'label', d.label,
          'count', COALESCE(wc.matches_count, 0)
        )
        ORDER BY d.dow
      )
      FROM (
        VALUES
          (0, 'Dom'),
          (1, 'Lun'),
          (2, 'Mar'),
          (3, 'Mie'),
          (4, 'Jue'),
          (5, 'Vie'),
          (6, 'Sab')
      ) AS d(dow, label)
      LEFT JOIN weekday_counts wc ON wc.dow = d.dow
    ), '[]'::jsonb) AS matches_by_weekday,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'hour', h.hour_of_day,
          'count', COALESCE(hc.matches_count, 0)
        )
        ORDER BY h.hour_of_day
      )
      FROM generate_series(0, 23) AS h(hour_of_day)
      LEFT JOIN hour_counts hc ON hc.hour_of_day = h.hour_of_day
    ), '[]'::jsonb) AS matches_by_hour,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'player_id', t.player_id,
          'display_name', t.display_name,
          'matches_count', t.matches_count
        )
        ORDER BY t.matches_count DESC, t.display_name ASC
      )
      FROM (
        SELECT pa.player_id, pa.display_name, pa.matches_count
        FROM player_activity_30 pa
        ORDER BY pa.matches_count DESC, pa.display_name ASC
        LIMIT 10
      ) t
    ), '[]'::jsonb) AS top_players,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'category', cc.category_label,
          'count', cc.appearances
        )
        ORDER BY cc.appearances DESC, cc.category_label ASC
      )
      FROM category_counts cc
    ), '[]'::jsonb) AS matches_by_category,
    COALESCE((SELECT c.courts_count FROM public.clubs c WHERE c.id = v_club_id), 0) AS courts_count,
    COALESCE((SELECT c.surface_types FROM public.clubs c WHERE c.id = v_club_id), '{}'::jsonb) AS surface_types;
END;
$$;

-- 12) Adoption telemetry RPCs
CREATE OR REPLACE FUNCTION public.admin_get_club_anchoring_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_is_admin boolean;
  v_total int := 0;
  v_anchored int := 0;
  v_rate numeric := 0;
  v_top_city jsonb := '{}'::jsonb;
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

  SELECT COUNT(*)::int,
         COUNT(*) FILTER (WHERE m.club_id IS NOT NULL)::int
    INTO v_total, v_anchored
  FROM public.matches m
  WHERE m.deleted_at IS NULL
    AND m.created_at >= now() - interval '30 days';

  v_rate := CASE WHEN v_total > 0 THEN ROUND((v_anchored::numeric / v_total::numeric) * 100.0, 2) ELSE 0 END;

  SELECT COALESCE(
    jsonb_build_object(
      'city_id', x.city_id,
      'city', x.city,
      'region_code', x.region_code,
      'unanchored_matches', x.unanchored_matches
    ),
    '{}'::jsonb
  )
  INTO v_top_city
  FROM (
    SELECT
      c.city_id,
      c.city,
      c.region_code,
      COUNT(*)::int AS unanchored_matches
    FROM public.matches m
    LEFT JOIN public.clubs c
      ON c.id = m.club_id
    WHERE m.deleted_at IS NULL
      AND m.created_at >= now() - interval '30 days'
      AND m.club_id IS NULL
    GROUP BY c.city_id, c.city, c.region_code
    ORDER BY unanchored_matches DESC
    LIMIT 1
  ) x;

  RETURN jsonb_build_object(
    'anchoring_rate_last_30d', v_rate,
    'matches_total_last_30d', v_total,
    'matches_anchored_last_30d', v_anchored,
    'top_unanchored_city', v_top_city
  );
END;
$$;

-- 13) Compatibility wrapper for 2-arg merge API
CREATE OR REPLACE FUNCTION public.admin_merge_clubs(
  p_from uuid,
  p_into uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.admin_merge_clubs(p_from, p_into, NULL);
END;
$$;

-- 14) Grants
REVOKE ALL ON FUNCTION public.club_search(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_search(text, int) TO authenticated;

REVOKE ALL ON FUNCTION public.club_create_candidate(text, text, text, text, text, text, text, int, jsonb, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_create_candidate(text, text, text, text, text, text, text, int, jsonb, text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.club_register_alias(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_register_alias(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.club_get_public_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_get_public_profile(uuid) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.club_get_dashboard_stats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_get_dashboard_stats(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_get_club_anchoring_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_club_anchoring_stats() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_merge_clubs(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_merge_clubs(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_backfill_match_clubs(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_backfill_match_clubs(boolean) TO authenticated;

NOTIFY pgrst, 'reload schema';

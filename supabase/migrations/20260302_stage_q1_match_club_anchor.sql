-- STAGE Q1: MATCH CLUB ANCHOR
-- Anchor matches to canonical clubs and add secure player/admin flows.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1) Matches hardening
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS club_name_raw text NULL;

CREATE INDEX IF NOT EXISTS idx_matches_club_id
  ON public.matches(club_id);

CREATE INDEX IF NOT EXISTS idx_matches_match_at_club
  ON public.matches(club_id, match_at DESC);

-- 2) Clubs hardening (claim + responsible data + surfaces)
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS claimed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS responsible_first_name text NULL,
  ADD COLUMN IF NOT EXISTS responsible_last_name text NULL,
  ADD COLUMN IF NOT EXISTS responsible_phone text NULL,
  ADD COLUMN IF NOT EXISTS responsible_email text NULL,
  ADD COLUMN IF NOT EXISTS surface_types jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.clubs
SET claimed = (claim_status = 'claimed')
WHERE claimed IS DISTINCT FROM (claim_status = 'claimed');

-- 3) Match-club audit events
CREATE TABLE IF NOT EXISTS public.match_club_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  actor_user_id uuid NULL REFERENCES auth.users(id),
  old_club_id uuid NULL REFERENCES public.clubs(id),
  new_club_id uuid NULL REFERENCES public.clubs(id),
  old_club_name_raw text NULL,
  new_club_name_raw text NULL,
  source text NOT NULL CHECK (source IN ('player', 'admin', 'backfill')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_club_events_match_id
  ON public.match_club_events(match_id);

CREATE INDEX IF NOT EXISTS idx_match_club_events_created_at
  ON public.match_club_events(created_at DESC);

-- 4) Club claim audit log
CREATE TABLE IF NOT EXISTS public.club_claim_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  claimed_by uuid NOT NULL REFERENCES auth.users(id),
  claimed_at timestamptz NOT NULL DEFAULT now(),
  method text NOT NULL,
  note text NULL
);

CREATE INDEX IF NOT EXISTS idx_club_claim_log_club_id
  ON public.club_claim_log(club_id);

CREATE INDEX IF NOT EXISTS idx_club_claim_log_claimed_at
  ON public.club_claim_log(claimed_at DESC);

-- 5) Policies for audit tables (admin read)
ALTER TABLE public.match_club_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_claim_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "match_club_events_admin_select" ON public.match_club_events;
CREATE POLICY "match_club_events_admin_select"
  ON public.match_club_events
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

DROP POLICY IF EXISTS "club_claim_log_admin_select" ON public.club_claim_log;
CREATE POLICY "club_claim_log_admin_select"
  ON public.club_claim_log
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

-- 6) Player search clubs (canonical + aliases)
CREATE OR REPLACE FUNCTION public.player_search_clubs(
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
DECLARE
  v_uid uuid;
  v_q text;
  v_qn text;
  v_me record;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  v_q := COALESCE(NULLIF(TRIM(p_query), ''), '');
  v_qn := public.club_normalize_name(v_q);

  SELECT p.country_code, p.region_code, p.city_id, p.city_normalized
    INTO v_me
  FROM public.players p
  WHERE p.user_id = v_uid
    AND p.deleted_at IS NULL
  LIMIT 1;

  RETURN QUERY
  WITH candidates AS (
    SELECT
      c.id,
      c.name,
      c.city,
      c.city_id,
      c.region_code,
      c.region_name,
      c.country_code,
      COALESCE(c.claimed, c.claim_status = 'claimed', false) AS claimed,
      c.normalized_name,
      EXISTS (
        SELECT 1
        FROM public.club_aliases a
        WHERE a.club_id = c.id
          AND (
            a.alias_normalized = v_qn
            OR (v_qn <> '' AND a.alias_normalized LIKE v_qn || '%')
            OR (v_q <> '' AND a.alias_name ILIKE '%' || v_q || '%')
          )
      ) AS alias_match
    FROM public.clubs c
    WHERE c.deleted_at IS NULL
      AND c.archived_at IS NULL
      AND c.merged_into IS NULL
      AND (
        v_q = ''
        OR c.name ILIKE '%' || v_q || '%'
        OR c.normalized_name ILIKE '%' || v_qn || '%'
        OR EXISTS (
          SELECT 1
          FROM public.club_aliases a
          WHERE a.club_id = c.id
            AND (
              a.alias_normalized = v_qn
              OR (v_qn <> '' AND a.alias_normalized LIKE v_qn || '%')
              OR (v_q <> '' AND a.alias_name ILIKE '%' || v_q || '%')
            )
        )
      )
  )
  SELECT
    c.id,
    c.name,
    c.city,
    c.city_id,
    c.region_code,
    c.region_name,
    c.country_code,
    c.claimed,
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
        WHEN v_q <> '' AND c.alias_match THEN 40
        WHEN v_q <> '' AND c.normalized_name = v_qn THEN 30
        WHEN v_q <> '' AND c.name ILIKE v_q || '%' THEN 20
        WHEN v_q <> '' AND c.name ILIKE '%' || v_q || '%' THEN 10
        ELSE 0
      END
    )::int AS score
  FROM candidates c
  ORDER BY score DESC, c.name ASC
  LIMIT GREATEST(COALESCE(p_limit, 20), 1);
END;
$$;

-- 7) Player create club candidate
CREATE OR REPLACE FUNCTION public.player_create_club_candidate(
  p_name text,
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

  IF v_club_id IS NULL THEN
    INSERT INTO public.clubs (
      name,
      normalized_name,
      country_code,
      region_code,
      region_name,
      city,
      city_id,
      created_by,
      claim_status,
      claimed,
      claimed_by,
      claimed_at,
      address,
      courts_count,
      surface_types,
      responsible_first_name,
      responsible_last_name,
      responsible_phone,
      responsible_email
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
      'unclaimed',
      false,
      NULL,
      NULL,
      NULLIF(TRIM(p_address), ''),
      p_courts_count,
      COALESCE(p_surface_types, '{}'::jsonb),
      NULLIF(TRIM(p_responsible_first_name), ''),
      NULLIF(TRIM(p_responsible_last_name), ''),
      NULLIF(TRIM(p_responsible_phone), ''),
      NULLIF(LOWER(TRIM(p_responsible_email)), '')
    )
    RETURNING id INTO v_club_id;
  END IF;

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
    v_club_id,
    v_name,
    v_normalized,
    v_city_id,
    v_region_code,
    v_country,
    v_uid
  )
  ON CONFLICT (country_code, region_code_key, city_id_key, alias_normalized)
  DO UPDATE
  SET club_id = EXCLUDED.club_id;

  RETURN v_club_id;
END;
$$;

-- 8) Player set match club (participant check)
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
  v_club_name text;
  v_match record;
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

  SELECT c.name INTO v_club_name
  FROM public.clubs c
  WHERE c.id = p_club_id
    AND c.deleted_at IS NULL
    AND c.archived_at IS NULL
    AND c.merged_into IS NULL;

  IF v_club_name IS NULL THEN
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

  UPDATE public.matches
  SET club_id = p_club_id,
      club_name = v_club_name,
      club_name_raw = NULLIF(TRIM(p_club_name_raw), ''),
      updated_at = now()
  WHERE id = p_match_id;

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
    NULLIF(TRIM(p_club_name_raw), ''),
    'player'
  );

  RETURN p_match_id;
END;
$$;

-- 9) Player claim club with responsible data check
CREATE OR REPLACE FUNCTION public.player_claim_club(
  p_club_id uuid,
  p_phone text,
  p_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_club record;
  v_phone text;
  v_email text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  v_phone := NULLIF(TRIM(p_phone), '');
  v_email := NULLIF(LOWER(TRIM(p_email)), '');

  IF v_phone IS NULL OR v_email IS NULL THEN
    RAISE EXCEPTION 'INVALID_REQUESTER_DATA';
  END IF;

  SELECT c.id,
         c.claimed,
         c.claim_status,
         NULLIF(TRIM(c.responsible_phone), '') AS responsible_phone,
         NULLIF(LOWER(TRIM(c.responsible_email)), '') AS responsible_email
    INTO v_club
  FROM public.clubs c
  WHERE c.id = p_club_id
    AND c.deleted_at IS NULL
    AND c.archived_at IS NULL
    AND c.merged_into IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CLUB_NOT_FOUND';
  END IF;

  IF COALESCE(v_club.claimed, false) OR v_club.claim_status = 'claimed' THEN
    RAISE EXCEPTION 'CLUB_ALREADY_CLAIMED';
  END IF;

  IF v_club.responsible_phone IS NULL
     OR v_club.responsible_email IS NULL
     OR v_club.responsible_phone <> v_phone
     OR v_club.responsible_email <> v_email THEN
    RAISE EXCEPTION 'INVALID_REQUESTER_DATA';
  END IF;

  UPDATE public.clubs
  SET claimed = true,
      claimed_by = v_uid,
      claimed_at = now(),
      claim_status = 'claimed',
      updated_at = now()
  WHERE id = p_club_id;

  INSERT INTO public.club_claim_log (
    club_id,
    claimed_by,
    claimed_at,
    method,
    note
  )
  VALUES (
    p_club_id,
    v_uid,
    now(),
    'responsible_contact_match',
    'Q1 self-claim by responsible phone/email'
  );

  RETURN p_club_id;
END;
$$;

-- 10) Admin set match club (for /admin/matches/unlinked)
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
  v_club_name text;
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

  SELECT c.name INTO v_club_name
  FROM public.clubs c
  WHERE c.id = p_club_id
    AND c.deleted_at IS NULL
    AND c.archived_at IS NULL
    AND c.merged_into IS NULL;

  IF v_club_name IS NULL THEN
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

  UPDATE public.matches
  SET club_id = p_club_id,
      club_name = v_club_name,
      club_name_raw = NULLIF(TRIM(p_club_name_raw), ''),
      updated_at = now()
  WHERE id = p_match_id;

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
    NULLIF(TRIM(p_club_name_raw), ''),
    'admin'
  );

  RETURN p_match_id;
END;
$$;

-- 11) Admin backfill for unlinked matches
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
      PERFORM public.admin_set_match_club(v_row.match_id, v_row.suggested_club_id, v_row.club_name_raw);

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

-- 12) Keep existing match create/update RPCs aligned with club_name_raw
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

  v_raw_club_name := NULLIF(TRIM(p_club_name), '');

  IF p_club_id IS NOT NULL THEN
    SELECT c.name INTO v_final_club_name
    FROM public.clubs c
    WHERE c.id = p_club_id
      AND c.deleted_at IS NULL
      AND c.archived_at IS NULL
      AND c.merged_into IS NULL;

    IF v_final_club_name IS NULL THEN
      RAISE EXCEPTION 'CLUB_NOT_FOUND';
    END IF;
  ELSE
    v_final_club_name := v_raw_club_name;
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

  INSERT INTO public.matches (match_at, club_name, club_name_raw, club_id, status, notes, max_players, created_by)
  VALUES (
    p_match_at,
    v_final_club_name,
    CASE WHEN p_club_id IS NULL THEN v_raw_club_name ELSE v_raw_club_name END,
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
  v_raw_club_name text;
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

  v_raw_club_name := NULLIF(TRIM(p_club_name), '');

  IF p_club_id IS NOT NULL THEN
    SELECT c.name INTO v_final_club_name
    FROM public.clubs c
    WHERE c.id = p_club_id
      AND c.deleted_at IS NULL
      AND c.archived_at IS NULL
      AND c.merged_into IS NULL;

    IF v_final_club_name IS NULL THEN
      RAISE EXCEPTION 'CLUB_NOT_FOUND';
    END IF;
  ELSE
    v_final_club_name := v_raw_club_name;
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
    club_name_raw = v_raw_club_name,
    club_id = p_club_id,
    notes = p_notes,
    status = v_new_status,
    updated_at = now()
  WHERE id = p_match_id;

  RETURN p_match_id;
END;
$$;

-- 13) Grants
REVOKE ALL ON FUNCTION public.player_search_clubs(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.player_search_clubs(text, int) TO authenticated;

REVOKE ALL ON FUNCTION public.player_create_club_candidate(text, text, text, text, text, text, text, int, jsonb, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.player_create_club_candidate(text, text, text, text, text, text, text, int, jsonb, text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.player_set_match_club(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.player_set_match_club(uuid, uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.player_claim_club(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.player_claim_club(uuid, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_set_match_club(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_match_club(uuid, uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_backfill_match_clubs(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_backfill_match_clubs(boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.player_create_match_with_players(timestamptz, text, uuid, uuid, uuid, text, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.player_create_match_with_players(timestamptz, text, uuid, uuid, uuid, text, integer, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.player_update_match(uuid, timestamptz, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.player_update_match(uuid, timestamptz, text, text, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

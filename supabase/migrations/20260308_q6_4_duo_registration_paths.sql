-- Q6.4: registration with optional teammate (solo or duo)
-- Adds teammate support for tournament/league registrations and propagates
-- pending/confirmed visibility to both players.

BEGIN;

ALTER TABLE public.tournament_registrations
  ADD COLUMN IF NOT EXISTS teammate_player_id uuid NULL REFERENCES public.players(id) ON DELETE SET NULL;

ALTER TABLE public.league_registrations
  ADD COLUMN IF NOT EXISTS teammate_player_id uuid NULL REFERENCES public.players(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_tournament_registrations_teammate_diff'
  ) THEN
    ALTER TABLE public.tournament_registrations
      ADD CONSTRAINT chk_tournament_registrations_teammate_diff
      CHECK (teammate_player_id IS NULL OR teammate_player_id <> player_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_league_registrations_teammate_diff'
  ) THEN
    ALTER TABLE public.league_registrations
      ADD CONSTRAINT chk_league_registrations_teammate_diff
      CHECK (teammate_player_id IS NULL OR teammate_player_id <> player_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tournament_registrations_teammate
  ON public.tournament_registrations(teammate_player_id);

CREATE INDEX IF NOT EXISTS idx_league_registrations_teammate
  ON public.league_registrations(teammate_player_id);

DROP POLICY IF EXISTS tournament_registrations_select_player ON public.tournament_registrations;
CREATE POLICY tournament_registrations_select_player
  ON public.tournament_registrations FOR SELECT TO authenticated
  USING (
    player_id IN (
      SELECT p.id FROM public.players p WHERE p.user_id = auth.uid()
    )
    OR teammate_player_id IN (
      SELECT p.id FROM public.players p WHERE p.user_id = auth.uid()
    )
    OR public.q6_can_manage_club(
      (SELECT ct.club_id FROM public.club_tournaments ct WHERE ct.id = tournament_id),
      auth.uid()
    )
  );

DROP POLICY IF EXISTS league_registrations_select_player ON public.league_registrations;
CREATE POLICY league_registrations_select_player
  ON public.league_registrations FOR SELECT TO authenticated
  USING (
    player_id IN (
      SELECT p.id FROM public.players p WHERE p.user_id = auth.uid()
    )
    OR teammate_player_id IN (
      SELECT p.id FROM public.players p WHERE p.user_id = auth.uid()
    )
    OR public.q6_can_manage_club(
      (SELECT cl.club_id FROM public.club_leagues cl WHERE cl.id = league_id),
      auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.player_request_tournament_registration(
  p_tournament_id uuid,
  p_teammate_player_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_player_id uuid;
  v_player_label text;
  v_tournament_status text;
  v_club_id uuid;
  v_tournament_name text;
  v_reg_id uuid;
  v_requested_at timestamptz;
  v_teammate_uid uuid;
  v_teammate_label text;
  v_message text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT
    p.id,
    COALESCE(
      NULLIF(TRIM(p.display_name), ''),
      NULLIF(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''),
      'Un jugador'
    )
  INTO v_player_id, v_player_label
  FROM public.players p
  WHERE p.user_id = v_uid
    AND p.deleted_at IS NULL
  LIMIT 1;

  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'PLAYER_NOT_FOUND';
  END IF;

  SELECT ct.status, ct.club_id, ct.name
    INTO v_tournament_status, v_club_id, v_tournament_name
  FROM public.club_tournaments ct
  WHERE ct.id = p_tournament_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TOURNAMENT_NOT_FOUND';
  END IF;
  IF v_tournament_status <> 'active' THEN
    RAISE EXCEPTION 'TOURNAMENT_NOT_OPEN';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.tournament_registrations tr
    WHERE tr.tournament_id = p_tournament_id
      AND tr.status IN ('pending', 'confirmed')
      AND (tr.player_id = v_player_id OR tr.teammate_player_id = v_player_id)
  ) THEN
    RAISE EXCEPTION 'PLAYER_ALREADY_REGISTERED';
  END IF;

  IF p_teammate_player_id IS NOT NULL THEN
    IF p_teammate_player_id = v_player_id THEN
      RAISE EXCEPTION 'INVALID_TEAM_PLAYERS';
    END IF;

    SELECT
      p.user_id,
      COALESCE(
        NULLIF(TRIM(p.display_name), ''),
        NULLIF(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''),
        'Tu companero'
      )
    INTO v_teammate_uid, v_teammate_label
    FROM public.players p
    WHERE p.id = p_teammate_player_id
      AND p.deleted_at IS NULL
      AND p.status = 'active';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'TEAMMATE_NOT_FOUND';
    END IF;

    IF v_teammate_uid IS NULL THEN
      RAISE EXCEPTION 'TEAMMATE_NOT_ELIGIBLE';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.tournament_registrations tr
      WHERE tr.tournament_id = p_tournament_id
        AND tr.status IN ('pending', 'confirmed')
        AND (tr.player_id = p_teammate_player_id OR tr.teammate_player_id = p_teammate_player_id)
    ) THEN
      RAISE EXCEPTION 'TEAMMATE_ALREADY_REGISTERED';
    END IF;
  END IF;

  INSERT INTO public.tournament_registrations (tournament_id, player_id, teammate_player_id)
  VALUES (p_tournament_id, v_player_id, p_teammate_player_id)
  ON CONFLICT (tournament_id, player_id) DO UPDATE
    SET status = CASE
      WHEN tournament_registrations.status = 'rejected' THEN 'pending'
      ELSE tournament_registrations.status
    END,
    requested_at = CASE
      WHEN tournament_registrations.status = 'rejected' THEN now()
      ELSE tournament_registrations.requested_at
    END,
    resolved_at = CASE
      WHEN tournament_registrations.status = 'rejected' THEN NULL
      ELSE tournament_registrations.resolved_at
    END,
    resolved_by = CASE
      WHEN tournament_registrations.status = 'rejected' THEN NULL
      ELSE tournament_registrations.resolved_by
    END,
    teammate_player_id = CASE
      WHEN tournament_registrations.status = 'rejected' THEN EXCLUDED.teammate_player_id
      ELSE tournament_registrations.teammate_player_id
    END
  RETURNING id, requested_at
  INTO v_reg_id, v_requested_at;

  v_message := CASE
    WHEN p_teammate_player_id IS NULL THEN
      v_player_label || ' solicito inscribirse al torneo "' || v_tournament_name || '".'
    ELSE
      v_player_label || ' solicito inscribirse con ' || COALESCE(v_teammate_label, 'companero') ||
      ' al torneo "' || v_tournament_name || '".'
  END;

  INSERT INTO public.notifications (club_id, type, entity_id, payload, priority, dedupe_key)
  VALUES (
    v_club_id,
    'tournament_registration_requested',
    p_tournament_id,
    jsonb_build_object(
      'schema_version', 1,
      'title', 'Nueva inscripcion solicitada',
      'message', v_message,
      'cta_label', 'Revisar solicitudes',
      'link', '/club/dashboard/tournaments/' || p_tournament_id::text || '#registrations'
    ),
    2,
    'tournament_registration_requested:' || v_reg_id::text || ':' || to_char(v_requested_at, 'YYYYMMDDHH24MISS')
  )
  ON CONFLICT DO NOTHING;

  IF p_teammate_player_id IS NOT NULL AND v_teammate_uid IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, entity_id, payload, priority, dedupe_key)
    VALUES (
      v_teammate_uid,
      'tournament_registration_requested',
      p_tournament_id,
      jsonb_build_object(
        'schema_version', 1,
        'title', 'Te sumaron a una inscripcion',
        'message', v_player_label || ' te sumo como companero para el torneo "' || v_tournament_name || '". Queda pendiente de aprobacion del club.',
        'cta_label', 'Ver estado',
        'link', '/player/events'
      ),
      1,
      'tournament_registration_teammate_pending:' || v_reg_id::text || ':' || v_teammate_uid::text
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_reg_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.player_request_tournament_registration(
  p_tournament_id uuid
)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.player_request_tournament_registration($1, NULL::uuid);
$$;

CREATE OR REPLACE FUNCTION public.player_request_league_registration(
  p_league_id uuid,
  p_teammate_player_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_player_id uuid;
  v_player_label text;
  v_league_status text;
  v_club_id uuid;
  v_league_name text;
  v_reg_id uuid;
  v_requested_at timestamptz;
  v_teammate_uid uuid;
  v_teammate_label text;
  v_message text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT
    p.id,
    COALESCE(
      NULLIF(TRIM(p.display_name), ''),
      NULLIF(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''),
      'Un jugador'
    )
  INTO v_player_id, v_player_label
  FROM public.players p
  WHERE p.user_id = v_uid
    AND p.deleted_at IS NULL
  LIMIT 1;

  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'PLAYER_NOT_FOUND';
  END IF;

  SELECT cl.status, cl.club_id, cl.name
    INTO v_league_status, v_club_id, v_league_name
  FROM public.club_leagues cl
  WHERE cl.id = p_league_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LEAGUE_NOT_FOUND';
  END IF;
  IF v_league_status <> 'active' THEN
    RAISE EXCEPTION 'LEAGUE_NOT_OPEN';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.league_registrations lr
    WHERE lr.league_id = p_league_id
      AND lr.status IN ('pending', 'confirmed')
      AND (lr.player_id = v_player_id OR lr.teammate_player_id = v_player_id)
  ) THEN
    RAISE EXCEPTION 'PLAYER_ALREADY_REGISTERED';
  END IF;

  IF p_teammate_player_id IS NOT NULL THEN
    IF p_teammate_player_id = v_player_id THEN
      RAISE EXCEPTION 'INVALID_TEAM_PLAYERS';
    END IF;

    SELECT
      p.user_id,
      COALESCE(
        NULLIF(TRIM(p.display_name), ''),
        NULLIF(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''),
        'Tu companero'
      )
    INTO v_teammate_uid, v_teammate_label
    FROM public.players p
    WHERE p.id = p_teammate_player_id
      AND p.deleted_at IS NULL
      AND p.status = 'active';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'TEAMMATE_NOT_FOUND';
    END IF;

    IF v_teammate_uid IS NULL THEN
      RAISE EXCEPTION 'TEAMMATE_NOT_ELIGIBLE';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.league_registrations lr
      WHERE lr.league_id = p_league_id
        AND lr.status IN ('pending', 'confirmed')
        AND (lr.player_id = p_teammate_player_id OR lr.teammate_player_id = p_teammate_player_id)
    ) THEN
      RAISE EXCEPTION 'TEAMMATE_ALREADY_REGISTERED';
    END IF;
  END IF;

  INSERT INTO public.league_registrations (league_id, player_id, teammate_player_id)
  VALUES (p_league_id, v_player_id, p_teammate_player_id)
  ON CONFLICT (league_id, player_id) DO UPDATE
    SET status = CASE
      WHEN league_registrations.status = 'rejected' THEN 'pending'
      ELSE league_registrations.status
    END,
    requested_at = CASE
      WHEN league_registrations.status = 'rejected' THEN now()
      ELSE league_registrations.requested_at
    END,
    resolved_at = CASE
      WHEN league_registrations.status = 'rejected' THEN NULL
      ELSE league_registrations.resolved_at
    END,
    resolved_by = CASE
      WHEN league_registrations.status = 'rejected' THEN NULL
      ELSE league_registrations.resolved_by
    END,
    teammate_player_id = CASE
      WHEN league_registrations.status = 'rejected' THEN EXCLUDED.teammate_player_id
      ELSE league_registrations.teammate_player_id
    END
  RETURNING id, requested_at
  INTO v_reg_id, v_requested_at;

  v_message := CASE
    WHEN p_teammate_player_id IS NULL THEN
      v_player_label || ' solicito inscribirse a la liga "' || v_league_name || '".'
    ELSE
      v_player_label || ' solicito inscribirse con ' || COALESCE(v_teammate_label, 'companero') ||
      ' a la liga "' || v_league_name || '".'
  END;

  INSERT INTO public.notifications (club_id, type, entity_id, payload, priority, dedupe_key)
  VALUES (
    v_club_id,
    'league_registration_requested',
    p_league_id,
    jsonb_build_object(
      'schema_version', 1,
      'title', 'Nueva inscripcion solicitada',
      'message', v_message,
      'cta_label', 'Revisar solicitudes',
      'link', '/club/dashboard/leagues/' || p_league_id::text || '#registrations'
    ),
    2,
    'league_registration_requested:' || v_reg_id::text || ':' || to_char(v_requested_at, 'YYYYMMDDHH24MISS')
  )
  ON CONFLICT DO NOTHING;

  IF p_teammate_player_id IS NOT NULL AND v_teammate_uid IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, entity_id, payload, priority, dedupe_key)
    VALUES (
      v_teammate_uid,
      'league_registration_requested',
      p_league_id,
      jsonb_build_object(
        'schema_version', 1,
        'title', 'Te sumaron a una inscripcion',
        'message', v_player_label || ' te sumo como companero para la liga "' || v_league_name || '". Queda pendiente de aprobacion del club.',
        'cta_label', 'Ver estado',
        'link', '/player/events'
      ),
      1,
      'league_registration_teammate_pending:' || v_reg_id::text || ':' || v_teammate_uid::text
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_reg_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.player_request_league_registration(
  p_league_id uuid
)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.player_request_league_registration($1, NULL::uuid);
$$;

CREATE OR REPLACE FUNCTION public.club_resolve_tournament_registration(
  p_registration_id uuid,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_club_id uuid;
  v_tournament_id uuid;
  v_tournament_name text;
  v_player_id uuid;
  v_teammate_player_id uuid;
  v_notify_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF p_status NOT IN ('confirmed', 'rejected') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  SELECT tr.player_id, tr.teammate_player_id, ct.club_id, ct.id, ct.name
    INTO v_player_id, v_teammate_player_id, v_club_id, v_tournament_id, v_tournament_name
  FROM public.tournament_registrations tr
  JOIN public.club_tournaments ct ON ct.id = tr.tournament_id
  WHERE tr.id = p_registration_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REGISTRATION_NOT_FOUND';
  END IF;

  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  UPDATE public.tournament_registrations
  SET status = p_status,
      resolved_at = now(),
      resolved_by = v_uid
  WHERE id = p_registration_id;

  IF p_status = 'confirmed' THEN
    FOR v_notify_uid IN
      SELECT DISTINCT p.user_id
      FROM public.players p
      WHERE p.id IN (v_player_id, v_teammate_player_id)
        AND p.user_id IS NOT NULL
    LOOP
      INSERT INTO public.notifications (user_id, type, entity_id, payload, priority, dedupe_key)
      VALUES (
        v_notify_uid,
        'tournament_registration_confirmed',
        v_tournament_id,
        jsonb_build_object(
          'schema_version', 1,
          'title', 'Inscripcion confirmada',
          'message', 'Tu inscripcion al torneo "' || v_tournament_name || '" fue confirmada.',
          'cta_label', 'Ver torneo',
          'link', '/player/events'
        ),
        2,
        'tournament_registration_confirmed:' || p_registration_id::text || ':' || v_notify_uid::text
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.club_resolve_league_registration(
  p_registration_id uuid,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_club_id uuid;
  v_league_id uuid;
  v_league_name text;
  v_player_id uuid;
  v_teammate_player_id uuid;
  v_notify_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF p_status NOT IN ('confirmed', 'rejected') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  SELECT lr.player_id, lr.teammate_player_id, cl.club_id, cl.id, cl.name
    INTO v_player_id, v_teammate_player_id, v_club_id, v_league_id, v_league_name
  FROM public.league_registrations lr
  JOIN public.club_leagues cl ON cl.id = lr.league_id
  WHERE lr.id = p_registration_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REGISTRATION_NOT_FOUND';
  END IF;

  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  UPDATE public.league_registrations
  SET status = p_status,
      resolved_at = now(),
      resolved_by = v_uid
  WHERE id = p_registration_id;

  IF p_status = 'confirmed' THEN
    FOR v_notify_uid IN
      SELECT DISTINCT p.user_id
      FROM public.players p
      WHERE p.id IN (v_player_id, v_teammate_player_id)
        AND p.user_id IS NOT NULL
    LOOP
      INSERT INTO public.notifications (user_id, type, entity_id, payload, priority, dedupe_key)
      VALUES (
        v_notify_uid,
        'league_registration_confirmed',
        v_league_id,
        jsonb_build_object(
          'schema_version', 1,
          'title', 'Inscripcion confirmada',
          'message', 'Tu inscripcion a la liga "' || v_league_name || '" fue confirmada.',
          'cta_label', 'Ver liga',
          'link', '/player/events'
        ),
        2,
        'league_registration_confirmed:' || p_registration_id::text || ':' || v_notify_uid::text
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.player_get_open_events();

CREATE OR REPLACE FUNCTION public.player_get_open_events()
RETURNS TABLE (
  entity_type text,
  entity_id uuid,
  entity_name text,
  season_label text,
  club_id uuid,
  club_name text,
  start_date date,
  end_date date,
  registration_id uuid,
  registration_status text,
  registration_role text,
  registration_partner_player_id uuid,
  registration_partner_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_player_id uuid;
  v_city_id text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT p.id, p.city_id
    INTO v_player_id, v_city_id
  FROM public.players p
  WHERE p.user_id = v_uid
    AND p.deleted_at IS NULL
  LIMIT 1;

  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'PLAYER_NOT_FOUND';
  END IF;

  RETURN QUERY
  SELECT
    'tournament'::text,
    ct.id,
    ct.name,
    ct.season_label,
    ct.club_id,
    c.name,
    ct.start_date,
    ct.end_date,
    tr.id,
    tr.status,
    CASE
      WHEN tr.id IS NULL THEN NULL
      WHEN tr.player_id = v_player_id THEN 'requester'
      ELSE 'teammate'
    END,
    CASE
      WHEN tr.id IS NULL THEN NULL
      WHEN tr.player_id = v_player_id THEN tr.teammate_player_id
      ELSE tr.player_id
    END,
    CASE
      WHEN tr.id IS NULL THEN NULL
      WHEN tr.player_id = v_player_id THEN p_tm.display_name
      ELSE p_req.display_name
    END
  FROM public.club_tournaments ct
  JOIN public.clubs c ON c.id = ct.club_id AND c.deleted_at IS NULL
  LEFT JOIN LATERAL (
    SELECT tr2.*
    FROM public.tournament_registrations tr2
    WHERE tr2.tournament_id = ct.id
      AND (tr2.player_id = v_player_id OR tr2.teammate_player_id = v_player_id)
    ORDER BY
      CASE tr2.status WHEN 'confirmed' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,
      tr2.requested_at DESC
    LIMIT 1
  ) tr ON TRUE
  LEFT JOIN public.players p_req ON p_req.id = tr.player_id
  LEFT JOIN public.players p_tm ON p_tm.id = tr.teammate_player_id
  WHERE ct.status = 'active'
    AND (
      array_length(ct.target_city_ids, 1) IS NULL
      OR ct.target_city_ids = '{}'
      OR (v_city_id IS NOT NULL AND v_city_id = ANY(ct.target_city_ids))
    )
  ORDER BY ct.start_date ASC NULLS LAST, ct.created_at DESC;

  RETURN QUERY
  SELECT
    'league'::text,
    cl.id,
    cl.name,
    cl.season_label,
    cl.club_id,
    c.name,
    cl.start_date,
    cl.end_date,
    lr.id,
    lr.status,
    CASE
      WHEN lr.id IS NULL THEN NULL
      WHEN lr.player_id = v_player_id THEN 'requester'
      ELSE 'teammate'
    END,
    CASE
      WHEN lr.id IS NULL THEN NULL
      WHEN lr.player_id = v_player_id THEN lr.teammate_player_id
      ELSE lr.player_id
    END,
    CASE
      WHEN lr.id IS NULL THEN NULL
      WHEN lr.player_id = v_player_id THEN p_tm.display_name
      ELSE p_req.display_name
    END
  FROM public.club_leagues cl
  JOIN public.clubs c ON c.id = cl.club_id AND c.deleted_at IS NULL
  LEFT JOIN LATERAL (
    SELECT lr2.*
    FROM public.league_registrations lr2
    WHERE lr2.league_id = cl.id
      AND (lr2.player_id = v_player_id OR lr2.teammate_player_id = v_player_id)
    ORDER BY
      CASE lr2.status WHEN 'confirmed' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,
      lr2.requested_at DESC
    LIMIT 1
  ) lr ON TRUE
  LEFT JOIN public.players p_req ON p_req.id = lr.player_id
  LEFT JOIN public.players p_tm ON p_tm.id = lr.teammate_player_id
  WHERE cl.status = 'active'
    AND (
      array_length(cl.target_city_ids, 1) IS NULL
      OR cl.target_city_ids = '{}'
      OR (v_city_id IS NOT NULL AND v_city_id = ANY(cl.target_city_ids))
    )
  ORDER BY cl.start_date ASC NULLS LAST, cl.created_at DESC;
END;
$$;

DROP FUNCTION IF EXISTS public.club_get_tournament_registrations(uuid);

CREATE OR REPLACE FUNCTION public.club_get_tournament_registrations(
  p_tournament_id uuid
)
RETURNS TABLE (
  registration_id uuid,
  player_id uuid,
  player_name text,
  player_category int,
  player_city text,
  teammate_player_id uuid,
  teammate_name text,
  teammate_category int,
  teammate_city text,
  status text,
  requested_at timestamptz
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

  SELECT club_id INTO v_club_id
  FROM public.club_tournaments
  WHERE id = p_tournament_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TOURNAMENT_NOT_FOUND';
  END IF;
  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  RETURN QUERY
  SELECT
    tr.id,
    tr.player_id,
    p.display_name,
    p.category,
    p.city,
    tr.teammate_player_id,
    tp.display_name,
    tp.category,
    tp.city,
    tr.status,
    tr.requested_at
  FROM public.tournament_registrations tr
  JOIN public.players p ON p.id = tr.player_id
  LEFT JOIN public.players tp ON tp.id = tr.teammate_player_id
  WHERE tr.tournament_id = p_tournament_id
  ORDER BY
    CASE tr.status WHEN 'pending' THEN 0 WHEN 'confirmed' THEN 1 ELSE 2 END,
    tr.requested_at ASC;
END;
$$;

DROP FUNCTION IF EXISTS public.club_get_league_registrations(uuid);

CREATE OR REPLACE FUNCTION public.club_get_league_registrations(
  p_league_id uuid
)
RETURNS TABLE (
  registration_id uuid,
  player_id uuid,
  player_name text,
  player_category int,
  player_city text,
  teammate_player_id uuid,
  teammate_name text,
  teammate_category int,
  teammate_city text,
  status text,
  requested_at timestamptz
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

  SELECT club_id INTO v_club_id
  FROM public.club_leagues
  WHERE id = p_league_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LEAGUE_NOT_FOUND';
  END IF;
  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  RETURN QUERY
  SELECT
    lr.id,
    lr.player_id,
    p.display_name,
    p.category,
    p.city,
    lr.teammate_player_id,
    tp.display_name,
    tp.category,
    tp.city,
    lr.status,
    lr.requested_at
  FROM public.league_registrations lr
  JOIN public.players p ON p.id = lr.player_id
  LEFT JOIN public.players tp ON tp.id = lr.teammate_player_id
  WHERE lr.league_id = p_league_id
  ORDER BY
    CASE lr.status WHEN 'pending' THEN 0 WHEN 'confirmed' THEN 1 ELSE 2 END,
    lr.requested_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.player_request_tournament_registration(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.player_request_tournament_registration(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.player_request_league_registration(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.player_request_league_registration(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.player_get_open_events() TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_get_tournament_registrations(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_get_league_registrations(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_resolve_tournament_registration(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_resolve_league_registration(uuid, text) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Q6.3: Tournament & League registrations + geographic broadcasting notifications
-- Adds: start_date/end_date/target_city_ids to tournaments & leagues,
--       registration tables, new notification types, RPCs for player registration
--       and club resolution, bulk notification trigger on status -> active.

BEGIN;

-- ─── 1. New columns on club_tournaments & club_leagues ────────────────────────

ALTER TABLE public.club_tournaments
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date   date,
  ADD COLUMN IF NOT EXISTS target_city_ids text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.club_leagues
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date   date,
  ADD COLUMN IF NOT EXISTS target_city_ids text[] NOT NULL DEFAULT '{}';

-- ─── 2. Registration tables ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tournament_registrations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.club_tournaments(id) ON DELETE CASCADE,
  player_id     uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'confirmed', 'rejected')),
  requested_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at   timestamptz,
  resolved_by   uuid REFERENCES auth.users(id),
  UNIQUE (tournament_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_registrations_tournament
  ON public.tournament_registrations(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_player
  ON public.tournament_registrations(player_id);

CREATE TABLE IF NOT EXISTS public.league_registrations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id  uuid NOT NULL REFERENCES public.club_leagues(id) ON DELETE CASCADE,
  player_id  uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  status     text NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'confirmed', 'rejected')),
  requested_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at   timestamptz,
  resolved_by   uuid REFERENCES auth.users(id),
  UNIQUE (league_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_league_registrations_league
  ON public.league_registrations(league_id);
CREATE INDEX IF NOT EXISTS idx_league_registrations_player
  ON public.league_registrations(player_id);

-- ─── 3. RLS for registration tables ──────────────────────────────────────────

ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_registrations     ENABLE ROW LEVEL SECURITY;

-- Players can see their own registrations
DROP POLICY IF EXISTS tournament_registrations_select_player ON public.tournament_registrations;
CREATE POLICY tournament_registrations_select_player
  ON public.tournament_registrations FOR SELECT TO authenticated
  USING (
    player_id IN (
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
    OR public.q6_can_manage_club(
      (SELECT cl.club_id FROM public.club_leagues cl WHERE cl.id = league_id),
      auth.uid()
    )
  );

-- ─── 4. Update notification type CHECK constraint ─────────────────────────────
-- Constraint is updated in 20260308_q6_3_fix_notification_constraint.sql
-- using NOT VALID to skip existing rows. Applied separately.

-- ─── 5. Update notification_create RPC to accept new types ───────────────────

CREATE OR REPLACE FUNCTION public.notification_create(
  p_user_id    uuid    DEFAULT NULL,
  p_club_id    uuid    DEFAULT NULL,
  p_type       text    DEFAULT NULL,
  p_entity_id  uuid    DEFAULT NULL,
  p_payload    jsonb   DEFAULT '{}'::jsonb,
  p_priority   smallint DEFAULT 0,
  p_dedupe_key text    DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      uuid;
  v_is_admin boolean;
  v_id       uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = v_uid AND pr.role = 'admin'
  ) INTO v_is_admin;

  IF ((CASE WHEN p_user_id IS NULL THEN 0 ELSE 1 END) +
      (CASE WHEN p_club_id  IS NULL THEN 0 ELSE 1 END)) <> 1 THEN
    RAISE EXCEPTION 'INVALID_NOTIFICATION_TARGET';
  END IF;

  IF p_type IS NULL OR p_type NOT IN (
    'player_match_result_ready',
    'player_claim_success',
    'club_claim_requested',
    'club_match_created',
    'tournament_open_for_registration',
    'league_open_for_registration',
    'tournament_registration_confirmed',
    'league_registration_confirmed'
  ) THEN
    RAISE EXCEPTION 'INVALID_NOTIFICATION_TYPE';
  END IF;

  IF p_club_id IS NOT NULL THEN
    PERFORM 1 FROM public.clubs c WHERE c.id = p_club_id AND c.deleted_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'CLUB_NOT_FOUND'; END IF;
  END IF;

  -- Authorization per type
  IF p_type IN ('player_match_result_ready', 'player_claim_success') THEN
    IF p_user_id IS DISTINCT FROM v_uid THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  ELSIF p_type = 'club_match_created' THEN
    IF p_club_id IS NULL THEN RAISE EXCEPTION 'INVALID_NOTIFICATION_TARGET'; END IF;
    PERFORM 1 FROM public.clubs c
    WHERE c.id = p_club_id AND c.deleted_at IS NULL
      AND c.claim_status = 'claimed' AND c.claimed_by = v_uid;
    IF NOT FOUND THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
  ELSIF p_type = 'club_claim_requested' THEN
    IF p_user_id IS NULL THEN RAISE EXCEPTION 'INVALID_NOTIFICATION_TARGET'; END IF;
    IF NOT v_is_admin THEN
      PERFORM 1 FROM public.club_claim_requests r
      WHERE r.id = p_entity_id AND r.requested_by = v_uid;
      IF NOT FOUND THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
    END IF;
  -- New types: only SECURITY DEFINER RPCs can insert these (called without auth.uid check)
  -- They are inserted by club_resolve_*_registration and the broadcast function below.
  END IF;

  INSERT INTO public.notifications (user_id, club_id, type, entity_id, payload, priority, dedupe_key)
  VALUES (
    p_user_id, p_club_id, p_type, p_entity_id,
    COALESCE(p_payload, '{}'::jsonb),
    COALESCE(p_priority, 0),
    NULLIF(TRIM(COALESCE(p_dedupe_key, '')), '')
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL AND p_dedupe_key IS NOT NULL THEN
    SELECT n.id INTO v_id
    FROM public.notifications n
    WHERE n.user_id IS NOT DISTINCT FROM p_user_id
      AND n.club_id IS NOT DISTINCT FROM p_club_id
      AND n.dedupe_key = p_dedupe_key
    ORDER BY n.created_at DESC LIMIT 1;
  END IF;

  RETURN v_id;
END;
$$;

-- ─── 6. Internal helper: bulk-insert registration notifications ───────────────
-- Called by update_tournament_status / update_league_status RPCs when going active.

CREATE OR REPLACE FUNCTION public.q6_notify_event_open(
  p_entity_type text,   -- 'tournament' | 'league'
  p_entity_id   uuid,
  p_entity_name text,
  p_club_name   text,
  p_start_date  date,
  p_city_ids    text[]
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type        text;
  v_count       int := 0;
  v_payload     jsonb;
  v_dedupe_base text;
  v_link        text;
  rec           RECORD;
BEGIN
  IF p_city_ids IS NULL OR array_length(p_city_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  v_type := CASE p_entity_type
    WHEN 'tournament' THEN 'tournament_open_for_registration'
    WHEN 'league'     THEN 'league_open_for_registration'
    ELSE NULL
  END;
  IF v_type IS NULL THEN RETURN 0; END IF;

  v_link        := '/player/events';
  v_dedupe_base := v_type || ':' || p_entity_id::text;

  v_payload := jsonb_build_object(
    'schema_version', 1,
    'title',   p_entity_name || ' abierto para inscripción',
    'message', 'El club ' || p_club_name ||
               CASE WHEN p_start_date IS NOT NULL
                    THEN ' · Inicio: ' || to_char(p_start_date, 'DD/MM/YYYY')
                    ELSE '' END,
    'cta_label', 'Ver e inscribirme',
    'link',    v_link,
    'entity_name', p_entity_name,
    'club_name',   p_club_name,
    'start_date',  CASE WHEN p_start_date IS NOT NULL THEN to_char(p_start_date, 'YYYY-MM-DD') ELSE NULL END
  );

  FOR rec IN
    SELECT DISTINCT p.user_id
    FROM public.players p
    WHERE p.city_id = ANY(p_city_ids)
      AND p.user_id IS NOT NULL
      AND p.status = 'active'
      AND p.deleted_at IS NULL
  LOOP
    INSERT INTO public.notifications (user_id, type, entity_id, payload, priority, dedupe_key)
    VALUES (
      rec.user_id,
      v_type,
      p_entity_id,
      v_payload,
      1,
      v_dedupe_base || ':' || rec.user_id::text
    )
    ON CONFLICT DO NOTHING;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ─── 7. RPC: update tournament fields (dates + cities) ───────────────────────

CREATE OR REPLACE FUNCTION public.club_update_tournament_info(
  p_tournament_id   uuid,
  p_start_date      date    DEFAULT NULL,
  p_end_date        date    DEFAULT NULL,
  p_target_city_ids text[]  DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid;
  v_club_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT club_id INTO v_club_id FROM public.club_tournaments WHERE id = p_tournament_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'TOURNAMENT_NOT_FOUND'; END IF;
  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  UPDATE public.club_tournaments SET
    start_date       = COALESCE(p_start_date, start_date),
    end_date         = COALESCE(p_end_date, end_date),
    target_city_ids  = COALESCE(p_target_city_ids, target_city_ids)
  WHERE id = p_tournament_id;
END;
$$;

-- ─── 8. RPC: update league fields (dates + cities) ───────────────────────────

CREATE OR REPLACE FUNCTION public.club_update_league_info(
  p_league_id       uuid,
  p_start_date      date   DEFAULT NULL,
  p_end_date        date   DEFAULT NULL,
  p_target_city_ids text[] DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid;
  v_club_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT club_id INTO v_club_id FROM public.club_leagues WHERE id = p_league_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'LEAGUE_NOT_FOUND'; END IF;
  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  UPDATE public.club_leagues SET
    start_date      = COALESCE(p_start_date, start_date),
    end_date        = COALESCE(p_end_date, end_date),
    target_city_ids = COALESCE(p_target_city_ids, target_city_ids)
  WHERE id = p_league_id;
END;
$$;

-- ─── 9. RPC: player requests tournament registration ─────────────────────────

CREATE OR REPLACE FUNCTION public.player_request_tournament_registration(
  p_tournament_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       uuid;
  v_player_id uuid;
  v_status    text;
  v_reg_id    uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT id INTO v_player_id FROM public.players WHERE user_id = v_uid AND deleted_at IS NULL LIMIT 1;
  IF v_player_id IS NULL THEN RAISE EXCEPTION 'PLAYER_NOT_FOUND'; END IF;

  SELECT status INTO v_status FROM public.club_tournaments WHERE id = p_tournament_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'TOURNAMENT_NOT_FOUND'; END IF;
  IF v_status NOT IN ('active') THEN RAISE EXCEPTION 'TOURNAMENT_NOT_OPEN'; END IF;

  INSERT INTO public.tournament_registrations (tournament_id, player_id)
  VALUES (p_tournament_id, v_player_id)
  ON CONFLICT (tournament_id, player_id) DO UPDATE
    SET status = CASE
      WHEN tournament_registrations.status = 'rejected' THEN 'pending'
      ELSE tournament_registrations.status
    END,
    requested_at = CASE
      WHEN tournament_registrations.status = 'rejected' THEN now()
      ELSE tournament_registrations.requested_at
    END
  RETURNING id INTO v_reg_id;

  RETURN v_reg_id;
END;
$$;

-- ─── 10. RPC: player requests league registration ─────────────────────────────

CREATE OR REPLACE FUNCTION public.player_request_league_registration(
  p_league_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       uuid;
  v_player_id uuid;
  v_status    text;
  v_reg_id    uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT id INTO v_player_id FROM public.players WHERE user_id = v_uid AND deleted_at IS NULL LIMIT 1;
  IF v_player_id IS NULL THEN RAISE EXCEPTION 'PLAYER_NOT_FOUND'; END IF;

  SELECT status INTO v_status FROM public.club_leagues WHERE id = p_league_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'LEAGUE_NOT_FOUND'; END IF;
  IF v_status NOT IN ('active') THEN RAISE EXCEPTION 'LEAGUE_NOT_OPEN'; END IF;

  INSERT INTO public.league_registrations (league_id, player_id)
  VALUES (p_league_id, v_player_id)
  ON CONFLICT (league_id, player_id) DO UPDATE
    SET status = CASE
      WHEN league_registrations.status = 'rejected' THEN 'pending'
      ELSE league_registrations.status
    END,
    requested_at = CASE
      WHEN league_registrations.status = 'rejected' THEN now()
      ELSE league_registrations.requested_at
    END
  RETURNING id INTO v_reg_id;

  RETURN v_reg_id;
END;
$$;

-- ─── 11. RPC: club resolves tournament registration ───────────────────────────

CREATE OR REPLACE FUNCTION public.club_resolve_tournament_registration(
  p_registration_id uuid,
  p_status          text  -- 'confirmed' | 'rejected'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid        uuid;
  v_club_id    uuid;
  v_player_uid uuid;
  v_t_name     text;
  v_t_id       uuid;
  v_player_id  uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF p_status NOT IN ('confirmed', 'rejected') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;

  SELECT tr.player_id, ct.club_id, ct.id, ct.name
    INTO v_player_id, v_club_id, v_t_id, v_t_name
  FROM public.tournament_registrations tr
  JOIN public.club_tournaments ct ON ct.id = tr.tournament_id
  WHERE tr.id = p_registration_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'REGISTRATION_NOT_FOUND'; END IF;

  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  UPDATE public.tournament_registrations
  SET status = p_status, resolved_at = now(), resolved_by = v_uid
  WHERE id = p_registration_id;

  -- Notify player if confirmed
  IF p_status = 'confirmed' THEN
    SELECT p.user_id INTO v_player_uid FROM public.players p WHERE p.id = v_player_id;
    IF v_player_uid IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, entity_id, payload, priority, dedupe_key)
      VALUES (
        v_player_uid,
        'tournament_registration_confirmed',
        v_t_id,
        jsonb_build_object(
          'schema_version', 1,
          'title',     'Inscripción confirmada',
          'message',   'Tu inscripción al torneo "' || v_t_name || '" fue confirmada.',
          'cta_label', 'Ver torneo',
          'link',      '/player/events'
        ),
        2,
        'tournament_registration_confirmed:' || p_registration_id::text
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END;
$$;

-- ─── 12. RPC: club resolves league registration ───────────────────────────────

CREATE OR REPLACE FUNCTION public.club_resolve_league_registration(
  p_registration_id uuid,
  p_status          text  -- 'confirmed' | 'rejected'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid        uuid;
  v_club_id    uuid;
  v_player_uid uuid;
  v_l_name     text;
  v_l_id       uuid;
  v_player_id  uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF p_status NOT IN ('confirmed', 'rejected') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;

  SELECT lr.player_id, cl.club_id, cl.id, cl.name
    INTO v_player_id, v_club_id, v_l_id, v_l_name
  FROM public.league_registrations lr
  JOIN public.club_leagues cl ON cl.id = lr.league_id
  WHERE lr.id = p_registration_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'REGISTRATION_NOT_FOUND'; END IF;

  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  UPDATE public.league_registrations
  SET status = p_status, resolved_at = now(), resolved_by = v_uid
  WHERE id = p_registration_id;

  -- Notify player if confirmed
  IF p_status = 'confirmed' THEN
    SELECT p.user_id INTO v_player_uid FROM public.players p WHERE p.id = v_player_id;
    IF v_player_uid IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, entity_id, payload, priority, dedupe_key)
      VALUES (
        v_player_uid,
        'league_registration_confirmed',
        v_l_id,
        jsonb_build_object(
          'schema_version', 1,
          'title',     'Inscripción confirmada',
          'message',   'Tu inscripción a la liga "' || v_l_name || '" fue confirmada.',
          'cta_label', 'Ver liga',
          'link',      '/player/events'
        ),
        2,
        'league_registration_confirmed:' || p_registration_id::text
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END;
$$;

-- ─── 13. RPC: player gets open events in their city ───────────────────────────

CREATE OR REPLACE FUNCTION public.player_get_open_events()
RETURNS TABLE (
  entity_type      text,
  entity_id        uuid,
  entity_name      text,
  season_label     text,
  club_id          uuid,
  club_name        text,
  start_date       date,
  end_date         date,
  registration_id  uuid,
  registration_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       uuid;
  v_player_id uuid;
  v_city_id   text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT p.id, p.city_id INTO v_player_id, v_city_id
  FROM public.players p
  WHERE p.user_id = v_uid AND p.deleted_at IS NULL
  LIMIT 1;

  IF v_player_id IS NULL THEN RAISE EXCEPTION 'PLAYER_NOT_FOUND'; END IF;

  -- Tournaments
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
    tr.status
  FROM public.club_tournaments ct
  JOIN public.clubs c ON c.id = ct.club_id AND c.deleted_at IS NULL
  LEFT JOIN public.tournament_registrations tr
    ON tr.tournament_id = ct.id AND tr.player_id = v_player_id
  WHERE ct.status = 'active'
    AND (
      array_length(ct.target_city_ids, 1) IS NULL
      OR ct.target_city_ids = '{}'
      OR (v_city_id IS NOT NULL AND v_city_id = ANY(ct.target_city_ids))
    )
  ORDER BY ct.start_date ASC NULLS LAST, ct.created_at DESC;

  -- Leagues
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
    lr.status
  FROM public.club_leagues cl
  JOIN public.clubs c ON c.id = cl.club_id AND c.deleted_at IS NULL
  LEFT JOIN public.league_registrations lr
    ON lr.league_id = cl.id AND lr.player_id = v_player_id
  WHERE cl.status = 'active'
    AND (
      array_length(cl.target_city_ids, 1) IS NULL
      OR cl.target_city_ids = '{}'
      OR (v_city_id IS NOT NULL AND v_city_id = ANY(cl.target_city_ids))
    )
  ORDER BY cl.start_date ASC NULLS LAST, cl.created_at DESC;
END;
$$;

-- ─── 14. RPC: club gets pending registrations for a tournament ────────────────

CREATE OR REPLACE FUNCTION public.club_get_tournament_registrations(
  p_tournament_id uuid
)
RETURNS TABLE (
  registration_id uuid,
  player_id       uuid,
  player_name     text,
  player_category int,
  player_city     text,
  status          text,
  requested_at    timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid;
  v_club_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT club_id INTO v_club_id FROM public.club_tournaments WHERE id = p_tournament_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'TOURNAMENT_NOT_FOUND'; END IF;
  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  RETURN QUERY
  SELECT
    tr.id,
    tr.player_id,
    p.display_name,
    p.category,
    p.city,
    tr.status,
    tr.requested_at
  FROM public.tournament_registrations tr
  JOIN public.players p ON p.id = tr.player_id
  WHERE tr.tournament_id = p_tournament_id
  ORDER BY
    CASE tr.status WHEN 'pending' THEN 0 WHEN 'confirmed' THEN 1 ELSE 2 END,
    tr.requested_at ASC;
END;
$$;

-- ─── 15. RPC: club gets pending registrations for a league ───────────────────

CREATE OR REPLACE FUNCTION public.club_get_league_registrations(
  p_league_id uuid
)
RETURNS TABLE (
  registration_id uuid,
  player_id       uuid,
  player_name     text,
  player_category int,
  player_city     text,
  status          text,
  requested_at    timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid;
  v_club_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT club_id INTO v_club_id FROM public.club_leagues WHERE id = p_league_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'LEAGUE_NOT_FOUND'; END IF;
  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  RETURN QUERY
  SELECT
    lr.id,
    lr.player_id,
    p.display_name,
    p.category,
    p.city,
    lr.status,
    lr.requested_at
  FROM public.league_registrations lr
  JOIN public.players p ON p.id = lr.player_id
  WHERE lr.league_id = p_league_id
  ORDER BY
    CASE lr.status WHEN 'pending' THEN 0 WHEN 'confirmed' THEN 1 ELSE 2 END,
    lr.requested_at ASC;
END;
$$;

-- ─── 16. Grants ───────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION public.q6_notify_event_open(text, uuid, text, text, date, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_update_tournament_info(uuid, date, date, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_update_league_info(uuid, date, date, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.player_request_tournament_registration(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.player_request_league_registration(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_resolve_tournament_registration(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_resolve_league_registration(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.player_get_open_events() TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_get_tournament_registrations(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_get_league_registrations(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;

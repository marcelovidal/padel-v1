-- ============================================================
-- Q5: Coach Profiles
-- Feature: Un jugador puede habilitar perfil de entrenador
-- Tablas: coach_profiles, coach_players, coach_availability,
--         coach_bookings, training_sessions, player_challenges,
--         player_coach_notes
-- RPCs: coach_enable_profile, coach_update_profile,
--       coach_set_availability, coach_invite_player,
--       coach_accept_invitation, coach_get_my_players,
--       coach_get_public_profile, get_available_coaches
-- ============================================================

BEGIN;

-- ── 1. Extend players table ──────────────────────────────────

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS is_coach            boolean       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS coach_enabled_at    timestamptz   NULL;

-- ── 2. coach_profiles ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.coach_profiles (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id          uuid        NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  primary_club_id    uuid        NULL REFERENCES public.clubs(id) ON DELETE SET NULL,
  additional_club_ids uuid[]     NULL,
  bio                text        NULL,
  especialidad       text        NULL,
  tarifa_por_hora    numeric     NULL,
  tarifa_publica     boolean     NOT NULL DEFAULT false,
  activo             boolean     NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_coach_profiles_especialidad'
  ) THEN
    ALTER TABLE public.coach_profiles
      ADD CONSTRAINT chk_coach_profiles_especialidad
      CHECK (especialidad IS NULL OR especialidad IN (
        'iniciacion', 'tecnica', 'competicion', 'alto_rendimiento', 'todos_los_niveles'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_coach_profiles_player_id
  ON public.coach_profiles(player_id);

CREATE INDEX IF NOT EXISTS idx_coach_profiles_primary_club
  ON public.coach_profiles(primary_club_id);

-- ── 3. coach_players (cartera de alumnos) ────────────────────

CREATE TABLE IF NOT EXISTS public.coach_players (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    uuid        NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  player_id   uuid        NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  status      text        NOT NULL DEFAULT 'pending',
  invited_at  timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz NULL,
  UNIQUE (coach_id, player_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_coach_players_status'
  ) THEN
    ALTER TABLE public.coach_players
      ADD CONSTRAINT chk_coach_players_status
      CHECK (status IN ('pending', 'active', 'inactive'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_coach_players_coach_id
  ON public.coach_players(coach_id, status);

CREATE INDEX IF NOT EXISTS idx_coach_players_player_id
  ON public.coach_players(player_id);

-- ── 4. coach_availability (plantilla semanal) ────────────────

CREATE TABLE IF NOT EXISTS public.coach_availability (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id              uuid        NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  club_id               uuid        NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  day_of_week           int         NOT NULL,
  start_time            time        NOT NULL,
  end_time              time        NOT NULL,
  slot_duration_minutes int         NOT NULL DEFAULT 60,
  activo                boolean     NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_coach_availability_day'
  ) THEN
    ALTER TABLE public.coach_availability
      ADD CONSTRAINT chk_coach_availability_day
      CHECK (day_of_week BETWEEN 0 AND 6);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_coach_availability_slot_duration'
  ) THEN
    ALTER TABLE public.coach_availability
      ADD CONSTRAINT chk_coach_availability_slot_duration
      CHECK (slot_duration_minutes IN (30, 45, 60));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_coach_availability_times'
  ) THEN
    ALTER TABLE public.coach_availability
      ADD CONSTRAINT chk_coach_availability_times
      CHECK (end_time > start_time);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_coach_availability_coach_id
  ON public.coach_availability(coach_id);

-- ── 5. coach_bookings ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.coach_bookings (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id          uuid        NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  player_id         uuid        NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  club_id           uuid        NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  court_id          uuid        NULL REFERENCES public.club_courts(id) ON DELETE SET NULL,
  scheduled_at      timestamptz NOT NULL,
  duration_minutes  int         NOT NULL,
  status            text        NOT NULL DEFAULT 'pending',
  notes_player      text        NULL,
  notes_coach       text        NULL,
  tarifa_aplicada   numeric     NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_coach_bookings_status'
  ) THEN
    ALTER TABLE public.coach_bookings
      ADD CONSTRAINT chk_coach_bookings_status
      CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_coach_bookings_coach_id
  ON public.coach_bookings(coach_id, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_coach_bookings_player_id
  ON public.coach_bookings(player_id);

-- ── 6. training_sessions ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.training_sessions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id          uuid        NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  player_id         uuid        NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  coach_booking_id  uuid        NULL REFERENCES public.coach_bookings(id) ON DELETE SET NULL,
  session_date      date        NOT NULL,
  duration_minutes  int         NULL,
  session_type      text        NOT NULL DEFAULT 'individual',
  notes             text        NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_training_sessions_type'
  ) THEN
    ALTER TABLE public.training_sessions
      ADD CONSTRAINT chk_training_sessions_type
      CHECK (session_type IN ('individual', 'grupal'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_training_sessions_coach_player
  ON public.training_sessions(coach_id, player_id, session_date DESC);

-- ── 7. player_challenges ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.player_challenges (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id       uuid        NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  player_id      uuid        NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  title          text        NOT NULL,
  description    text        NULL,
  target_metric  text        NULL,
  target_value   numeric     NULL,
  deadline       date        NULL,
  status         text        NOT NULL DEFAULT 'active',
  created_at     timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_player_challenges_status'
  ) THEN
    ALTER TABLE public.player_challenges
      ADD CONSTRAINT chk_player_challenges_status
      CHECK (status IN ('active', 'completed', 'expired'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_player_challenges_coach_id
  ON public.player_challenges(coach_id);

CREATE INDEX IF NOT EXISTS idx_player_challenges_player_id
  ON public.player_challenges(player_id, status);

-- ── 8. player_coach_notes (legajo privado) ───────────────────

CREATE TABLE IF NOT EXISTS public.player_coach_notes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id   uuid        NOT NULL REFERENCES public.coach_profiles(id) ON DELETE CASCADE,
  player_id  uuid        NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  note       text        NOT NULL,
  note_type  text        NOT NULL DEFAULT 'observacion',
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_player_coach_notes_type'
  ) THEN
    ALTER TABLE public.player_coach_notes
      ADD CONSTRAINT chk_player_coach_notes_type
      CHECK (note_type IN ('observacion', 'objetivo', 'alerta', 'logro'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_player_coach_notes_coach_player
  ON public.player_coach_notes(coach_id, player_id, created_at DESC);


-- ══════════════════════════════════════════════════════════════
-- RLS
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.coach_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_players     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_bookings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_coach_notes ENABLE ROW LEVEL SECURITY;

-- coach_profiles: lectura pública, escritura solo el propio entrenador
DROP POLICY IF EXISTS "coach_profiles_select_public" ON public.coach_profiles;
CREATE POLICY "coach_profiles_select_public"
  ON public.coach_profiles FOR SELECT
  USING (activo = true);

DROP POLICY IF EXISTS "coach_profiles_write_own" ON public.coach_profiles;
CREATE POLICY "coach_profiles_write_own"
  ON public.coach_profiles FOR ALL
  USING (
    player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid())
  );

-- coach_players: solo el entrenador ve su cartera
DROP POLICY IF EXISTS "coach_players_coach_only" ON public.coach_players;
CREATE POLICY "coach_players_coach_only"
  ON public.coach_players FOR ALL
  USING (
    coach_id IN (
      SELECT cp.id FROM public.coach_profiles cp
      JOIN public.players p ON p.id = cp.player_id
      WHERE p.user_id = auth.uid()
    )
  );

-- coach_availability: lectura pública, escritura solo el entrenador
DROP POLICY IF EXISTS "coach_availability_select_public" ON public.coach_availability;
CREATE POLICY "coach_availability_select_public"
  ON public.coach_availability FOR SELECT
  USING (activo = true);

DROP POLICY IF EXISTS "coach_availability_write_own" ON public.coach_availability;
CREATE POLICY "coach_availability_write_own"
  ON public.coach_availability FOR ALL
  USING (
    coach_id IN (
      SELECT cp.id FROM public.coach_profiles cp
      JOIN public.players p ON p.id = cp.player_id
      WHERE p.user_id = auth.uid()
    )
  );

-- coach_bookings: visible para el entrenador y el jugador involucrado
DROP POLICY IF EXISTS "coach_bookings_parties" ON public.coach_bookings;
CREATE POLICY "coach_bookings_parties"
  ON public.coach_bookings FOR ALL
  USING (
    coach_id IN (
      SELECT cp.id FROM public.coach_profiles cp
      JOIN public.players p ON p.id = cp.player_id
      WHERE p.user_id = auth.uid()
    )
    OR
    player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid())
  );

-- training_sessions: solo el entrenador
DROP POLICY IF EXISTS "training_sessions_coach_only" ON public.training_sessions;
CREATE POLICY "training_sessions_coach_only"
  ON public.training_sessions FOR ALL
  USING (
    coach_id IN (
      SELECT cp.id FROM public.coach_profiles cp
      JOIN public.players p ON p.id = cp.player_id
      WHERE p.user_id = auth.uid()
    )
  );

-- player_challenges: entrenador escribe, jugador lee las suyas
DROP POLICY IF EXISTS "player_challenges_coach_write" ON public.player_challenges;
CREATE POLICY "player_challenges_coach_write"
  ON public.player_challenges FOR ALL
  USING (
    coach_id IN (
      SELECT cp.id FROM public.coach_profiles cp
      JOIN public.players p ON p.id = cp.player_id
      WHERE p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "player_challenges_player_read" ON public.player_challenges;
CREATE POLICY "player_challenges_player_read"
  ON public.player_challenges FOR SELECT
  USING (
    player_id IN (SELECT id FROM public.players WHERE user_id = auth.uid())
  );

-- player_coach_notes: solo el entrenador, nunca el jugador
DROP POLICY IF EXISTS "player_coach_notes_coach_only" ON public.player_coach_notes;
CREATE POLICY "player_coach_notes_coach_only"
  ON public.player_coach_notes FOR ALL
  USING (
    coach_id IN (
      SELECT cp.id FROM public.coach_profiles cp
      JOIN public.players p ON p.id = cp.player_id
      WHERE p.user_id = auth.uid()
    )
  );


-- ══════════════════════════════════════════════════════════════
-- GRANTS
-- ══════════════════════════════════════════════════════════════

GRANT SELECT ON public.coach_profiles     TO authenticated, anon;
GRANT INSERT, UPDATE ON public.coach_profiles     TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.coach_players     TO authenticated;
GRANT SELECT ON public.coach_availability TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.coach_availability TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.coach_bookings    TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.training_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.player_challenges TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.player_coach_notes TO authenticated;


-- ══════════════════════════════════════════════════════════════
-- NOTIFICATIONS: agregar tipos coach
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS chk_notifications_type;

ALTER TABLE public.notifications
  ADD CONSTRAINT chk_notifications_type CHECK (
    type IN (
      'player_match_result_ready',
      'player_claim_success',
      'club_claim_requested',
      'club_match_created',
      'tournament_open_for_registration',
      'league_open_for_registration',
      'tournament_registration_requested',
      'league_registration_requested',
      'tournament_registration_confirmed',
      'league_registration_confirmed',
      'coach_invitation',
      'coach_invitation_accepted',
      'coach_challenge_assigned',
      'coach_booking_request',
      'coach_booking_confirmed'
    )
  ) NOT VALID;


-- ══════════════════════════════════════════════════════════════
-- RPCs
-- ══════════════════════════════════════════════════════════════

-- ── RPC 1: coach_enable_profile ──────────────────────────────

CREATE OR REPLACE FUNCTION public.coach_enable_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_player   players%ROWTYPE;
  v_coach_id uuid;
  v_profile  jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT * INTO v_player
  FROM public.players
  WHERE user_id = v_uid AND status = 'active' AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PLAYER_NOT_FOUND';
  END IF;

  IF v_player.is_coach THEN
    SELECT row_to_json(cp)::jsonb INTO v_profile
    FROM public.coach_profiles cp
    WHERE cp.player_id = v_player.id;
    RETURN v_profile;
  END IF;

  UPDATE public.players
  SET is_coach = true, coach_enabled_at = now()
  WHERE id = v_player.id;

  INSERT INTO public.coach_profiles (player_id)
  VALUES (v_player.id)
  ON CONFLICT (player_id) DO NOTHING
  RETURNING id INTO v_coach_id;

  IF v_coach_id IS NULL THEN
    SELECT id INTO v_coach_id FROM public.coach_profiles WHERE player_id = v_player.id;
  END IF;

  SELECT row_to_json(cp)::jsonb INTO v_profile
  FROM public.coach_profiles cp
  WHERE cp.id = v_coach_id;

  RETURN v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION public.coach_enable_profile() TO authenticated;

-- ── RPC 2: coach_update_profile ──────────────────────────────

CREATE OR REPLACE FUNCTION public.coach_update_profile(
  p_bio               text    DEFAULT NULL,
  p_especialidad      text    DEFAULT NULL,
  p_primary_club_id   uuid    DEFAULT NULL,
  p_tarifa_por_hora   numeric DEFAULT NULL,
  p_tarifa_publica    boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_player_id uuid;
  v_profile   jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT id INTO v_player_id
  FROM public.players
  WHERE user_id = v_uid AND is_coach = true AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COACH_NOT_FOUND';
  END IF;

  UPDATE public.coach_profiles
  SET
    bio             = COALESCE(p_bio,             bio),
    especialidad    = COALESCE(p_especialidad,    especialidad),
    primary_club_id = CASE WHEN p_primary_club_id IS NOT NULL THEN p_primary_club_id ELSE primary_club_id END,
    tarifa_por_hora = CASE WHEN p_tarifa_por_hora IS NOT NULL THEN p_tarifa_por_hora ELSE tarifa_por_hora END,
    tarifa_publica  = COALESCE(p_tarifa_publica,  tarifa_publica)
  WHERE player_id = v_player_id;

  SELECT row_to_json(cp)::jsonb INTO v_profile
  FROM public.coach_profiles cp
  WHERE cp.player_id = v_player_id;

  RETURN v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION public.coach_update_profile(text, text, uuid, numeric, boolean) TO authenticated;

-- ── RPC 3: coach_set_availability ────────────────────────────

CREATE OR REPLACE FUNCTION public.coach_set_availability(
  p_slots jsonb  -- array of {club_id, day_of_week, start_time, end_time, slot_duration_minutes}
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_coach_id uuid;
  v_slot     jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT cp.id INTO v_coach_id
  FROM public.coach_profiles cp
  JOIN public.players p ON p.id = cp.player_id
  WHERE p.user_id = v_uid AND p.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COACH_NOT_FOUND';
  END IF;

  -- Replace all slots
  DELETE FROM public.coach_availability WHERE coach_id = v_coach_id;

  FOR v_slot IN SELECT * FROM jsonb_array_elements(p_slots)
  LOOP
    INSERT INTO public.coach_availability (
      coach_id, club_id, day_of_week, start_time, end_time, slot_duration_minutes
    )
    VALUES (
      v_coach_id,
      (v_slot->>'club_id')::uuid,
      (v_slot->>'day_of_week')::int,
      (v_slot->>'start_time')::time,
      (v_slot->>'end_time')::time,
      COALESCE((v_slot->>'slot_duration_minutes')::int, 60)
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.coach_set_availability(jsonb) TO authenticated;

-- ── RPC 4: coach_invite_player ───────────────────────────────

CREATE OR REPLACE FUNCTION public.coach_invite_player(
  p_player_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         uuid := auth.uid();
  v_coach_id    uuid;
  v_coach_player_id uuid;
  v_target_user_id  uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT cp.id INTO v_coach_id
  FROM public.coach_profiles cp
  JOIN public.players p ON p.id = cp.player_id
  WHERE p.user_id = v_uid AND p.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COACH_NOT_FOUND';
  END IF;

  -- Check target player exists and has account
  SELECT user_id INTO v_target_user_id
  FROM public.players
  WHERE id = p_player_id AND status = 'active' AND deleted_at IS NULL AND is_guest = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PLAYER_NOT_FOUND';
  END IF;

  INSERT INTO public.coach_players (coach_id, player_id, status)
  VALUES (v_coach_id, p_player_id, 'pending')
  ON CONFLICT (coach_id, player_id) DO NOTHING
  RETURNING id INTO v_coach_player_id;

  -- Notify the player if they have an account
  IF v_coach_player_id IS NOT NULL AND v_target_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, entity_id, payload)
    VALUES (
      v_target_user_id,
      'coach_invitation',
      v_coach_player_id,
      jsonb_build_object('coach_player_id', v_coach_player_id)
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_coach_player_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.coach_invite_player(uuid) TO authenticated;

-- ── RPC 5: coach_accept_invitation ───────────────────────────

CREATE OR REPLACE FUNCTION public.coach_accept_invitation(
  p_coach_player_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid          uuid := auth.uid();
  v_player_id    uuid;
  v_coach_user_id uuid;
  v_coach_player coach_players%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT id INTO v_player_id
  FROM public.players
  WHERE user_id = v_uid AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PLAYER_NOT_FOUND';
  END IF;

  SELECT * INTO v_coach_player
  FROM public.coach_players
  WHERE id = p_coach_player_id AND player_id = v_player_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVITATION_NOT_FOUND';
  END IF;

  UPDATE public.coach_players
  SET status = 'active', accepted_at = now()
  WHERE id = p_coach_player_id;

  -- Notify the coach
  SELECT p.user_id INTO v_coach_user_id
  FROM public.coach_profiles cp
  JOIN public.players p ON p.id = cp.player_id
  WHERE cp.id = v_coach_player.coach_id;

  IF v_coach_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, entity_id, payload)
    VALUES (
      v_coach_user_id,
      'coach_invitation_accepted',
      p_coach_player_id,
      jsonb_build_object('coach_player_id', p_coach_player_id)
    )
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.coach_accept_invitation(uuid) TO authenticated;

-- ── RPC 6: coach_get_my_players ──────────────────────────────

CREATE OR REPLACE FUNCTION public.coach_get_my_players()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_coach_id uuid;
  v_result   jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT cp.id INTO v_coach_id
  FROM public.coach_profiles cp
  JOIN public.players p ON p.id = cp.player_id
  WHERE p.user_id = v_uid AND p.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COACH_NOT_FOUND';
  END IF;

  WITH active_students AS (
    SELECT cp.player_id, cp.id AS coach_player_id, cp.status, cp.accepted_at
    FROM public.coach_players cp
    WHERE cp.coach_id = v_coach_id AND cp.status = 'active'
  ),
  player_data AS (
    SELECT
      p.id,
      p.display_name,
      p.avatar_url,
      p.category,
      p.pasala_index,
      COALESCE(s.coach_player_id, NULL) AS coach_player_id,
      COALESCE(s.accepted_at, NULL)     AS accepted_at
    FROM active_students s
    JOIN public.players p ON p.id = s.player_id
  ),
  last_match AS (
    SELECT
      mp.player_id,
      MAX(m.match_at) AS last_match_at
    FROM public.match_players mp
    JOIN public.matches m ON m.id = mp.match_id
    WHERE mp.player_id IN (SELECT id FROM player_data)
    GROUP BY mp.player_id
  ),
  index_30d_ago AS (
    SELECT DISTINCT ON (pih.player_id)
      pih.player_id,
      pih.pasala_index AS index_30d
    FROM public.player_index_history pih
    WHERE pih.player_id IN (SELECT id FROM player_data)
      AND pih.recorded_at <= now() - INTERVAL '30 days'
    ORDER BY pih.player_id, pih.recorded_at DESC
  ),
  streak_calc AS (
    -- Last 5 matches per player to determine streak
    SELECT
      mp.player_id,
      COUNT(*) FILTER (
        WHERE mr.winner_team IS NOT NULL AND mp.team = mr.winner_team
        AND m.match_at >= (
          SELECT MAX(m2.match_at) - INTERVAL '60 days'
          FROM public.matches m2
          JOIN public.match_players mp2 ON mp2.match_id = m2.id
          WHERE mp2.player_id = mp.player_id
        )
      ) AS recent_wins
    FROM public.match_players mp
    JOIN public.matches m ON m.id = mp.match_id
    JOIN public.match_results mr ON mr.match_id = mp.match_id
    WHERE mp.player_id IN (SELECT id FROM player_data)
      AND m.match_at >= now() - INTERVAL '60 days'
    GROUP BY mp.player_id
  ),
  active_challenges AS (
    SELECT
      pc.player_id,
      COUNT(*) AS challenge_count
    FROM public.player_challenges pc
    WHERE pc.coach_id = v_coach_id AND pc.status = 'active'
    GROUP BY pc.player_id
  ),
  enriched AS (
    SELECT
      pd.*,
      lm.last_match_at,
      i30.index_30d,
      COALESCE(sc.recent_wins, 0)        AS recent_wins,
      COALESCE(ac.challenge_count, 0)    AS challenge_count,
      CASE
        WHEN lm.last_match_at IS NULL OR lm.last_match_at < now() - INTERVAL '30 days'
          THEN 'inactivo'
        WHEN COALESCE(sc.recent_wins, 0) >= 3
          THEN 'en_racha'
        WHEN i30.index_30d IS NOT NULL AND pd.pasala_index > i30.index_30d + 2
             AND lm.last_match_at >= now() - INTERVAL '7 days'
          THEN 'en_forma'
        WHEN i30.index_30d IS NOT NULL AND pd.pasala_index < i30.index_30d - 5
          THEN 'bajando'
        WHEN lm.last_match_at >= now() - INTERVAL '14 days'
          THEN 'estable'
        ELSE 'estable'
      END AS player_state,
      CASE
        WHEN i30.index_30d IS NOT NULL
          THEN ROUND(pd.pasala_index - i30.index_30d, 1)
        ELSE NULL
      END AS index_delta_30d
    FROM player_data pd
    LEFT JOIN last_match     lm  ON lm.player_id = pd.id
    LEFT JOIN index_30d_ago  i30 ON i30.player_id = pd.id
    LEFT JOIN streak_calc    sc  ON sc.player_id  = pd.id
    LEFT JOIN active_challenges ac ON ac.player_id = pd.id
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',               e.id,
        'coach_player_id',  e.coach_player_id,
        'display_name',     e.display_name,
        'avatar_url',       e.avatar_url,
        'category',         e.category,
        'pasala_index',     e.pasala_index,
        'index_delta_30d',  e.index_delta_30d,
        'last_match_at',    e.last_match_at,
        'player_state',     e.player_state,
        'challenge_count',  e.challenge_count
      )
      ORDER BY e.display_name
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM enriched e;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.coach_get_my_players() TO authenticated;

-- ── RPC 7: coach_get_public_profile ──────────────────────────

CREATE OR REPLACE FUNCTION public.coach_get_public_profile(
  p_coach_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT
    jsonb_build_object(
      'id',             cp.id,
      'player_id',      p.id,
      'display_name',   p.display_name,
      'avatar_url',     p.avatar_url,
      'city',           p.city,
      'region_code',    p.region_code,
      'region_name',    p.region_name,
      'category',       p.category,
      'pasala_index',   p.pasala_index,
      'bio',            cp.bio,
      'especialidad',   cp.especialidad,
      'primary_club_id', cp.primary_club_id,
      'primary_club_name', c.name,
      'tarifa_por_hora', CASE WHEN cp.tarifa_publica THEN cp.tarifa_por_hora ELSE NULL END,
      'tarifa_publica',  cp.tarifa_publica,
      'availability', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'day_of_week',            ca.day_of_week,
            'start_time',             ca.start_time,
            'end_time',               ca.end_time,
            'slot_duration_minutes',  ca.slot_duration_minutes,
            'club_id',                ca.club_id
          ) ORDER BY ca.day_of_week, ca.start_time
        ), '[]'::jsonb)
        FROM public.coach_availability ca
        WHERE ca.coach_id = cp.id AND ca.activo = true
      )
    )
  INTO v_result
  FROM public.coach_profiles cp
  JOIN public.players p ON p.id = cp.player_id
  LEFT JOIN public.clubs c ON c.id = cp.primary_club_id
  WHERE cp.id = p_coach_id AND cp.activo = true AND p.deleted_at IS NULL;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'COACH_NOT_FOUND';
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.coach_get_public_profile(uuid) TO authenticated, anon;

-- ── RPC 8: get_available_coaches ─────────────────────────────

CREATE OR REPLACE FUNCTION public.get_available_coaches(
  p_club_id      uuid    DEFAULT NULL,
  p_city_id      text    DEFAULT NULL,
  p_especialidad text    DEFAULT NULL,
  p_limit        int     DEFAULT 24,
  p_offset       int     DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_total  bigint;
BEGIN
  WITH base AS (
    SELECT
      cp.id,
      p.id               AS player_id,
      p.display_name,
      p.avatar_url,
      p.city,
      p.city_id,
      p.region_code,
      p.region_name,
      p.category,
      p.pasala_index,
      cp.bio,
      cp.especialidad,
      cp.primary_club_id,
      c.name             AS primary_club_name,
      CASE WHEN cp.tarifa_publica THEN cp.tarifa_por_hora ELSE NULL END AS tarifa_por_hora,
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'day_of_week',  ca.day_of_week,
            'start_time',   ca.start_time,
            'end_time',     ca.end_time,
            'club_id',      ca.club_id
          ) ORDER BY ca.day_of_week, ca.start_time
        )
        FROM public.coach_availability ca
        WHERE ca.coach_id = cp.id AND ca.activo = true
      ) AS availability
    FROM public.coach_profiles cp
    JOIN public.players p ON p.id = cp.player_id
    LEFT JOIN public.clubs c ON c.id = cp.primary_club_id
    WHERE cp.activo = true
      AND p.deleted_at IS NULL
      AND p.status = 'active'
      AND (p_club_id      IS NULL OR cp.primary_club_id = p_club_id
           OR p_club_id = ANY(cp.additional_club_ids))
      AND (p_city_id      IS NULL OR p.city_id = p_city_id)
      AND (p_especialidad IS NULL OR cp.especialidad = p_especialidad)
    ORDER BY p.pasala_index DESC NULLS LAST
    LIMIT  p_limit
    OFFSET p_offset
  ),
  counted AS (
    SELECT COUNT(*) AS cnt
    FROM public.coach_profiles cp
    JOIN public.players p ON p.id = cp.player_id
    WHERE cp.activo = true
      AND p.deleted_at IS NULL
      AND p.status = 'active'
      AND (p_club_id      IS NULL OR cp.primary_club_id = p_club_id
           OR p_club_id = ANY(cp.additional_club_ids))
      AND (p_city_id      IS NULL OR p.city_id = p_city_id)
      AND (p_especialidad IS NULL OR cp.especialidad = p_especialidad)
  )
  SELECT
    (SELECT cnt FROM counted),
    COALESCE(jsonb_agg(row_to_json(base)::jsonb), '[]'::jsonb)
  INTO v_total, v_result
  FROM base;

  RETURN jsonb_build_object(
    'total',   COALESCE(v_total, 0),
    'coaches', COALESCE(v_result, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_coaches(uuid, text, text, int, int) TO authenticated, anon;

COMMIT;

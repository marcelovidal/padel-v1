-- Q7: Player Unified Calendar
-- RPC: get_player_calendar(p_date_from date, p_date_to date)
-- Reemplaza la vista de Reservas en el nav del jugador.
-- Unifica: matches, court_bookings, coach_bookings, tournament_registrations,
--          league_registrations, training_sessions.
--
-- Nuevos tipos de notificación para actividad agendada:
--   booking_confirmed, booking_cancelled, booking_requested, training_session_scheduled

BEGIN;

-- ── 1. Añadir nuevos tipos de notificación ────────────────────────────────────

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
      'coach_booking_confirmed',
      'booking_confirmed',
      'booking_cancelled',
      'booking_requested',
      'training_session_scheduled',
      'coach_booking_cancelled'
    )
  ) NOT VALID;

-- ── 2. Índices en start_at para performance del RPC ───────────────────────────

CREATE INDEX IF NOT EXISTS idx_court_bookings_player_start
  ON public.court_bookings(requested_by_player_id, start_at);

CREATE INDEX IF NOT EXISTS idx_coach_bookings_player_scheduled
  ON public.coach_bookings(player_id, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_training_sessions_player_date
  ON public.training_sessions(player_id, session_date);

-- ── 3. RPC: get_player_calendar ───────────────────────────────────────────────
--
-- Devuelve todos los eventos del jugador autenticado en el rango de fechas.
-- UNION de 6 fuentes ordenado por start_at ASC.
--
-- Tipos de evento:
--   match       — partidos donde el jugador es match_player
--   booking     — court_bookings solicitadas por el jugador (no rejected/cancelled)
--   training    — coach_bookings (como alumno) + training_sessions completadas
--   tournament  — inscripciones confirmadas a torneos
--   league      — inscripciones confirmadas a ligas

DROP FUNCTION IF EXISTS public.get_player_calendar(date, date);

CREATE OR REPLACE FUNCTION public.get_player_calendar(
  p_date_from date,
  p_date_to   date
)
RETURNS TABLE (
  id         uuid,
  type       text,
  title      text,
  start_at   timestamptz,
  end_at     timestamptz,
  status     text,
  club_name  text,
  court_name text,
  metadata   jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_player_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT p.id INTO v_player_id
  FROM public.players p
  WHERE p.user_id = v_uid AND p.deleted_at IS NULL
  LIMIT 1;

  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'PLAYER_NOT_FOUND';
  END IF;

  -- 1. Partidos
  RETURN QUERY
  SELECT
    m.id,
    'match'::text                                                      AS type,
    COALESCE(c.name, m.club_name, 'Partido')                           AS title,
    m.match_at                                                         AS start_at,
    (m.match_at + INTERVAL '90 minutes')::timestamptz                  AS end_at,
    m.status::text                                                     AS status,
    COALESCE(c.name, m.club_name, '')                                  AS club_name,
    NULL::text                                                         AS court_name,
    jsonb_build_object(
      'link',      '/player/matches/' || m.id::text,
      'cta_label', 'Ver partido',
      'club_id',   m.club_id
    )                                                                  AS metadata
  FROM public.matches m
  JOIN public.match_players mp ON mp.match_id = m.id AND mp.player_id = v_player_id
  LEFT JOIN public.clubs c ON c.id = m.club_id
  WHERE m.match_at::date BETWEEN p_date_from AND p_date_to;

  -- 2. Reservas de cancha
  RETURN QUERY
  SELECT
    cb.id,
    'booking'::text                                                    AS type,
    COALESCE(c.name, 'Reserva')
      || CASE WHEN cc.name IS NOT NULL THEN ' — ' || cc.name ELSE '' END AS title,
    cb.start_at,
    cb.end_at,
    cb.status,
    COALESCE(c.name, '')                                               AS club_name,
    cc.name                                                            AS court_name,
    jsonb_build_object(
      'link',      '/player/bookings/' || cb.id::text,
      'cta_label', 'Ver reserva'
    )                                                                  AS metadata
  FROM public.court_bookings cb
  JOIN public.clubs c ON c.id = cb.club_id
  LEFT JOIN public.club_courts cc ON cc.id = cb.court_id
  WHERE cb.requested_by_player_id = v_player_id
    AND cb.start_at::date BETWEEN p_date_from AND p_date_to
    AND cb.status NOT IN ('rejected', 'cancelled');

  -- 3. Clases de entrenamiento (coach_bookings como alumno)
  RETURN QUERY
  SELECT
    cb.id,
    'training'::text                                                   AS type,
    'Clase con ' || p_coach.display_name                               AS title,
    cb.scheduled_at                                                    AS start_at,
    (cb.scheduled_at + (cb.duration_minutes * INTERVAL '1 minute'))::timestamptz AS end_at,
    cb.status,
    COALESCE(c.name, '')                                               AS club_name,
    cc.name                                                            AS court_name,
    jsonb_build_object(
      'coach_name',         p_coach.display_name,
      'coach_pasala_index', p_coach.pasala_index,
      'duration_minutes',   cb.duration_minutes,
      'tarifa_por_hora',    CASE WHEN cp.tarifa_publica THEN cp.tarifa_por_hora ELSE NULL END,
      'link',               '/player/coach'
    )                                                                  AS metadata
  FROM public.coach_bookings cb
  JOIN public.coach_profiles cp ON cp.id = cb.coach_id
  JOIN public.players p_coach ON p_coach.id = cp.player_id
  JOIN public.clubs c ON c.id = cb.club_id
  LEFT JOIN public.club_courts cc ON cc.id = cb.court_id
  WHERE cb.player_id = v_player_id
    AND cb.scheduled_at::date BETWEEN p_date_from AND p_date_to
    AND cb.status <> 'cancelled';

  -- 4. Sesiones de entrenamiento registradas (sin coach_booking — evita duplicados)
  RETURN QUERY
  SELECT
    ts.id,
    'training'::text                                                   AS type,
    'Entrenamiento — ' || p_coach.display_name                         AS title,
    ts.session_date::timestamptz                                       AS start_at,
    CASE WHEN ts.duration_minutes IS NOT NULL
      THEN (ts.session_date::timestamptz + (ts.duration_minutes * INTERVAL '1 minute'))
      ELSE NULL
    END                                                                AS end_at,
    'completed'::text                                                  AS status,
    ''                                                                 AS club_name,
    NULL::text                                                         AS court_name,
    jsonb_build_object(
      'coach_name',       p_coach.display_name,
      'session_type',     ts.session_type,
      'duration_minutes', ts.duration_minutes,
      'notes',            ts.notes,
      'link',             '/player/coach'
    )                                                                  AS metadata
  FROM public.training_sessions ts
  JOIN public.coach_profiles cp ON cp.id = ts.coach_id
  JOIN public.players p_coach ON p_coach.id = cp.player_id
  WHERE ts.player_id = v_player_id
    AND ts.session_date BETWEEN p_date_from AND p_date_to
    AND ts.coach_booking_id IS NULL;

  -- 5. Torneos (inscripción confirmada, activos en el rango)
  RETURN QUERY
  SELECT
    tr.id,
    'tournament'::text                                                 AS type,
    ct.name                                                            AS title,
    COALESCE(ct.start_date::timestamptz, tr.requested_at)             AS start_at,
    ct.end_date::timestamptz                                           AS end_at,
    tr.status,
    COALESCE(c.name, '')                                               AS club_name,
    NULL::text                                                         AS court_name,
    jsonb_build_object(
      'link',      '/player/events',
      'cta_label', 'Ver torneo',
      'tournament_id', ct.id
    )                                                                  AS metadata
  FROM public.tournament_registrations tr
  JOIN public.club_tournaments ct ON ct.id = tr.tournament_id
  JOIN public.clubs c ON c.id = ct.club_id AND c.deleted_at IS NULL
  WHERE tr.player_id = v_player_id
    AND tr.status = 'confirmed'
    AND (
      ct.start_date IS NULL
      OR (ct.start_date <= p_date_to
          AND (ct.end_date IS NULL OR ct.end_date >= p_date_from))
    );

  -- 6. Ligas (inscripción confirmada, activas en el rango)
  RETURN QUERY
  SELECT
    lr.id,
    'league'::text                                                     AS type,
    cl.name                                                            AS title,
    COALESCE(cl.start_date::timestamptz, lr.requested_at)             AS start_at,
    cl.end_date::timestamptz                                           AS end_at,
    lr.status,
    COALESCE(c.name, '')                                               AS club_name,
    NULL::text                                                         AS court_name,
    jsonb_build_object(
      'link',      '/player/events',
      'cta_label', 'Ver liga',
      'league_id', cl.id
    )                                                                  AS metadata
  FROM public.league_registrations lr
  JOIN public.club_leagues cl ON cl.id = lr.league_id
  JOIN public.clubs c ON c.id = cl.club_id AND c.deleted_at IS NULL
  WHERE lr.player_id = v_player_id
    AND lr.status = 'confirmed'
    AND (
      cl.start_date IS NULL
      OR (cl.start_date <= p_date_to
          AND (cl.end_date IS NULL OR cl.end_date >= p_date_from))
    );

END;
$$;

GRANT EXECUTE ON FUNCTION public.get_player_calendar(date, date) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- Q7 Coach Booking Flow RPCs
-- Flujo B: el entrenador inicia una sesión con un alumno.
-- Flujo compartido: confirmación y cancelación.
--
-- RPCs:
--   coach_create_booking   — entrenador agenda sesión → notifica jugador
--   coach_confirm_booking  — entrenador confirma solicitud → notifica jugador
--   coach_reject_booking   — entrenador rechaza/cancela → notifica jugador
--   coach_cancel_booking   — cualquier parte cancela sesión futura

BEGIN;

-- ── coach_create_booking ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.coach_create_booking(
  p_player_id         uuid,
  p_scheduled_at      timestamptz,
  p_duration_minutes  int,
  p_club_id           uuid,
  p_court_id          uuid  DEFAULT NULL,
  p_notes_coach       text  DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid          uuid := auth.uid();
  v_coach_id     uuid;
  v_coach_name   text;
  v_booking_id   uuid;
  v_player_uid   uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  -- Resolver entrenador
  SELECT cp.id, p.display_name
    INTO v_coach_id, v_coach_name
  FROM public.coach_profiles cp
  JOIN public.players p ON p.id = cp.player_id
  WHERE p.user_id = v_uid AND p.deleted_at IS NULL AND cp.activo = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'COACH_NOT_FOUND'; END IF;

  -- Resolver jugador
  SELECT user_id INTO v_player_uid
  FROM public.players
  WHERE id = p_player_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'PLAYER_NOT_FOUND'; END IF;

  -- Crear reserva
  INSERT INTO public.coach_bookings (
    coach_id, player_id, club_id, court_id,
    scheduled_at, duration_minutes, status, notes_coach
  )
  VALUES (
    v_coach_id, p_player_id, p_club_id, p_court_id,
    p_scheduled_at, p_duration_minutes, 'confirmed', p_notes_coach
  )
  RETURNING id INTO v_booking_id;

  -- Notificar al jugador
  IF v_player_uid IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, entity_id, payload, priority, dedupe_key)
    VALUES (
      v_player_uid,
      'coach_booking_confirmed',
      v_booking_id,
      jsonb_build_object(
        'schema_version', 1,
        'title',     'Tu entrenador agendó una sesión',
        'message',   v_coach_name
                     || ' · ' || to_char(p_scheduled_at, 'DD/MM HH24:MI')
                     || ' · ' || p_duration_minutes || ' min',
        'cta_label', 'Ver en calendario',
        'link',      '/player/calendario',
        'booking_id', v_booking_id,
        'coach_name', v_coach_name
      ),
      2,
      'coach_booking_confirmed:' || v_booking_id::text
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_booking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.coach_create_booking(uuid, timestamptz, int, uuid, uuid, text) TO authenticated;

-- ── coach_confirm_booking ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.coach_confirm_booking(
  p_booking_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid          uuid := auth.uid();
  v_coach_id     uuid;
  v_coach_name   text;
  v_booking      public.coach_bookings%ROWTYPE;
  v_player_uid   uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT cp.id, p.display_name
    INTO v_coach_id, v_coach_name
  FROM public.coach_profiles cp
  JOIN public.players p ON p.id = cp.player_id
  WHERE p.user_id = v_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'COACH_NOT_FOUND'; END IF;

  SELECT * INTO v_booking
  FROM public.coach_bookings
  WHERE id = p_booking_id AND coach_id = v_coach_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;

  UPDATE public.coach_bookings SET status = 'confirmed' WHERE id = p_booking_id;

  -- Notificar al jugador
  SELECT user_id INTO v_player_uid
  FROM public.players WHERE id = v_booking.player_id;

  IF v_player_uid IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, entity_id, payload, priority, dedupe_key)
    VALUES (
      v_player_uid,
      'coach_booking_confirmed',
      p_booking_id,
      jsonb_build_object(
        'schema_version', 1,
        'title',     'Sesión confirmada',
        'message',   v_coach_name || ' confirmó tu clase del '
                     || to_char(v_booking.scheduled_at, 'DD/MM " a las " HH24:MI'),
        'cta_label', 'Ver en calendario',
        'link',      '/player/calendario',
        'booking_id', p_booking_id
      ),
      2,
      'coach_booking_confirmed:' || p_booking_id::text
    )
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.coach_confirm_booking(uuid) TO authenticated;

-- ── coach_reject_booking ──────────────────────────────────────────────────────
-- Rechaza una solicitud pendiente o cancela una confirmada.
-- Envía notificación al jugador con tipo coach_booking_cancelled.

CREATE OR REPLACE FUNCTION public.coach_reject_booking(
  p_booking_id uuid,
  p_reason     text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid          uuid := auth.uid();
  v_coach_id     uuid;
  v_coach_name   text;
  v_booking      public.coach_bookings%ROWTYPE;
  v_player_uid   uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT cp.id, p.display_name
    INTO v_coach_id, v_coach_name
  FROM public.coach_profiles cp
  JOIN public.players p ON p.id = cp.player_id
  WHERE p.user_id = v_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'COACH_NOT_FOUND'; END IF;

  SELECT * INTO v_booking
  FROM public.coach_bookings
  WHERE id = p_booking_id AND coach_id = v_coach_id
    AND status IN ('pending', 'confirmed');
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;

  UPDATE public.coach_bookings
  SET status = 'cancelled',
      notes_coach = CASE WHEN p_reason IS NOT NULL THEN p_reason ELSE notes_coach END
  WHERE id = p_booking_id;

  -- Notificar al jugador
  SELECT user_id INTO v_player_uid
  FROM public.players WHERE id = v_booking.player_id;

  IF v_player_uid IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, entity_id, payload, priority, dedupe_key)
    VALUES (
      v_player_uid,
      'coach_booking_cancelled',
      p_booking_id,
      jsonb_build_object(
        'schema_version', 1,
        'title',   'Sesión cancelada',
        'message', v_coach_name || ' canceló la clase del '
                   || to_char(v_booking.scheduled_at, 'DD/MM " a las " HH24:MI')
                   || CASE WHEN p_reason IS NOT NULL THEN '. Motivo: ' || p_reason ELSE '' END,
        'link',    '/player/calendario'
      ),
      1,
      'coach_booking_cancelled:' || p_booking_id::text
    )
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.coach_reject_booking(uuid, text) TO authenticated;

-- ── coach_cancel_booking ──────────────────────────────────────────────────────
-- El jugador (o el entrenador) cancela una sesión futura.
-- Si la cancela el jugador, notifica al entrenador.
-- Si la cancela el entrenador, usa coach_reject_booking en su lugar.

CREATE OR REPLACE FUNCTION public.coach_cancel_booking(
  p_booking_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid          uuid := auth.uid();
  v_player_id    uuid;
  v_booking      public.coach_bookings%ROWTYPE;
  v_coach_uid    uuid;
  v_player_name  text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  -- Resolver el jugador autenticado
  SELECT id, display_name INTO v_player_id, v_player_name
  FROM public.players
  WHERE user_id = v_uid AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'PLAYER_NOT_FOUND'; END IF;

  -- Verificar que el booking pertenece a este jugador y es futuro
  SELECT * INTO v_booking
  FROM public.coach_bookings
  WHERE id = p_booking_id
    AND player_id = v_player_id
    AND status IN ('pending', 'confirmed')
    AND scheduled_at > now();
  IF NOT FOUND THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;

  UPDATE public.coach_bookings SET status = 'cancelled' WHERE id = p_booking_id;

  -- Notificar al entrenador
  SELECT p.user_id INTO v_coach_uid
  FROM public.coach_profiles cp
  JOIN public.players p ON p.id = cp.player_id
  WHERE cp.id = v_booking.coach_id;

  IF v_coach_uid IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, entity_id, payload, priority, dedupe_key)
    VALUES (
      v_coach_uid,
      'coach_booking_cancelled',
      p_booking_id,
      jsonb_build_object(
        'schema_version', 1,
        'title',   'Sesión cancelada por el alumno',
        'message', v_player_name || ' canceló la clase del '
                   || to_char(v_booking.scheduled_at, 'DD/MM " a las " HH24:MI'),
        'link',    '/player/coach?tab=agenda'
      ),
      1,
      'coach_cancel_by_player:' || p_booking_id::text
    )
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.coach_cancel_booking(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;

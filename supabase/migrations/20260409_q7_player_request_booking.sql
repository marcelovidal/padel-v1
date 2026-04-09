-- Q7: player_request_coach_booking
-- El jugador solicita una clase con un entrenador.
-- Crea coach_booking con status = 'pending' y notifica al entrenador.

BEGIN;

CREATE OR REPLACE FUNCTION public.player_request_coach_booking(
  p_coach_id          uuid,
  p_scheduled_at      timestamptz,
  p_duration_minutes  int,
  p_notes_player      text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid           uuid := auth.uid();
  v_player_id     uuid;
  v_player_name   text;
  v_coach         public.coach_profiles%ROWTYPE;
  v_coach_uid     uuid;
  v_booking_id    uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT id, display_name INTO v_player_id, v_player_name
  FROM public.players
  WHERE user_id = v_uid AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'PLAYER_NOT_FOUND'; END IF;

  SELECT * INTO v_coach
  FROM public.coach_profiles
  WHERE id = p_coach_id AND activo = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'COACH_NOT_FOUND'; END IF;

  SELECT user_id INTO v_coach_uid
  FROM public.players WHERE id = v_coach.player_id;

  INSERT INTO public.coach_bookings (
    coach_id, player_id, club_id,
    scheduled_at, duration_minutes, status, notes_player
  )
  VALUES (
    p_coach_id, v_player_id, v_coach.primary_club_id,
    p_scheduled_at, p_duration_minutes, 'pending', p_notes_player
  )
  RETURNING id INTO v_booking_id;

  -- Notificar al entrenador (campana, requiere acción)
  IF v_coach_uid IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, entity_id, payload, priority, dedupe_key)
    VALUES (
      v_coach_uid,
      'coach_booking_request',
      v_booking_id,
      jsonb_build_object(
        'schema_version', 1,
        'title',       'Solicitud de clase',
        'message',     v_player_name
                       || ' · ' || to_char(p_scheduled_at, 'DD/MM HH24:MI')
                       || ' · ' || p_duration_minutes || ' min',
        'cta_label',   'Ver en agenda',
        'link',        '/player/coach?tab=agenda',
        'booking_id',  v_booking_id,
        'player_name', v_player_name
      ),
      1,
      'coach_booking_request:' || v_booking_id::text
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_booking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.player_request_coach_booking(uuid, timestamptz, int, text) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;

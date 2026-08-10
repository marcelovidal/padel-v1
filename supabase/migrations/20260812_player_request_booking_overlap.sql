-- ============================================================================
-- player_request_booking — validar solapamiento antes de insertar
-- ============================================================================
-- APLICAR MANUALMENTE EN SUPABASE.
-- APLICAR DESPUES de 20260812_club_get_occupied_slots.sql, que crea la funcion
-- que este chequeo invoca. El nombre comparte el prefijo de fecha y ordena
-- despues alfabeticamente ('c' < 'p') para que el orden de los archivos
-- coincida con el orden de aplicacion.
--
-- Problema
-- --------
-- player_request_booking validaba horarios, encuadre en la grilla y duracion,
-- pero NO consultaba si el turno ya estaba ocupado. Insertaba siempre. Dos
-- jugadores podian pedir el mismo turno y los dos recibian "solicitud
-- enviada"; el conflicto recien aparecia cuando el club intentaba confirmar
-- la segunda, con BOOKING_OVERLAP desde club_confirm_booking.
--
-- Tampoco veia turnos fijos, partidos de liga o torneo ni clases: se podia
-- pedir una cancha encima de una final de torneo ya programada.
--
-- Cambio
-- ------
-- Un unico bloque nuevo, entre la ultima validacion de encuadre y el INSERT,
-- que consulta club_get_occupied_slots. Todo lo demas es copia verbatim de la
-- version vigente (pg_get_functiondef sobre produccion).
--
-- Se agrega ademas la variable v_conflict_type al DECLARE, que es parte del
-- mismo bloque: sirve para informar el origen de la ocupacion.
--
-- Por que va antes del INSERT y despues de todo lo demas
-- ------------------------------------------------------
-- Las validaciones previas son aritmetica sobre datos ya cargados en
-- variables. Esta recorre siete tablas. Ponerla al final evita pagar ese costo
-- en las solicitudes que igual van a fallar por horario invalido.
--
-- Por que BOOKING_OVERLAP y no un codigo nuevo
-- --------------------------------------------
-- lib/actions/booking.actions.ts:46 ya mapea BOOKING_OVERLAP a un mensaje de
-- permisos entendible. Un codigo nuevo caeria en UNKNOWN y el jugador veria
-- "No pudimos completar la accion". Se reusa el contrato existente.
--
-- El origen concreto viaja en DETAIL, que inferBookingErrorCode ya concatena
-- al buscar el codigo. Hoy solo sirve para logs y depuracion: el texto que ve
-- el jugador sale de errorMessageFor(code), que ignora DETAIL. Mostrarlo
-- requiere tocar TypeScript y queda fuera del alcance de este paso.
--
-- Nota: el mensaje actual de errorMessageFor('BOOKING_OVERLAP') dice "La
-- cancha ya tiene una reserva confirmada en ese horario". Con este cambio la
-- causa tambien puede ser una solicitud pendiente, un turno fijo, un partido
-- o una clase. El texto quedo corto — ver el informe.
--
-- Esto NO reemplaza al constraint de exclusion
-- --------------------------------------------
-- Entre este SELECT y el INSERT hay una ventana de concurrencia que ninguna
-- validacion en el cuerpo puede cerrar. La cierra el EXCLUDE de
-- 20260813_court_bookings_exclude_overlap.sql. Este chequeo existe para dar un
-- error entendible en el 99% de los casos; el constraint, para el 1% restante.
--
-- CREATE OR REPLACE conserva los GRANT existentes. La firma se reproduce
-- exacta: cambiar un tipo o un DEFAULT crearia una sobrecarga nueva.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.player_request_booking(p_club_id uuid, p_court_id uuid, p_start_at timestamp with time zone, p_end_at timestamp with time zone, p_note text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid;
  v_player_id uuid;
  v_booking_id uuid;
  v_court_ok boolean;
  v_timezone text;
  v_opening_time time;
  v_closing_time time;
  v_slot_interval_minutes int;
  v_start_local timestamp;
  v_end_local timestamp;
  v_start_minutes int;
  v_conflict_type text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF p_end_at <= p_start_at THEN
    RAISE EXCEPTION 'INVALID_TIME_RANGE';
  END IF;

  IF p_start_at < now() - interval '10 minutes' THEN
    RAISE EXCEPTION 'BOOKING_MUST_BE_FUTURE';
  END IF;

  IF p_start_at > now() + interval '60 days' THEN
    RAISE EXCEPTION 'BOOKING_TOO_FAR';
  END IF;

  SELECT p.id
    INTO v_player_id
  FROM public.players p
  WHERE p.user_id = v_uid
    AND p.deleted_at IS NULL
  LIMIT 1;

  SELECT EXISTS (
    SELECT 1
    FROM public.club_courts cc
    JOIN public.clubs c
      ON c.id = cc.club_id
    WHERE cc.id = p_court_id
      AND cc.club_id = p_club_id
      AND cc.active = true
      AND c.deleted_at IS NULL
      AND c.archived_at IS NULL
      AND c.merged_into IS NULL
  ) INTO v_court_ok;

  IF NOT COALESCE(v_court_ok, false) THEN
    RAISE EXCEPTION 'COURT_NOT_AVAILABLE';
  END IF;

  SELECT
    COALESCE(cbs.timezone, 'America/Argentina/Buenos_Aires'),
    cc.opening_time,
    cc.closing_time,
    COALESCE(cc.slot_interval_minutes, cbs.slot_duration_minutes, 90)
  INTO
    v_timezone,
    v_opening_time,
    v_closing_time,
    v_slot_interval_minutes
  FROM public.club_courts cc
  LEFT JOIN public.club_booking_settings cbs
    ON cbs.club_id = cc.club_id
  WHERE cc.id = p_court_id
  LIMIT 1;

  v_start_local := p_start_at AT TIME ZONE v_timezone;
  v_end_local := p_end_at AT TIME ZONE v_timezone;

  -- Booking must stay on the same local date and inside court hours.
  IF v_start_local::date <> v_end_local::date THEN
    RAISE EXCEPTION 'BOOKING_INVALID_SLOT';
  END IF;

  IF v_start_local::time < v_opening_time OR v_end_local::time > v_closing_time THEN
    RAISE EXCEPTION 'BOOKING_OUTSIDE_HOURS';
  END IF;

  IF EXTRACT(EPOCH FROM (p_end_at - p_start_at))::int / 60 <> v_slot_interval_minutes THEN
    RAISE EXCEPTION 'BOOKING_INVALID_DURATION';
  END IF;

  v_start_minutes := FLOOR(EXTRACT(EPOCH FROM (v_start_local::time - v_opening_time)) / 60.0);
  IF v_start_minutes < 0 OR (v_start_minutes % v_slot_interval_minutes) <> 0 THEN
    RAISE EXCEPTION 'BOOKING_INVALID_SLOT';
  END IF;

  -- Solapamiento contra la fuente unica de disponibilidad: reservas pedidas o
  -- confirmadas, turnos fijos, partidos de liga y torneo (grupos y playoffs) y
  -- clases con entrenador. El filtro por court_id es necesario porque
  -- club_get_occupied_slots devuelve todas las canchas del club.
  SELECT o.occupancy_type
    INTO v_conflict_type
  FROM public.club_get_occupied_slots(p_club_id, p_start_at, p_end_at) o
  WHERE o.court_id = p_court_id
  ORDER BY o.start_at
  LIMIT 1;

  IF v_conflict_type IS NOT NULL THEN
    RAISE EXCEPTION 'BOOKING_OVERLAP'
      USING DETAIL = CONCAT('Ocupado por: ', v_conflict_type);
  END IF;

  INSERT INTO public.court_bookings (
    club_id,
    court_id,
    requested_by_player_id,
    requested_by_user_id,
    start_at,
    end_at,
    status,
    note,
    updated_at
  )
  VALUES (
    p_club_id,
    p_court_id,
    v_player_id,
    v_uid,
    p_start_at,
    p_end_at,
    'requested',
    NULLIF(TRIM(p_note), ''),
    now()
  )
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$function$;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- Verificacion post-aplicacion
-- ============================================================================
-- 1) No se creo una sobrecarga por firma distinta:
--
--    select count(*), min(p.oid::regprocedure::text)
--    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname = 'player_request_booking';
--
--    Esperado: 1.
--
-- 2) El chequeo quedo en el cuerpo:
--
--    select p.prosrc ~* 'club_get_occupied_slots' as valida_solapamiento
--    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname = 'player_request_booking';
--
--    Esperado: true.
--
-- 3) Prueba funcional del caso que motivo el cambio: desde
--    /player/bookings/new, pedir un turno que ya tiene una solicitud
--    pendiente de otro jugador. Antes: se creaba una segunda solicitud.
--    Ahora: "La cancha ya tiene una reserva confirmada en ese horario".
--
-- 4) Que no rompio el camino feliz: pedir un turno libre sigue funcionando y
--    devuelve el uuid de la reserva.
--
-- 5) Que un turno contiguo sigue siendo reservable: si hay una reserva de
--    19:00 a 20:30, pedir 20:30 a 22:00 en la misma cancha debe funcionar.
--    Es la semantica semiabierta [inicio, fin) y es el caso mas facil de
--    romper sin darse cuenta.
--
-- 6) Que un turno fijo ahora bloquea: con un club que tenga una regla activa,
--    pedir esa cancha ese dia a esa hora debe fallar con BOOKING_OVERLAP y
--    DETAIL 'Ocupado por: fixed_slot'.
-- ============================================================================

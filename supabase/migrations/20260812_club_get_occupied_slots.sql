-- ============================================================================
-- club_get_occupied_slots — fuente unica de disponibilidad de canchas
-- ============================================================================
-- APLICAR MANUALMENTE EN SUPABASE. Este archivo no se ejecuta solo.
--
-- Problema
-- --------
-- Habia tres calculos de disponibilidad distintos y ninguno completo:
--
--   * la grilla de /player/bookings/new: query inline a court_bookings
--     filtrada por status = 'confirmed'. No ve solicitudes pendientes, ni
--     turnos fijos, ni partidos de liga o torneo.
--   * club_get_agenda_slots: la vista del panel del club. Ve mas cosas, pero
--     exige ser administrador (q6_can_manage_club) y proyecta nombres de
--     jugadores y de equipos, asi que no sirve para el jugador ni para lo
--     publico.
--   * player_request_booking: no chequea solapamiento de ninguna clase.
--
-- Consecuencias en produccion: dos jugadores pueden pedir el mismo turno y
-- los dos ven verde; un turno fijo activo se muestra disponible; se puede
-- reservar sobre un partido de liga ya programado.
--
-- Esta funcion es la unica respuesta a "que esta ocupado en este club entre
-- estas dos fechas". La consume la grilla del jugador (PASO 4) y la
-- validacion de player_request_booking (PASO 2).
--
-- Decision de producto
-- --------------------
-- Una solicitud en estado 'requested' OCUPA el turno. El primero que pide se
-- lo reserva de hecho; el club confirma o rechaza esa unica solicitud en vez
-- de elegir entre varias superpuestas.
--
-- Siete origenes de ocupacion
-- ---------------------------
--   1. court_bookings            requested + confirmed
--   2. court_fixed_slots         activos y vigentes en el rango
--   3. league_matches            con cancha y horario
--   4. tournament_matches        con cancha y horario
--   5. league_playoff_matches    con cancha y horario
--   6. tournament_playoff_matches con cancha y horario
--   7. coach_bookings            pending + confirmed
--
-- Las tres ultimas no estaban en el planteo original. Se incluyen porque
-- tienen court_id y scheduled_at reales: dejarlas afuera reabre exactamente
-- el mismo agujero por otro lado, y coach_bookings es de uso diario.
--
-- Sin guardian, a proposito
-- -------------------------
-- No lleva q6_can_manage_club: la consume el jugador, que no administra el
-- club. Por eso la proyeccion esta acotada a lo minimo — cancha, intervalo,
-- tipo de ocupacion y el id de la fila de origen. NO sale ningun dato
-- personal: ni nombres de jugadores, ni equipos, ni notas, ni player_id, ni
-- el nombre de la liga o del torneo. Es la diferencia deliberada con
-- club_get_agenda_slots, que si proyecta requester_name, team_a y team_b y
-- por eso conserva su guardian de administrador.
--
-- El id de origen se expone para que la UI pueda desduplicar y para depurar.
-- Es un uuid opaco: no revela nada por si solo y no permite leer la fila,
-- porque las tablas de origen siguen con su RLS intacta.
--
-- Alcance del GRANT: solo authenticated. El flujo publico de reserva todavia
-- no existe; cuando exista, habilitarlo es agregar anon en un GRANT, sin
-- tocar el cuerpo.
--
-- Timezone: el fallback es el camino normal, no el borde
-- ------------------------------------------------------
-- club_booking_settings tiene UNA sola fila en produccion, de un solo club.
-- Todos los demas clubes resuelven su timezone por el COALESCE. Por eso el
-- LEFT JOIN es obligatorio: con un JOIN comun, la expansion de turnos fijos
-- devolveria cero filas para casi todos los clubes, en silencio y sin error.
--
-- Cadena hasta el club de las tablas de playoff
-- ---------------------------------------------
-- No son simetricas entre si, verificado contra los FK de la base:
--   league_playoff_matches.division_id  -> league_divisions -> club_leagues
--   tournament_playoff_matches.tournament_id -> club_tournaments  (un solo salto)
-- La de torneo cuelga directo del torneo y no pasa por grupos, a diferencia
-- de tournament_matches.
--
-- Convencion de duracion
-- ----------------------
-- Los partidos de liga y torneo no tienen columna de duracion: se usa
-- slot_interval_minutes de la cancha con fallback 90, que es exactamente lo
-- que ya hace club_get_agenda_slots. Se replica para que las dos funciones no
-- discrepen. coach_bookings si tiene duration_minutes propio y se usa ese.
--
-- Semantica de solapamiento
-- -------------------------
-- Intervalos semiabiertos [inicio, fin): una ocupacion que termina 20:00 y
-- otra que empieza 20:00 NO se solapan. Es el mismo criterio que aplica el
-- EXCLUDE del PASO 3 y el que ya usa club_get_agenda_slots con su
-- start_at < p_to AND end_at > p_from.
-- ============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.club_get_occupied_slots(uuid, timestamptz, timestamptz);

CREATE FUNCTION public.club_get_occupied_slots(
  p_club_id uuid,
  p_from    timestamptz,
  p_to      timestamptz
)
RETURNS TABLE (
  court_id       uuid,
  start_at       timestamptz,
  end_at         timestamptz,
  occupancy_type text,
  source_id      uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_timezone text;
BEGIN
  IF p_club_id IS NULL OR p_from IS NULL OR p_to IS NULL THEN
    RAISE EXCEPTION 'INVALID_ARGUMENTS';
  END IF;

  IF p_to <= p_from THEN
    RAISE EXCEPTION 'INVALID_TIME_RANGE';
  END IF;

  -- Techo defensivo: la expansion de turnos fijos genera una fila por dia del
  -- rango y por regla vigente. Sin limite, un rango de anios es un problema
  -- de performance servido por una funcion sin guardian.
  IF p_to > p_from + INTERVAL '90 days' THEN
    RAISE EXCEPTION 'RANGE_TOO_WIDE';
  END IF;

  -- Timezone del club para expandir los turnos fijos, que estan guardados
  -- como hora local (day_of_week + start_time/end_time) y no como timestamptz.
  SELECT COALESCE(cbs.timezone, 'America/Argentina/Buenos_Aires')
    INTO v_timezone
  FROM public.clubs c
  LEFT JOIN public.club_booking_settings cbs ON cbs.club_id = c.id
  WHERE c.id = p_club_id;

  IF v_timezone IS NULL THEN
    v_timezone := 'America/Argentina/Buenos_Aires';
  END IF;

  RETURN QUERY

    -- ── 1. court_bookings: requested tambien ocupa ────────────────────────
    SELECT
      cb.court_id,
      cb.start_at,
      cb.end_at,
      CASE cb.status
        WHEN 'requested' THEN 'booking_requested'
        ELSE 'booking_confirmed'
      END::text            AS occupancy_type,
      cb.id                AS source_id
    FROM public.court_bookings cb
    WHERE cb.club_id  = p_club_id
      AND cb.status   IN ('requested', 'confirmed')
      AND cb.start_at < p_to
      AND cb.end_at   > p_from

  UNION ALL

    -- ── 2. court_fixed_slots: recurrencia semanal expandida a fechas ──────
    -- El margen de +-1 dia en generate_series cubre el corrimiento entre la
    -- fecha UTC del rango y la fecha local del club: un turno del lunes a las
    -- 21:00 local puede caer en martes UTC.
    SELECT
      fs.court_id,
      ((d.dia + fs.start_time) AT TIME ZONE v_timezone) AS start_at,
      ((d.dia + fs.end_time)   AT TIME ZONE v_timezone) AS end_at,
      'fixed_slot'::text                                AS occupancy_type,
      fs.id                                             AS source_id
    FROM public.court_fixed_slots fs
    CROSS JOIN LATERAL generate_series(
      ((p_from AT TIME ZONE v_timezone)::date - 1),
      ((p_to   AT TIME ZONE v_timezone)::date + 1),
      INTERVAL '1 day'
    ) AS d(dia)
    WHERE fs.club_id = p_club_id
      AND fs.status  = 'active'
      AND EXTRACT(DOW FROM d.dia)::int = fs.day_of_week
      AND fs.valid_from <= d.dia::date
      AND (fs.valid_until IS NULL OR fs.valid_until >= d.dia::date)
      AND ((d.dia + fs.start_time) AT TIME ZONE v_timezone) < p_to
      AND ((d.dia + fs.end_time)   AT TIME ZONE v_timezone) > p_from

  UNION ALL

    -- ── 3. league_matches ─────────────────────────────────────────────────
    SELECT
      lm.court_id,
      lm.scheduled_at,
      lm.scheduled_at + (COALESCE(cc.slot_interval_minutes, 90) * INTERVAL '1 minute'),
      'league_match'::text,
      lm.id
    FROM public.league_matches   lm
    JOIN public.club_courts      cc ON cc.id = lm.court_id
    JOIN public.league_groups    lg ON lg.id = lm.group_id
    JOIN public.league_divisions ld ON ld.id = lg.division_id
    JOIN public.club_leagues     cl ON cl.id = ld.league_id
    WHERE cl.club_id      = p_club_id
      AND lm.court_id     IS NOT NULL
      AND lm.scheduled_at IS NOT NULL
      AND lm.scheduled_at < p_to
      AND (lm.scheduled_at
        + (COALESCE(cc.slot_interval_minutes, 90) * INTERVAL '1 minute')) > p_from

  UNION ALL

    -- ── 4. tournament_matches ─────────────────────────────────────────────
    SELECT
      tm.court_id,
      tm.scheduled_at,
      tm.scheduled_at + (COALESCE(cc.slot_interval_minutes, 90) * INTERVAL '1 minute'),
      'tournament_match'::text,
      tm.id
    FROM public.tournament_matches tm
    JOIN public.club_courts        cc ON cc.id = tm.court_id
    JOIN public.tournament_groups  tg ON tg.id = tm.group_id
    JOIN public.club_tournaments   ct ON ct.id = tg.tournament_id
    WHERE ct.club_id      = p_club_id
      AND tm.court_id     IS NOT NULL
      AND tm.scheduled_at IS NOT NULL
      AND tm.scheduled_at < p_to
      AND (tm.scheduled_at
        + (COALESCE(cc.slot_interval_minutes, 90) * INTERVAL '1 minute')) > p_from

  UNION ALL

    -- ── 5. league_playoff_matches ─────────────────────────────────────────
    SELECT
      lpm.court_id,
      lpm.scheduled_at,
      lpm.scheduled_at + (COALESCE(cc.slot_interval_minutes, 90) * INTERVAL '1 minute'),
      'league_playoff_match'::text,
      lpm.id
    FROM public.league_playoff_matches lpm
    JOIN public.club_courts            cc ON cc.id = lpm.court_id
    JOIN public.league_divisions       ld ON ld.id = lpm.division_id
    JOIN public.club_leagues           cl ON cl.id = ld.league_id
    WHERE cl.club_id       = p_club_id
      AND lpm.court_id     IS NOT NULL
      AND lpm.scheduled_at IS NOT NULL
      AND lpm.scheduled_at < p_to
      AND (lpm.scheduled_at
        + (COALESCE(cc.slot_interval_minutes, 90) * INTERVAL '1 minute')) > p_from

  UNION ALL

    -- ── 6. tournament_playoff_matches ─────────────────────────────────────
    SELECT
      tpm.court_id,
      tpm.scheduled_at,
      tpm.scheduled_at + (COALESCE(cc.slot_interval_minutes, 90) * INTERVAL '1 minute'),
      'tournament_playoff_match'::text,
      tpm.id
    FROM public.tournament_playoff_matches tpm
    JOIN public.club_courts                cc ON cc.id = tpm.court_id
    JOIN public.club_tournaments           ct ON ct.id = tpm.tournament_id
    WHERE ct.club_id       = p_club_id
      AND tpm.court_id     IS NOT NULL
      AND tpm.scheduled_at IS NOT NULL
      AND tpm.scheduled_at < p_to
      AND (tpm.scheduled_at
        + (COALESCE(cc.slot_interval_minutes, 90) * INTERVAL '1 minute')) > p_from

  UNION ALL

    -- ── 7. coach_bookings: clases particulares con cancha asignada ────────
    -- Unica fuente con duracion propia (duration_minutes NOT NULL).
    -- 'completed' queda afuera: es pasado y no compite por disponibilidad.
    SELECT
      cbk.court_id,
      cbk.scheduled_at,
      cbk.scheduled_at + (cbk.duration_minutes * INTERVAL '1 minute'),
      'coach_booking'::text,
      cbk.id
    FROM public.coach_bookings cbk
    WHERE cbk.club_id      = p_club_id
      AND cbk.court_id     IS NOT NULL
      AND cbk.status       IN ('pending', 'confirmed')
      AND cbk.scheduled_at < p_to
      AND (cbk.scheduled_at + (cbk.duration_minutes * INTERVAL '1 minute')) > p_from

  ORDER BY 1, 2;

END;
$$;

COMMENT ON FUNCTION public.club_get_occupied_slots(uuid, timestamptz, timestamptz) IS
  'Fuente unica de disponibilidad: devuelve todos los intervalos ocupados de un '
  'club en un rango, con su origen. Sin guardian de administrador a proposito — '
  'la consume la grilla del jugador. La proyeccion esta acotada a cancha, '
  'intervalo, tipo y id de origen: NO exponer nombres de jugadores, equipos, '
  'notas ni ningun dato personal al ampliarla. Para la vista rica del panel del '
  'club, con nombres y equipos, usar club_get_agenda_slots, que si tiene guardian.';

REVOKE ALL ON FUNCTION public.club_get_occupied_slots(uuid, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_get_occupied_slots(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_get_occupied_slots(uuid, timestamptz, timestamptz) TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- Verificacion post-aplicacion
-- ============================================================================
-- 1) La funcion existe con una sola firma:
--
--    select p.oid::regprocedure, p.prosecdef, p.provolatile
--    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname = 'club_get_occupied_slots';
--
--    Esperado: 1 fila, prosecdef = true, provolatile = 's'.
--
-- 2) Devuelve los siete origenes. Con un club que tenga movimiento:
--
--    select occupancy_type, count(*)
--    from public.club_get_occupied_slots(
--      '<club_id>'::uuid, now(), now() + interval '14 days')
--    group by occupancy_type order by 1;
--
-- 3) Contraste contra la vista del panel: para el mismo club y rango, los
--    intervalos de tipo booking_* deben coincidir uno a uno con los que
--    devuelve club_get_agenda_slots.
--
--    select count(*) from public.club_get_occupied_slots(
--      '<club_id>'::uuid, now(), now() + interval '7 days')
--    where occupancy_type like 'booking_%';
--
--    select count(*) from public.club_get_agenda_slots(
--      '<club_id>'::uuid, now(), now() + interval '7 days')
--    where slot_type like 'booking_%';
--
--    Si difieren, la version vigente de club_get_agenda_slots filtra distinto
--    y hay que revisar cual de las dos tiene razon.
--
-- 4) Turnos fijos: es la logica nueva del proyecto y no tiene con que
--    contrastarse. Con un club que tenga reglas activas, verificar que la
--    expansion caiga en el dia de semana correcto y en la hora local correcta:
--
--    select fs.day_of_week, fs.start_time, fs.end_time, fs.valid_from,
--           o.start_at, o.end_at,
--           (o.start_at AT TIME ZONE 'America/Argentina/Buenos_Aires') as inicio_local
--    from public.court_fixed_slots fs
--    join public.club_get_occupied_slots(
--           '<club_id>'::uuid, now(), now() + interval '14 days') o
--      ON o.source_id = fs.id
--    where o.occupancy_type = 'fixed_slot'
--    order by o.start_at;
--
--    inicio_local debe coincidir con start_time, y el dia de semana de
--    start_at debe coincidir con day_of_week (0=Domingo).
--
-- 5) Que un jugador sin permisos de club pueda ejecutarla: con la sesion de un
--    jugador comun, la llamada debe devolver filas y no NOT_ALLOWED.
--
-- ============================================================================
-- Supuestos, todos verificados contra produccion
-- ============================================================================
-- * day_of_week 0=Domingo..6=Sabado: CHECK (day_of_week >= 0 AND <= 6) en la
--   tabla, y DOW_OPTIONS/DOW_LABEL en FixedSlotsTab.tsx:38-56 mapea 0=Domingo.
--   Coincide con EXTRACT(DOW) de Postgres, sin corrimiento.
-- * court_fixed_slots.status: CHECK (status IN ('active','released')).
--   'active' es el unico que ocupa; 'released' es un turno devuelto.
-- * Un turno fijo no puede cruzar medianoche: CHECK (end_time > start_time)
--   lo garantiza a nivel tabla, asi que la expansion no necesita defenderse.
-- * coach_bookings.status IN ('pending','confirmed','cancelled','completed'),
--   de chk_coach_bookings_status en 20260407_q5_coach_profiles.sql:151.
--
-- Sobre la expansion de recurrencia
-- ---------------------------------
-- No hay con que compararla: la version vigente de club_get_agenda_slots en
-- produccion tiene solo tres ramas (court_bookings, league_matches,
-- tournament_matches) y NO expande turnos fijos. Esta es la primera logica de
-- expansion del proyecto, no una replica de una existente.
--
-- Consecuencia colateral: los turnos fijos hoy no aparecen en la agenda del
-- club tampoco, aunque AgendaGrid tenga el caso 'fixed_slot' resuelto en
-- cinco lugares. Ver el informe del PASO 5.
-- ============================================================================

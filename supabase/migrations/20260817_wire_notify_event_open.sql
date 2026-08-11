-- ============================================================================
-- Cablear q6_notify_event_open — difusion por ciudad al activar un evento
-- ============================================================================
-- APLICAR MANUALMENTE EN SUPABASE. Este archivo no se ejecuta solo.
-- APLICAR DESPUES de 20260816_public_event_registration.sql (orden del bloque;
-- no hay dependencia tecnica entre las dos).
--
-- El problema
-- -----------
-- q6_notify_event_open existe desde 20260308_q6_3_registrations.sql, hace el
-- bulk-insert por ciudad, tiene el dedupe puesto y los permisos dados. Y NADIE
-- LA LLAMA. Hoy activar un torneo no le avisa a nadie.
--
-- Ademas, el link que arma apunta a /player/events, que es una ruta privada:
-- exige sesion y onboarding completo. Para alguien que recibe la notificacion
-- y todavia no termino de registrarse, es una pared.
--
-- Por que dentro de las funciones y no con un trigger
-- ---------------------------------------------------
-- Un trigger sobre la columna se dispara con CUALQUIER UPDATE de status:
-- tambien el de un script de mantenimiento, una correccion desde el panel de
-- admin o un backfill. La difusion geografica le escribe a todos los jugadores
-- de las ciudades objetivo, asi que tiene que salir cuando el club activa el
-- evento a proposito, y no cuando alguien toca la fila.
--
-- Las definiciones de abajo son las vigentes en produccion, verbatim. Lo unico
-- que cambia respecto de esas:
--   - el SELECT inicial lee ademas status, name, start_date y target_city_ids
--   - despues del UPDATE, el bloque que llama a q6_notify_event_open
--
-- La condicion de disparo es `p_status = 'active'` Y el status anterior
-- distinto de 'active'. Sin la segunda mitad, guardar un torneo ya activo
-- volveria a intentar la difusion. El dedupe la haria inocua igual, pero el
-- trabajo se haria al pedo y el conteo devuelto mentiria.
--
-- Idempotencia
-- ------------
-- El dedupe_key ya existente hace que reactivar un evento — activo → borrador
-- → activo — no duplique notificaciones: el jugador que ya la recibio no la
-- recibe de nuevo.
-- ============================================================================

BEGIN;

-- Por si se llego a aplicar un borrador anterior de este archivo, que
-- enganchaba por trigger. Si nunca existieron, esto no hace nada.
DROP TRIGGER IF EXISTS trg_notify_tournament_open ON public.club_tournaments;
DROP TRIGGER IF EXISTS trg_notify_league_open ON public.club_leagues;
DROP FUNCTION IF EXISTS public.q6_trg_notify_tournament_open();
DROP FUNCTION IF EXISTS public.q6_trg_notify_league_open();

-- ─── 1. Link a la pagina publica ─────────────────────────────────────────────
-- Reemplazo completo del cuerpo. Se puede hacer porque hoy nadie la llama: su
-- cuerpo actual es codigo muerto y no hay camino vivo que romper.
--
-- La firma NO cambia —mismos seis parametros, mismo orden— para que los GRANT
-- existentes sigan valiendo. Por eso el slug se resuelve adentro en vez de
-- agregarse como parametro.
--
-- Lo unico que cambia respecto del original es de donde sale v_link: antes era
-- el literal '/player/events', ahora es la pagina publica del evento.

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
  v_segment     text;
  v_club_ref    text;
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

  v_segment := CASE p_entity_type
    WHEN 'tournament' THEN 'torneos'
    ELSE 'ligas'
  END;

  -- El slug del club sale de la fila del evento. clubs.slug existe desde
  -- 20260810_club_public_profile.sql, aplicada y verificada. El COALESCE al id
  -- cubre un club sin slug generado: /clubs/[slug] resuelve UUID igual y
  -- redirige a la URL canonica, asi que el link funciona en los dos casos.
  IF p_entity_type = 'tournament' THEN
    SELECT COALESCE(c.slug, c.id::text)
      INTO v_club_ref
    FROM public.club_tournaments ct
    JOIN public.clubs c ON c.id = ct.club_id
    WHERE ct.id = p_entity_id;
  ELSE
    SELECT COALESCE(c.slug, c.id::text)
      INTO v_club_ref
    FROM public.club_leagues cl
    JOIN public.clubs c ON c.id = cl.club_id
    WHERE cl.id = p_entity_id;
  END IF;

  -- Sin club resoluble no hay pagina publica a donde mandar. Antes que un link
  -- roto, se cae al listado privado, que al menos existe.
  v_link := CASE
    WHEN v_club_ref IS NULL THEN '/player/events'
    ELSE '/clubs/' || v_club_ref || '/' || v_segment || '/' || p_entity_id::text
  END;

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

-- ─── 2. Torneo: disparo al activar ───────────────────────────────────────────
-- Definicion vigente de produccion, verbatim, salvo el SELECT inicial ampliado
-- y el bloque de difusion al final.

CREATE OR REPLACE FUNCTION public.club_update_tournament_status(
  p_tournament_id uuid,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid;
  v_club_id uuid;
  v_prev_status text;
  v_name text;
  v_start_date date;
  v_city_ids text[];
  v_club_name text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  IF p_status NOT IN ('draft', 'active', 'finished') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;

  -- Ampliado: ademas de club_id se leen el status anterior y los datos que
  -- necesita la difusion. Se leen ANTES del UPDATE porque despues el status
  -- anterior ya no existe.
  SELECT club_id, status, name, start_date, target_city_ids
    INTO v_club_id, v_prev_status, v_name, v_start_date, v_city_ids
  FROM public.club_tournaments WHERE id = p_tournament_id;

  IF v_club_id IS NULL THEN RAISE EXCEPTION 'TOURNAMENT_NOT_FOUND'; END IF;
  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;

  UPDATE public.club_tournaments
  SET status = p_status, updated_at = now()
  WHERE id = p_tournament_id;

  -- Difusion geografica: solo en la transicion HACIA 'active'. Guardar un
  -- torneo que ya estaba activo no vuelve a notificar.
  IF p_status = 'active' AND v_prev_status IS DISTINCT FROM 'active' THEN
    SELECT c.name INTO v_club_name FROM public.clubs c WHERE c.id = v_club_id;

    PERFORM public.q6_notify_event_open(
      'tournament',
      p_tournament_id,
      v_name,
      COALESCE(v_club_name, 'Un club'),
      v_start_date,
      v_city_ids
    );
  END IF;
END;
$function$;

-- ─── 3. Liga: disparo al activar ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.club_update_league_status(
  p_league_id uuid,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid;
  v_club_id uuid;
  v_prev_status text;
  v_name text;
  v_start_date date;
  v_city_ids text[];
  v_club_name text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF p_status NOT IN ('draft', 'active', 'finished') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  -- Ampliado: ver el comentario equivalente en club_update_tournament_status.
  SELECT l.club_id, l.status, l.name, l.start_date, l.target_city_ids
    INTO v_club_id, v_prev_status, v_name, v_start_date, v_city_ids
  FROM public.club_leagues l
  WHERE l.id = p_league_id;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'LEAGUE_NOT_FOUND';
  END IF;

  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  UPDATE public.club_leagues
  SET status = p_status,
      updated_at = now()
  WHERE id = p_league_id;

  IF p_status = 'active' AND v_prev_status IS DISTINCT FROM 'active' THEN
    SELECT c.name INTO v_club_name FROM public.clubs c WHERE c.id = v_club_id;

    PERFORM public.q6_notify_event_open(
      'league',
      p_league_id,
      v_name,
      COALESCE(v_club_name, 'Un club'),
      v_start_date,
      v_city_ids
    );
  END IF;
END;
$function$;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================================
-- ANTES de aplicar
-- ============================================================================
-- El diff de q6_notify_event_open contra produccion ya se hizo el 11/08/2026:
-- la version viva era identica a la del repo, y lo unico que cambia aca son
-- las dos variables nuevas y el bloque que arma v_link.
--
-- clubs.slug tambien esta verificada: 20260810_club_public_profile.sql aplicada
-- el 10/08/2026, los 6 clubes con slug generado.
--
-- ============================================================================
-- Verificacion posterior (no destructiva, correr aparte)
-- ============================================================================
-- 1) Que las tres funciones quedaron como se espera, y que no hay triggers
--    colgados de un borrador anterior.
--
-- SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
-- FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname IN ('q6_notify_event_open', 'club_update_tournament_status',
--                     'club_update_league_status');
--
-- SELECT c.relname, t.tgname FROM pg_trigger t
-- JOIN pg_class c ON c.oid = t.tgrelid
-- WHERE NOT t.tgisinternal
--   AND c.relname IN ('club_tournaments', 'club_leagues');
--
-- 2) El link apunta a la pagina publica nueva, no a /player/events.
--
-- SELECT ct.name,
--        '/clubs/' || COALESCE(c.slug, c.id::text) || '/torneos/' || ct.id::text AS link_esperado,
--        coalesce(array_length(ct.target_city_ids, 1), 0) AS ciudades
-- FROM public.club_tournaments ct
-- JOIN public.clubs c ON c.id = ct.club_id
-- WHERE ct.status = 'active';
--
-- 3) Cuantos jugadores recibirian la difusion. Mismos filtros que la funcion —
--    es el numero que muestra el modal de alcance.
--
-- SELECT count(DISTINCT p.user_id)
-- FROM public.players p
-- WHERE p.city_id = ANY (SELECT unnest(target_city_ids) FROM public.club_tournaments WHERE id = '<ID>')
--   AND p.user_id IS NOT NULL AND p.status = 'active' AND p.deleted_at IS NULL;
--
-- 4) Que salio despues de activar. Pasar a borrador y volver a activar NO debe
--    sumar filas: el dedupe_key lo impide.
--
-- SELECT type, payload->>'link' AS link, count(*)
-- FROM public.notifications
-- WHERE type IN ('tournament_open_for_registration', 'league_open_for_registration')
-- GROUP BY 1, 2 ORDER BY 3 DESC;
-- ============================================================================

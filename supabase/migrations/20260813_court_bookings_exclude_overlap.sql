-- ============================================================================
-- court_bookings — constraint de exclusion contra solapamiento
-- ============================================================================
-- APLICAR MANUALMENTE EN SUPABASE. Este archivo no se ejecuta solo.
-- APLICAR DESPUES de 20260812_club_get_occupied_slots.sql y de la migracion
-- que valida el solapamiento dentro de player_request_booking.
--
-- Por que
-- -------
-- La validacion dentro de player_request_booking lee y despues inserta. Entre
-- las dos operaciones hay una ventana: dos solicitudes simultaneas sobre el
-- mismo turno pueden leer "libre" las dos y despues insertar las dos. Ninguna
-- cantidad de chequeo en el cuerpo de la funcion cierra esa ventana, porque el
-- problema no es la logica sino la concurrencia.
--
-- El EXCLUDE la cierra en el unico lugar donde se puede cerrar: el indice. La
-- segunda transaccion espera a que la primera termine y despues falla. Es la
-- red final, no la primera linea de defensa — la validacion del RPC sigue
-- siendo la que da el mensaje entendible.
--
-- Alcance: solo court_bookings contra si misma
-- --------------------------------------------
-- Un constraint de tabla no puede mirar otras tablas. Los turnos fijos, los
-- partidos de liga y torneo y las clases quedan cubiertos unicamente por la
-- validacion del RPC contra club_get_occupied_slots. Esto protege el caso mas
-- frecuente y mas concurrido: dos jugadores peleando el mismo turno.
--
-- Estado de la base al escribir esto
-- ----------------------------------
-- Verificado en produccion: 0 pares solapados en court_bookings entre filas
-- requested/confirmed (pares_solapados = 0, ambos_confirmados = 0,
-- con_impacto_futuro = 0). Por eso el constraint se crea directo y validando
-- las filas existentes, sin NOT VALID y sin limpieza previa.
--
-- Si al aplicarlo fallara con "conflicting key value violates exclusion
-- constraint", significa que entraron solapamientos entre esa verificacion y
-- la aplicacion. En ese caso NO forzar con NOT VALID: correr la consulta de
-- deteccion, resolver a mano cuales reservas quedan, y recien despues aplicar.
--
-- Semantica
-- ---------
-- tstzrange(start_at, end_at) es semiabierto [inicio, fin): una reserva que
-- termina 20:00 y otra que empieza 20:00 NO se consideran solapadas. Es el
-- mismo criterio de club_get_occupied_slots.
--
-- El WHERE deja afuera 'rejected' y 'cancelled' a proposito: una reserva
-- rechazada o cancelada no debe seguir bloqueando el turno.
-- ============================================================================

BEGIN;

-- btree_gist aporta el operator class que permite mezclar el operador = sobre
-- uuid con el operador && sobre rangos dentro del mismo indice GiST. Sin la
-- extension, el EXCLUDE falla con "data type uuid has no default operator
-- class for access method gist".
--
-- Verificado en produccion: instalada = 0, disponible = 1.
--
-- Se instala en el esquema extensions, que es la convencion de Supabase. Si
-- este proyecto no tuviera ese esquema, cambiar por:
--   CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- El ALTER de abajo necesita resolver gist_uuid_ops, que vive en el esquema
-- donde quedo la extension. Se fija el search_path de la transaccion en vez de
-- confiar en el del rol que corra la migracion.
SET LOCAL search_path = public, extensions;

ALTER TABLE public.court_bookings
  ADD CONSTRAINT excl_court_bookings_no_overlap
  EXCLUDE USING gist (
    court_id                          WITH =,
    tstzrange(start_at, end_at)       WITH &&
  )
  WHERE (status IN ('requested', 'confirmed'));

COMMENT ON CONSTRAINT excl_court_bookings_no_overlap ON public.court_bookings IS
  'Impide dos reservas superpuestas en la misma cancha cuando ambas estan '
  'requested o confirmed. Red final contra concurrencia: la validacion '
  'entendible vive en player_request_booking, contra club_get_occupied_slots. '
  'rejected y cancelled quedan fuera del WHERE para que no sigan bloqueando.';

COMMIT;

-- ============================================================================
-- Verificacion post-aplicacion
-- ============================================================================
-- 1) La extension quedo instalada:
--
--    select extname, n.nspname as esquema
--    from pg_extension e join pg_namespace n on n.oid = e.extnamespace
--    where extname = 'btree_gist';
--
-- 2) El constraint existe y es de exclusion:
--
--    select conname, contype, pg_get_constraintdef(oid)
--    from pg_constraint
--    where conrelid = 'public.court_bookings'::regclass
--      and conname = 'excl_court_bookings_no_overlap';
--
--    Esperado: contype = 'x'.
--
-- 3) Que efectivamente rechaza. En una transaccion que se descarta:
--
--    BEGIN;
--    INSERT INTO public.court_bookings (club_id, court_id, start_at, end_at, status)
--    SELECT club_id, court_id, start_at, end_at, 'requested'
--    FROM public.court_bookings
--    WHERE status IN ('requested','confirmed')
--    LIMIT 1;
--    -- Esperado: ERROR conflicting key value violates exclusion constraint
--    ROLLBACK;
--
-- 4) Que NO rechaza lo que debe permitir: dos reservas contiguas (una termina
--    donde arranca la otra) tienen que poder convivir, y una reserva nueva
--    sobre el horario de una 'cancelled' tambien.
--
-- 5) Que el flujo del club sigue andando: confirmar una solicitud pendiente
--    desde /player/mi-club/dashboard/bookings pasa de requested a confirmed
--    sin tocar el rango, asi que no puede chocar consigo misma.
-- ============================================================================

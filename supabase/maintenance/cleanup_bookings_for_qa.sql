-- QA cleanup: reservas Q3/Q4
-- Ejecutar manualmente en SQL Editor (staging/dev recomendado).
-- Fecha: 2026-03-04

BEGIN;

-- 0) Snapshot previo
SELECT
  (SELECT count(*) FROM public.court_bookings) AS bookings_before,
  (SELECT count(*) FROM public.matches WHERE match_source = 'booking') AS booking_matches_before;

-- 1) Limpieza segura: solo reservas
--    No elimina partidos ya creados. Si un booking tenia match_id, el partido queda en historial.
DELETE FROM public.court_bookings;

-- 2) Snapshot posterior
SELECT
  (SELECT count(*) FROM public.court_bookings) AS bookings_after,
  (SELECT count(*) FROM public.matches WHERE match_source = 'booking') AS booking_matches_after;

COMMIT;

-- ============================================================
-- OPCIONAL (HARD RESET):
-- Si queres eliminar tambien partidos creados desde reserva,
-- ejecutar ESTE bloque por separado (no junto al de arriba).
-- ============================================================
--
-- BEGIN;
--
-- DELETE FROM public.matches
-- WHERE match_source = 'booking'
--    OR notes ILIKE 'Creado desde reserva #%'
--    OR notes ILIKE 'Partido iniciado desde reserva #%';
--
-- DELETE FROM public.court_bookings;
--
-- COMMIT;

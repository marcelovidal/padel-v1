-- ============================================
-- AUTO-STATUS: Partidos Finalizados por Fecha
-- ============================================

-- 1) Función del trigger
CREATE OR REPLACE FUNCTION public.trg_autoset_match_status_from_time()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Usar timezone de Argentina (UTC-3)
  -- Si el partido está programado y la fecha ya pasó, marcarlo como completado
  IF NEW.match_at < NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires' 
     AND NEW.status = 'scheduled' THEN
    NEW.status := 'completed';
  END IF;
  RETURN NEW;
END;
$$;

-- 2) Crear el trigger
DROP TRIGGER IF EXISTS trg_autoset_match_status_before_write ON public.matches;
CREATE TRIGGER trg_autoset_match_status_before_write
  BEFORE INSERT OR UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_autoset_match_status_from_time();

-- 3) Backfill: Actualizar partidos históricos
-- Marcar como 'completed' todos los partidos programados cuya fecha ya pasó
UPDATE public.matches
SET status = 'completed'
WHERE status = 'scheduled'
  AND match_at < NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires';

-- 4) Verificación (comentado, descomentar para debug)
-- SELECT id, match_at, status, created_at
-- FROM public.matches
-- WHERE match_at < NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires'
-- ORDER BY match_at DESC
-- LIMIT 10;

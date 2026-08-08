-- ============================================================================
-- club_count_players_in_cities — alcance de la difusion geografica
-- ============================================================================
-- APLICAR MANUALMENTE EN SUPABASE. Este archivo no se ejecuta solo.
--
-- Proposito
-- ---------
-- Devuelve cuantos jugadores recibirian la notificacion de difusion si un
-- torneo o liga con esas ciudades objetivo se activara. Alimenta el modal de
-- confirmacion previo a activar el evento, para que el dueño del club vea el
-- alcance real antes de un envio masivo irreversible.
--
-- Los filtros replican EXACTAMENTE los de q6_notify_event_open, que es quien
-- emite las notificaciones:
--   - p.city_id = ANY(p_city_ids)
--   - p.user_id IS NOT NULL     (sin cuenta no hay a quien notificar)
--   - p.status = 'active'
--   - p.deleted_at IS NULL
--   - COUNT(DISTINCT p.user_id) — un usuario puede tener mas de un player
--
-- Si los filtros de q6_notify_event_open cambian, hay que actualizar este
-- conteo o el numero mostrado dejara de ser el alcance real.
--
-- Nota sobre city_id: players.city_id es text (IDs oficiales de Georef
-- Argentina) y target_city_ids es text[]. El match es por igualdad exacta,
-- sin normalizar. Los jugadores con city_id NULL — cargados antes de la
-- integracion K2.1 o por flujo legacy — nunca entran en el alcance, aunque
-- su campo de texto `city` coincida.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.club_count_players_in_cities(
  p_city_ids text[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   uuid;
  v_count integer;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF p_city_ids IS NULL OR array_length(p_city_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COUNT(DISTINCT p.user_id)
    INTO v_count
  FROM public.players p
  WHERE p.city_id = ANY(p_city_ids)
    AND p.user_id IS NOT NULL
    AND p.status = 'active'
    AND p.deleted_at IS NULL;

  RETURN COALESCE(v_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.club_count_players_in_cities(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_count_players_in_cities(text[]) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================
-- Q3.1 fix: club_cancel_booking
-- Permite al admin del club cancelar cualquier reserva de su club.
-- ============================================================

CREATE OR REPLACE FUNCTION public.club_cancel_booking(
  p_booking_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_booking record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT b.*
    INTO v_booking
  FROM public.court_bookings b
  WHERE b.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND';
  END IF;

  -- Verificar que el usuario es dueño del club de la reserva
  PERFORM 1
  FROM public.clubs c
  WHERE c.id           = v_booking.club_id
    AND c.deleted_at   IS NULL
    AND c.claim_status = 'claimed'
    AND c.claimed_by   = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  IF v_booking.status NOT IN ('requested', 'confirmed') THEN
    RAISE EXCEPTION 'BOOKING_NOT_CANCELLABLE';
  END IF;

  UPDATE public.court_bookings
     SET status     = 'cancelled',
         updated_at = now()
   WHERE id = p_booking_id;

  RETURN p_booking_id;
END;
$$;

REVOKE ALL ON FUNCTION public.club_cancel_booking(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_cancel_booking(uuid) TO authenticated;

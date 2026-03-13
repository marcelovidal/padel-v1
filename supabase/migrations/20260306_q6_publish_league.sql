-- STAGE Q6 HOTFIX: publicar/finalizar liga desde UI club

BEGIN;

CREATE OR REPLACE FUNCTION public.club_update_league_status(
  p_league_id uuid,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_club_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF p_status NOT IN ('draft', 'active', 'finished') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  SELECT l.club_id
    INTO v_club_id
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
END;
$$;

REVOKE ALL ON FUNCTION public.club_update_league_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_update_league_status(uuid, text) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

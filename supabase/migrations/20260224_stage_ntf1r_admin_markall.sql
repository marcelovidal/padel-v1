-- STAGE NTF-1R follow-up: admin target alias + mark_all_read RPC

CREATE OR REPLACE FUNCTION public.notification_list(
  p_limit int DEFAULT 10,
  p_target text DEFAULT 'auto'
)
RETURNS TABLE (
  id uuid,
  type text,
  entity_id uuid,
  payload jsonb,
  priority smallint,
  read_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_target text;
  v_limit int;
  v_club_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);
  v_target := COALESCE(NULLIF(TRIM(p_target), ''), 'auto');

  IF v_target = 'auto' THEN
    v_target := 'player';
  END IF;

  IF v_target = 'club' THEN
    SELECT c.id INTO v_club_id
    FROM public.clubs c
    WHERE c.deleted_at IS NULL
      AND c.claim_status = 'claimed'
      AND c.claimed_by = v_uid
    ORDER BY c.claimed_at DESC NULLS LAST, c.created_at DESC
    LIMIT 1;

    RETURN QUERY
    SELECT n.id, n.type, n.entity_id, n.payload, n.priority, n.read_at, n.created_at
    FROM public.notifications n
    WHERE n.club_id = v_club_id
    ORDER BY n.priority DESC, n.created_at DESC
    LIMIT v_limit;
    RETURN;
  END IF;

  IF v_target NOT IN ('player', 'admin') THEN
    RAISE EXCEPTION 'INVALID_TARGET';
  END IF;

  RETURN QUERY
  SELECT n.id, n.type, n.entity_id, n.payload, n.priority, n.read_at, n.created_at
  FROM public.notifications n
  WHERE n.user_id = v_uid
  ORDER BY n.priority DESC, n.created_at DESC
  LIMIT v_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.notification_unread_count(
  p_target text DEFAULT 'auto'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_target text;
  v_club_id uuid;
  v_count integer;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  v_target := COALESCE(NULLIF(TRIM(p_target), ''), 'auto');
  IF v_target = 'auto' THEN
    v_target := 'player';
  END IF;

  IF v_target = 'club' THEN
    SELECT c.id INTO v_club_id
    FROM public.clubs c
    WHERE c.deleted_at IS NULL
      AND c.claim_status = 'claimed'
      AND c.claimed_by = v_uid
    ORDER BY c.claimed_at DESC NULLS LAST, c.created_at DESC
    LIMIT 1;

    SELECT COUNT(*)::int INTO v_count
    FROM public.notifications n
    WHERE n.club_id = v_club_id
      AND n.read_at IS NULL;
    RETURN COALESCE(v_count, 0);
  END IF;

  IF v_target NOT IN ('player', 'admin') THEN
    RAISE EXCEPTION 'INVALID_TARGET';
  END IF;

  SELECT COUNT(*)::int INTO v_count
  FROM public.notifications n
  WHERE n.user_id = v_uid
    AND n.read_at IS NULL;

  RETURN COALESCE(v_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.notification_mark_all_read(
  p_target text DEFAULT 'auto'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_target text;
  v_club_id uuid;
  v_count integer;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  v_target := COALESCE(NULLIF(TRIM(p_target), ''), 'auto');
  IF v_target = 'auto' THEN
    v_target := 'player';
  END IF;

  IF v_target = 'club' THEN
    SELECT c.id INTO v_club_id
    FROM public.clubs c
    WHERE c.deleted_at IS NULL
      AND c.claim_status = 'claimed'
      AND c.claimed_by = v_uid
    ORDER BY c.claimed_at DESC NULLS LAST, c.created_at DESC
    LIMIT 1;

    IF v_club_id IS NULL THEN
      RETURN 0;
    END IF;

    UPDATE public.notifications n
    SET read_at = COALESCE(n.read_at, now())
    WHERE n.club_id = v_club_id
      AND n.read_at IS NULL;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN COALESCE(v_count, 0);
  END IF;

  IF v_target NOT IN ('player', 'admin') THEN
    RAISE EXCEPTION 'INVALID_TARGET';
  END IF;

  UPDATE public.notifications n
  SET read_at = COALESCE(n.read_at, now())
  WHERE n.user_id = v_uid
    AND n.read_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN COALESCE(v_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.notification_mark_all_read(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notification_mark_all_read(text) TO authenticated;

NOTIFY pgrst, 'reload schema';


-- STAGE NTF-1R: In-app notifications (retention-first)

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id uuid NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  type text NOT NULL,
  entity_id uuid NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority smallint NOT NULL DEFAULT 0,
  dedupe_key text NULL,
  read_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_notifications_exactly_one_target'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT chk_notifications_exactly_one_target
      CHECK (
        (CASE WHEN user_id IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN club_id IS NULL THEN 0 ELSE 1 END) = 1
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_notifications_type'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT chk_notifications_type
      CHECK (
        type IN (
          'player_match_result_ready',
          'player_claim_success',
          'club_claim_requested',
          'club_match_created'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at
  ON public.notifications(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_club_created_at
  ON public.notifications(club_id, created_at DESC)
  WHERE club_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, created_at DESC)
  WHERE user_id IS NOT NULL AND read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_club_unread
  ON public.notifications(club_id, created_at DESC)
  WHERE club_id IS NOT NULL AND read_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_user_dedupe
  ON public.notifications(user_id, dedupe_key)
  WHERE user_id IS NOT NULL AND dedupe_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_club_dedupe
  ON public.notifications(club_id, dedupe_key)
  WHERE club_id IS NOT NULL AND dedupe_key IS NOT NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own_user ON public.notifications;
CREATE POLICY notifications_select_own_user
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_update_own_user ON public.notifications;
CREATE POLICY notifications_update_own_user
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_select_own_club ON public.notifications;
CREATE POLICY notifications_select_own_club
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (
    club_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.clubs c
      WHERE c.id = notifications.club_id
        AND c.deleted_at IS NULL
        AND c.claim_status = 'claimed'
        AND c.claimed_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS notifications_update_own_club ON public.notifications;
CREATE POLICY notifications_update_own_club
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (
    club_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.clubs c
      WHERE c.id = notifications.club_id
        AND c.deleted_at IS NULL
        AND c.claim_status = 'claimed'
        AND c.claimed_by = auth.uid()
    )
  )
  WITH CHECK (
    club_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.clubs c
      WHERE c.id = notifications.club_id
        AND c.deleted_at IS NULL
        AND c.claim_status = 'claimed'
        AND c.claimed_by = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.notification_create(
  p_user_id uuid DEFAULT NULL,
  p_club_id uuid DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_priority smallint DEFAULT 0,
  p_dedupe_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_is_admin boolean;
  v_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = v_uid
      AND pr.role = 'admin'
  ) INTO v_is_admin;

  IF ((CASE WHEN p_user_id IS NULL THEN 0 ELSE 1 END) + (CASE WHEN p_club_id IS NULL THEN 0 ELSE 1 END)) <> 1 THEN
    RAISE EXCEPTION 'INVALID_NOTIFICATION_TARGET';
  END IF;

  IF p_type IS NULL OR p_type NOT IN (
    'player_match_result_ready',
    'player_claim_success',
    'club_claim_requested',
    'club_match_created'
  ) THEN
    RAISE EXCEPTION 'INVALID_NOTIFICATION_TYPE';
  END IF;

  IF p_club_id IS NOT NULL THEN
    PERFORM 1
    FROM public.clubs c
    WHERE c.id = p_club_id
      AND c.deleted_at IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'CLUB_NOT_FOUND';
    END IF;
  END IF;

  IF p_type = 'player_match_result_ready' THEN
    IF p_user_id IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'NOT_ALLOWED';
    END IF;
  ELSIF p_type = 'player_claim_success' THEN
    IF p_user_id IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'NOT_ALLOWED';
    END IF;
  ELSIF p_type = 'club_match_created' THEN
    IF p_club_id IS NULL THEN
      RAISE EXCEPTION 'INVALID_NOTIFICATION_TARGET';
    END IF;
    PERFORM 1
    FROM public.clubs c
    WHERE c.id = p_club_id
      AND c.deleted_at IS NULL
      AND c.claim_status = 'claimed'
      AND c.claimed_by = v_uid;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'NOT_ALLOWED';
    END IF;
  ELSIF p_type = 'club_claim_requested' THEN
    IF p_user_id IS NULL THEN
      RAISE EXCEPTION 'INVALID_NOTIFICATION_TARGET';
    END IF;
    IF NOT v_is_admin THEN
      PERFORM 1
      FROM public.club_claim_requests r
      WHERE r.id = p_entity_id
        AND r.requested_by = v_uid;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_ALLOWED';
      END IF;
    END IF;
  END IF;

  INSERT INTO public.notifications (
    user_id, club_id, type, entity_id, payload, priority, dedupe_key
  )
  VALUES (
    p_user_id,
    p_club_id,
    p_type,
    p_entity_id,
    COALESCE(p_payload, '{}'::jsonb),
    COALESCE(p_priority, 0),
    NULLIF(TRIM(COALESCE(p_dedupe_key, '')), '')
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL AND p_dedupe_key IS NOT NULL THEN
    SELECT n.id
      INTO v_id
    FROM public.notifications n
    WHERE n.user_id IS NOT DISTINCT FROM p_user_id
      AND n.club_id IS NOT DISTINCT FROM p_club_id
      AND n.dedupe_key = p_dedupe_key
    ORDER BY n.created_at DESC
    LIMIT 1;
  END IF;

  RETURN v_id;
END;
$$;

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

  IF v_target <> 'player' THEN
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

  IF v_target <> 'player' THEN
    RAISE EXCEPTION 'INVALID_TARGET';
  END IF;

  SELECT COUNT(*)::int INTO v_count
  FROM public.notifications n
  WHERE n.user_id = v_uid
    AND n.read_at IS NULL;

  RETURN COALESCE(v_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.notification_mark_read(
  p_notification_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_club_id uuid;
  v_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT c.id INTO v_club_id
  FROM public.clubs c
  WHERE c.deleted_at IS NULL
    AND c.claim_status = 'claimed'
    AND c.claimed_by = v_uid
  ORDER BY c.claimed_at DESC NULLS LAST, c.created_at DESC
  LIMIT 1;

  UPDATE public.notifications n
  SET read_at = COALESCE(n.read_at, now())
  WHERE n.id = p_notification_id
    AND (
      n.user_id = v_uid
      OR (v_club_id IS NOT NULL AND n.club_id = v_club_id)
    )
  RETURNING n.id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'NOTIFICATION_NOT_FOUND';
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON public.notifications FROM PUBLIC;
REVOKE ALL ON public.notifications FROM authenticated;

REVOKE ALL ON FUNCTION public.notification_create(uuid, uuid, text, uuid, jsonb, smallint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notification_create(uuid, uuid, text, uuid, jsonb, smallint, text) TO authenticated;

REVOKE ALL ON FUNCTION public.notification_list(int, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notification_list(int, text) TO authenticated;

REVOKE ALL ON FUNCTION public.notification_unread_count(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notification_unread_count(text) TO authenticated;

REVOKE ALL ON FUNCTION public.notification_mark_read(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notification_mark_read(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

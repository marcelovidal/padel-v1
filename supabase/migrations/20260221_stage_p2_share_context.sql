-- STAGE P2: share_events context for directory/profile/match

ALTER TABLE public.share_events
  ADD COLUMN IF NOT EXISTS context text NOT NULL DEFAULT 'match';

ALTER TABLE public.share_events
  ALTER COLUMN match_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_share_events_user_match_channel'
  ) THEN
    ALTER TABLE public.share_events
      DROP CONSTRAINT uq_share_events_user_match_channel;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_share_events_user_match_channel_context'
  ) THEN
    ALTER TABLE public.share_events
      ADD CONSTRAINT uq_share_events_user_match_channel_context
      UNIQUE (user_id, match_id, channel, context);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_share_events_context'
  ) THEN
    ALTER TABLE public.share_events
      ADD CONSTRAINT chk_share_events_context
      CHECK (context IN ('match', 'directory', 'profile'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_share_events_context
  ON public.share_events(context);

-- Keep share stats focused on match sharing only
CREATE OR REPLACE FUNCTION public.player_get_share_stats(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  shares_last_30d BIGINT,
  shares_total BIGINT,
  last_share_at TIMESTAMPTZ,
  ignored_last_3 BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shares_last_30d BIGINT;
  v_shares_total BIGINT;
  v_last_share_at TIMESTAMPTZ;
  v_ignored_last_3 BOOLEAN;
BEGIN
  SELECT COUNT(*)
  INTO v_shares_last_30d
  FROM public.share_events
  WHERE user_id = p_user_id
    AND context = 'match'
    AND created_at > NOW() - INTERVAL '30 days';

  SELECT COUNT(*)
  INTO v_shares_total
  FROM public.share_events
  WHERE user_id = p_user_id
    AND context = 'match';

  SELECT MAX(created_at)
  INTO v_last_share_at
  FROM public.share_events
  WHERE user_id = p_user_id
    AND context = 'match';

  WITH user_matches AS (
    SELECT m.id
    FROM public.matches m
    JOIN public.match_players mp ON m.id = mp.match_id
    JOIN public.players p ON mp.player_id = p.id
    WHERE p.user_id = p_user_id
      AND m.status = 'completed'
    ORDER BY m.match_at DESC
    LIMIT 3
  ),
  matches_with_shares AS (
    SELECT um.id, se.id AS share_id
    FROM user_matches um
    LEFT JOIN public.share_events se
      ON um.id = se.match_id
     AND se.user_id = p_user_id
     AND se.context = 'match'
  )
  SELECT
    CASE
      WHEN COUNT(*) = 3 AND COUNT(share_id) = 0 THEN TRUE
      ELSE FALSE
    END
  INTO v_ignored_last_3
  FROM matches_with_shares;

  RETURN QUERY SELECT
    v_shares_last_30d,
    v_shares_total,
    v_last_share_at,
    COALESCE(v_ignored_last_3, FALSE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.player_get_share_stats(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';

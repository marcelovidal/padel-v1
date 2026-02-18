-- STAGE O2: Share Invites & Public Sharing
-- =========================================

-- 1. Table: share_events
CREATE TABLE IF NOT EXISTS public.share_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_share_events_user_match_channel UNIQUE (user_id, match_id, channel)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_share_events_user_created_at ON public.share_events(user_id, created_at DESC);

-- RLS
ALTER TABLE public.share_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own share events" ON public.share_events;
CREATE POLICY "Users can insert own share events" 
  ON public.share_events FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own share events" ON public.share_events;
CREATE POLICY "Users can view own share events" 
  ON public.share_events FOR SELECT 
  USING (auth.uid() = user_id);

-- 2. RPC: player_get_share_stats
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
  -- Count shares in last 30 days
  SELECT COUNT(*)
  INTO v_shares_last_30d
  FROM public.share_events
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '30 days';

  -- Count total shares
  SELECT COUNT(*)
  INTO v_shares_total
  FROM public.share_events
  WHERE user_id = p_user_id;

  -- Last share timestamp
  SELECT MAX(created_at)
  INTO v_last_share_at
  FROM public.share_events
  WHERE user_id = p_user_id;

  -- Ignored last 3 logic:
  -- Find the last 3 completed matches of the user and check if they have a share event
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
    SELECT um.id, se.id as share_id
    FROM user_matches um
    LEFT JOIN public.share_events se ON um.id = se.match_id AND se.user_id = p_user_id
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

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';

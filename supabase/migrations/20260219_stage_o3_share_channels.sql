-- STAGE O3: Multi-channel sharing support hardening
-- channel is already TEXT in public.share_events from O2, so no column change is required.

CREATE OR REPLACE FUNCTION public.record_share_event(
  p_match_id UUID,
  p_channel TEXT DEFAULT 'whatsapp'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.share_events (user_id, match_id, channel)
  VALUES (auth.uid(), p_match_id, p_channel)
  ON CONFLICT (user_id, match_id, channel) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_share_event(UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

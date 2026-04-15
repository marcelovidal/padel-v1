-- Already applied in Supabase on 2026-04-15
-- Documentation only

-- RLS policies para admin en club_owner_requests

CREATE POLICY admin_ve_solicitudes_club_owner
  ON public.club_owner_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role = 'admin'
    )
  );

CREATE POLICY admin_actualiza_solicitudes_club_owner
  ON public.club_owner_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role = 'admin'
    )
  );

NOTIFY pgrst, 'reload schema';

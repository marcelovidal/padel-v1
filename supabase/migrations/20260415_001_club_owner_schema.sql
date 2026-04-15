-- Already applied in Supabase on 2026-04-15
-- Documentation only

-- Schema: rol dueño de club en players + clubs + tabla de solicitudes

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS is_club_owner boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS club_owner_enabled_at timestamptz;

ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS owner_player_id uuid REFERENCES public.players(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.club_owner_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  club_id uuid REFERENCES public.clubs(id) ON DELETE SET NULL,
  club_name_requested text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.club_owner_requests ENABLE ROW LEVEL SECURITY;

-- El player ve sus propias solicitudes
CREATE POLICY player_ve_sus_solicitudes_club_owner
  ON public.club_owner_requests
  FOR SELECT
  USING (
    player_id IN (
      SELECT p.id FROM public.players p WHERE p.user_id = auth.uid()
    )
  );

-- El player puede crear solicitudes para sí mismo
CREATE POLICY player_crea_solicitud_club_owner
  ON public.club_owner_requests
  FOR INSERT
  WITH CHECK (
    player_id IN (
      SELECT p.id FROM public.players p WHERE p.user_id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';

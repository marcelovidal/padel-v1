-- STAGE U: player-suggested clubs (when club is not yet published)

CREATE TABLE IF NOT EXISTS public.club_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggested_name text NOT NULL,
  normalized_name text NOT NULL,
  country_code text NOT NULL DEFAULT 'AR',
  region_code text NULL,
  region_name text NULL,
  city text NULL,
  city_id text NULL,
  suggested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'player_match',
  status text NOT NULL DEFAULT 'pending',
  match_id uuid NULL REFERENCES public.matches(id) ON DELETE SET NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL,
  resolved_by uuid NULL REFERENCES auth.users(id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_club_leads_status'
  ) THEN
    ALTER TABLE public.club_leads
      ADD CONSTRAINT chk_club_leads_status
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_club_leads_status_created
  ON public.club_leads(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_club_leads_normalized_city
  ON public.club_leads(normalized_name, city_id, region_code);

CREATE UNIQUE INDEX IF NOT EXISTS uq_club_leads_pending_name_city
  ON public.club_leads(normalized_name, COALESCE(city_id, ''), COALESCE(region_code, ''))
  WHERE status = 'pending';

ALTER TABLE public.club_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "club_leads_insert_own" ON public.club_leads;
CREATE POLICY "club_leads_insert_own"
  ON public.club_leads FOR INSERT
  TO authenticated
  WITH CHECK (suggested_by = auth.uid());

DROP POLICY IF EXISTS "club_leads_select_own_or_admin" ON public.club_leads;
CREATE POLICY "club_leads_select_own_or_admin"
  ON public.club_leads FOR SELECT
  TO authenticated
  USING (
    suggested_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles pr
      WHERE pr.id = auth.uid()
        AND pr.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "club_leads_update_admin" ON public.club_leads;
CREATE POLICY "club_leads_update_admin"
  ON public.club_leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles pr
      WHERE pr.id = auth.uid()
        AND pr.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles pr
      WHERE pr.id = auth.uid()
        AND pr.role = 'admin'
    )
  );

NOTIFY pgrst, 'reload schema';

-- SQL: Crear tabla public.player_match_assessments
-- Crea constraints, índices y políticas RLS básicas (admin-only)

BEGIN;

-- Asegurar UNIQUE constraint en match_players(match_id, player_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'match_players_match_player_unique'
  ) THEN
    ALTER TABLE public.match_players
    ADD CONSTRAINT match_players_match_player_unique UNIQUE (match_id, player_id);
  END IF;
END$$;

-- Crear tabla de autoevaluaciones por jugador/partido
CREATE TABLE IF NOT EXISTS public.player_match_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL,
  player_id uuid NOT NULL,
  volea smallint NULL,
  globo smallint NULL,
  remate smallint NULL,
  bandeja smallint NULL,
  vibora smallint NULL,
  bajada_pared smallint NULL,
  saque smallint NULL,
  recepcion_saque smallint NULL,
  comments text NULL,
  submitted_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT player_match_assessments_match_player_unique UNIQUE (match_id, player_id)
);

-- FK compuesto que garantiza que player_id participó en match_id
ALTER TABLE public.player_match_assessments
  ADD CONSTRAINT player_match_assessments_match_players_fk
  FOREIGN KEY (match_id, player_id)
  REFERENCES public.match_players(match_id, player_id)
  ON DELETE CASCADE;

-- FK a profiles (se usa profiles en el repo para role/admin)
ALTER TABLE public.player_match_assessments
  ADD CONSTRAINT player_match_assessments_submitted_by_profiles_fk
  FOREIGN KEY (submitted_by)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- Índices para consultas por jugador y por partido
CREATE INDEX IF NOT EXISTS idx_player_match_assessments_player_id ON public.player_match_assessments(player_id);
CREATE INDEX IF NOT EXISTS idx_player_match_assessments_match_id ON public.player_match_assessments(match_id);

-- Constraints por columna que permiten NULL o 1..5
ALTER TABLE public.player_match_assessments
  ADD CONSTRAINT IF NOT EXISTS chk_pma_volea_range CHECK (volea IS NULL OR (volea BETWEEN 1 AND 5)),
  ADD CONSTRAINT IF NOT EXISTS chk_pma_globo_range CHECK (globo IS NULL OR (globo BETWEEN 1 AND 5)),
  ADD CONSTRAINT IF NOT EXISTS chk_pma_remate_range CHECK (remate IS NULL OR (remate BETWEEN 1 AND 5)),
  ADD CONSTRAINT IF NOT EXISTS chk_pma_bandeja_range CHECK (bandeja IS NULL OR (bandeja BETWEEN 1 AND 5)),
  ADD CONSTRAINT IF NOT EXISTS chk_pma_vibora_range CHECK (vibora IS NULL OR (vibora BETWEEN 1 AND 5)),
  ADD CONSTRAINT IF NOT EXISTS chk_pma_bajada_pared_range CHECK (bajada_pared IS NULL OR (bajada_pared BETWEEN 1 AND 5)),
  ADD CONSTRAINT IF NOT EXISTS chk_pma_saque_range CHECK (saque IS NULL OR (saque BETWEEN 1 AND 5)),
  ADD CONSTRAINT IF NOT EXISTS chk_pma_recepcion_saque_range CHECK (recepcion_saque IS NULL OR (recepcion_saque BETWEEN 1 AND 5));

-- Asegurar que la fila no esté totalmente vacía: al menos un golpe NO NULL o comments no vacío
ALTER TABLE public.player_match_assessments
  ADD CONSTRAINT IF NOT EXISTS chk_pma_at_least_one_field CHECK (
    volea IS NOT NULL OR globo IS NOT NULL OR remate IS NOT NULL OR bandeja IS NOT NULL OR
    vibora IS NOT NULL OR bajada_pared IS NOT NULL OR saque IS NOT NULL OR recepcion_saque IS NOT NULL OR
    NULLIF(trim(coalesce(comments, '')), '') IS NOT NULL
  );

-- Habilitar RLS y políticas básicas: admin-only por ahora
ALTER TABLE public.player_match_assessments ENABLE ROW LEVEL SECURITY;

-- Policy para SELECT/INSERT solamente para admins
CREATE POLICY player_match_assessments_admin_select
  ON public.player_match_assessments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY player_match_assessments_admin_insert
  ON public.player_match_assessments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- No se crean policies para UPDATE/DELETE => quedan bloqueadas por defecto

COMMIT;

-- Nota: `submitted_by` referencia `public.profiles(id)` por consistencia con el modelo existente
-- (el código del repo usa `profiles` para roles). Si se prefiere `auth.users`, ajustar la FK.

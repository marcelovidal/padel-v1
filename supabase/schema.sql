-- ============================================
-- PADEL V1 - SCHEMA MÍNIMO (CORREGIDO)
-- ============================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TIPOS ENUM
-- ============================================
DO $$ BEGIN
  CREATE TYPE player_position AS ENUM ('drive', 'reves', 'cualquiera');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE player_status AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE match_status AS ENUM ('scheduled', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE team_type AS ENUM ('A', 'B');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- TABLA: profiles (vinculada a auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role = 'admin'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ============================================
-- TABLA: players (entidad de negocio independiente)
-- ============================================
CREATE TABLE IF NOT EXISTS public.players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  position player_position NOT NULL DEFAULT 'cualquiera',
  status player_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT check_email_format
    CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Unicidad robusta (parcial)
CREATE UNIQUE INDEX IF NOT EXISTS uq_players_email_not_null
  ON public.players(email)
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_players_phone
  ON public.players(phone);

-- Índices de búsqueda
CREATE INDEX IF NOT EXISTS idx_players_first_name ON public.players(first_name);
CREATE INDEX IF NOT EXISTS idx_players_last_name ON public.players(last_name);
CREATE INDEX IF NOT EXISTS idx_players_status ON public.players(status);
CREATE INDEX IF NOT EXISTS idx_players_deleted_at_null ON public.players(deleted_at) WHERE deleted_at IS NULL;

-- ============================================
-- TABLA: matches
-- ============================================
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_at TIMESTAMPTZ NOT NULL,
  club_name TEXT NOT NULL,
  max_players INTEGER NOT NULL DEFAULT 4 CHECK (max_players >= 2 AND max_players <= 4),
  notes TEXT,
  status match_status NOT NULL DEFAULT 'scheduled',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_match_at ON public.matches(match_at);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_created_by ON public.matches(created_by);

-- ============================================
-- TABLA: match_players
-- ============================================
CREATE TABLE IF NOT EXISTS public.match_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
  team team_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_player_match UNIQUE (match_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_match_players_match_id ON public.match_players(match_id);
CREATE INDEX IF NOT EXISTS idx_match_players_player_id ON public.match_players(player_id);
CREATE INDEX IF NOT EXISTS idx_match_players_match_team ON public.match_players(match_id, team);

-- ============================================
-- TABLA: match_results
-- ============================================
CREATE TABLE IF NOT EXISTS public.match_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL UNIQUE REFERENCES public.matches(id) ON DELETE CASCADE,
  sets JSONB NOT NULL,
  winner_team team_type NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT check_sets_structure CHECK (
    jsonb_typeof(sets) = 'array' AND
    jsonb_array_length(sets) > 0 AND
    jsonb_array_length(sets) <= 5
  )
);

CREATE INDEX IF NOT EXISTS idx_match_results_match_id ON public.match_results(match_id);
CREATE INDEX IF NOT EXISTS idx_match_results_winner_team ON public.match_results(winner_team);

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_match_results_updated_at
  BEFORE UPDATE ON public.match_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.update_match_status_on_result()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.matches SET status = 'completed' WHERE id = NEW.match_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER update_match_status_on_result_insert
  AFTER INSERT ON public.match_results
  FOR EACH ROW EXECUTE FUNCTION public.update_match_status_on_result();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;

-- Helper is_admin()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies: solo admin
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can delete profiles" ON public.profiles;

CREATE POLICY "Admin can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admin can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admin can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.is_admin());

-- Players
DROP POLICY IF EXISTS "Admin can view all players" ON public.players;
DROP POLICY IF EXISTS "Admin can insert players" ON public.players;
DROP POLICY IF EXISTS "Admin can update players" ON public.players;
DROP POLICY IF EXISTS "Admin can delete players" ON public.players;

CREATE POLICY "Admin can view all players"
  ON public.players FOR SELECT
  USING (public.is_admin() AND deleted_at IS NULL);

CREATE POLICY "Admin can insert players"
  ON public.players FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update players"
  ON public.players FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admin can delete players"
  ON public.players FOR DELETE
  USING (public.is_admin());

-- Matches
DROP POLICY IF EXISTS "Admin can view all matches" ON public.matches;
DROP POLICY IF EXISTS "Admin can insert matches" ON public.matches;
DROP POLICY IF EXISTS "Admin can update matches" ON public.matches;
DROP POLICY IF EXISTS "Admin can delete matches" ON public.matches;

CREATE POLICY "Admin can view all matches"
  ON public.matches FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admin can insert matches"
  ON public.matches FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update matches"
  ON public.matches FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admin can delete matches"
  ON public.matches FOR DELETE
  USING (public.is_admin());

-- Match_players
DROP POLICY IF EXISTS "Admin can view all match_players" ON public.match_players;
DROP POLICY IF EXISTS "Admin can insert match_players" ON public.match_players;
DROP POLICY IF EXISTS "Admin can update match_players" ON public.match_players;
DROP POLICY IF EXISTS "Admin can delete match_players" ON public.match_players;

CREATE POLICY "Admin can view all match_players"
  ON public.match_players FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admin can insert match_players"
  ON public.match_players FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update match_players"
  ON public.match_players FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admin can delete match_players"
  ON public.match_players FOR DELETE
  USING (public.is_admin());

-- Match_results
DROP POLICY IF EXISTS "Admin can view all match_results" ON public.match_results;
DROP POLICY IF EXISTS "Admin can insert match_results" ON public.match_results;
DROP POLICY IF EXISTS "Admin can update match_results" ON public.match_results;
DROP POLICY IF EXISTS "Admin can delete match_results" ON public.match_results;

CREATE POLICY "Admin can view all match_results"
  ON public.match_results FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admin can insert match_results"
  ON public.match_results FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update match_results"
  ON public.match_results FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admin can delete match_results"
  ON public.match_results FOR DELETE
  USING (public.is_admin());

-- Comentarios
COMMENT ON TABLE public.profiles IS 'Perfiles de acceso (auth.users). Solo admin en V1.';
COMMENT ON TABLE public.players IS 'Jugadores (entidad de negocio, sin login en V1).';
COMMENT ON TABLE public.matches IS 'Partidos (club_name simple, match_at).';
COMMENT ON TABLE public.match_players IS 'Participantes del partido por equipo.';
COMMENT ON TABLE public.match_results IS 'Resultado con sets JSONB.';

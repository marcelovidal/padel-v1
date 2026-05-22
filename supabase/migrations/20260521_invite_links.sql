-- Applied in Supabase on 2026-05-21
-- Tabla de invite links para onboarding personalizado

CREATE TABLE invite_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_by UUID REFERENCES players(id) ON DELETE SET NULL,

  -- Destinatario (opcional — null = link genérico)
  target_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  target_name TEXT,
  target_email TEXT,
  target_phone TEXT,

  -- Tipo de onboarding
  intent TEXT NOT NULL CHECK (intent IN ('new_player', 'coach', 'club_owner')),

  -- Mensaje personalizado opcional
  custom_message TEXT,

  -- Vigencia
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INT DEFAULT 1,
  use_count INT DEFAULT 0,

  -- Estado
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_invite_links_token ON invite_links(token);
CREATE INDEX idx_invite_links_created_by ON invite_links(created_by);
CREATE INDEX idx_invite_links_target_player ON invite_links(target_player_id);

-- RLS
ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;

-- Solo service_role puede leer/escribir (el admin usa createAdminClient)
-- Los links públicos se validan via API route sin RLS

-- RPC: incrementar use_count de forma atómica
CREATE OR REPLACE FUNCTION increment_invite_link_use(p_token TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE invite_links
  SET use_count = use_count + 1,
      updated_at = now()
  WHERE token = p_token;
END;
$$;

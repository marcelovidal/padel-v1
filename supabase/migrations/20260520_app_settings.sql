-- app_settings: feature flags y configuración global controlados por super admin
CREATE TABLE IF NOT EXISTS app_settings (
  key        text PRIMARY KEY,
  value      text NOT NULL DEFAULT 'false',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Lectura pública (el layout del player necesita leerlo sin contexto de admin)
CREATE POLICY "app_settings_read_all"
  ON app_settings FOR SELECT
  USING (true);

-- Escritura solo para admins
CREATE POLICY "app_settings_write_admin"
  ON app_settings FOR ALL
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Valor inicial: reservas desactivadas
INSERT INTO app_settings (key, value)
VALUES ('bookings_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

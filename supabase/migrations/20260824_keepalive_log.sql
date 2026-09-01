-- keepalive_log: registro de cada ejecución del cron keepalive
-- Tabla dedicada para auditar latidos sin tocar app_settings.
-- Histórico: cada INSERT es un latido, se limpian registros >30 días.

CREATE TABLE IF NOT EXISTS keepalive_log (
  id         bigserial PRIMARY KEY,
  status     text NOT NULL CHECK (status IN ('ok', 'error')),
  source     text NOT NULL DEFAULT 'cron' CHECK (source IN ('cron', 'manual')),
  message    text,
  duration_ms integer,
  ts         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE keepalive_log ENABLE ROW LEVEL SECURITY;

-- Solo service_role puede leer (auditoría desde admin o logs)
CREATE POLICY "keepalive_log_read_service"
  ON keepalive_log FOR SELECT
  USING (auth.role() = 'service_role');

-- Solo service_role puede insertar (el cron)
CREATE POLICY "keepalive_log_insert_service"
  ON keepalive_log FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Limpieza de registros >30 días (se ejecuta periódicamente)
CREATE OR REPLACE FUNCTION keepalive_log_cleanup()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM keepalive_log
  WHERE ts < now() - interval '30 days';
$$;

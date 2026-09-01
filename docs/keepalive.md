# Keep-alive de Supabase — verificación

## Qué es

El cron diario (`0 6 * * *`, ver `vercel.json`) golpea
`GET /api/cron/keepalive` para generar actividad de escritura en la
base y evitar que Supabase pause el proyecto por inactividad.

Cada ejecución inserta una fila en `keepalive_log`:

| columna | qué guarda |
|---|---|
| `status` | `ok` o `error` |
| `source` | `cron` (Vercel) o `manual` (curl) |
| `duration_ms` | milisegundos del request |
| `message` | texto del error, o `NULL` si ok |
| `ts` | momento del latido |

Después del insert, llama a `keepalive_log_cleanup()`, que borra los
registros de más de 30 días.

## Probar a mano sin esperar al cron

Necesitás `CRON_SECRET` (la misma variable de entorno que usa Vercel).
En local está en `.env.local`, en producción en el dashboard de Vercel.

Con `source=manual` para distinguir la prueba de los latidos reales del
cron:

```bash
# Linux / macOS
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://<tu-proyecto>.vercel.app/api/cron/keepalive?source=manual"

# PowerShell
$headers = @{ Authorization = "Bearer $env:CRON_SECRET" }
Invoke-RestMethod -Uri "https://<tu-proyecto>.vercel.app/api/cron/keepalive?source=manual" -Headers $headers
```

En local:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/keepalive?source=manual"
```

### Respuestas posibles

| Status | Body | Qué significa |
|---|---|---|
| `200` | `{ "ok": true, "source": "manual", "ts": "...", "duration_ms": N, "previous": {...} \| null }` | Latido registrado. `previous` es el latido anterior (o `null` si es el primero), para auditar sin entrar a Vercel |
| `401` | `{ "ok": false, "error": "No autorizado" }` | El `CRON_SECRET` del header no coincide con la variable de entorno |
| `500` | `{ "ok": false, "error": "CRON_SECRET no está configurada en el entorno" }` | La variable no está seteada. No es un 401 genérico: es un fallo de configuración |

## Auditar

Para confirmar que el cron corrió y cuándo, sin depender de los logs de
Vercel, en el SQL Editor de Supabase:

```sql
SELECT ts, status, source, duration_ms, message
FROM keepalive_log
ORDER BY ts DESC
LIMIT 10;
```

Si no aparece ninguna fila `source = 'cron'`, el cron no está corriendo
(o `CRON_SECRET` no está configurada: los 401 no llegan a insertar).
Si aparece una fila `source = 'cron'` de cada día, el latido funciona.
Las filas `source = 'manual'` son pruebas; no confundirlas con el cron.

## Migración

La tabla la crea `supabase/migrations/20260824_keepalive_log.sql`.
Aplicarla en el SQL Editor de Supabase **antes** de desplegar el código
nuevo: sin la tabla, el cron responde 500 al intentar el insert.
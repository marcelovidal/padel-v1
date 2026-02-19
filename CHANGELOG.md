# Changelog

All notable changes to this project will be documented in this file.

## [v1.7.0-claim] - 2026-02-19 (Draft)

### Agregado
- **Stage P1 - Claim real**: nueva RPC `player_claim_profile_v2(p_target_player_id, p_match_id)` con reglas anti-abuso.
- **Flujo público de claim**: nueva ruta `app/welcome/claim/page.tsx` para reclamar perfil desde link compartido.
- **Server Action dedicada**: `lib/actions/claim.actions.ts` con mapeo explícito de errores (`CLAIM_NOT_ALLOWED`, `PROFILE_ALREADY_CLAIMED`, etc.).
- **Persistencia de retorno en auth**: login Google y email ahora conservan `next` para volver al claim tras autenticarse.

### Seguridad / Reglas
- Se bloquea claim de perfiles ya reclamados o eliminados lógicamente (`deleted_at`).
- Se bloquea claim si el usuario autenticado ya tiene perfil en `players`.
- El claim exige validación de contexto: el target debe pertenecer al `claim_match` (o co-participación para compatibilidad futura).

### UX
- Mensajería humana en español para estados de claim exitoso/error.
- Visualización del partido compartido y resaltado del jugador objetivo antes de confirmar.

## [v1.6.0-onboarding-lock-avatars] - 2026-02-17

### Agregado
- **Sistema de Onboarding**: Flujo inicial "one-shot" bloqueado por estado (`onboarding_completed`).
- **Gestión de Avatares**: Bucket privado en Supabase Storage, signed URLs temporales, y fallback robusto (Foto Google -> Iniciales).
- **Capa Competitiva (Stage M2)**: Métricas de "Mejor Compañero" (mín. 2 partidos) y rendimiento vs categoría superior (basado en el equipo rival).
- **Dashboard**: Integración del contexto competitivo y radar técnico en el panel principal.

### Corregido
- Flujo de login: redirección automática al dashboard (`/player`) en lugar de listado de partidos.
- Consistencia del avatar del jugador a través de toda la aplicación.

### Nota de Base de Datos
- Tabla `players`: Se agregaron campos `onboarding_completed` (bool), `onboarding_completed_at` (timestamptz) y `onboarding_version` (text).
- Campo `avatar_url`: Ahora almacena el path interno del bucket. Permisos RLS configurados para bucket privado `avatars`.

## [Stage M2] - 2026-02-13
### Agregado
- RPC `player_get_competitive_stats` para cálculo de métricas competitivas avanzadas.
- Dashboard: Bloque de "Contexto Competitivo".

## [Stage M1 / v1.5.0] - 2026-02-12

### Corregido
- Desacople entre la tabla `players` y la RPC `player_create_guest_player`.
- Error de columna `city` inexistente en producción.
- Firma de función RPC para creación de invitados desalineada con el frontend.

### Agregado
- Campos geográficos en `players`: `country_code`, `region_code`, `city`, `city_normalized`.
- Campo `created_by` y `is_guest` en `players` para mejor trazabilidad.
- Índices para búsqueda ponderada por ubicación (`idx_players_location`).
- Parche seguro de migración idempotente.
- Lógica de "Zero-Safety" para el teléfono de invitados (default '00000000').

## [Stage K2] - 2026-02-10
### Agregado
- Búsqueda de jugadores ponderada por ubicación (Ciudad/Provincia).
- Nueva RPC `player_search_players` con sistema de scoring.
- Etiquetas enriquecidas en la selección de jugadores: "Inicial.Apellido — Ciudad (Región)".
- Soporte para ubicación en la creación de jugadores invitados.

## [Stage K1] - 2026-02-09
### Agregado
- Sistema de jugadores invitados.
- Proceso de "Claim Profile" para vincular cuentas de usuario a perfiles de jugadores pre-existentes.
- Restricciones de co-participación en partidos.

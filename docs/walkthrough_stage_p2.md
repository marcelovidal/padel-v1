# Stage P2 Walkthrough

## Objetivo
Stage P2 agrega:
- Directorio de jugadores robusto en `/player/players`.
- Perfil publico de jugador en `/p/[playerId]`.
- Invitaciones por WhatsApp desde directorio/perfil con tracking en `share_events.context`.

## Flujo de Directorio
1. Usuario autenticado entra a `/player/players`.
2. Se ejecuta `player_search_players` (ranking por ubicacion + nombre).
3. Se enriquecen resultados con `position`, `category`, `avatar_url`, `user_id`.
4. Cada card muestra:
   - Avatar (signed URL o iniciales)
   - Nombre, ubicacion, categoria, posicion
   - `Ver perfil` -> `/p/[playerId]`
   - `Invitar por WhatsApp` si el perfil aun no fue reclamado (`user_id IS NULL`)

## Flujo de Perfil Publico
1. Ruta publica: `/p/[playerId]`.
2. Se carga `getPublicPlayerData` con allowlist:
   - `display_name`, `avatar_url`, `city`, `region_name`, `region_code`, `category`, `position`.
3. CTA contextual:
   - Anonimo -> `/welcome?next=/p/[playerId]`
   - Logueado sin onboarding -> `/welcome/onboarding?next=/p/[playerId]`
   - Dueño del perfil -> `/player/profile`
   - Otro jugador -> `/player/players`
4. Si el perfil es reclamable, se ofrece CTA de `Reclamar perfil` hacia `/welcome/claim`.

## WhatsApp Invite
- Mensaje unificado:
  1) `Te agregué en PASALA 👇`
  2) `{display_name} — {city} ({region_code})`
  3) `Mirá tu perfil acá:`
  4) `{publicProfileUrl}`
- URL pública armada con `buildPublicPlayerUrl(playerId, siteUrl)`.
- Encoding aplicado una sola vez al construir `wa.me`.
- Tracking:
  - `channel='whatsapp'`
  - `context='directory' | 'profile' | 'match'`

## Migracion DB
Archivo: `supabase/migrations/20260221_stage_p2_share_context.sql`
- Agrega columna `context` en `share_events`.
- Permite `match_id` nulo para shares fuera de match.
- Ajusta unique key a `(user_id, match_id, channel, context)`.
- Agrega check de contexto valido.
- Mantiene `player_get_share_stats` filtrando `context='match'`.

## Validacion manual
1. `/player/players` lista y busca correctamente.
2. Boton de invite abre WhatsApp con URL absoluta correcta.
3. `/p/[playerId]` no expone `email`, `phone`, ni `user_id`.
4. `share_events` registra filas con `context=directory/profile`.
5. `npm run build` sin errores.

# Stage Club Walkthrough (MVP)

## Objetivo
Implementar clubes reutilizables en creacion de partidos, busqueda por ubicacion, y flujo seguro de solicitud de reclamo de club (sin auto-claim).

## DB aplicada
- Migracion: `supabase/migrations/20260222_stage_club.sql`
- Tablas nuevas:
  - `public.clubs`
  - `public.club_claim_requests`
- Integracion en partidos:
  - `public.matches.club_id` (FK a `clubs.id`)
- RPCs nuevas:
  - `club_create(...)`
  - `club_search(...)`
  - `club_request_claim(...)`
  - `club_resolve_claim(...)` (admin)
- RPCs actualizadas:
  - `player_create_match_with_players(..., p_club_id uuid default null)`
  - `player_update_match(..., p_club_id uuid default null)`

## Backend
- Tipos DB actualizados para:
  - `matches.club_id`
  - `clubs`
  - `club_claim_requests`
- Nueva capa club:
  - `repositories/club.repository.ts`
  - `services/club.service.ts`
  - `lib/actions/club.actions.ts`

## UI
### /welcome
- Dos accesos diferenciados:
  - Jugadores
  - Clubes
- Login unificado via `/player/login` con query params:
  - `portal=player|club`
  - `mode=login|signup`

### /player/matches/new
- Nuevo selector de club con:
  - busqueda por RPC `club_search`
  - creacion en linea via `club_create`
  - badge visual `Reclamable` / `En revision`
- Persistencia robusta:
  - si el usuario escribe un club y no lo selecciona, se crea automaticamente antes de guardar el partido y se envia `club_id` al RPC de partido.

### /welcome/claim/club
- Nueva ruta de solicitud de reclamo de club.
- Reglas de acceso:
  - anonimo -> redirect a `/welcome?next=...`
  - logueado sin onboarding -> redirect a `/welcome/onboarding?next=...`
  - logueado con onboarding -> formulario de solicitud
- Formulario:
  - telefono prellenado desde `players.phone`
  - mensaje opcional
  - submit idempotente via `club_request_claim`

### /m/[id]
- Muestra estado de club reclamable cuando corresponde.
- CTA publica: `Reclamar club` -> `/welcome/claim/club?club_id=...&next=/m/[id]`

## Compatibilidad
- Se mantiene `matches.club_name` como fallback de lectura.
- El flujo nuevo prioriza `club_id` para nuevas altas.
- Edicion de partido conserva `club_id` si ya existe para no perder la relacion.

## QA manual recomendado
1. Crear partido desde `/player/matches/new` seleccionando club existente.
2. Crear partido escribiendo club nuevo (sin seleccionar) y validar que guarda `club_id`.
3. Abrir `/m/[id]` y verificar badge/CTA de club reclamable.
4. Probar `/welcome/claim/club` en tres estados:
   - anonimo
   - logueado sin onboarding
   - logueado onboarded
5. Enviar solicitud dos veces y verificar idempotencia (misma pending request).
6. `npm run build`.

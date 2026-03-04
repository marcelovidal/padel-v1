# Q4 Unified Match Flow

## Diagnostico inicial

Fecha: 2026-03-04

### 1) Rutas relevantes actuales

- Player `crear partido`: `app/player/(app)/matches/new/page.tsx`
  - Usa `CreateMatchForm` (`components/matches/CreateMatchForm.tsx`).
  - Llama a `createMatchAsPlayer` (`lib/actions/player-match.actions.ts`).
- Player `reservar`: `app/player/(app)/bookings/new/page.tsx`
  - Hace request de booking con `requestBookingAction` (`lib/actions/booking.actions.ts`).
  - Luego redirige a `player/matches/new` con `from_booking=1`.
- Player continuidad post-reserva:
  - `CreateMatchForm` abre modal y precarga `date/time/club` cuando `from_booking=1`.
- Club calendario reservas: `app/club/(app)/dashboard/bookings/page.tsx`
  - Panel: `components/bookings/ClubBookingsCalendarPanel.tsx`.
  - Usa `confirmBookingAction`, `rejectBookingAction`, `createMatchFromBookingAction` y `clubCreateBookingAndMatchAction`.

### 2) Fuente de verdad booking <-> match

- Existe FK en `court_bookings.match_id` (Q3) y `uq_court_bookings_match_id_not_null`.
- No existe `matches.booking_id` en schema actual.
- El vinculo principal actual ya es `court_bookings.match_id`.

### 3) RPCs / acciones actuales relacionadas

- Match player:
  - `player_create_match_with_players` (match + 4 jugadores).
  - `player_update_match`, `player_update_match_roster`, `player_cancel_match`.
- Booking Q3:
  - `player_request_booking`
  - `club_confirm_booking`
  - `club_reject_booking`
  - `player_cancel_booking`
  - `booking_create_match` (puente booking -> match)
  - `club_create_confirmed_booking_match` (club crea booking confirmado + match)
- Server actions:
  - `createMatchAsPlayer` mezcla match directo + auto-request booking (si hay club y no booking_id).
  - `requestBookingAction` crea booking y redirige para completar jugadores.
  - `createMatchFromBookingAction` crea match desde booking confirmado.

### 4) Duplicaciones detectadas

- Duplicacion de entrypoint UX:
  - `matches/new` y `bookings/new` representan el mismo objetivo del usuario (armar partido).
- Duplicacion de logica de creacion:
  - Match directo (`player_create_match_with_players`).
  - Match desde booking (`booking_create_match`).
  - Match + booking desde club (`club_create_confirmed_booking_match`).
  - Auto-booking desde `createMatchAsPlayer`.
- Duplicacion de UI:
  - Calendario/fecha-hora aparece tanto en `CreateMatchForm` como en `bookings/new`.
  - Continuidad de jugadores post-reserva vive aparte del flujo base.

### 5) Decision Q4 adoptada

- Mantener `court_bookings.match_id` como relacion canonica.
- Introducir `matches.match_source` (`direct | booking`) para trazabilidad.
- Crear RPC unificada `player_create_match_unified(...)` con booking opcional.
- Migrar acciones server a una unica accion de creacion y dejar compatibilidad retro.

## Arquitectura final (Q4)

### Modelo

- Entidad central: `matches`.
- Reserva como relacion opcional: `court_bookings.match_id`.
- Trazabilidad de origen: `matches.match_source`.
  - `direct`: partido creado sin reserva.
  - `booking`: partido creado vinculado a reserva.

### Contrato unificado

- Nueva RPC:
  - `public.player_create_match_unified(...) returns uuid`
- Caso `direct`:
  - Crea `matches` + `match_players` (4 jugadores).
- Caso `booking`:
  - Toma booking existente (lock `FOR UPDATE`), valida permisos/estado, crea `matches` + `match_players`, y vincula `court_bookings.match_id`.
  - Si la reserva ya tiene `match_id`, retorna ese id (idempotencia funcional).

## Cambios implementados

### 1) DB

Archivo: `supabase/migrations/20260220_stage_q4_unified_match_flow.sql`

- Agregado `matches.match_source text not null default 'direct'`.
- Constraint `chk_matches_match_source` con valores `direct|booking`.
- Indices:
  - `idx_matches_match_source`
  - `idx_court_bookings_match_id` (si no existe)
- Nueva RPC `player_create_match_unified(...)` + `GRANT EXECUTE` para `authenticated`.

### 2) Backend

- Nueva action unificada:
  - `lib/actions/match-create.actions.ts`
  - `createMatchUnifiedAction(payload)`
- Match service/repository:
  - `services/match.service.ts`: `createMatchUnified(...)`
  - `repositories/match.repository.ts`: RPC call `player_create_match_unified`
- Refactor compat:
  - `lib/actions/player-match.actions.ts` ahora delega en `createMatchUnifiedAction`.
  - Se elimina la logica duplicada de auto-booking implícito desde `createMatchAsPlayer`.

### 3) UI Player

- Entrada unica:
  - `app/player/(app)/matches/new/page.tsx`
  - Selector de modo:
    - `En un club (reservar)` -> deriva al flujo de reserva existente.
    - `Sin club` -> crea partido directo.
- Reuso del formulario de jugadores:
  - `components/matches/CreateMatchForm.tsx`
  - Se agrega `clubRequired` para permitir partidos sin club.
- Compatibilidad navegación:
  - Boton en `app/player/(app)/bookings/page.tsx` pasa a `Reservar y crear partido` y abre el flujo unificado.

### 4) UI Club

- Archivo: `components/bookings/ClubBookingsCalendarPanel.tsx`
- En modal de “Crear partido desde reserva”:
  - Si viene de solicitud, cancha y jugador se muestran precargados en modo resumen.
  - Si falta `requested_by_player_id`, mantiene selector manual para no romper casos legacy.

## Seguridad y RLS

- Se mantiene RLS vigente para `court_bookings`, `matches` y `match_players`.
- La RPC unificada valida:
  - `auth.uid()`
  - creador con perfil de jugador activo
  - 4 jugadores unicos y activos
  - creador incluido en el partido
  - permisos sobre booking cuando `p_booking_id` existe:
    - solicitante, owner del club o admin

## Compatibilidad y no-ruptura

- No se eliminaron RPCs Q3/Q2 existentes.
- El flujo legacy de reservas sigue funcionando.
- Las integraciones previas pueden convivir mientras migran al contrato unificado.

## Rollout

1. Ejecutar migraciones en staging.
2. Validar build y QA manual.
3. Deploy app + migracion a produccion.
4. Monitorear errores RPC (`NOT_ALLOWED`, `INVALID_STATUS`, `PLAYER_NOT_FOUND`).

## Rollback

Si se necesita reversión rápida:

1. Revertir deploy de app al commit previo.
2. Mantener migracion aplicada (es backward-compatible):
   - `match_source` tiene default y no rompe consultas antiguas.
   - RPC vieja sigue existiendo.
3. Si fuera necesario rollback de DB duro:
   - Drop de `player_create_match_unified`.
   - Drop de indice `idx_matches_match_source`.
   - Drop constraint `chk_matches_match_source`.
   - Drop column `matches.match_source`.
   - Solo realizar en ventana controlada (impacta lecturas que ya usen el nuevo campo).

## QA manual (checklist)

1. Player crea partido sin club:
   - Ruta: `/player/matches/new?mode=direct`
   - Esperado: crea partido con `match_source=direct`.
2. Player crea partido con reserva:
   - Ruta: `/player/matches/new` -> “En un club”.
   - Reserva en `/player/bookings/new` y continuidad a `/player/matches/new?from_booking=1...`.
   - Esperado: partido creado y booking vinculado (`court_bookings.match_id`).
3. Club opera calendario reservas:
   - Ruta: `/club/dashboard/bookings`
   - Modal muestra cancha y jugador de la solicitud precargados.
4. Carga de resultados:
   - Ruta: `/player/matches/[id]/result`
   - Esperado: sin regresiones.
5. Seguridad:
   - Verificar que usuario no autorizado no pueda crear partido sobre booking ajeno.
6. Build:
   - `npm run build` debe pasar.

## Verificacion ejecutada

- Comando ejecutado:
  - `npm run build`
- Resultado:
  - `PASS` (con warnings de lint preexistentes no bloqueantes).

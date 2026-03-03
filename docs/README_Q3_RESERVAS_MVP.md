# README Q3 - Reservas MVP Club-First

## Estado
- Fecha: 2026-03-03
- Branch: `feature/q3-bookings`
- Alcance: MVP de reservas club-first con puente a partidos y UX operativa para club + player.

## Objetivo de Q3
Implementar un flujo de reservas de canchas con estas reglas:
1. El player solicita reserva.
2. El club confirma/rechaza la solicitud.
3. Desde reserva se puede generar partido.
4. El flujo de club y player no es identico: cada actor resuelve su objetivo operativo.

## Resultado funcional entregado
### Backend (DB + seguridad)
- Tablas nuevas:
  - `public.club_courts`
  - `public.club_booking_settings`
  - `public.court_bookings`
- Validaciones y constraints:
  - `surface_type` valido.
  - `slot_duration_minutes` y `buffer_minutes` acotados.
  - `status` valido (`requested|confirmed|rejected|cancelled`).
  - `end_at > start_at`.
  - unicidad de `match_id` en reservas cuando no es nulo.
- Indices operativos por club/cancha/estado/solicitante.
- RLS activo en las 3 tablas:
  - lectura por requester, owner del club o admin.
  - escritura restringida segun rol y estado.

### RPCs de reservas
- `club_upsert_booking_settings`
- `club_create_court`
- `club_update_court`
- `player_request_booking`
- `club_confirm_booking`
- `club_reject_booking`
- `player_cancel_booking`
- `booking_create_match`
- Hotfix adicional para operativa club:
  - `club_create_confirmed_booking_match`

### Reglas de negocio clave
- Validacion temporal en solicitud player:
  - no pasado (con margen operativo), no demasiado lejano.
- Anti-solapamiento al confirmar reserva de club (`BOOKING_OVERLAP`).
- Creacion de partido desde reserva confirmada con comportamiento idempotente.

## Cambios UX Player
### 1) Nueva reserva con calendario
- Ruta: `/player/bookings/new`
- Vista por defecto: semana.
- Opcion adicional: mes.
- Flujo: dia -> club -> hora -> ver canchas disponibles -> enviar solicitud.

### 2) Envio de reserva + continuidad
- Se resolvio falso error de UI por manejo de redirect en server actions.
- Al enviar solicitud, el flujo continua a completar el partido (carga de jugadores).

### 3) Completar partido desde reserva
- Ruta: `/player/matches/new` acepta contexto de reserva:
  - `booking_id`, `club_id`, `club_name`, `date`, `time`, `from_booking`.
- Modal simplificado para ese contexto:
  - fecha/hora/club como resumen fijo (sin duplicar inputs).
  - foco en completar roster.
- CTA ajustada: `Continuar generando partido`.

## Cambios UX Club
### 1) Settings de reservas
- Pantalla simplificada para owner:
  - duracion turno
  - buffer (default 0)
- Se evito exponer complejidad tecnica innecesaria en el flujo principal.

### 2) Calendario de reservas
- Ruta: `/club/dashboard/bookings`
- Vista mensual con contadores por dia:
  - solicitudes, confirmadas, historial.

### 3) Modal “Crear partido desde reserva”
- Ahora trabaja sobre solicitud concreta del dia.
- Precarga automaticamente:
  - hora (`start_at`)
  - cancha (`court_id`)
  - jugador solicitante (`requested_by_player_id`)
- Si hay varias solicitudes en el dia:
  - selector de solicitud para alternar y mantener prefill coherente.
- Se incorporo merge de jugadores para no perder solicitantes fuera del search limitado.

## Arquitectura de codigo (Q3)
- Repositorio: `repositories/booking.repository.ts`
- Servicio: `services/booking.service.ts`
- Acciones server: `lib/actions/booking.actions.ts`
- Esquemas: `schemas/booking.schema.ts`
- UI:
  - `components/bookings/ClubBookingsCalendarPanel.tsx`
  - `app/player/(app)/bookings/new/page.tsx`
  - `components/matches/CreateMatchForm.tsx`
  - `app/club/(app)/dashboard/bookings/page.tsx`

## Migraciones Q3
Aplicar en este orden (si no estan ya en ambiente):
1. `supabase/migrations/20260303_q3_reservas_mvp.sql`
2. `supabase/migrations/20260303_q3_booking_buffer_default_zero.sql`
3. `supabase/migrations/20260303_q3_club_create_confirmed_booking_match.sql`

## Checklist de QA funcional
### Player
1. Crear reserva desde `player/bookings/new`.
2. Ver canchas disponibles por club/horario.
3. Enviar solicitud y continuar a completar jugadores.
4. Confirmar que no aparece error falso en envio.

### Club
1. Ver solicitud en calendario del dia correcto.
2. Abrir modal “Crear partido desde reserva”.
3. Validar prefill de hora, cancha y jugador solicitante.
4. Crear partido confirmado y validar reflejo en paneles club/player.

### Solapamientos
1. Crear reservas cruzadas en misma cancha.
2. Confirmar primera.
3. Confirmar segunda y esperar `BOOKING_OVERLAP`.

## Produccion - Runbook
### Pre-deploy
1. `npm run build`
2. Validar migraciones Q3 aplicadas en DB de produccion.
3. Verificar que PostgREST recargue esquema (`NOTIFY pgrst, 'reload schema';`).

### Deploy app
1. Publicar commit de `feature/q3-bookings`.
2. Promover a rama de produccion segun pipeline del proyecto.

### Post-deploy
1. Smoke de rutas:
  - `/player/bookings/new`
  - `/player/matches/new` con query `from_booking=1`
  - `/club/dashboard/bookings`
2. Crear una reserva real de punta a punta y validar reflejo en ambos portales.

## Rollback
1. Revertir deploy de app al release anterior.
2. Si hay fallo de lógica en app pero DB estable:
  - mantener migraciones y revertir solo frontend/server actions.
3. Si hay fallo crítico de DB:
  - aplicar script de rollback controlado (no destructivo) segun snapshot/backup operativo.

## Riesgos conocidos y siguientes pasos
- Vinculo fuerte `court_bookings.match_id` para flujo player “partido iniciado desde reserva pending” puede endurecerse en siguiente iteracion.
- Mejorar trazabilidad de actor que crea partido desde modal club para auditoria operativa.
- Agregar métricas de conversión:
  - solicitud -> confirmada
  - solicitud -> partido generado
  - tiempo medio de confirmación.

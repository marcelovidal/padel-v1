# Walkthrough Stage Q3 - Reservas MVP Club-First

> Documentacion completa: `docs/README_Q3_RESERVAS_MVP.md`

## Objetivo
Implementar reservas simples de canchas:
- Player solicita (`requested`)
- Club confirma/rechaza (`confirmed` / `rejected`)
- Player/club crea partido desde reserva confirmada (idempotente)

## Migracion SQL
Archivo:
- `supabase/migrations/20260303_q3_reservas_mvp.sql`

Incluye:
- Tablas `club_courts`, `club_booking_settings`, `court_bookings`
- RLS por owner/requester/admin
- RPCs de escritura y gestion de reservas
- Constraint anti-doble booking en `club_confirm_booking` via chequeo de solapamiento temporal

## Flujo funcional
1. Club configura canchas:
   - `/club/dashboard/courts`
2. Club define settings:
   - `/club/dashboard/settings`
3. Player reserva:
   - `/clubs/[id]` -> `/clubs/[id]/book`
4. Club gestiona:
   - `/club/dashboard/bookings`
5. Player consulta:
   - `/player/bookings` -> `/player/bookings/[id]`
6. Crear partido desde reserva confirmada:
   - Boton en detalle de reserva player o panel club

## Verificacion manual
1. Club crea 2 canchas y settings.
2. Player solicita reserva para manana 20:00.
3. Club confirma en `/club/dashboard/bookings`.
4. Player ve reserva `confirmed`.
5. Player crea partido desde reserva y valida `match_id` asociado.
6. Crear 2 solicitudes solapadas y confirmar ambas:
   - la segunda debe fallar con `BOOKING_OVERLAP`.
7. RLS:
   - player solo ve sus reservas.
   - owner del club ve reservas de su club.

## Comandos recomendados
```bash
npm run build
```

Migraciones (segun flujo de tu entorno):
```bash
supabase db push
```

Si aplicas manual en SQL Editor, ejecutar en orden:
1. `20260302_stage_q2_club_adoption.sql`
2. `20260303_stage_q2_player_create_candidate_compat.sql`
3. `20260303_stage_q2_matches_deleted_at_compat.sql`
4. `20260303_stage_q2_club_claim_consistency.sql`
5. `20260303_q3_reservas_mvp.sql`

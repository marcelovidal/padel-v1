# Walkthrough Q2 - Club Data Quality & Adoption

## Alcance implementado
- Migracion incremental: `supabase/migrations/20260302_stage_q2_club_adoption.sql`.
- Club canonico obligatorio (`club_id`) en creacion/edicion de partidos de jugador.
- Registro automatico de alias cuando el usuario tipea una variante y selecciona un club canonico.
- Telemetry de anclaje: `match_club_anchoring_events`.
- Estadisticas admin de adopcion: RPC `admin_get_club_anchoring_stats()`.
- Perfil publico de club: `app/club/[id]/page.tsx`.
- Dashboard club owner: CTA de compartir/invitar + bloque de infraestructura declarada.
- Ruta admin de review: `app/admin/clubs/review/page.tsx`.

## SQL a ejecutar
Si tu entorno ya tenia Q1 aplicado, corre solo Q2:

```sql
-- Supabase SQL editor / migration runner
\i supabase/migrations/20260302_stage_q2_club_adoption.sql
```

## Verificacion funcional (manual)
1. Crear partido pasado sin club:
- Ir a `/player/matches/new`.
- Dejar club sin seleccionar.
- Esperado: bloqueo en UI y mensaje de validacion.

2. Crear partido seleccionando club existente:
- Buscar en combobox y elegir club.
- Enviar formulario.
- Esperado: partido creado con `matches.club_id` no nulo.

3. Crear club candidato en flujo:
- En modal "No encuentro mi club" completar nombre, ubicacion, canchas y superficies.
- Guardar y luego crear partido.
- Esperado: club creado + seleccionado automaticamente + partido anclado.

4. Alias automatico:
- Buscar/escribir variante (ej: "El Palau"), seleccionar club canonico "Palau".
- Crear partido.
- Esperado: se inserta/actualiza alias en `club_aliases`.

5. Vista publica de club:
- Abrir `/club/{club_id}`.
- Esperado: nombre, ubicacion, canchas, superficies, estado claimed.

6. Dashboard owner:
- Abrir `/club/dashboard` con cuenta owner.
- Esperado: KPIs + CTA compartir + CTA invitar por WhatsApp + infraestructura.

7. Admin adopcion:
- Abrir `/admin`.
- Esperado: card/tasa de anclaje 30d + ciudad top unanchored.

8. Admin review:
- Abrir `/admin/clubs/review`.
- Esperado: redireccion a tab de duplicados (`/admin/club-claims?tab=duplicates`).

## Queries de control
```sql
-- Tasa de anclaje via RPC
select public.admin_get_club_anchoring_stats();

-- Eventos de anclaje recientes
select *
from public.match_club_anchoring_events
order by created_at desc
limit 50;

-- Partidos sin club
select id, match_at, club_name, club_name_raw
from public.matches
where club_id is null
order by created_at desc
limit 50;
```

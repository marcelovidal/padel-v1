# Stage Q1 - Match Club Anchor (Runbook)

## Objetivo
Anclar partidos a clubes canónicos (`matches.club_id`) para habilitar métricas, ligas y reservas confiables.

## Alcance implementado
- `matches.club_name_raw` para conservar input libre.
- Auditoría de cambios de anclaje en `match_club_events`.
- Claim seguro por responsable en `player_claim_club` + `club_claim_log`.
- Búsqueda de clubes con aliases y scoring (`player_search_clubs`).
- Alta de club candidato desde jugador (`player_create_club_candidate`).
- Tooling admin para partidos sin club: `/admin/matches/unlinked`.
- Backfill controlado con dry-run: `admin_backfill_match_clubs`.

## Migración aplicada
- `supabase/migrations/20260302_stage_q1_match_club_anchor.sql`

## Validación mínima post-deploy
1. Crear partido con club existente desde `/player/matches/new`.
2. Crear club candidato desde modal "No encuentro mi club" y generar partido.
3. Ver badge "Club sin reclamar" en `/player/matches` o detalle.
4. Asignar un partido en `/admin/matches/unlinked`.
5. Ejecutar backfill:
```sql
select * from public.admin_backfill_match_clubs(true);
select * from public.admin_backfill_match_clubs(false);
```

## SQL de observabilidad
```sql
-- Partidos sin anclar
select id, match_at, club_name_raw
from public.matches
where club_id is null and nullif(trim(club_name_raw), '') is not null
order by match_at desc
limit 100;

-- Eventos recientes de anclaje
select match_id, source, old_club_id, new_club_id, created_at
from public.match_club_events
order by created_at desc
limit 100;

-- Claims recientes de clubes
select club_id, claimed_by, claimed_at, method
from public.club_claim_log
order by claimed_at desc
limit 50;
```

## Rollback rápido (solo aplicación)
Si aparece regresión de UI:
1. Revertir deploy al release previo en Vercel.
2. Mantener migración DB (es compatible hacia adelante y no destructiva).

## Rollback SQL (solo emergencia)
No recomendado en caliente. Si es estrictamente necesario:
- deshabilitar uso de rutas nuevas (`/admin/matches/unlinked`) en app.
- restaurar funciones previas con nueva migración correctiva (no `DROP` directo en producción).

## Notas operativas
- El build pasa con warnings no bloqueantes existentes (imágenes/hooks).
- Seguridad: RPCs con `SECURITY DEFINER` + validaciones de rol/participación.

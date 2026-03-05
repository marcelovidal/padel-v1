# Q5 - Ranking Por Club (MVP)

## Objetivo
Implementar ranking por club rapido, recalculable e idempotente, basado en partidos `completed` con resultado, para dos vistas:
- Club: Top jugadores por puntos.
- Player: posicion propia por club.

## Modelo
Se agrega tabla materializada:
- `public.player_club_stats`
  - `club_id`, `player_id` (PK compuesta)
  - `matches_played`, `wins`, `losses`
  - `sets_won`, `sets_lost`
  - `points` (regla MVP: `wins*3 + losses*1`)
  - `last_match_at`, `updated_at`

## Regla De Computo
Solo cuentan partidos que cumplen:
- `matches.status = 'completed'`
- existe `match_results`
- `match_results.winner_team` no nulo
- `match_results.sets` no nulo y array con al menos 1 set

Para cada jugador en `match_players`:
- `win` si `match_players.team = winner_team`
- `loss` si `match_players.team <> winner_team`
- `sets_won/sets_lost` se derivan por set comparando score del team del jugador.

Compatibilidad legacy de sets:
- score por set soporta claves `team_a_games/team_b_games` y `a/b`.

## RPCs
### 1) `public.club_recalculate_rankings(p_club_id uuid)`
- `SECURITY DEFINER`
- valida autenticacion
- valida club existente y activo (no deleted/archived/merged)
- autoriza solo:
  - owner del club (`claim_status='claimed'` y `claimed_by=auth.uid()`)
  - admin (`profiles.role='admin'`)
- recalcula set-based, borra stats previas del club y vuelve a insertar snapshot actual

### 2) `public.club_get_ranking(p_club_id uuid, p_limit int, p_offset int)`
- lectura paginada
- retorna ranking con `row_number()`:
  - orden: `points DESC, wins DESC, matches_played DESC, display_name ASC`
- retorna `category` como `text` para compatibilidad legacy

### 3) `public.player_get_my_club_rankings(p_limit int)`
- resuelve `player_id` desde `auth.uid()`
- devuelve posicion del jugador por club (clubs donde tiene stats)
- ordena por actividad (`matches_played`, `last_match_at`)

## RLS Y Seguridad
- `player_club_stats` con RLS habilitado.
- SELECT permitido a `authenticated` si el club esta activo.
- sin policies de write para `authenticated`; escritura solo via RPC `SECURITY DEFINER`.

## Performance
Indices:
- `idx_player_club_stats_ranking (club_id, points DESC, wins DESC, matches_played DESC)`
- `idx_player_club_stats_player (player_id)`
- `idx_matches_club_match_at (club_id, match_at DESC)`

Lecturas UI usan tabla materializada (`player_club_stats`), evitando escaneo full de `matches`.

## UI Entregada
- Club:
  - nueva ruta: `/club/dashboard/ranking`
  - tabla Top 20
  - KPIs: jugadores rankeados, partidos considerados, ultimo partido rankeado
  - accion: boton "Recalcular ranking"
- Player:
  - `app/player/(app)/profile/page.tsx`
  - nueva seccion "Ranking por clubes" (hasta 5 clubes)

## Idempotencia
- Recalculo puede ejecutarse repetidamente: deja mismo snapshot para mismos datos fuente.
- No depende de estado incremental; siempre recompone por club.

## QA Manual
1. Crear/usar club con >= 3 matches `completed` y resultado cargado.
2. Owner ejecuta recalculo en `/club/dashboard/ranking`: debe actualizar tabla.
3. Usuario no owner/admin intentando recalculo: `NOT_ALLOWED`.
4. Player en `/player/profile` ve rank por club.
5. Matches sin resultado o sin sets no deben impactar ranking.

## Rollout
1. Aplicar migracion `20260305_stage_q5_club_ranking.sql`.
2. Verificar RPCs en PostgREST schema cache (`NOTIFY pgrst, 'reload schema'` incluido).
3. Deploy app.

## Rollback
- Reversible a nivel app:
  - ocultar ruta/boton de ranking.
  - mantener migracion aplicada sin uso.
- Revert tecnico:
  - revert de commits TS/UI/docs.
  - opcionalmente, drop de RPCs/tabla en migracion de rollback dedicada.

## Nota De Compatibilidad
- `players.category` sigue siendo legacy-compatible (TEXT en DB en entornos heredados).
- El ranking la expone como texto y no fuerza migracion de tipo.

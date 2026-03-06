# Q6 - Ligas del Club (MVP)

## Objetivo
Implementar una capa de ligas por club, separando:
- Competencia (liga/division/grupo/fixture)
- Agenda (fecha/hora/cancha, reutilizando reservas)

La solucion permite crear liga, divisiones, inscribir parejas, generar grupos y fixture round-robin, agendar cruces en canchas del club y leer tabla por grupo.

## Modelo DB
Migracion: `supabase/migrations/20260305_stage_q6_leagues.sql`

Tablas nuevas:
- `club_leagues`: liga por club (`draft|active|finished`)
- `league_divisions`: divisiones por liga (`SINGLE|SUM|OPEN`)
- `league_teams`: parejas inscriptas por division
- `league_groups`: grupos por division
- `league_group_teams`: asignacion equipo->grupo
- `league_matches`: cruces del fixture (1:1 con `matches`)

Indices:
- `idx_club_leagues_club_status`
- `idx_league_divisions_league`
- `idx_league_teams_division`
- `idx_league_groups_division`
- `idx_league_group_teams_group`
- `idx_league_matches_group_round`
- `idx_league_matches_match`
- Uniques de pares para evitar duplicados de pareja y cruce.

## Seguridad y RLS
- RLS activado en las 6 tablas.
- `SELECT` para `authenticated`:
  - ligas `active` visibles para autenticados
  - borradores/finalizadas visibles para owner/admin del club
- Mutaciones bloqueadas por tabla (sin grants INSERT/UPDATE/DELETE).
- Mutaciones solo via RPC `SECURITY DEFINER` con validacion `q6_can_manage_club(club_id, auth.uid())`.

Helpers:
- `q6_is_admin(p_uid)`
- `q6_can_manage_club(p_club_id, p_uid)`

## RPCs Q6
### Gestion
- `club_create_league(p_club_id, p_name, p_season_label, p_description, p_status)`
- `club_create_league_division(p_league_id, p_name, p_category_mode, p_category_value_int, p_allow_override)`
- `club_register_league_team(p_division_id, p_player_id_a, p_player_id_b, p_entry_category_int)`
  - `SINGLE`: valida `entry_category_int` salvo `allow_override=true`
  - `SUM`: valida suma de categorias reales de jugadores (parse seguro)
  - `OPEN`: sin validacion estricta

### Grupos y Fixture
- `club_auto_create_groups(p_division_id, p_group_count, p_target_size)`
  - asignacion serpentina
  - orden por `strength` usando `player_club_stats` si existe (fallback por nombre)
- `club_generate_group_fixture(p_group_id)`
  - round-robin por grupo
  - crea `matches` y `match_players`
  - vincula en `league_matches`

### Agenda
- `club_schedule_league_match(p_league_match_id, p_court_id, p_match_at)`
  - valida owner/admin
  - valida slot/cancha con horario Q4.1
  - valida overlap de `court_bookings`
  - crea/actualiza booking confirmado y actualiza `league_matches` + `matches`

### Standings
- `club_get_group_table(p_group_id)`
  - calcula tabla por grupo desde `matches + match_results`
  - cuenta solo matches `completed` con `winner_team` y `sets` validos
  - puntos liga: win=3, loss=0

## Backend (Next.js)
Archivos:
- `repositories/leagues.repository.ts`
- `services/leagues.service.ts`
- `lib/actions/leagues.actions.ts`

Responsabilidades:
- repository: acceso a tablas/RPCs
- service: orquestacion simple
- actions: validacion basica, manejo de errores y `revalidatePath`

## UI
### Club (owner/admin)
- `/club/dashboard/leagues`
  - listar ligas del club
  - crear liga
- `/club/dashboard/leagues/[leagueId]`
  - crear division
  - inscribir equipos
  - auto grupos
  - generar fixture por grupo
  - agenda por match (fecha/hora/cancha)
  - tabla por grupo

### Player / lectura
- `/club/[clubId]/leagues`
  - ligas activas del club
  - divisiones, grupos y tablas (solo lectura)

Extra:
- Seccion "Ranking por Clubes" agregada en `/player/profile` (usa `player_get_my_club_rankings` de Q5 si esta disponible)

## QA Manual
1. Crear liga desde `/club/dashboard/leagues`.
2. Crear division en `/club/dashboard/leagues/[leagueId]`.
3. Inscribir al menos 4 equipos.
4. Ejecutar auto grupos.
5. Generar fixture en un grupo.
6. Agendar al menos un cruce con cancha + fecha/hora.
7. Cargar resultado del match desde flujo normal y verificar `club_get_group_table` reflejado en UI.
8. Entrar como player autenticado a `/club/[clubId]/leagues` y verificar lectura.

## Rollout
1. Aplicar migracion Q6 en Supabase.
2. Verificar `NOTIFY pgrst` y cache de schema.
3. Deploy backend/frontend.
4. Smoke test club + player.

## Hotfixes Aplicados (Q6)
Migraciones adicionales ya versionadas en este branch:
- `supabase/migrations/20260306_q6_schedule_fix_for_update.sql`
- `supabase/migrations/20260306_q6_schedule_player_overlap.sql`
- `supabase/migrations/20260306_q6_fixture_duplicate_player_guards.sql`
- `supabase/migrations/20260306_q6_remove_league_team.sql`
- `supabase/migrations/20260306_q6_publish_league.sql`
- `supabase/migrations/20260306_q6_register_team_group_guard.sql`
- `supabase/migrations/20260306_q6_reopen_division_fixture_for_edit.sql`

Impacto funcional:
- Fix de scheduling (`FOR UPDATE`, validacion de solapamiento por jugadores).
- Guardas para evitar duplicados de jugadores por division/grupo.
- Eliminacion de equipo desde UI (con bloqueo si tiene fixture).
- Publicar/finalizar liga desde UI.
- Bloqueo de altas/asignaciones cuando ya existe fixture.
- Reapertura controlada de fixture en modo borrador (con confirmacion e impacto).

## Handoff: Continuar En Otra PC (Sin Produccion)
### 1) Traer codigo exacto
```bash
git fetch origin
git checkout feature/stage-q6-leagues
git pull
```

### 2) Instalar dependencias y levantar app local
```bash
npm install
npm run dev
```

### 3) Sincronizar variables de entorno
- Copiar `.env.local` de la PC actual a la otra PC.
- Verificar que apunte a entorno de desarrollo/staging (no prod).

### 4) Sincronizar base de datos (Supabase)
Si el proyecto usa SQL Editor manual:
1. Ejecutar las migraciones faltantes de `supabase/migrations/` en orden por fecha.
2. Confirmar que no hubo errores en cada script.

Si el proyecto usa CLI:
```bash
supabase db push
```

### 5) Verificaciones minimas post-sync
1. Abrir `/club/dashboard/leagues`.
2. Entrar a una liga de prueba.
3. Verificar:
   - badges `Asignado/Sin grupo`,
   - bloqueo de altas con fixture,
   - flujo `Reabrir edicion de fixture` con confirmacion `REABRIR`.

## Nota Operativa Importante
- Subir commits a `feature/stage-q6-leagues` **no** pasa a produccion.
- Produccion solo cambia al mergear a la rama de release (`main`/la que use CI para deploy).

## Rollback
- Aplicacion:
  - ocultar menu/rutas de Ligas (feature toggle o revert UI/API).
- DB:
  - las tablas/rpcs son aditivas; si se necesita rollback fuerte, usar migracion de down explicitamente.
- Operativo:
  - si falla scheduling, conservar gestion de partidos/reservas Q4 sin impacto.


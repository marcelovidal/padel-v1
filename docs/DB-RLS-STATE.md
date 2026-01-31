# Estado de Base de Datos y RLS (v1.0.0-player-read)

Este documento describe el estado actual de la seguridad a nivel de filas (RLS) en Supabase para el portal de jugadores.

## Resumen de Seguridad

Todas las tablas críticas tienen **RLS habilitado**. Los administradores mantienen acceso total a través de sus perfiles (`profiles.role = 'admin'`), mientras que los jugadores tienen acceso restringido basado en su identidad vinculada.

### Tablas con RLS Activo

| Tabla | Estado | Acceso Jugador |
| :--- | :--- | :--- |
| `players` | ✅ ENABLED | Propio perfil + participantes de sus partidos |
| `matches` | ✅ ENABLED | Partidos donde participa |
| `match_players` | ✅ ENABLED | Participaciones en sus partidos |
| `match_results` | ✅ ENABLED | Resultados de sus partidos |
| `player_match_assessments` | ✅ ENABLED | Solo autoevaluaciones propias |

## Políticas Vigentes

### 1. `public.players`
- **`players_select_owner`**: `user_id = auth.uid()`.
- **`players_select_participants`**: Permite ver a otros jugadores que compartan un `match_id` conmigo.

### 2. `public.matches`
- **`matches_select_participant`**: El jugador debe estar listado en `match_players` para el partido.

### 3. `public.match_players`
- **`match_players_select_all_in_my_matches`**: Permite ver a todos los participantes de los partidos donde el usuario actual es jugador.
- *Nota*: Evita recursión mediante la función `current_player_match_ids()`.

### 4. `public.match_results`
- **`match_results_select_participant`**: El jugador puede ver el resultado solo si participó en el partido.

### 5. `public.player_match_assessments`
- **`player_match_assessments_player_select`**: El jugador solo puede leer filas donde `player_id` coincida con su ID de jugador.

## Funciones Auxiliares (Security Definer)

Para evitar errores de recursión infinita en las políticas, se utilizan las siguientes funciones que se ejecutan con permisos elevados:

- `public.current_player_id()`: Retorna el UUID del jugador vinculado al usuario autenticado.
- `public.current_player_match_ids()`: Retorna una tabla con todos los IDs de partidos donde participa el jugador actual.

## Verificación de Acceso

Un jugador autenticado puede:
- Ver la lista de sus partidos pasados y futuros.
- Ver los nombres de sus compañeros y rivales (formato inicial + apellido).
- Ver los resultados detallados por sets.
- Consultar el detalle de su propia autoevaluación (vía carga bajo demanda).

Un jugador **NO** puede:
- Ver partidos donde no participa.
- Ver autoevaluaciones de otros jugadores.
- Modificar resultados o perfiles de otros.

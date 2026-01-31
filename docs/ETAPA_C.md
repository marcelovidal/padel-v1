# ETAPA C: Experiencia del Jugador - Partidos

Esta etapa consolida la visualización de datos propios para el jugador autenticado.

## Funcionalidades implementadas

### 1. Listado de Partidos (`/player/matches`)
- Consulta dinámica de partidos donde el jugador logueado es participante.
- Manejo de estados:
    - **Cargando**: (vía Next.js Server Components).
    - **Sin partidos**: Mensaje amigable "Todavía no tenés partidos registrados" y placeholder del botón de carga.
    - **Con partidos**: Tarjetas informativas con fecha, club, estado y resultado.
- Respeto estricto de **RLS** (Row Level Security): el frontend no usa `service_role`.

## Cambios Técnicos

### Backend
- **MatchRepository**: Se utilizó el método existente `findByPlayerId(playerId)` que realiza los joins necesarios con `match_players` y `match_results`.
- **MatchService**: Se expuso `getPlayerMatches(playerId)` para facilitar el acceso desde la capa de UI.

### Frontend
- **Página `/player/matches`**: Implementada como Server Component. Utiliza `requirePlayer()` para asegurar autenticación y obtener el `playerId`.

## Tablas y Relaciones
- `matches`: Datos principales del partido.
- `match_players`: Relación N:N para filtrar por `player_id`.
- `match_results`: Datos del marcador final.

## Supuestos y Decisiones
- Se asume que el `playerId` obtenido de la sesión/middleware es válido (ver etapa B).
- La visualización de resultados es simplificada (Ganador Eq. A / Eq. B) a la espera de la lógica de sets detallada en la Etapa D.

## Pendientes para ETAPA D
- [ ] Implementar botón funcional para "Cargar nuevo partido".
- [ ] Detalle expandible del partido (desglose de sets).
- [ ] Edición de resultados de partidos propios.

# Player Auth RLS policies

Se agregan políticas para permitir que jugadores autenticados (vinculados mediante `players.user_id`) accedan a sus propios datos y a los partidos donde participan.

Políticas añadidas:

- `players_select_owner` (SELECT on `public.players`): permite a un usuario ver su propia fila cuando `players.user_id = auth.uid()`.
- `matches_select_participant` (SELECT on `public.matches`): permite a un usuario ver partidos donde existe una fila en `match_players` con `player_id = (SELECT id FROM players WHERE user_id = auth.uid())`.
- `assessments_select_owner` (SELECT on `public.player_match_assessments`): permite a un jugador ver sus propias autoevaluaciones (`player_id` coincide con su player id).

Notas:
- INSERT/UPDATE policies para `match_results` y `player_match_assessments` no se habilitan automáticamente: la intención es validar en server actions y luego, si se desea, añadir políticas estrictas por columnas.
- Todas las políticas se agregaron por medio de la migración: `scripts/sql/2026-01-23-02-add-rls-policies-for-players.md.sql`.

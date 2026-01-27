# Estado de la rama — feature/player-auth-v2

## Contexto
Esta rama implementa la autenticación separada para jugadores (Player Auth) en Padel V1.

## Estado Actual (Completado)
✔️ **ETAPA A y B COMPLETADAS**
- `players.user_id` existe y referencia correctamente a `auth.users.id`.
- Login de jugador (`/player/login`) redirige correctamente al dashboard (`/player`).
- Middleware y Route Guards funcionando correctamente.
- **Fix Crítico**: Resuelto el problema de redirect infinito causado por políticas RLS faltantes y diferencias de puerto.

## Cambios Validados
1. **Autenticación**: Login funcional con email/password.
2. **Base de Datos**: 
   - Migraciones SQL aplicadas correctamente.
   - Políticas RLS activas y corruptas (ver `scripts/sql/2026-01-25-01-players-select-owner-policy.sql`).
3. **UI**:
   - `/player`: Dashboard accesible.
   - `/player/matches`: Muestra placeholder "Listado de partidos (implementación futura)".

## Notas de Desarrollo
- El usuario de prueba `mvidal@iupa.edu.ar` tiene su `user_id` vinculado.
- La diferencia de puertos (3000 vs 3001) fue diagnosticada y resuelta.
- Próximos pasos: Implementar la funcionalidad real de `/player/matches`.

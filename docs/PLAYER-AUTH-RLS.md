# Player Auth RLS policies

Se agregan políticas para permitir que jugadores autenticados (vinculados mediante `players.user_id`) accedan a sus propios datos y a los partidos donde participan.

Políticas añadidas:

- `players_select_owner` (SELECT on `public.players`): permite a un usuario ver su propia fila cuando `players.user_id = auth.uid()`.
- `matches_select_participant` (SELECT on `public.matches`): permite a un usuario ver partidos donde existe una fila en `match_players` con `player_id = (SELECT id FROM players WHERE user_id = auth.uid())`.
- `assessments_select_owner` (SELECT on `public.player_match_assessments`): permite a un jugador ver sus propias autoevaluaciones (`player_id` coincide con su player id).

Notas:
- INSERT/UPDATE policies para `match_results` y `player_match_assessments` no se habilitan automáticamente: la intención es validar en server actions y luego, si se desea, añadir políticas estrictas por columnas.
- Todas las políticas se agregaron por medio de la migración: `scripts/sql/2026-01-23-02-add-rls-policies-for-players.md.sql`.

## Troubleshooting: Bucle de Redirección Infinito

Este error se manifiesta como un loop constante entre `/player/login` y `/player`, resultando en un error de "Too many redirects" o una pantalla en blanco con parpadeo de URL.

### Síntomas Típicos
- **Error 307 (Temporary Redirect)** recurrente en la pestaña Network del navegador.
- El usuario se loguea correctamente pero nunca llega al dashboard de forma estable.

### Cusas Raíz y Soluciones
1.  **Políticas RLS en tabla `players`**: 
    - **Problema**: El middleware o el guard intentan leer la fila del jugador para verificar permisos, pero Supabase devuelve un array vacío debido a RLS, lo que hace que el sistema crea que no está autorizado.
    - **Solución**: Asegurar que la política `players_select_owner` esté aplicada (ver `scripts/sql/2026-01-25-01-players-select-owner-policy.sql`).
2.  **Configuración de URL y Puertos**:
    - **Problema**: Desajuste entre el puerto de la aplicación (e.g. 3001) y la `NEXT_PUBLIC_SITE_URL` o las "Redirect URLs" en el dashboard de Supabase (e.g. 3000).
    - **Solución**: Sincronizar todos los puertos a 3000 (o el puerto definido por el entorno) tanto en `.env.local` como en Supabase Dashboard > Authentication > URL Configuration.
3.  **Relación de Identidad**:
    - **Problema**: El campo `players.user_id` no coincide con el `id` del usuario en `auth.users`.
    - **Solución**: Verificar que al crear un jugador manualmente o vía seed, el `user_id` sea el UUID correcto de la tabla `auth.users`.

---

## Checklist de Despliegue (DEV / STAGING / PROD)

Para asegurar que el flujo de Player Auth funcione, se debe seguir este orden:

- [ ] **1. Migraciones SQL**: Ejecutar los scripts en `scripts/sql/` en orden cronológico, especialmente los relacionados con RLS.
- [ ] **2. Site URL**: Configurar `NEXT_PUBLIC_SITE_URL` en el entorno para que coincida exactamente con la URL base (incluyendo protocolo y puerto).
- [ ] **3. Redirect URLs**: Añadir `<SITE_URL>/player/login` y `<SITE_URL>/login` a las URLs permitidas en Supabase.
- [ ] **4. Database Link**: Confirmar que los usuarios de prueba tengan una entrada en `public.players` con el `user_id` correcto.
- [ ] **5. Orden de Arranque**:
    1. Base de datos (Supabase) con RLS configurado.
    2. Servidor Next.js con variables de entorno actualizadas.

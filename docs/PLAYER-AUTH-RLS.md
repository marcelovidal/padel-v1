# Player Auth RLS policies

Se agregan políticas para permitir que jugadores autenticados (vinculados mediante `players.user_id`) accedan a sus propios datos y a los partidos donde participan.

Políticas añadidas:

- `players_select_owner` (SELECT on `public.players`): permite a un usuario ver su propia fila cuando `players.user_id = auth.uid()`.
- `matches_select_participant` (SELECT on `public.matches`): permite a un usuario ver partidos donde existe una fila en `match_players` con `player_id = (SELECT id FROM players WHERE user_id = auth.uid())`.
- `assessments_select_owner` (SELECT on `public.player_match_assessments`): permite a un jugador ver sus propias autoevaluaciones (`player_id` coincide con su player id).

Notas:
- INSERT/UPDATE policies para `match_results` y `player_match_assessments` no se habilitan automáticamente: la intención es validar en server actions y luego, si se desea, añadir políticas estrictas por columnas.
- Todas las políticas se agregaron por medio de la migración: `scripts/sql/2026-01-23-02-add-rls-policies-for-players.md.sql` y se corrigieron en `scripts/sql/2026-01-27-01-player-rls-read-matches.sql`.

---

## Visibilidad de Partidos para Jugadores (Etapa C)

Para que un jugador pueda ver sus partidos en `/player/matches`, no basta con tener permisos en la tabla `matches`. Debido a que la consulta filtra por `match_players` y los datos se obtienen mediante joins, se requieren las siguientes políticas de lectura (`SELECT`):

1.  **`public.players`**: El jugador debe poder leer su propia fila (`user_id = auth.uid()`). Sin esto, el sistema no puede resolver su `player_id`.
2.  **`public.match_players`**: El jugador debe poder leer las filas de participación. Para ver a sus compañeros y oponentes, la política debe permitir ver todos los `match_players` de aquellos `match_id` donde él participe.
3.  **`public.matches`**: El jugador debe poder leer la cabecera del partido si existe una relación en `match_players`.
4.  **`public.match_results`**: El jugador debe poder leer el resultado si pertenece al partido.

### Checklist de RLS para Player Matches
- [x] Política `players_select_owner` en `players`.
- [x] Política `match_players_select_all_in_match` en `match_players` (Crucial para que el join funcione).
- [x] Política `matches_select_participant` en `matches`.
- [x] Política `match_results_select_participant` en `match_results`.

> [!WARNING]
> **Recursión Infinita en RLS**: Al crear políticas que referencian a la misma tabla (como en `match_players`), se puede producir una recursión infinita. Para evitarlo, se debe usar funciones con `SECURITY DEFINER` (ver `scripts/sql/2026-01-28-01-fix-rls-recursion.sql`). En esta rama se implementaron `current_player_id()` y `current_player_match_ids()` para resolver este problema limpiamente.

---

## Componentes Compartidos: MatchCard

Para asegurar una estética "Wow" y coherencia visual en toda la app, se ha unificado el renderizado de partidos en un único componente:

- **Ubicación**: `src/components/matches/MatchCard.tsx`
- **Modelo de Datos**: `src/components/matches/matchCard.model.ts` (usa `toMatchCardModel` para normalizar datos de cualquier servicio).

### Ejemplo de uso:
```tsx
import MatchCard from "@/components/matches/MatchCard";
import { toMatchCardModel } from "@/components/matches/matchCard.model";

// En el Server Component
const model = toMatchCardModel(matchData, { playerTeam: 'A' });
return <MatchCard model={model} variant="player" />;
```

Este componente se utiliza actualmente en `/admin/matches`, `/player/matches` y en el perfil de usuario `/admin/users/[id]`.

## Troubleshooting: Bucle de Redirección Infinito

Este error ocurría cuando un usuario autenticado (ej: admin) intentaba acceder al portal de jugadores sin tener un registro vinculado en la tabla `public.players`.

### Solución Implementada:
1.  **Middleware Simplificado**: El middleware ya no redirige automáticamente de `/player/login` a `/player`. Solo se encarga de proteger las rutas `/player/*` si no hay una sesión activa.
2.  **Login Server-Side**: La página `app/player/login/page.tsx` es ahora un **Server Component** que decide la redirección:
    *   Si hay sesión y hay perfil de jugador: Redirige a `/player/matches`.
    *   Si hay sesión pero NO hay perfil: Muestra un aviso claro y permite cerrar sesión.
    *   Si no hay sesión: Muestra el formulario de login.
3.  **PlayerLoginForm**: Componente cliente que maneja el envío del formulario y el cierre de sesión, evitando pasar funciones desde el servidor.

---

## Etapa D: Visualización Completa de Partidos

Para que el jugador vea la información completa de sus partidos, se requieren los siguientes datos y permisos:

### Datos Requeridos (MatchCardModel)
- **playersByTeam**: Objeto `{ A: PlayerMini[], B: PlayerMini[] }` con nombres y apellidos.
- **results**: Objeto con `sets` (array de scores `a` y `b`) y `winnerTeam`.
- **hasAssessment**: Booleano que indica si el jugador logueado ya completó su autoevaluación para ese partido.

### Políticas RLS Necesarias (SELECT)
Para que los jugadores puedan ver estos datos, se han implementado las siguientes políticas:
- `matches_select_participant`: Permite ver el partido si es participante.
- `match_players_select_all_in_my_matches`: Permite ver los nombres de todos los jugadores en sus partidos.
- `match_results_select_participant`: Permite ver el resultado de sus partidos.
- `player_match_assessments_player_select`: Permite ver **solo sus propias** autoevaluaciones.
Esta arquitectura es más robusta, evita loops infinitos y mejora la experiencia del usuario al explicar por qué no puede acceder si ya está logueado con otra cuenta.

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

---

## Estado Validado – v1.0.0-player-read

Este estado representa la primera versión estable del Portal de Jugadores.

- **URL**: `/player/matches`
- **Capacidad**: Lectura completa de partidos, equipos y autoevaluaciones propias.
- **Seguridad**: RLS blindado contra recursión.
- **Arquitectura**: Server Components para el listado, Client Components para la interactividad on-demand.

**Archivos SQL clave**:
- `scripts/sql/2026-01-28-01-fix-rls-recursion.sql`
- `scripts/sql/2026-01-31-01-player-assessment-read-policy.sql`
- `scripts/sql/2026-01-31-02-player-participants-visibility.sql`

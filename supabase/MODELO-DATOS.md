# Modelo de Datos - Padel V1

## Resumen

El modelo de datos está diseñado con los siguientes principios:
- **Separación Cuenta/Jugador**: Los jugadores son entidades de negocio independientes de `auth.users`
- **Soft Delete**: Uso de `deleted_at` para mantener historial
- **Resultados Estructurados**: Sets guardados en JSONB para facilitar estadísticas
- **RLS Activo**: Row Level Security habilitado desde el inicio

## Tablas

### 1. `profiles`
Vinculada a `auth.users` para almacenar el rol del usuario.

**Campos:**
- `id` (UUID, PK, FK → auth.users)
- `role` (TEXT): 'admin' (solo admin en V1)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**RLS:** Solo admin puede leer/escribir

### 2. `players`
Entidad de negocio independiente. NO depende de auth.users.

**Campos:**
- `id` (UUID, PK)
- `first_name` (TEXT, requerido)
- `last_name` (TEXT, requerido)
- `email` (TEXT, opcional, único si existe)
- `phone` (TEXT, único si existe)
- `position` (ENUM): 'drive' | 'reves' | 'cualquiera'
- `status` (ENUM): 'active' | 'inactive'
- `created_at`, `updated_at`, `deleted_at` (TIMESTAMPTZ)

**Constraints:**
- Email único cuando no es NULL
- Phone único cuando no es NULL
- Validación de formato de email

**RLS:** Solo admin puede leer/escribir

### 3. `matches`
Partidos programados o completados.

**Campos:**
- `id` (UUID, PK)
- `datetime` (TIMESTAMPTZ, requerido)
- `club_name` (TEXT, requerido) - **NOTA: Es texto simple, NO existe entidad Club**
- `max_players` (INTEGER, default 4, entre 2 y 4)
- `notes` (TEXT, opcional)
- `status` (ENUM): 'scheduled' | 'completed' | 'cancelled'
- `created_at`, `updated_at`, `deleted_at` (TIMESTAMPTZ)

**RLS:** Solo admin puede leer/escribir

**Nota V1:** Los clubes NO son una entidad separada. `club_name` es solo un campo de texto.

### 4. `match_players`
Join table entre matches y players con información de equipo y posición.

**Campos:**
- `id` (UUID, PK)
- `match_id` (UUID, FK → matches)
- `player_id` (UUID, FK → players)
- `team` (ENUM): 'A' | 'B'
- `position_in_match` (ENUM, opcional): 'drive' | 'reves'
- `created_at` (TIMESTAMPTZ)

**Constraints:**
- Un jugador no puede estar dos veces en el mismo partido (unique_player_match)
- Validación de tamaño de equipo se maneja en la aplicación

**RLS:** Solo admin puede leer/escribir

### 5. `match_results`
Resultados de partidos con sets estructurados.

**Campos:**
- `id` (UUID, PK)
- `match_id` (UUID, FK → matches, UNIQUE)
- `sets` (JSONB): Array de objetos `[{a: 6, b: 4}, ...]`
- `winner_team` (ENUM): 'A' | 'B'
- `recorded_at` (TIMESTAMPTZ)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Constraints:**
- Solo un resultado por partido (UNIQUE match_id)
- Sets debe ser un array con 1-5 elementos
- Trigger automático: al crear resultado, marca match como 'completed'

**RLS:** Solo admin puede leer/escribir

## Triggers

1. **update_updated_at_column**: Actualiza `updated_at` automáticamente en todas las tablas
2. **update_match_status_on_result**: Marca el match como 'completed' cuando se crea un resultado

## Índices

- `profiles`: role
- `players`: first_name, last_name, email, phone, status, deleted_at
- `matches`: datetime, status, deleted_at
- `match_players`: match_id, player_id, (match_id, team)
- `match_results`: match_id, winner_team

## Row Level Security (RLS)

Todas las tablas tienen RLS habilitado. Las policies permiten:
- **SELECT**: Solo admin puede leer registros no eliminados (deleted_at IS NULL)
- **INSERT/UPDATE/DELETE**: Solo admin puede escribir

La función helper `is_admin()` verifica si el usuario actual tiene rol 'admin' en la tabla profiles.

## Notas de Implementación

- La validación de tamaño de equipo (max_players) se maneja en la capa de aplicación, no en la base de datos
- Los soft deletes se implementan filtrando por `deleted_at IS NULL` en las queries
- Los resultados estructurados en JSONB permiten consultas flexibles y estadísticas futuras


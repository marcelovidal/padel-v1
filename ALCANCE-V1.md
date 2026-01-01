# Alcance V1 - Padel App

## ✅ INCLUIDO EN V1

### 1. Autenticación
- **Solo login de admin**
- Protección de rutas `/admin/*`
- Middleware de verificación de rol
- No existe login para jugadores

### 2. Gestión de Jugadores (CRUD completo)
- ✅ Crear jugadores
- ✅ Listar jugadores
- ✅ Editar jugadores
- ✅ Inactivar jugadores (soft delete)
- ✅ Búsqueda por nombre, email, teléfono

### 3. Gestión de Partidos
- ✅ Crear partidos
- ✅ Asignar jugadores a equipos (A/B)
- ✅ Listar partidos
- ✅ `club_name` como campo de texto (NO es entidad)

### 4. Resultados
- ✅ Cargar resultados de partidos
- ✅ Estructura de sets en JSONB: `[{a: 6, b: 4}, ...]`
- ✅ Marca automáticamente el partido como 'completed'

## ❌ FUERA DE ALCANCE V1

### Entidades NO incluidas
- ❌ **Clubes como entidad**: Solo existe `club_name` como texto en matches
- ❌ **Reservas de canchas**: No existe tabla `reservations` ni funcionalidad relacionada
- ❌ **Ratings/Reputación**: No existe tabla `ratings` ni sistema de calificaciones
- ❌ **Notificaciones**: No existe tabla `notifications` ni sistema de notificaciones

### Funcionalidades NO incluidas
- ❌ **Login de jugadores**: Solo existe login de admin
- ❌ **Panel de jugadores**: No existe interfaz para jugadores
- ❌ **Integraciones externas**: WhatsApp, Instagram, etc.
- ❌ **Dashboard con estadísticas**: No existe dashboard
- ❌ **Búsqueda avanzada**: Solo búsqueda básica por texto

### Tablas NO incluidas en el schema
- ❌ `clubs` - NO existe
- ❌ `reservations` - NO existe
- ❌ `ratings` - NO existe
- ❌ `notifications` - NO existe
- ❌ `player_profiles` vinculados a auth - Los players son independientes

## Tablas del Schema V1

1. `profiles` - Solo para admin (vinculado a auth.users)
2. `players` - Entidad de negocio independiente
3. `matches` - Partidos con `club_name` como texto
4. `match_players` - Join table para asignar jugadores a partidos
5. `match_results` - Resultados con sets en JSONB

## Principios V1

1. **Admin-driven**: Todo es gestionado por un superusuario admin
2. **Separación Cuenta/Jugador**: Players NO dependen de auth.users
3. **Soft delete**: Uso de `deleted_at` y `status` para mantener historial
4. **Simplicidad**: No hay entidades complejas ni relaciones innecesarias
5. **Resultados estructurados**: Sets en JSONB para facilitar futuras estadísticas



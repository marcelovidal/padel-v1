# Cambios Realizados - Alcance Reducido V1

## Resumen

Se ajustó el proyecto para alinear el alcance a V1 reducido:
- Solo login de admin
- Solo CRUD de jugadores
- Solo creación de partidos y carga de resultados
- NO existen clubes como entidad, reservas, ratings, notificaciones ni integraciones externas

## Cambios en el Modelo de Datos

### ✅ Schema SQL (`supabase/schema.sql`)

**Cambio realizado:**
- Simplificado el campo `role` en `profiles`: ahora solo acepta 'admin' (eliminado 'user')
  - Antes: `role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user'))`
  - Ahora: `role TEXT NOT NULL DEFAULT 'admin' CHECK (role = 'admin')`

**Tablas mantenidas (todas dentro del alcance):**
- ✅ `profiles` - Solo para admin
- ✅ `players` - CRUD de jugadores
- ✅ `matches` - Creación de partidos (con `club_name` como texto)
- ✅ `match_players` - Asignación de jugadores a partidos
- ✅ `match_results` - Carga de resultados

**Tablas NO incluidas (correcto, fuera de alcance):**
- ❌ `clubs` - NO existe (solo `club_name` como texto en matches)
- ❌ `reservations` - NO existe
- ❌ `ratings` - NO existe
- ❌ `notifications` - NO existe

## Cambios en el Código

### ✅ Tipos TypeScript (`types/database.ts`)

**Cambio realizado:**
- Actualizado el tipo `role` en `profiles` para solo aceptar 'admin'
  - Antes: `role: "admin" | "user"`
  - Ahora: `role: "admin"`

### ✅ Documentación

**Archivos actualizados:**
1. **README.md** - Actualizado con:
   - Funcionalidades V1 claramente definidas
   - Sección "Fuera de Alcance V1" explícita
   - Notas sobre clubes (solo texto, no entidad)

2. **supabase/MODELO-DATOS.md** - Actualizado con:
   - Nota sobre `club_name` como texto simple
   - Aclaración de que solo existe rol 'admin'

3. **ALCANCE-V1.md** - Nuevo archivo creado:
   - Documentación completa de lo que está incluido
   - Lista explícita de lo que NO está incluido
   - Tablas del schema V1

## Archivos que NO requieren cambios

Los siguientes archivos están correctos y no necesitan modificaciones:

- ✅ `app/login/page.tsx` - Solo login de admin (correcto)
- ✅ `app/admin/users/page.tsx` - CRUD de jugadores (correcto)
- ✅ `app/admin/users/new/page.tsx` - Crear jugador (correcto)
- ✅ `app/admin/matches/page.tsx` - Placeholder para partidos (correcto)
- ✅ `repositories/player.repository.ts` - Solo jugadores (correcto)
- ✅ `services/player.service.ts` - Solo jugadores (correcto)
- ✅ `schemas/player.schema.ts` - Solo jugadores (correcto)
- ✅ `middleware.ts` - Protección de rutas admin (correcto)
- ✅ `lib/auth.ts` - Verificación de admin (correcto)

## Verificación

✅ No se encontraron referencias a:
- Clubes como entidad
- Reservas
- Ratings
- Notificaciones
- Integraciones externas (WhatsApp, Instagram)
- Login de jugadores

✅ Todas las referencias a `club_name` son correctas (campo de texto en matches)

## Estado Final

El proyecto está ahora completamente alineado con el alcance reducido V1:

1. ✅ Solo login de admin
2. ✅ Solo CRUD de jugadores
3. ✅ Solo creación de partidos (estructura lista)
4. ✅ Solo carga de resultados (estructura lista)
5. ✅ NO hay funcionalidades fuera del alcance

## Próximos Pasos Sugeridos

Para completar V1, falta implementar la UI para:
- [ ] Edición de jugadores (`/admin/users/[id]/edit`)
- [ ] Creación de partidos (`/admin/matches/new`)
- [ ] Carga de resultados (`/admin/matches/[id]`)

Pero la estructura de datos y arquitectura ya están listas.



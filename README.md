# Padel V1 - Sistema de Gestión de Pádel

Sistema admin-driven para gestión de jugadores, partidos y resultados de pádel.

## Stack Tecnológico

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Validación**: Zod
- **Formularios**: react-hook-form

## Arquitectura

El proyecto sigue una arquitectura escalable con separación de responsabilidades:

- `/lib/supabase` - Clientes de Supabase (browser y server)
- `/repositories` - Capa de acceso a datos (CRUD a Supabase)
- `/services` - Lógica de negocio (use-cases)
- `/schemas` - Validaciones con Zod
- `/components` - Componentes UI reutilizables
- `/app` - Rutas y páginas de Next.js

## Configuración Inicial

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta el SQL del archivo `supabase/schema.sql` en el SQL Editor de Supabase
3. Crea el primer usuario admin siguiendo la guía en `supabase/seed-admin.md`

### 3. Variables de entorno

Crea un archivo `.env.local` con:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
```

### 4. Ejecutar el proyecto

```bash
npm run dev
```

El proyecto estará disponible en `http://localhost:3000`

## Estructura del Proyecto

```
├── app/
│   ├── admin/          # Rutas protegidas para admin
│   │   ├── users/      # Gestión de jugadores
│   │   └── matches/    # Gestión de partidos
│   ├── api/            # API routes
│   ├── login/          # Página de login
│   └── layout.tsx      # Layout principal
├── components/
│   └── ui/             # Componentes shadcn/ui
├── lib/
│   ├── supabase/       # Clientes de Supabase
│   └── auth.ts         # Helpers de autenticación
├── repositories/       # Capa de acceso a datos
├── services/           # Lógica de negocio
├── schemas/            # Validaciones Zod
└── types/              # Tipos TypeScript
```

## Funcionalidades V1

**Alcance reducido - Solo funcionalidades esenciales:**

### ✅ Autenticación
- Login para administradores únicamente
- Protección de rutas `/admin/*`
- Middleware de verificación de rol admin

### ✅ Gestión de Jugadores (CRUD completo)
- Crear jugadores
- Listar jugadores
- Editar jugadores
- Inactivar jugadores (soft delete)
- Búsqueda por nombre, email, teléfono

### ✅ Gestión de Partidos
- Crear partidos
- Asignar jugadores a equipos (A/B)
- Listar partidos
- Nota: `club_name` es texto simple, NO existe entidad Club

### ✅ Resultados
- Cargar resultados de partidos
- Estructura de sets en JSONB: `[{a: 6, b: 4}, ...]`
- Marca automáticamente el partido como 'completed'

## Fuera de Alcance V1

- ❌ Clubes como entidad (solo `club_name` como texto)
- ❌ Reservas de canchas
- ❌ Ratings / reputación
- ❌ Notificaciones
- ❌ Integraciones externas (WhatsApp, Instagram, etc.)
- ❌ Login de jugadores (solo admin)
- ❌ Panel de jugadores

## Principios de Diseño

1. **Separación Cuenta/Jugador**: Los jugadores son entidades de negocio independientes de `auth.users`
2. **Soft Delete**: No se borran registros físicamente, se usa `deleted_at`
3. **Resultados Estructurados**: Los sets se guardan en JSONB para facilitar estadísticas futuras
4. **RLS Activo**: Row Level Security habilitado desde el inicio
5. **Capa de Repositorios**: No se acopla la UI directamente a Supabase

## Funcionalidades Portal Jugadores (v1.0.0-player-read)

### ✅ Lectura de Partidos
- Listado de "Mis Partidos" con diseño premium y unificado con admin.
- Visibilidad total de equipos (4 jugadores con formato inicial + apellido).
- Marcador detallado por sets y equipo ganador resaltado.

### ✅ Autoevaluaciones
- Estado de evaluación dinámico (Completa/Pendiente).
- Consulta on-demand detallada de golpes y comentarios mediante panel expandible.

## Próximos Pasos (Next Steps) 🚀

- [ ] **Cargar autoevaluaciones**: Permitir que el jugador complete su evaluación si está pendiente.
- [ ] **Creación de partidos**: Permitir que los jugadores propongan nuevos partidos.
- [ ] **Buscador de Jugadores**: Para facilitar el armado de nuevos partidos.
- [ ] **Estadísticas**: Gráficos basados en el desempeño histórico.

## Fuera de Alcance Actual
- ❌ Clubes como entidad (solo `club_name` como texto).
- ❌ Notificaciones push/email.
- ❌ Edición de partidos por parte de jugadores.


# PASALA — Claude Code Context

### Versión actual
v0.10.0

### Features completos
- Q1–Q4: Core — partidos, reservas, resultados,
  ranking, auth, RLS
- Q3.1: Agenda multi-canchas — matriz hora×cancha
- Índice PASALA: rating 0-100, 5 factores, historial
- UX1/UX2: Player Card gamificada, radar, badges
- S1: Social Share Cards — 5 route handlers OG
- Analytics: panel super admin con KPIs y métricas
- Q5: Perfil entrenador — agenda, legajo, desafíos,
  reserva de clase, buscador de entrenadores
- Q7: Calendario unificado — todos los eventos
  del jugador en una sola vista
- Q8: Sidebar player — desktop colapsable +
  bottom nav mobile + cards contextuales
- Q9: Sidebar club — desktop colapsable +
  bottom nav mobile + página entrenadores del club
- Calendario hub UX: eventos visibles en grid
  mensual (chips hora+título, máx 2 por celda),
  filtros por tipo, DaySheet con cards enriquecidas
  por tipo de evento + acciones directas; días
  pasados solo eventos, días futuros eventos +
  4 acciones (partido en club / sin club / reservar
  cancha / reservar clase); flujo directo sin
  pantalla intermedia desde calendario
- Rol dueño de club: jugador solicita acceso desde
  perfil, super admin aprueba/rechaza con notif,
  panel /player/mi-club con 18 páginas (reservas,
  canchas, ligas, torneos, ranking, jugadores,
  entrenadores, perfil, ajustes), sidebar condicional
  is_club_owner; /club → redirect a /player/mi-club

### Arquitectura de navegación
- Desktop (md+): sidebar fijo colapsable 
  (expandido 240px / colapsado 56px)
- Mobile: bottom nav 5 ítems + header sticky
- Player: PlayerSidebar + PlayerBottomNav + 
  PlayerMobileHeader
- Club: ClubSidebar + ClubBottomNav + 
  ClubMobileHeader
- Íconos: L1 = 18px, L2 = 15px (lucide-react)
- IMPORTANTE: íconos lucide-react solo renderizan
  dentro de <Link> (genera <a>), NO dentro de <div>
  Causa: barrel optimizer Next.js App Router no
  resuelve React.forwardRef en divs sin href

### Roles del jugador
- is_coach: activa "Mi equipo" en sidebar player
- is_club_owner: activa "Mi club" en sidebar player
- Patrón de roles: flag en players + profile table
  (coach_profiles / clubs.owner_player_id) +
  tabla de solicitud (club_owner_requests) +
  aprobación admin + sección en perfil del jugador
- Pendiente: is_organizer

### Migraciones aplicadas (últimas)
- 20260409_q7_coach_booking_rpcs.sql
- 20260409_q7_player_calendar.sql
- 20260409_q7_player_request_booking.sql
- 20260410_sidebar_last_match.sql
- players.is_club_owner, players.club_owner_enabled_at
- clubs.owner_player_id
- club_owner_requests (con RLS)
- notifications.type CHECK constraint ampliado con
  club_owner_request_approved/rejected

### Pendientes próximo sprint
1. Landing page pública
2. S1 mejoras — páginas /share/* + PhotoCardComposer
3. Analítica para clubes
4. Fix geo — datos estáticos
5. Port completo leagues/[id] y tournaments/[id]
   en /player/mi-club (stubs apuntan a /club aún)

### Próximos features (post lanzamiento piloto)
- Organizador de torneos (rol en player,
  reutiliza lógica de /club/torneos)
- QR de torneo — URL pública + bracket tiempo real
- Canchas virtuales del torneo (opt-in)
- WhatsApp / IA con n8n

### Convenciones
- Patrón: repositorio → servicio → server action
- RPCs con SECURITY DEFINER en Supabase
- RLS activo en todas las tablas
- Mobile first en todos los componentes
- Hydration: useState(stable_default) + useEffect
  para cualquier valor basado en new Date()
- Layout desktop: sin max-w en wrappers principales,
  solo px-6/px-8 como padding lateral
- Íconos lucide-react: siempre dentro de <Link>,
  nunca dentro de <div> — barrel optimizer issue

### Stack
Next.js 14, Supabase PostgreSQL, Tailwind CSS,
NextAuth, Vercel

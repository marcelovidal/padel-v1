# CHANGELOG

## [v1.17.0] - 2026-08-20

### Inscripción con creación de jugador + Asignación flexible de grupos

#### Crear jugador desde inscripción (Pedido 1)
- `PlayerSearchSelect` agrega prop opcional `onCreateNew`:
  cuando la búsqueda no encuentra resultados y se pasa
  el callback, renderiza botón `+ Crear "nombre" como
  nuevo jugador` en vez del div muerto anterior
- `TournamentRegisterTeamForm` y `LeagueRegisterTeamForm`
  refactorizados: `players` pasa de prop a `useState`;
  `<form>` extraído a fragmento para que GuestPlayerModal
  quede como hermano (evita anidamiento HTML inválido);
  `handleGuestSuccess` inyecta el jugador nuevo en el
  estado y lo selecciona automáticamente en el campo
  correspondiente
- `GuestPlayerModal` agrega prop `showCategory`: select
  de categoría 1-7 visible solo cuando se pasa; los 4
  formularios de partidos existentes no lo ven
- RPC `player_create_guest_player` ampliado con
  `p_category int DEFAULT NULL`; cadena action → service
  → repository cableada para pasar la categoría

#### Asignación flexible de parejas a grupos (Pedido 2)
- RPCs `club_assign_team_to_group` y
  `club_assign_tournament_team_to_group` ahora ejecutan
  `DELETE previo` del team_id antes del INSERT, permitiendo
  mover parejas entre grupos sin errores 23505
- `club_assign_tournament_team_to_group` portó el guard
  `FIXTURE_ALREADY_EXISTS` de ligas: bloquea movimientos
  a grupos con fixture generado
- Página de torneos: select de asignación filtra parejas
  ya en un grupo; warning ambar cuando hay parejas sin
  grupo

#### Migraciones SQL
- `20260820_guest_player_category.sql`
- `20260820_fix_group_team_reassign.sql`

## [v1.16.0] - 2026-05-20

### Reservas condicionales + Admin reorganizado

#### Feature flag de reservas (bookings_enabled)
- Nueva tabla `app_settings` (key/value) con RLS: lectura pública,
  escritura solo admin
- El botón "Reservar y crear partido" y el flujo de selección en
  `/player/matches/new` solo se activan cuando el super admin habilita
  el flag desde `/admin/settings` Y hay canchas activas en la DB
- Sin el flag, todos los jugadores ven únicamente "Solo crear partido"
- Valor inicial: `bookings_enabled = false` (no rompe producción)
- Página `/admin/settings` con toggle UI y feedback optimista

#### Botones condicionales en sidebar del jugador
- Sidebar expandido: 2 CTAs ("Reservar y crear partido" + "Solo crear
  partido") cuando hay canchas y el flag está activo; 1 CTA cuando no
- Sidebar colapsado: ícono "+" apunta a bookings/new o matches/new
  según condición
- `/player/matches/new` sin `?mode`: muestra selección o auto-redirige
  a `?mode=direct` según disponibilidad

#### Admin — sección Entrenadores en Dashboard
- `getCoachStats()` en AdminRepository: total activados, con perfil
  completo, alumnos activos, sesiones últimos 30d
- Sección horizontal en `/admin` entre growth cards y salud operativa
- Sin nueva migración SQL — queries directas a tablas existentes
- Expone drop-off entre "activados" y "con perfil completo"

#### Admin — reorganización de navegación
- "Club owners" eliminado del nav como ítem independiente
- Nuevo tab "Dueños de club" dentro de `/admin/club-claims` con
  pendientes (aprobar/rechazar) e historial
- KPIs del header de Clubes incluyen solicitudes de dueño pendientes
- Nav resultante: Dashboard · Jugadores · Partidos · Clubes ·
  Analytics · Configuración

#### Migraciones SQL a aplicar
- `20260520_app_settings.sql` — tabla app_settings + fila inicial

## [v1.15.0-landing] - 2025-04-27

### Landing page — rediseño completo

#### Identidad visual
- Migración completa de dark mode a light mode
- Paleta: fondo blanco #FFFFFF, acento azul cancha #1565C0,
  tipografía Georgia serif italic para claims
- Navbar: transparente sobre hero → blanca al scroll,
  dos botones (Registrate → /welcome, Ingresá → /player/login),
  avatar de sesión activa + sub-barra de acciones rápidas
- Menú: JUGADORES · CLUBES · ENTRENADORES · CONTACTO
  con scroll suave a cada sección

#### Hero
- Video de fondo (video.mp4) con poster hero-jugadora2.png
- Claim tipográfico superpuesto con doble overlay
- Card glassmorphism del Índice PASALA con animación
  fadeSlideUp (cubic-bezier expo-out)
- Badge "EN VIVO" en emerald

#### Sección Jugadores
- Claim: "El partido terminó. Tu juego recién empieza."
- Foto jugador-movil.png con efecto scale al scroll
  via IntersectionObserver
- Carrusel auto-rotante 5 segundos con 5 pantallas:
  resultado de partido, ranking del club, próximo rival
  (buscador simulado), atributos técnicos (radar SVG +
  forma reciente), stats de rendimiento
- Barra de progreso temporal como indicador de rotación
- CTA: "Creá tu perfil gratis" → /welcome

#### Sección Clubes
- Fondo navy #0a1628 con círculos decorativos blur
- Claim: "Tu comunidad ya utiliza Pasala. ¿Tu club está listo?"
- Carrusel auto-rotante 5 segundos con 6 pantallas:
  resumen ejecutivo (browser mockup), agenda semanal
  (grid cancha×hora con badges SOLICITUD/CONFIRMADA/
  LIGA/TORNEO/FIJO/LIBRE), turnos fijos recurrentes,
  torneos y ligas (lista de eventos), bracket automático
  (3 rondas con sets, colores por etapa: slate→azul→ámbar),
  ranking del club con Índice PASALA
- Texto explicativo por item con animación cardFade
- Pills de features + CTA WhatsApp

#### Sección Entrenadores
- Imagen entrenador.png (cancha nocturna, AUP El Calafate)
- Card glassmorphism flotante con perfil "Carlos Romero"
- Layout split: foto izquierda, features derecha
- 3 cards: perfil público (avatares alumnos en overlap),
  agenda de clases, evolución de alumnos con desafío activo
- CTA: "Crear mi perfil de entrenador" → /welcome

#### Sección Contacto
- Fondo navy #0a1628 (mismo que clubes)
- Formulario integrado con /api/support/public-contact (Resend)
- Campos: nombre, email, mensaje + selector de rol
  (Jugador / Dueño de club / Entrenador)
- Estado enviado con CTA a WhatsApp
- Datos: WhatsApp +54 298 431-5287, Instagram @pasala_app,
  General Roca · Patagonia · Argentina

#### CTA Final
- Collage fotográfico patagónico de fondo
- Dos botones: "Registrate gratis" → /welcome,
  "Ya tengo cuenta · Ingresá" → /player/login

#### Técnico
- Todos los componentes en components/landing/
- Carruseles: useRef para closure-safe intervals
- Animaciones: cardFade (opacity + scale 0.98→1),
  cubic-bezier(0.16, 1, 0.3, 1) en todas las transiciones
- IntersectionObserver para efectos de entrada al scroll
- scroll-behavior: smooth en globals.css
- noindex no aplicado (landing es pública)
- Vercel deploy automático desde main

#### Feature pendiente documentada
- /demo/[token] — tour interactivo para prospectos de club
  con sesión demo precargada (is_club_owner + is_coach),
  datos ficticios patagónicos, noindex, CTA WhatsApp fijo.
  Ver documentación en backlog.
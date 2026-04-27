# CHANGELOG

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
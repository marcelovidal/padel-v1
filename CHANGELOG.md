# Changelog

All notable changes to this project will be documented in this file.

## [v1.11.3-ntf1r-in-app-notifications] - 2026-02-24 (Draft)

### Agregado
- **NTF-1R (retention-first)**: sistema de notificaciones in-app para Player y Club.
- **UI de campana** con badge de no leidas + dropdown (ultimas 10) en `PlayerTopNav` y `ClubTopNav`.
- **RPCs de notificaciones**:
  - `notification_create`
  - `notification_list`
  - `notification_unread_count`
  - `notification_mark_read`
- **Tracking GA4 de interaccion** en campana y clicks de notificaciones.

### Eventos iniciales (retencion)
- `player_match_result_ready` al guardar resultado (incluye flujo FME).
- `player_claim_success` al completar reclamo de perfil.
- `club_claim_requested` (notificacion a admins para revisar reclamo).
- `club_match_created` al crear partido desde portal Club.

### Seguridad / Solidez
- Tabla `public.notifications` con target exclusivo (`user_id` xor `club_id`).
- RLS para lectura/actualizacion de notificaciones propias (player y club owner).
- Deduplicacion por `dedupe_key` (indices parciales por destinatario).
- `notification_create` endurecida con validaciones por tipo para evitar uso indebido.

### Incremental (NTF-1R follow-up)
- RPC `notification_mark_all_read` para marcar todas como leidas por target.
- Soporte de target `admin` (alias user-based) en `notification_list` / `notification_unread_count`.
- Campana de notificaciones integrada en `app/admin/layout.tsx`.
- CTA `Marcar todo` en dropdown de notificaciones.

## [v1.11.2-ga4-tracking] - 2026-02-23 (Draft)

### Agregado
- **GA4 global (App Router)**: integracion de Google Analytics 4 en `app/layout.tsx` usando `next/script`.
- **Pageviews consistentes en SPA**: tracker client con `usePathname` + `useSearchParams` para registrar `page_view` en navegaciones internas.
- **Helper reutilizable de analytics**: `lib/analytics/gtag.ts` con `pageview()` y `trackEvent()`.
- **Evento de negocio `match_shared`**: tracking en `ShareButtons` con parametros `channel`, `match_id` y `surface_variant`.

### Solidez / Implementacion
- Configuracion GA4 con `send_page_view: false` para evitar doble conteo y enviar `page_view` manualmente.
- Activacion por entorno via `NEXT_PUBLIC_GA_MEASUREMENT_ID` (sin hardcode obligatorio en produccion).
- Tracker envuelto en `Suspense` para compatibilidad con `useSearchParams` en build de Next.js App Router.

## [v1.11.1-public-polish] - 2026-02-22 (Draft)

### Corregido / Ajustado (Produccion)
- **Home publica (copy + navegacion)**
  - Se agrego `Inicio` al menu principal.
  - Ajustes de copy comercial y unificacion de lenguaje (`padel` sin tilde).
  - Reemplazo de nombres de ejemplo por nombres neutros/no sensibles.
  - Mensaje demo de WhatsApp actualizado con contenido realista y URL simplificada (`pasla.com.ar/match`).
- **Flujo auth desde home publica**
  - OAuth callback robustecido: si `next` llega vacio o `/`, redirige a `/player` por defecto.
  - Evita volver a la home publica tras login con Google en flujos iniciados desde marketing.
- **Detalle de partido (jugador)**
  - CTA renombrado a `Editar partido`.
  - Aviso explicito cuando el partido esta programado pero el usuario no es el creador (solo el creador puede editar).
- **UX de soporte / testing**
  - Boton flotante renombrado de `Reportar` a `Sugerencias`.
- **Privacidad / UI jugador**
  - Se oculta el identificador (ID) visible en el dashboard del jugador.

### Visual / Familiaridad del producto
- La home publica reutiliza componentes reales del producto para familiarizar al usuario:
  - `MatchScore` (marcador de partido)
  - `PasalaIndex` (indice y performance)

## [v1.11.0-stage-public-web] - 2026-02-21 (Draft)

### Agregado
- **Stage Public Web**: nuevo sitio publico integrado en App Router con layout dedicado y rutas:
  - `/` (home de conversion)
  - `/players`
  - `/clubs`
  - `/pricing`
  - `/faq`
  - `/privacy`
  - `/terms`
- **Header/Footer publicos** reutilizables con navegacion principal y CTAs.
- **Componentes publicos** base (`PublicContainer`, `PublicSection`, `FeatureCard`, `StatCard`, `FAQAccordion`).

### Auth / Conversion
- Helper server-side para CTAs inteligentes segun sesion/estado:
  - guest -> `/welcome?next=...`
  - onboarding pendiente -> `/welcome/onboarding?next=...`
  - jugador onboarded -> `/player`
  - club reclamado -> `/club`
- CTA de registro de club alineada al flujo vigente:
  - `/welcome?portal=club&mode=signup&next=/club`

### SEO
- Metadata y OpenGraph basicos para la capa publica.
- Asset OG estatico (`/og.svg`) para previews sociales.

## [v1.10.1-stage-p-club-claims-admin] - 2026-02-26 (Draft)

### Agregado
- **Stage P (manual review)**: panel admin `/admin/club-claims` para revisar reclamos pendientes.
- **Acciones admin**: resolver reclamo con aprobar/rechazar via `club_resolve_claim`.
- **Datos de solicitante** en reclamos: nombre, apellido, celular y email para validacion manual.

### Seguridad / Solidez
- Migracion incremental idempotente para reforzar reclamos:
  - una sola solicitud `pending` por club.
  - endurecimiento de `club_request_claim` con validacion de datos del solicitante.
- Mantiene validacion manual (sin auto-claim).

## [v1.10.0-stage-club-claims] - 2026-02-19 (Draft)

### Agregado
- **Stage Club (MVP)**: modelo de clubes reutilizable para partidos con `matches.club_id`.
- **Busqueda y alta de clubes**: RPCs `club_search` y `club_create` integradas en `/player/matches/new`.
- **Solicitud de reclamo de club**: nueva ruta `/welcome/claim/club` y RPC `club_request_claim`.
- **CTA publica de club** en `/m/[id]` cuando el club es reclamable.
- **Accesos en welcome**: separacion visual de acceso/registro para jugadores y clubes.

### Seguridad / Solidez
- RLS en `clubs` y `club_claim_requests`.
- Claim de club por solicitud `pending` (sin auto-asignacion de ownership).
- Idempotencia para solicitudes repetidas al mismo club.

### Compatibilidad
- Se mantiene `matches.club_name` como fallback legado.
- Los nuevos partidos priorizan `club_id`.
## [v1.9.0-stage-p2-directory-public-profile] - 2026-02-19 (Draft)

### Agregado
- **Stage P2 Directorio**: `/player/players` con cards enriquecidas (avatar, ciudad/provincia, categoria, posicion).
- **Perfil publico de jugador**: nueva ruta `/p/[playerId]` con allowlist segura.
- **Invitaciones por WhatsApp**: boton en directorio/perfil para perfiles no reclamados.
- **Share context**: migracion para registrar `share_events.context` con valores `match | directory | profile`.
- **Mensajeria unificada**: `buildPublicPlayerUrl` + `buildPlayerInviteMessage`.

### Seguridad / Datos publicos
- `getPublicPlayerData` expone solo: `display_name`, `avatar`, `city/region`, `category`, `position`.
- No se exponen `email`, `phone` ni `user_id` en `/p/[playerId]`.

### Compatibilidad
- `player_get_share_stats` mantiene foco en shares de partidos (`context='match'`) para no contaminar metricas existentes.

## [v1.7.0-claim] - 2026-02-19 (Draft)

### Agregado
- **Stage P1 - Claim real**: nueva RPC `player_claim_profile_v2(p_target_player_id, p_match_id)` con reglas anti-abuso.
- **Flujo pÃƒÂºblico de claim**: nueva ruta `app/welcome/claim/page.tsx` para reclamar perfil desde link compartido.
- **Server Action dedicada**: `lib/actions/claim.actions.ts` con mapeo explÃƒÂ­cito de errores (`CLAIM_NOT_ALLOWED`, `PROFILE_ALREADY_CLAIMED`, etc.).
- **Persistencia de retorno en auth**: login Google y email ahora conservan `next` para volver al claim tras autenticarse.

### Seguridad / Reglas
- Se bloquea claim de perfiles ya reclamados o eliminados lÃƒÂ³gicamente (`deleted_at`).
- Se bloquea claim si el usuario autenticado ya tiene perfil en `players`.
- El claim exige validaciÃƒÂ³n de contexto: el target debe pertenecer al `claim_match` (o co-participaciÃƒÂ³n para compatibilidad futura).

### UX
- MensajerÃƒÂ­a humana en espaÃƒÂ±ol para estados de claim exitoso/error.
- VisualizaciÃƒÂ³n del partido compartido y resaltado del jugador objetivo antes de confirmar.

## [v1.6.0-onboarding-lock-avatars] - 2026-02-17

### Agregado
- **Sistema de Onboarding**: Flujo inicial "one-shot" bloqueado por estado (`onboarding_completed`).
- **GestiÃƒÂ³n de Avatares**: Bucket privado en Supabase Storage, signed URLs temporales, y fallback robusto (Foto Google -> Iniciales).
- **Capa Competitiva (Stage M2)**: MÃƒÂ©tricas de "Mejor CompaÃƒÂ±ero" (mÃƒÂ­n. 2 partidos) y rendimiento vs categorÃƒÂ­a superior (basado en el equipo rival).
- **Dashboard**: IntegraciÃƒÂ³n del contexto competitivo y radar tÃƒÂ©cnico en el panel principal.

### Corregido
- Flujo de login: redirecciÃƒÂ³n automÃƒÂ¡tica al dashboard (`/player`) en lugar de listado de partidos.
- Consistencia del avatar del jugador a travÃƒÂ©s de toda la aplicaciÃƒÂ³n.

### Nota de Base de Datos
- Tabla `players`: Se agregaron campos `onboarding_completed` (bool), `onboarding_completed_at` (timestamptz) y `onboarding_version` (text).
- Campo `avatar_url`: Ahora almacena el path interno del bucket. Permisos RLS configurados para bucket privado `avatars`.

## [Stage M2] - 2026-02-13
### Agregado
- RPC `player_get_competitive_stats` para cÃƒÂ¡lculo de mÃƒÂ©tricas competitivas avanzadas.
- Dashboard: Bloque de "Contexto Competitivo".

## [Stage M1 / v1.5.0] - 2026-02-12

### Corregido
- Desacople entre la tabla `players` y la RPC `player_create_guest_player`.
- Error de columna `city` inexistente en producciÃƒÂ³n.
- Firma de funciÃƒÂ³n RPC para creaciÃƒÂ³n de invitados desalineada con el frontend.

### Agregado
- Campos geogrÃƒÂ¡ficos en `players`: `country_code`, `region_code`, `city`, `city_normalized`.
- Campo `created_by` y `is_guest` en `players` para mejor trazabilidad.
- ÃƒÂndices para bÃƒÂºsqueda ponderada por ubicaciÃƒÂ³n (`idx_players_location`).
- Parche seguro de migraciÃƒÂ³n idempotente.
- LÃƒÂ³gica de "Zero-Safety" para el telÃƒÂ©fono de invitados (default '00000000').

## [Stage K2] - 2026-02-10
### Agregado
- BÃƒÂºsqueda de jugadores ponderada por ubicaciÃƒÂ³n (Ciudad/Provincia).
- Nueva RPC `player_search_players` con sistema de scoring.
- Etiquetas enriquecidas en la selecciÃƒÂ³n de jugadores: "Inicial.Apellido Ã¢â‚¬â€ Ciudad (RegiÃƒÂ³n)".
- Soporte para ubicaciÃƒÂ³n en la creaciÃƒÂ³n de jugadores invitados.

## [Stage K1] - 2026-02-09
### Agregado
- Sistema de jugadores invitados.
- Proceso de "Claim Profile" para vincular cuentas de usuario a perfiles de jugadores pre-existentes.
- Restricciones de co-participaciÃƒÂ³n en partidos.

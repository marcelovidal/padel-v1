# Release Policy

## Baseline Tags
- **v1.0.0-player-read**: Legacy release. Not reproducible.
- **v1.0.1-player-read-ci-fix**: Reproducible baseline (npm ci + npm run build).

## Reproducibility Rules
Any new release tag must pass:
1. `npm ci` (Clean install)
2. `npm run build` (Production build with strict linting)

## Versioning Policy
- SemVer `v1.x.y` for patches and features.
- Tags must be immutable.
- Failed builds must not be tagged.

## Release History

- **v1.11.5-admin-club-preview** (Draft): Vista previa read-only de perfil de club para admins (`/admin/clubs/[id]/preview`) con acceso desde `/admin/club-claims`, para soporte y QA sin impersonacion ni acciones.
- **v1.11.4-stage-c1-club-dashboard** (Draft): Dashboard operativo para clubes (`/club/dashboard`) con KPIs de actividad (7d/30d), jugadores Ãºnicos, distribuciÃ³n por dÃ­a/hora, top jugadores y categorÃ­as. Incluye RPC segura `club_get_dashboard_stats` validando ownership del club y bloque de insights operativos (dÃ­a/hora pico, ritmo semanal y mix de actividad).
- **v1.11.3-ntf1r-in-app-notifications** (Draft): NTF-1R retention-first. Sistema de notificaciones in-app para Player/Club/Admin con tabla `notifications`, RLS+RPCs seguras, campana con badge/listado, `mark_read` + `mark_all_read`, y eventos iniciales (`player_match_result_ready`, `player_claim_success`, `club_claim_requested`, `club_match_created`).
- **v1.11.2-ga4-tracking** (Draft): Integracion GA4 para Next.js App Router con script global, `page_view` consistente en navegacion SPA (sin doble conteo) y evento de producto `match_shared` por canal.
- **v1.11.1-public-polish** (Draft): Ajustes finos de produccion. Pulido de home publica (copy/menu/demo), redirect post-Google hacia `/player`, mejora de claridad en detalle de partidos programados, boton `Sugerencias` para soporte y ocultamiento de ID visible en dashboard de jugador.
- **v1.11.0-stage-public-web** (Draft): Stage Public Web. Nuevo marketing site integrado (home + players/clubs/pricing/faq/legal), layout publico con header/footer, CTAs inteligentes por estado de sesion y metadata/OG base para campanas.
- **v1.10.1-stage-p-club-claims-admin** (Draft): Stage P manual review. Admin panel `/admin/club-claims` to approve/reject club claim requests, incremental hardening of claim request data, and pending uniqueness per club.
- **v1.10.0-stage-club-claims** (Draft): Stage Club. Modelo de clubes reutilizable en partidos, selector con busqueda/creacion, claim de club por solicitud y CTA publica desde `/m/[id]`.
- **v1.9.0-stage-p2-directory-public-profile** (Draft): Stage P2. Directorio de jugadores mejorado, perfil publico `/p/[playerId]`, invitaciones WhatsApp desde directorio/perfil y tracking con `share_events.context`.
- **v1.7.0-claim** (Draft): Stage P1 Claim real desde link publico. Incluye RPC segura `player_claim_profile_v2`, ruta `/welcome/claim`, validaciones anti-abuso, y retorno post-login conservando parametros de claim.
- **v1.6.0-onboarding-lock-avatars** (Current): Stage N Complete. Onboarding system (one-shot flow), robust private avatar system (Storage, Signed URLs, Fallbacks), and Stage M2 Competitive Metrics integration. Includes login redirect fix to Dashboard.
- **v1.5.0-pasala-index**: Stage M1 Complete. Rebranded to PASALA. Stunning Player Profile with PASALA Index, radar charts, streaks, and performance metrics. Dashboard upgraded with high-impact metrics.
- **v1.4.0-player-directory-location**: Stage L Complete. Includes player directory, profile editing, official Argentinian Geodata integration, and phone field robustification.
- **v1.3.1-stage-j-stable**: Stage J estable: resultados + autocurate + UX + fix listado/detalle.
- **v1.3.0-match-lifecycle**: Match detail, edit, and cancel for players. Categorized listings. Build OK.
- **v1.2.0-player-actions** (Stable): Player write operations via SECURITY DEFINER. Atomic match creation.

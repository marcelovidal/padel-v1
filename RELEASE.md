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

- **v1.11.0-stage-public-web** (Draft): Stage Public Web. Nuevo marketing site integrado (home + players/clubs/pricing/faq/legal), layout publico con header/footer, CTAs inteligentes por estado de sesion y metadata/OG base para campañas.
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

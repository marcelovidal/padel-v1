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

- **v1.6.0-onboarding-avatars** (Proposed): Stage N Complete. Robust onboarding flow with Google OAuth and Email. High-fidelity avatar system with priority fallbacks and server-side Signed URLs. Cross-UI consistency in Header, Profile, and Match rosters. Build PASS.

### Next: Stage O (Invitations & Discovery)
- **WhatsApp Invites**: Implementation of `player_invites` table to track match/platform shares.
    - Fields: `inviter_id`, `phone`, `token`, `status` (pending/accepted).
- **Claim Flow**: `/welcome?invite={token}` landing to auto-link new players to matches.
- **Viral Loop**: Incentives for inviting regular padel partners to the network.

- **v1.5.0-pasala-index**: Stage M1 Complete. Rebranded to PASALA. Stunning Player Profile with PASALA Index, radar charts, streaks, and performance metrics. Dashboard upgraded with high-impact metrics.
- **v1.4.0-player-directory-location**: Stage L Complete. Includes player directory, profile editing, official Argentinian Geodata integration, and phone field robustification.
- **v1.3.1-stage-j-stable**: Stage J estable: resultados + autocurate + UX + fix listado/detalle.
- **v1.3.0-match-lifecycle**: Match detail, edit, and cancel for players. Categorized listings. Build OK.
- **v1.2.0-player-actions** (Stable): Player write operations via SECURITY DEFINER. Atomic match creation.

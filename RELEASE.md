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

- **v1.2.0-player-actions** (Stable): Player write operations via SECURITY DEFINER. Atomic match creation.
- **Stage I - Match Lifecycle** (Completed): Match detail, edit, and cancel for players. Categorized listings. Build OK.

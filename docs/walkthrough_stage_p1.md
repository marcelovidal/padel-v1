# Stage P1 Walkthrough - Claim real + registro desde link publico

## Objetivo
Permitir que un usuario reclame su perfil invitado real desde un link publico de partido, con validaciones de seguridad para evitar apropiaciones arbitrarias.

## Flujo funcional
1. Un usuario abre `/m/[id]` y usa CTA de reclamo.
2. El CTA llega a `/welcome?claim_match={matchId}&claim_player={playerId}`.
3. `app/welcome/page.tsx` detecta parametros de claim y redirige a `/welcome/claim`.
4. En `/welcome/claim`:
   - si no hay sesion: muestra login Google/email preservando `next`.
   - si hay sesion: habilita `Reclamar mi perfil`.
5. `ClaimProfileButton` llama a `claimProfileAction`.
6. `claimProfileAction` invoca `player_claim_profile_v2`.
7. Si claim exitoso:
   - onboarding completo -> redireccion a `next` o `/player`.
   - onboarding incompleto -> redireccion a `/welcome/onboarding?next=...`.

## Backend
- Migracion: `supabase/migrations/20260220_stage_p1_claim_profile.sql`
- RPC: `player_claim_profile_v2(p_target_player_id uuid, p_match_id uuid default null)`
- Reglas principales:
  - `auth.uid()` obligatorio.
  - target debe existir, no estar eliminado y no tener `user_id`.
  - usuario autenticado no debe tener ya un perfil vinculado.
  - debe existir validacion de contexto por `p_match_id` (target participa en ese partido).
  - update idempotente con errores explicitos.

## Codigos de error mapeados
- `NOT_AUTHENTICATED`
- `PLAYER_NOT_FOUND`
- `PROFILE_ALREADY_CLAIMED`
- `USER_ALREADY_HAS_PROFILE`
- `CLAIM_NOT_ALLOWED`

## QA manual recomendado
1. Anonimo -> `/m/[id]` -> reclamar -> login -> volver a `/welcome/claim`.
2. Claim permitido -> vincula `players.user_id` y redirige segun onboarding.
3. Claim no permitido -> mensaje amable.
4. Claim repetido -> `PROFILE_ALREADY_CLAIMED`.
5. Usuario con perfil previo -> `USER_ALREADY_HAS_PROFILE`.
6. `npm run build` en verde.

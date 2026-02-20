import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(relPath) {
  return readFileSync(join(root, relPath), "utf8");
}

function assertMatch(source, pattern, message) {
  if (!pattern.test(source)) {
    throw new Error(message);
  }
}

function run() {
  const welcomeAuth = read("components/auth/WelcomePortalAuth.tsx");
  const clubSignup = read("components/auth/ClubSignupWizard.tsx");
  const authCallback = read("app/auth/callback/route.ts");
  const playerMatchActions = read("lib/actions/player-match.actions.ts");
  const adminClubClaims = read("app/admin/club-claims/page.tsx");
  const clubActions = read("lib/actions/club.actions.ts");
  const middleware = read("middleware.ts");

  // Player flow smoke checks.
  assertMatch(
    playerMatchActions,
    /export async function createMatchAsPlayer\(/,
    "Missing player match creation action."
  );
  assertMatch(
    middleware,
    /"\/player\/:path\*"/,
    "Missing /player middleware protection matcher."
  );

  // Club flow smoke checks.
  assertMatch(
    welcomeAuth,
    /function resolvePortalNextPath\(/,
    "Missing portal next-path resolver."
  );
  assertMatch(
    welcomeAuth,
    /portal === "club"[\s\S]*return "\/club"/,
    "Club login fallback does not route to /club."
  );
  assertMatch(
    clubSignup,
    /pending_club_onboarding/,
    "Club signup does not persist pending onboarding metadata."
  );
  assertMatch(
    authCallback,
    /resumePendingClubOnboarding\(/,
    "Auth callback does not resume pending club onboarding."
  );

  // Admin flow smoke checks.
  assertMatch(
    adminClubClaims,
    /AdminClubClaimActions/,
    "Admin club claims page is missing moderation controls."
  );
  assertMatch(
    clubActions,
    /export async function resolveClubClaimAction\(/,
    "Missing admin claim resolve action."
  );

  console.log("Smoke checks passed: player, club, admin flows are wired.");
}

try {
  run();
} catch (error) {
  console.error("Smoke checks failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

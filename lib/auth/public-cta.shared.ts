export type PublicCtaState =
  | "guest"
  | "needs_onboarding"
  | "player_ready"
  | "club_ready";

export interface PublicCtaContext {
  state: PublicCtaState;
  isAuthenticated: boolean;
  displayName: string | null;
  email: string | null;
}

function normalizePath(path: string): string {
  if (!path || path.trim() === "") return "/";
  if (path.startsWith("/")) return path;
  return `/${path}`;
}

export function resolvePublicCtaHref(
  state: PublicCtaState,
  _currentPath: string
): string {
  const playerTarget = "/player";

  if (state === "guest") {
    return `/welcome?portal=player&mode=signup&next=${encodeURIComponent(playerTarget)}`;
  }

  if (state === "needs_onboarding") {
    return `/welcome/onboarding?next=${encodeURIComponent(playerTarget)}`;
  }

  if (state === "club_ready") {
    return "/club";
  }

  return "/player";
}

export function getRegisterClubHref(): string {
  return "/welcome?portal=club&mode=signup&next=%2Fclub";
}

export function getLoginHref(currentPath: string): string {
  const safePath = normalizePath(currentPath);
  return `/welcome?portal=player&mode=login&next=${encodeURIComponent(
    safePath === "/" ? "/player" : safePath
  )}`;
}

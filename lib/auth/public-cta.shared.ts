export type PublicCtaState =
  | "guest"
  | "needs_onboarding"
  | "player_ready"
  | "club_ready";

function normalizePath(path: string): string {
  if (!path || path.trim() === "") return "/";
  if (path.startsWith("/")) return path;
  return `/${path}`;
}

export function resolvePublicCtaHref(
  state: PublicCtaState,
  currentPath: string
): string {
  const safePath = normalizePath(currentPath);

  if (state === "guest") {
    return `/welcome?next=${encodeURIComponent(safePath)}`;
  }

  if (state === "needs_onboarding") {
    return `/welcome/onboarding?next=${encodeURIComponent(safePath)}`;
  }

  if (state === "club_ready") {
    return "/club";
  }

  return "/player";
}

export function getRegisterClubHref(): string {
  return "/welcome?portal=club&mode=signup&next=%2Fclub";
}


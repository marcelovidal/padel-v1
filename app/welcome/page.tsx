import { redirect } from "next/navigation";
import { getOptionalPlayer } from "@/lib/auth";
import WelcomePortalAuth from "@/components/auth/WelcomePortalAuth";

type PortalType = "player" | "club";
type AuthMode = "login" | "signup";

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: {
    next?: string;
    claim_match?: string;
    claim_player?: string;
    portal?: string;
    mode?: string;
  };
}) {
  if (searchParams.claim_player) {
    const claimParams = new URLSearchParams();
    claimParams.set("claim_player", searchParams.claim_player);
    if (searchParams.claim_match) claimParams.set("claim_match", searchParams.claim_match);
    if (searchParams.next) claimParams.set("next", searchParams.next);
    redirect(`/welcome/claim?${claimParams.toString()}`);
  }

  const portal = searchParams.portal === "club" ? "club" : "player";
  const mode = searchParams.mode === "signup" ? "signup" : "login";
  const next = searchParams.next || (portal === "club" ? "/club" : "/player");

  const { user, playerId } = await getOptionalPlayer();

  const isExplicitAuthIntent = searchParams.portal === "club" || searchParams.mode === "signup";
  if (user && playerId && !isExplicitAuthIntent) {
    redirect(next);
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[420px]">
        <WelcomePortalAuth
          nextPath={next}
          initialPortal={portal as PortalType}
          initialMode={mode as AuthMode}
        />
      </div>
    </div>
  );
}

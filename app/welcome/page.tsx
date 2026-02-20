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
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-white to-white">
      <div className="w-full max-w-3xl space-y-8">
        <div className="space-y-3 text-center">
          <h1 className="text-6xl font-black text-blue-600 tracking-tighter italic transform -skew-x-6">PASALA</h1>
          <p className="text-lg text-gray-600 font-medium">
            Acceso unificado para jugadores y clubes.
          </p>
        </div>

        <WelcomePortalAuth
          nextPath={next}
          initialPortal={portal as PortalType}
          initialMode={mode as AuthMode}
        />
      </div>
    </div>
  );
}

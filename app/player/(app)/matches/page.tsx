import { requirePlayer } from "@/lib/auth";
import { PlayerAuthService } from "@/services/playerAuth.service";
import { MatchService } from "@/services/match.service";
import MatchCard from "@/components/matches/MatchCard";
import { toMatchCardModel } from "@/components/matches/matchCard.model";
import { Suspense } from "react";
import MatchCardSkeleton from "@/components/matches/MatchCardSkeleton";
import { PlayerMatches } from "@/components/player/PlayerMatches";
import { getEffectiveStatus } from "@/lib/match/matchUtils";
import { getSiteUrl } from "@/lib/utils/url";
import { buildPublicMatchUrl, buildShareMessage } from "@/lib/share/shareMessage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PlayerMatchesPage() {
  const { user, player: mePlayer } = await requirePlayer();
  const matchSvc = new MatchService();

  const matches = await matchSvc.getPlayerMatches(mePlayer.id);
  const siteUrl = getSiteUrl();

  // Group matches by effective status and prepare models with share messages
  const categorized = matches.reduce((acc, match) => {
    const status = getEffectiveStatus(match);
    const hasResult = !!match.match_results;
    const shareMessage = hasResult ? buildShareMessage(match, siteUrl) : undefined;
    const shareUrl = hasResult ? buildPublicMatchUrl(match.id, siteUrl) : undefined;

    acc[status].push({ ...match, shareMessage, shareUrl });
    return acc;
  }, { scheduled: [] as any[], completed: [] as any[], cancelled: [] as any[] });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mis Partidos</h1>
        <p className="text-sm text-gray-500 mt-1">Historial, programados y pendientes de resultado</p>
      </div>

      {matches.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">Todavía no tenés partidos registrados.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Section: Scheduled */}
          {categorized.scheduled.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Próximos Partidos</h2>
              <PlayerMatches matches={categorized.scheduled
                .sort((a, b) => new Date(a.match_at).getTime() - new Date(b.match_at).getTime())}
                currentUserId={user.id}
                currentPlayerId={mePlayer.id}
              />
            </div>
          )}

          {/* Section: Completed */}
          {categorized.completed.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Finalizados</h2>
              <PlayerMatches matches={categorized.completed
                .sort((a, b) => new Date(b.match_at).getTime() - new Date(a.match_at).getTime())}
                currentUserId={user.id}
                currentPlayerId={mePlayer.id}
              />
            </div>
          )}

          {/* Section: Cancelled */}
          {categorized.cancelled.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Cancelados</h2>
              <div className="opacity-75">
                <PlayerMatches matches={categorized.cancelled
                  .sort((a, b) => new Date(b.match_at).getTime() - new Date(a.match_at).getTime())}
                  currentUserId={user.id}
                  currentPlayerId={mePlayer.id}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

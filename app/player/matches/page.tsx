import { requirePlayer } from "@/lib/auth";
import { PlayerAuthService } from "@/services/playerAuth.service";
import { MatchService } from "@/services/match.service";
import MatchCard from "@/components/matches/MatchCard";
import { toMatchCardModel } from "@/components/matches/matchCard.model";
import { Suspense } from "react";
import MatchCardSkeleton from "@/components/matches/MatchCardSkeleton";
import { PlayerMatches } from "@/components/player/PlayerMatches";

export const dynamic = "force-dynamic";

export default async function PlayerMatchesPage() {
  const { user, playerId } = await requirePlayer();
  const playerAuthSvc = new PlayerAuthService();
  const matchSvc = new MatchService();

  const [player, matches] = await Promise.all([
    playerAuthSvc.getPlayerByUserId(user.id),
    matchSvc.getPlayerMatches(playerId),
  ]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="container mx-auto p-4 max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Mis Partidos</h1>
          <a
            href="/player/matches/new"
            className="bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            + Nuevo Partido
          </a>
        </div>

        <div className="text-sm text-gray-500 mb-6">
          Hola, {player?.first_name}
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">Todavía no tenés partidos registrados.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Section: Scheduled */}
          {matches.filter(m => m.status === 'scheduled').length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 px-4">Próximos Partidos</h2>
              <PlayerMatches matches={matches
                .filter(m => m.status === 'scheduled')
                .sort((a, b) => new Date(a.match_at).getTime() - new Date(b.match_at).getTime())}
              />
            </div>
          )}

          {/* Section: Completed */}
          {matches.filter(m => m.status === 'completed').length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 px-4">Finalizados</h2>
              <PlayerMatches matches={matches
                .filter(m => m.status === 'completed')
                .sort((a, b) => new Date(b.match_at).getTime() - new Date(a.match_at).getTime())}
              />
            </div>
          )}

          {/* Section: Cancelled */}
          {matches.filter(m => m.status === 'cancelled').length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 px-4">Cancelados</h2>
              <div className="opacity-75">
                <PlayerMatches matches={matches
                  .filter(m => m.status === 'cancelled')
                  .sort((a, b) => new Date(b.match_at).getTime() - new Date(a.match_at).getTime())}
                />
              </div>
            </div>
          )}
        </div>
      )}


    </div>
  );
}

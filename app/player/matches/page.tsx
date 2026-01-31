import { requirePlayer } from "@/lib/auth";
import { PlayerAuthService } from "@/services/playerAuth.service";
import { MatchService } from "@/services/match.service";
import MatchCard from "@/components/matches/MatchCard";
import { toMatchCardModel } from "@/components/matches/matchCard.model";
import { Suspense } from "react";
import MatchCardSkeleton from "@/components/matches/MatchCardSkeleton";

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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 ml-1">
          Mis Partidos
        </h1>
        <div className="text-sm text-gray-500">
          Hola, {player?.first_name}
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            Todavía no tenés partidos registrados
          </h3>
          <p className="text-gray-500 mb-6">
            Cuando participes en un partido, aparecerá listado acá.
          </p>
          <button
            disabled
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-400 cursor-not-allowed"
          >
            Cargar nuevo partido (Próximamente)
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match: any) => {
            const model = toMatchCardModel(match, {
              playerTeam: match.team,
              hasAssessment: match.hasAssessment,
            });
            return (
              <MatchCard
                key={match.id}
                model={model}
                variant="player"
                primaryAction={{
                  label: "Ver detalle",
                  href: `/player/matches/${match.id}`,
                  disabled: true, // Upcoming feature
                }}
              />
            );
          })}

          <div className="pt-6 text-center">
            <button
              disabled
              className="text-sm font-medium text-gray-400 cursor-not-allowed hover:text-gray-500 flex items-center justify-center mx-auto"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Cargar nuevo partido (Próximamente)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

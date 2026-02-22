import MatchCard from "@/components/matches/MatchCard";
import { toMatchCardModel } from "@/components/matches/matchCard.model";
import { getEffectiveStatus, hasMatchResult } from "@/lib/match/matchUtils";

interface PlayerMatchesProps {
    matches: any[]; // Ideally typed with MatchWithPlayers from service
    currentUserId?: string;
    currentPlayerId?: string;
}

export function PlayerMatches({ matches, currentUserId, currentPlayerId }: PlayerMatchesProps) {
    if (matches.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
                <p className="text-gray-500 text-sm">No hay partidos registrados aún.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {matches.map((match) => {
                const model = toMatchCardModel(match, {
                    playerTeam: match.team,
                    hasAssessment: match.hasAssessment,
                });
                const effectiveStatus = getEffectiveStatus(match);
                const hasResults = hasMatchResult(match);
                const isCreator = !!currentUserId && match.created_by === currentUserId;
                const canEdit = isCreator && effectiveStatus === "scheduled";
                const canLoadResult = effectiveStatus === "completed" && !hasResults && !!match.team;

                const primaryAction = canLoadResult
                    ? {
                        label: "Cargar resultado",
                        href: `/player/matches/${match.id}/result`,
                      }
                    : {
                        label: "Ver detalle",
                        href: `/player/matches/${match.id}`,
                      };

                const secondaryAction = canLoadResult
                    ? {
                        label: "Ver detalle",
                        href: `/player/matches/${match.id}`,
                      }
                    : canEdit
                      ? {
                          label: "Editar",
                          href: `/player/matches/${match.id}/edit`,
                        }
                      : undefined;

                return (
                    <MatchCard
                        key={match.id}
                        model={model}
                        variant="player"
                        highlightPlayerId={currentPlayerId}
                        primaryAction={primaryAction}
                        secondaryAction={secondaryAction}
                        shareMessage={match.shareMessage}
                        shareUrl={match.shareUrl}
                    />
                );
            })}
        </div>
    );
}

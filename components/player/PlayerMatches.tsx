import MatchCard from "@/components/matches/MatchCard";
import { toMatchCardModel } from "@/components/matches/matchCard.model";

interface PlayerMatchesProps {
    matches: any[]; // Ideally typed with MatchWithPlayers from service
}

export function PlayerMatches({ matches }: PlayerMatchesProps) {
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

                return (
                    <MatchCard
                        key={match.id}
                        model={model}
                        variant="player"
                        primaryAction={{
                            label: "Ver detalle",
                            href: `/player/matches/${match.id}`,
                        }}
                        shareMessage={match.shareMessage}
                        shareUrl={match.shareUrl}
                    />
                );
            })}
        </div>
    );
}

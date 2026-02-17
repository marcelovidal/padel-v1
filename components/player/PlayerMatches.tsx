import MatchCard from "@/components/matches/MatchCard";
import { toMatchCardModel } from "@/components/matches/matchCard.model";
import { ResolvedAvatar } from "@/lib/avatar-server.utils";

interface PlayerMatchesProps {
    matches: any[]; // Ideally typed with MatchWithPlayers from service
    meAvatarData?: ResolvedAvatar;
    mePlayerId?: string;
}

export function PlayerMatches({ matches, meAvatarData, mePlayerId }: PlayerMatchesProps) {
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
                        meAvatarData={meAvatarData}
                        mePlayerId={mePlayerId}
                        primaryAction={{
                            label: "Ver detalle",
                            href: `/player/matches/${match.id}`,
                        }}
                    />
                );
            })}
        </div>
    );
}

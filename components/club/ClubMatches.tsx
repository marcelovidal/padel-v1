import MatchCard from "@/components/matches/MatchCard";
import { toMatchCardModel } from "@/components/matches/matchCard.model";

interface ClubMatchesProps {
  matches: any[];
}

export function ClubMatches({ matches }: ClubMatchesProps) {
  if (matches.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
        <p className="text-gray-500 text-sm">No hay partidos registrados aun.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {matches.map((match) => {
        const model = toMatchCardModel({
          ...match,
          match_results: match.match_results,
          playersByTeam: match.playersByTeam,
        });

        return (
          <MatchCard
            key={match.id}
            model={model}
            variant="admin"
          />
        );
      })}
    </div>
  );
}

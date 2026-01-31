import { MatchService } from "@/services/match.service";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MatchCard from "@/components/matches/MatchCard";
import { toMatchCardModel } from "@/components/matches/matchCard.model";

export default async function MatchesPage() {
  const matchService = new MatchService();
  const matchesWithCounts = await matchService.getMatchesList();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Partidos</h1>
        <Link href="/admin/matches/new">
          <Button>Nuevo Partido</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Partidos</CardTitle>
        </CardHeader>
        <CardContent>
          {matchesWithCounts.length === 0 ? (
            <p className="text-gray-500">No hay partidos registrados</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matchesWithCounts.map((match: any) => {
                const hasSets = Array.isArray(match.match_results?.sets) && match.match_results.sets.length > 0;

                const model = toMatchCardModel(match);

                const primary = hasSets
                  ? { label: "Ver detalle", href: `/admin/matches/${match.id}` }
                  : { label: "Cargar resultado", href: `/admin/matches/${match.id}/result` };

                return (
                  <MatchCard
                    key={match.id}
                    model={model}
                    variant="admin"
                    primaryAction={primary}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



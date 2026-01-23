import { MatchService } from "@/services/match.service";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MatchCard from "@/components/matches/MatchCard";

export default async function MatchesPage() {
  const matchService = new MatchService();
  const matchesWithCounts = await matchService.getMatchesList();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${dd}/${mm} ${hh}:${min}`;
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      scheduled: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-gray-100 text-gray-800",
    };
    const labels = {
      scheduled: "Programado",
      completed: "Completado",
      cancelled: "Cancelado",
    };
    return {
      className: styles[status as keyof typeof styles] || styles.scheduled,
      label: labels[status as keyof typeof labels] || status,
    };
  };

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
                const primary = hasSets ? { label: "Ver detalle", href: `/admin/matches/${match.id}` } : { label: "Cargar resultado", href: `/admin/matches/${match.id}/result` };
                return (
                  <MatchCard
                    key={match.id}
                    matchId={match.id}
                    clubName={match.club_name}
                    matchAt={match.match_at}
                    status={match.status}
                    sets={hasSets ? (match.match_results.sets as any[]) : null}
                    playersByTeam={match.playersByTeam ?? { A: [], B: [] }}
                    hasAssessment={false}
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



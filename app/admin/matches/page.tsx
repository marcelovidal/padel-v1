import { MatchService } from "@/services/match.service";
import { MatchRepository } from "@/repositories/match.repository";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function MatchesPage() {
  const matchService = new MatchService();
  const matches = await matchService.getAllMatches();
  const matchRepository = new MatchRepository();

  // Obtener conteo de jugadores para cada partido
  const matchesWithCounts = await Promise.all(
    matches.map(async (match) => {
      const players = await matchRepository.getMatchPlayers(match.id);
      const result = await matchRepository.getMatchResult(match.id);
      return {
        ...match,
        playersCount: players.length,
        match_results: result,
      };
    })
  );

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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha/Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Club
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resultado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jugadores
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {matchesWithCounts.map((match) => {
                    const statusBadge = getStatusBadge(match.status);
                    return (
                      <tr key={match.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(match.match_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {match.club_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadge.className}`}
                          >
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {(() => {
                            // TODO: narrow match_results.sets type instead of casting to `any[]`
                            const sets = Array.isArray(match.match_results?.sets)
                              ? (match.match_results!.sets as any[])
                              : [];
                            return sets.length > 0 ? sets.map((s: any) => `${s.a}-${s.b}`).join(", ") : "—";
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {match.playersCount} / {match.max_players}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <Link href={`/admin/matches/${match.id}`}>
                            <Button variant="outline" size="sm">
                              Ver/Editar
                            </Button>
                          </Link>
                          {match.status === "scheduled" ? (
                            <Link href={`/admin/matches/${match.id}/result`}>
                              <Button variant="outline" size="sm">
                                Cargar Resultado
                              </Button>
                            </Link>
                          ) : match.status === "completed" ? (
                            <Link href={`/admin/matches/${match.id}/result`}>
                              <Button variant="outline" size="sm">
                                Editar Resultado
                              </Button>
                            </Link>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



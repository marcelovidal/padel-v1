import { requireClub } from "@/lib/auth";
import { RankingService } from "@/services/ranking.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecalculateRankingButton } from "@/components/club/RecalculateRankingButton";

function formatDate(date: string | null) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));
}

export default async function ClubRankingPage() {
  const { club } = await requireClub();
  const rankingService = new RankingService();
  const ranking = await rankingService.getClubRanking(club.id, 20, 0);

  const rankedPlayers = ranking.length;
  const rankedMatches = ranking.reduce((acc, row) => acc + row.matches_played, 0);
  const lastUpdated = ranking.reduce<string | null>((acc, row) => {
    if (!row.last_match_at) return acc;
    if (!acc) return row.last_match_at;
    return new Date(row.last_match_at) > new Date(acc) ? row.last_match_at : acc;
  }, null);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Club Ranking</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-gray-900">Ranking del club</h1>
            <p className="mt-1 text-gray-600">{club.name}</p>
          </div>
          <RecalculateRankingButton clubId={club.id} />
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-gray-600">Jugadores rankeados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-gray-900">{rankedPlayers}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-gray-600">Partidos considerados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-gray-900">{rankedMatches}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-gray-600">Ultimo partido rankeado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-black text-gray-900">{formatDate(lastUpdated)}</p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle>Top 20 del club</CardTitle>
        </CardHeader>
        <CardContent>
          {ranking.length === 0 ? (
            <p className="text-sm text-gray-600">
              No hay datos rankeables aun. Necesitas partidos `completed` con resultado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Jugador</th>
                    <th className="px-3 py-2">Categoria</th>
                    <th className="px-3 py-2">Puntos</th>
                    <th className="px-3 py-2">W/L</th>
                    <th className="px-3 py-2">Partidos</th>
                    <th className="px-3 py-2">Sets</th>
                    <th className="px-3 py-2">Ultimo</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((row) => (
                    <tr key={row.player_id} className="border-b border-gray-100">
                      <td className="px-3 py-2 font-black text-gray-900">{row.rank}</td>
                      <td className="px-3 py-2 font-semibold text-gray-900">{row.display_name}</td>
                      <td className="px-3 py-2 text-gray-700">{row.category || "-"}</td>
                      <td className="px-3 py-2 font-black text-blue-700">{row.points}</td>
                      <td className="px-3 py-2 text-gray-700">
                        {row.wins}/{row.losses}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{row.matches_played}</td>
                      <td className="px-3 py-2 text-gray-700">
                        {row.sets_won}/{row.sets_lost}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{formatDate(row.last_match_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

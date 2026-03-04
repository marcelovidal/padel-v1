import Link from "next/link";
import { requireClub } from "@/lib/auth";
import { ClubService } from "@/services/club.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatMatchDateTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function statusLabel(status: string) {
  if (status === "scheduled") return "Programado";
  if (status === "completed") return "Completado";
  if (status === "cancelled") return "Cancelado";
  return status;
}

export default async function ClubHomePage() {
  const { club } = await requireClub();
  const clubService = new ClubService();
  const matches = await clubService.listMyClubMatches(20);

  const scheduled = matches.filter((m) => m.status === "scheduled").length;
  const completed = matches.filter((m) => m.status === "completed").length;
  const cancelled = matches.filter((m) => m.status === "cancelled").length;
  const recent = matches.slice(0, 5);

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Panel del Club</h1>
        <p className="text-gray-600">{club.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Programados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-blue-700">{scheduled}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Completados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-green-700">{completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cancelados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-gray-700">{cancelled}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ultimos Partidos en tu Club</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-gray-500">Todavia no hay partidos asociados a este club.</p>
          ) : (
            <div className="space-y-3">
              {recent.map((match) => (
                <div key={match.id} className="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{formatMatchDateTime(match.match_at)}</p>
                    <p className="text-sm text-gray-600">{match.players_count}/{match.max_players} jugadores</p>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-600">{statusLabel(match.status)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="pt-4">
            <Link href="/club/matches" className="text-sm font-bold text-blue-700 hover:underline">
              Ver todos los partidos
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

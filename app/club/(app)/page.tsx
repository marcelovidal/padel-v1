import Link from "next/link";
import { requireClub } from "@/lib/auth";
import { ClubService } from "@/services/club.service";
import { BookingService } from "@/services/booking.service";
import { ClubAnalyticsSection, ClubInsightsSection } from "@/components/club/ClubAnalyticsSection";
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

function formatInt(value: number) {
  return new Intl.NumberFormat("es-AR").format(value || 0);
}

function isWithinDays(iso: string, days: number) {
  const now = new Date();
  const edge = new Date(now);
  edge.setDate(edge.getDate() + days);
  const date = new Date(iso);
  return date >= now && date <= edge;
}

export default async function ClubHomePage() {
  const { club } = await requireClub();
  const clubService = new ClubService();
  const bookingService = new BookingService();

  const [matches, stats, bookings] = await Promise.all([
    clubService.listMyClubMatches(60),
    clubService.getDashboardStats(club.id),
    bookingService.listClubBookings(club.id),
  ]);

  const recent = matches.slice(0, 6);

  const requestedBookings = bookings.filter((b) => b.status === "requested").length;
  const confirmedBookingsNext7 = bookings.filter(
    (b) => b.status === "confirmed" && isWithinDays(b.start_at, 7)
  ).length;

  const upcomingScheduledNext7 = matches.filter(
    (m) => m.status === "scheduled" && isWithinDays(m.match_at, 7)
  );

  const avgRosterFill = upcomingScheduledNext7.length
    ? Math.round(
        (upcomingScheduledNext7.reduce((acc, m) => acc + Math.min(4, m.players_count || 0), 0) /
          (upcomingScheduledNext7.length * 4)) *
          100
      )
    : 0;

  const peakHour = [...stats.matches_by_hour].sort((a, b) => b.count - a.count)[0];

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-4">
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-white via-cyan-50/70 to-blue-50/70 p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">Resumen Ejecutivo</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-gray-900">Panel del Club</h1>
            <p className="mt-1 text-gray-600">{club.name}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/club/dashboard/bookings" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700">
              Gestionar reservas
            </Link>
            <Link href="/club/dashboard/tournaments" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">
              Gestionar torneos
            </Link>
            <Link href="/club/dashboard/leagues" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">
              Gestionar ligas
            </Link>
            <Link href="/club/matches" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">
              Ver partidos
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-gray-600">Solicitudes pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-amber-700">{formatInt(requestedBookings)}</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-gray-600">Reservas confirmadas (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-green-700">{formatInt(confirmedBookingsNext7)}</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-gray-600">Llenado prox. 7d</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-blue-700">{avgRosterFill}%</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-gray-600">Partidos con resultado (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-cyan-700">{formatInt(stats.matches_last_30_days)}</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-gray-600">Jugadores unicos (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-violet-700">{formatInt(stats.unique_players_last_30_days)}</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-gray-600">Hora pico</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-gray-900">
              {peakHour?.count ? `${String(peakHour.hour).padStart(2, "0")}:00` : "N/D"}
            </p>
          </CardContent>
        </Card>
      </div>

      <ClubAnalyticsSection clubId={club.id} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle>Ultimos partidos en tu club</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-gray-500">Todavia no hay partidos asociados a este club.</p>
            ) : (
              <div className="space-y-3">
                {recent.map((match) => (
                  <div key={match.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
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

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle>Top jugadores (30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.top_players.length === 0 ? (
              <p className="text-sm text-gray-500">Todavia no hay jugadores suficientes para el ranking.</p>
            ) : (
              <ol className="space-y-2">
                {stats.top_players.slice(0, 5).map((player, idx) => (
                  <li
                    key={player.player_id}
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-gray-900">
                        {idx + 1}. {player.display_name}
                      </p>
                    </div>
                    <span className="inline-flex rounded-full bg-blue-50 px-2 py-1 text-xs font-black text-blue-700">
                      {player.matches_count}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <ClubInsightsSection clubId={club.id} />

    </div>
  );
}

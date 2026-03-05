import Link from "next/link";
import { requireClub } from "@/lib/auth";
import { ClubService } from "@/services/club.service";
import { BookingService } from "@/services/booking.service";
import { RankingService } from "@/services/ranking.service";
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

const CLUB_TZ = "America/Argentina/Buenos_Aires";
const WEEKDAY_ORDER = [
  { key: "Mon", label: "Lun", dow: 1 },
  { key: "Tue", label: "Mar", dow: 2 },
  { key: "Wed", label: "Mie", dow: 3 },
  { key: "Thu", label: "Jue", dow: 4 },
  { key: "Fri", label: "Vie", dow: 5 },
  { key: "Sat", label: "Sab", dow: 6 },
  { key: "Sun", label: "Dom", dow: 0 },
] as const;

export default async function ClubHomePage() {
  const { club } = await requireClub();
  const clubService = new ClubService();
  const bookingService = new BookingService();
  const rankingService = new RankingService();

  const [matches, stats, bookings, ranking] = await Promise.all([
    clubService.listMyClubMatches(60),
    clubService.getDashboardStats(club.id),
    bookingService.listClubBookings(club.id),
    rankingService.getClubRanking(club.id, 20, 0),
  ]);

  const scheduled = matches.filter((m) => m.status === "scheduled").length;
  const completed = matches.filter((m) => m.status === "completed").length;
  const cancelled = matches.filter((m) => m.status === "cancelled").length;
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

  const totalBookingsForDecision = bookings.filter((b) => b.status !== "cancelled").length;
  const decisionRate = totalBookingsForDecision
    ? Math.round(
        (bookings.filter((b) => b.status === "confirmed" || b.status === "rejected").length /
          totalBookingsForDecision) *
          100
      )
    : 0;

  const peakHour = [...stats.matches_by_hour].sort((a, b) => b.count - a.count)[0];
  const peakDay = [...stats.matches_by_weekday].sort((a, b) => b.count - a.count)[0];
  const topPlayer = stats.top_players[0];
  const topRanked = ranking[0] || null;
  const rankedPlayers = ranking.length;
  const avgPointsTop5 = ranking.length
    ? Math.round(
        ranking.slice(0, 5).reduce((acc, row) => acc + row.points, 0) / Math.min(5, ranking.length)
      )
    : 0;
  const maxWeekday = Math.max(1, ...stats.matches_by_weekday.map((d) => Number(d.count || 0)));
  const weekdayCountMap = new Map(stats.matches_by_weekday.map((d) => [d.dow, Number(d.count || 0)]));

  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - 30);
  const heatSource = matches.filter((m) => m.status !== "cancelled" && new Date(m.match_at) >= windowStart);

  const detectedHours = stats.matches_by_hour.filter((h) => h.count > 0).map((h) => h.hour);
  const minHour = detectedHours.length ? Math.max(6, Math.min(...detectedHours) - 1) : 9;
  const maxHour = detectedHours.length ? Math.min(23, Math.max(...detectedHours) + 1) : 22;
  const heatHours = Array.from({ length: maxHour - minHour + 1 }).map((_, idx) => minHour + idx);

  const heatMap = new Map<string, number>();
  for (const match of heatSource) {
    const date = new Date(match.match_at);
    const weekdayKey = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: CLUB_TZ }).format(date);
    const hour = Number(
      new Intl.DateTimeFormat("en-US", { hour: "2-digit", hour12: false, timeZone: CLUB_TZ }).format(date)
    );
    const day = WEEKDAY_ORDER.find((d) => d.key === weekdayKey);
    if (!day || Number.isNaN(hour)) continue;
    if (hour < minHour || hour > maxHour) continue;
    const key = `${day.dow}-${hour}`;
    heatMap.set(key, (heatMap.get(key) || 0) + 1);
  }

  const maxHeat = Math.max(1, ...Array.from(heatMap.values()));

  const operationalAlerts: string[] = [];
  if (requestedBookings > 0) {
    operationalAlerts.push(`Tenes ${requestedBookings} solicitud(es) de reserva pendiente(s) de gestion.`);
  }
  if (avgRosterFill < 75 && upcomingScheduledNext7.length > 0) {
    operationalAlerts.push("La ocupacion de jugadores de los proximos 7 dias esta baja. Conviene completar cupos.");
  }
  if (decisionRate < 80 && totalBookingsForDecision > 0) {
    operationalAlerts.push("El tiempo de decision de reservas puede mejorar. Prioriza confirmar/rechazar mas rapido.");
  }
  if (rankedPlayers < 4 && stats.matches_last_30_days > 0) {
    operationalAlerts.push("El ranking todavia tiene baja cobertura. Carga mas resultados para mejorar señal competitiva.");
  }
  if (operationalAlerts.length === 0) {
    operationalAlerts.push("Operacion estable: no se detectan alertas criticas para esta semana.");
  }

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

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-gray-600">Jugadores rankeados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-indigo-700">{formatInt(rankedPlayers)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="border-gray-200 xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between gap-2">
              <span>Mapa integrado semana x horario (30 dias)</span>
              <span className="text-xs font-semibold text-gray-500">
                {peakDay?.count && peakHour?.count
                  ? `Pico: ${peakDay.label} ${String(peakHour.hour).padStart(2, "0")}:00`
                  : "Sin pico"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {heatSource.length === 0 ? (
              <p className="text-sm text-gray-500">Todavia no hay datos para cruzar dias y horarios.</p>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <div className="min-w-[680px] space-y-1">
                    <div
                      className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-gray-500"
                      style={{ gridTemplateColumns: `56px repeat(${heatHours.length}, minmax(0, 1fr))` }}
                    >
                      <span />
                      {heatHours.map((hour) => (
                        <span key={`h-${hour}`} className="text-center">{String(hour).padStart(2, "0")}</span>
                      ))}
                    </div>
                    {WEEKDAY_ORDER.map((day) => (
                      <div
                        key={`d-${day.dow}`}
                        className="grid gap-1"
                        style={{ gridTemplateColumns: `56px repeat(${heatHours.length}, minmax(0, 1fr))` }}
                      >
                        <div className="flex items-center text-xs font-bold text-gray-600">{day.label}</div>
                        {heatHours.map((hour) => {
                          const value = heatMap.get(`${day.dow}-${hour}`) || 0;
                          const intensity = value === 0 ? 0 : Math.max(0.2, value / maxHeat);
                          return (
                            <div
                              key={`${day.dow}-${hour}`}
                              className="h-6 rounded-md border border-gray-100"
                              style={{
                                backgroundColor:
                                  value === 0
                                    ? "rgb(249 250 251)"
                                    : `rgba(8, 145, 178, ${Math.min(0.95, intensity)})`,
                                color: value === 0 ? "rgb(107 114 128)" : "white",
                              }}
                              title={`${day.label} ${String(hour).padStart(2, "0")}:00 - ${value} partido(s)`}
                            >
                              <div className="flex h-full items-center justify-center text-[10px] font-black">{value || ""}</div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {WEEKDAY_ORDER.map((day) => (
                    <div key={`sum-${day.dow}`} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
                      <p className="font-bold text-gray-500">{day.label}</p>
                      <p className="text-sm font-black text-gray-900">{weekdayCountMap.get(day.dow) || 0}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle>Senales clave</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Estado operativo</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">
                {requestedBookings > 0 ? "Con pendientes de reservas" : "Sin pendientes criticos"}
              </p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Top jugador (30d)</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">
                {topPlayer ? `${topPlayer.display_name} (${topPlayer.matches_count})` : "Sin datos"}
              </p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Lider ranking</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">
                {topRanked ? `${topRanked.display_name} (${topRanked.points} pts)` : "Sin ranking calculado"}
              </p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Promedio top 5</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">
                {rankedPlayers > 0 ? `${avgPointsTop5} pts` : "N/D"}
              </p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Partidos programados</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">{formatInt(scheduled)}</p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Partidos completados</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">{formatInt(completed)}</p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Partidos cancelados</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">{formatInt(cancelled)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="border-gray-200 xl:col-span-2">
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
            <CardTitle>Ranking del club (Top 5)</CardTitle>
          </CardHeader>
          <CardContent>
            {ranking.length === 0 ? (
              <p className="text-sm text-gray-500">No hay ranking disponible aun para este club.</p>
            ) : (
              <ol className="space-y-2">
                {ranking.slice(0, 5).map((row) => (
                  <li
                    key={row.player_id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        #{row.rank} {row.display_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        W/L {row.wins}/{row.losses} - {row.matches_played} partidos
                      </p>
                    </div>
                    <span className="text-sm font-black text-blue-700">{row.points}</span>
                  </li>
                ))}
              </ol>
            )}
            <div className="pt-4">
              <Link href="/club/dashboard/ranking" className="text-sm font-bold text-blue-700 hover:underline">
                Ver ranking completo
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle>Alertas operativas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {operationalAlerts.map((alert, idx) => (
                <li key={`${idx}-${alert}`} className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {alert}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

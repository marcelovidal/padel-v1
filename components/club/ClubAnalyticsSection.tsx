import { ClubService } from "@/services/club.service";
import { BookingService } from "@/services/booking.service";
import { LeaguesService } from "@/services/leagues.service";
import { TournamentsService } from "@/services/tournaments.service";
import { RegistrationsService } from "@/services/registrations.service";
import { ClubEventsSummaryWidget } from "@/components/club/ClubEventsSummaryWidget";
import { ClubAnalyticsTabs } from "@/components/club/ClubAnalyticsTabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + diffToMonday);

  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

function bookingStatusLabel(status: string) {
  if (status === "confirmed") return "Confirmada";
  if (status === "requested") return "Pendiente";
  if (status === "rejected") return "Rechazada";
  if (status === "cancelled") return "Cancelada";
  return status;
}

function bookingStatusClass(status: string) {
  if (status === "confirmed") return "bg-emerald-100 text-emerald-800";
  if (status === "requested") return "bg-amber-100 text-amber-800";
  if (status === "rejected") return "bg-rose-100 text-rose-800";
  if (status === "cancelled") return "bg-slate-100 text-slate-700";
  return "bg-gray-100 text-gray-700";
}

function getEventPriority(status: "draft" | "active" | "finished") {
  if (status === "active") return 0;
  if (status === "draft") return 1;
  return 2;
}

function InsightBox({
  title,
  detail,
  tone,
}: {
  title: string;
  detail: string;
  tone: "blue" | "green" | "violet" | "amber";
}) {
  const toneMap = {
    blue: "border-blue-200 bg-blue-50/70 text-blue-800",
    green: "border-emerald-200 bg-emerald-50/70 text-emerald-800",
    violet: "border-violet-200 bg-violet-50/70 text-violet-800",
    amber: "border-amber-200 bg-amber-50/70 text-amber-800",
  } as const;

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneMap[tone]}`}>
      <p className="text-xs font-black uppercase tracking-[0.14em]">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-gray-800">{detail}</p>
    </div>
  );
}

export async function ClubAnalyticsSection({
  clubId,
}: {
  clubId: string;
}) {
  const clubService = new ClubService();
  const bookingService = new BookingService();
  const leaguesService = new LeaguesService();
  const tournamentsService = new TournamentsService();
  const registrationsService = new RegistrationsService();

  const [stats, bookings, leagues, tournaments] = await Promise.all([
    clubService.getDashboardStats(clubId),
    bookingService.listClubBookings(clubId).catch(() => []),
    leaguesService.listClubLeagues(clubId).catch(() => []),
    tournamentsService.listClubTournaments(clubId).catch(() => []),
  ]);

  const [leagueEvents, tournamentEvents] = await Promise.all([
    Promise.all(
      leagues.map(async (league) => {
        const registrations = await registrationsService.getLeagueRegistrations(league.id).catch(() => []);
        return {
          entityType: "league" as const,
          entityId: league.id,
          name: league.name,
          seasonLabel: league.season_label,
          description: league.description,
          status: league.status,
          startDate: league.start_date,
          endDate: league.end_date,
          targetCityIds: league.target_city_ids,
          pendingRegistrations: registrations.filter((row) => row.status === "pending").length,
          confirmedRegistrations: registrations.filter((row) => row.status === "confirmed").length,
          href: `/club/dashboard/leagues/${league.id}`,
          updatedAt: league.updated_at,
        };
      }),
    ),
    Promise.all(
      tournaments.map(async (tournament) => {
        const registrations = await registrationsService.getTournamentRegistrations(tournament.id).catch(() => []);
        return {
          entityType: "tournament" as const,
          entityId: tournament.id,
          name: tournament.name,
          seasonLabel: tournament.season_label,
          description: tournament.description,
          status: tournament.status,
          startDate: tournament.start_date,
          endDate: tournament.end_date,
          targetCityIds: tournament.target_city_ids,
          pendingRegistrations: registrations.filter((row) => row.status === "pending").length,
          confirmedRegistrations: registrations.filter((row) => row.status === "confirmed").length,
          href: `/club/dashboard/tournaments/${tournament.id}`,
          updatedAt: tournament.updated_at,
        };
      }),
    ),
  ]);

  const managedEvents = [...leagueEvents, ...tournamentEvents]
    .sort((a, b) => {
      const priorityDiff = getEventPriority(a.status) - getEventPriority(b.status);
      if (priorityDiff !== 0) return priorityDiff;

      const aDate = a.startDate ? new Date(a.startDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bDate = b.startDate ? new Date(b.startDate).getTime() : Number.MAX_SAFE_INTEGER;
      if (aDate !== bDate) return aDate - bDate;

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    })
    .slice(0, 6);

  const maxWeekday = Math.max(1, ...stats.matches_by_weekday.map((d) => Number(d.count || 0)));
  const hasData = stats.matches_last_30_days > 0;
  const { start: weekStart, end: weekEnd } = getWeekBounds();
  const weekBookings = bookings
    .filter((booking) => {
      const startAt = new Date(booking.start_at);
      return startAt >= weekStart && startAt < weekEnd;
    })
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

  const peakDay = [...stats.matches_by_weekday].sort((a, b) => b.count - a.count)[0];
  const peakHour = [...stats.matches_by_hour].sort((a, b) => b.count - a.count)[0];
  return (
    <section className="space-y-6">
      {hasData ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="border-gray-200 shadow-sm xl:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between gap-2">
                <span>Calendario y frecuencia (ultimos 30 dias)</span>
                <span className="text-xs font-semibold text-gray-500">
                  {peakDay?.count && peakHour?.count
                    ? `Pico: ${peakDay.label} ${String(peakHour.hour).padStart(2, "0")}:00`
                    : "Sin pico detectado"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ClubAnalyticsTabs
                calendarContent={
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12">
                    {stats.matches_by_hour.map((h) => {
                      const maxHour = Math.max(1, ...stats.matches_by_hour.map((hour) => Number(hour.count || 0)));
                      const intensity = h.count === 0 ? 0 : Math.max(0.2, h.count / maxHour);
                      return (
                        <div
                          key={h.hour}
                          className="rounded-lg border border-gray-100 p-2 text-center shadow-sm"
                          style={{
                            backgroundColor:
                              h.count === 0
                                ? "rgb(249 250 251)"
                                : `rgba(8, 145, 178, ${Math.min(0.95, intensity)})`,
                            color: h.count === 0 ? "rgb(75 85 99)" : "white",
                          }}
                          title={`${String(h.hour).padStart(2, "0")}:00 - ${h.count} partidos`}
                        >
                          <div className="text-[10px] font-bold">{String(h.hour).padStart(2, "0")}:00</div>
                          <div className="text-sm font-black">{h.count}</div>
                        </div>
                      );
                    })}
                  </div>
                }
                byDayContent={
                  <div className="space-y-3">
                    {stats.matches_by_weekday.map((row) => {
                      const width = `${Math.round((row.count / maxWeekday) * 100)}%`;
                      return (
                        <div key={row.dow} className="grid grid-cols-[44px_1fr_36px] items-center gap-3">
                          <span className="text-xs font-bold text-gray-600">{row.label}</span>
                          <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500"
                              style={{ width: row.count > 0 ? width : "0%" }}
                            />
                          </div>
                          <span className="text-right text-xs font-black text-gray-800">{row.count}</span>
                        </div>
                      );
                    })}
                  </div>
                }
                weekBookingsContent={
                  weekBookings.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-sm text-gray-500">
                      No hay reservas cargadas para la semana en vigencia.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {weekBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"
                        >
                          <div>
                            <p className="text-sm font-black text-gray-900">{formatDateTime(booking.start_at)}</p>
                            <p className="text-xs text-gray-500">
                              {booking.club_courts?.name || "Cancha"} | {booking.note?.trim() || "Sin nota"}
                            </p>
                          </div>
                          <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${bookingStatusClass(booking.status)}`}>
                            {bookingStatusLabel(booking.status)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                }
              />
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between gap-2">
                <span>Participacion por categoria</span>
                <span className="text-xs font-semibold text-gray-500">Mix del club</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.matches_by_category.length === 0 ? (
                <p className="text-sm text-gray-500">Sin datos de categorias en los ultimos 30 dias.</p>
              ) : (
                <div className="space-y-2">
                  {stats.matches_by_category.map((c) => (
                    <div key={c.category} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm">
                      <span className="truncate pr-3 text-gray-700">{c.category}</span>
                      <span className="font-black text-gray-900">{c.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <ClubEventsSummaryWidget events={managedEvents} />
    </section>
  );
}

export async function ClubInsightsSection({
  clubId,
}: {
  clubId: string;
}) {
  const clubService = new ClubService();
  const stats = await clubService.getDashboardStats(clubId);
  const hasData = stats.matches_last_30_days > 0;
  const peakDay = [...stats.matches_by_weekday].sort((a, b) => b.count - a.count)[0];
  const peakHour = [...stats.matches_by_hour].sort((a, b) => b.count - a.count)[0];
  const avgWeeklyFrom30 = stats.matches_last_30_days / 4.2857;
  const weeklyDelta = stats.matches_last_7_days - avgWeeklyFrom30;
  const weeklyTrend =
    stats.matches_last_30_days === 0 ? null : weeklyDelta > 1 ? "up" : weeklyDelta < -1 ? "down" : "stable";
  const top3Appearances = stats.top_players.slice(0, 3).reduce((acc, p) => acc + p.matches_count, 0);
  const estimatedTotalAppearances = stats.matches_last_30_days * 4;
  const top3Share = estimatedTotalAppearances > 0 ? Math.round((top3Appearances / estimatedTotalAppearances) * 100) : 0;
  const mainCategory = stats.matches_by_category[0];

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2">
          <span>Insights operativos y estrategicos</span>
          <span className="text-xs font-semibold text-gray-500">Ultimos 30 dias</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5">
            <p className="text-sm text-gray-600">
              Cuando tengas partidos con resultado en el club, vas a ver recomendaciones de horarios, ritmo de actividad y jugadores frecuentes.
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Prioridad sugerida: registrar resultados de partidos para habilitar lecturas de uso real.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <InsightBox
              tone="blue"
              title="Dia y hora pico"
              detail={
                peakDay?.count
                  ? `Tu dia mas activo es ${peakDay.label} y la franja mas fuerte es ${String(peakHour?.hour ?? 0).padStart(2, "0")}:00. Esto sirve para reforzar slots de alta demanda.`
                  : "Todavia no hay suficiente actividad para detectar un dia y hora pico confiables."
              }
            />

            <InsightBox
              tone="green"
              title="Ritmo semanal"
              detail={
                weeklyTrend === "up"
                  ? `La ultima semana estuvo por encima del promedio mensual (+${Math.round(weeklyDelta)} partidos). Senal de traccion reciente.`
                  : weeklyTrend === "down"
                    ? `La ultima semana estuvo por debajo del promedio mensual (${Math.round(weeklyDelta)} partidos). Conviene revisar continuidad de agenda.`
                    : weeklyTrend === "stable"
                      ? "La actividad de la ultima semana se mantiene estable respecto del promedio mensual."
                      : "Todavia no hay historial suficiente para detectar tendencia semanal."
              }
            />

            <InsightBox
              tone="violet"
              title="Jugadores recurrentes"
              detail={
                stats.top_players.length > 0
                  ? `Los 3 jugadores mas frecuentes concentran ${top3Share}% de las participaciones estimadas del ultimo mes. Puede ayudar a definir horarios fijos o propuestas recurrentes.`
                  : "Todavia no hay actividad suficiente para medir recurrencia de jugadores."
              }
            />

            <InsightBox
              tone="amber"
              title="Mix de categorias"
              detail={
                mainCategory
                  ? `La categoria con mayor participacion es ${mainCategory.category} (${mainCategory.count} apariciones). Usalo para orientar ofertas y horarios por nivel.`
                  : "Todavia no hay categorias suficientes para analizar el mix del club."
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}


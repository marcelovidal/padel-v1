import { requireClub } from "@/lib/auth";
import { ClubService } from "@/services/club.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function KpiCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-gray-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-black text-gray-900">{value}</p>
        {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export default async function ClubDashboardPage() {
  const { club } = await requireClub();
  const clubService = new ClubService();
  const stats = await clubService.getDashboardStats(club.id);

  const maxWeekday = Math.max(1, ...stats.matches_by_weekday.map((d) => Number(d.count || 0)));
  const maxHour = Math.max(1, ...stats.matches_by_hour.map((h) => Number(h.count || 0)));
  const hasData = stats.matches_last_30_days > 0;

  const peakDay = [...stats.matches_by_weekday].sort((a, b) => b.count - a.count)[0];
  const peakHour = [...stats.matches_by_hour].sort((a, b) => b.count - a.count)[0];
  const avgWeeklyFrom30 = stats.matches_last_30_days / 4.2857;
  const weeklyDelta = stats.matches_last_7_days - avgWeeklyFrom30;
  const weeklyTrend =
    stats.matches_last_30_days === 0
      ? null
      : weeklyDelta > 1
        ? "up"
        : weeklyDelta < -1
          ? "down"
          : "stable";
  const top3Appearances = stats.top_players.slice(0, 3).reduce((acc, p) => acc + p.matches_count, 0);
  const estimatedTotalAppearances = stats.matches_last_30_days * 4;
  const top3Share = estimatedTotalAppearances > 0 ? Math.round((top3Appearances / estimatedTotalAppearances) * 100) : 0;
  const mainCategory = stats.matches_by_category[0];

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard del Club</h1>
        <p className="text-gray-600">{club.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          title="Partidos (7 días)"
          value={stats.matches_last_7_days}
          hint="Solo partidos con resultado"
        />
        <KpiCard
          title="Partidos (30 días)"
          value={stats.matches_last_30_days}
          hint="Actividad reciente del club"
        />
        <KpiCard
          title="Jugadores únicos (30 días)"
          value={stats.unique_players_last_30_days}
          hint="Participación de jugadores"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Insights operativos</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasData ? (
            <p className="text-sm text-gray-500">
              Cuando tengas partidos con resultado en el club, vas a ver recomendaciones de horarios, ritmo de actividad y jugadores frecuentes.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                <p className="text-xs font-black uppercase tracking-widest text-blue-700">Día y hora pico</p>
                <p className="mt-1 text-sm text-gray-800">
                  {peakDay?.count
                    ? `El día más activo es ${peakDay.label}`
                    : "Todavía no hay un día dominante"}{" "}
                  {peakHour?.count
                    ? `y la hora más fuerte es ${String(peakHour.hour).padStart(2, "0")}:00.`
                    : "y todavía no hay una hora pico clara."}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                <p className="text-xs font-black uppercase tracking-widest text-emerald-700">Ritmo semanal</p>
                <p className="mt-1 text-sm text-gray-800">
                  {weeklyTrend === "up" &&
                    `La última semana estuvo por encima del promedio mensual (+${Math.round(weeklyDelta)} partidos).`}
                  {weeklyTrend === "down" &&
                    `La última semana estuvo por debajo del promedio mensual (${Math.round(weeklyDelta)} partidos).`}
                  {weeklyTrend === "stable" &&
                    "La actividad de la última semana se mantiene estable respecto al promedio mensual."}
                  {weeklyTrend === null && "Todavía no hay historial suficiente para detectar una tendencia."}
                </p>
              </div>

              <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4">
                <p className="text-xs font-black uppercase tracking-widest text-violet-700">Jugadores recurrentes</p>
                <p className="mt-1 text-sm text-gray-800">
                  {stats.top_players.length > 0
                    ? `Los 3 jugadores más frecuentes concentran ${top3Share}% de las participaciones estimadas del último mes.`
                    : "Todavía no hay suficiente actividad para medir recurrencia de jugadores."}
                </p>
                {stats.top_players.length > 0 ? (
                  <p className="mt-1 text-xs text-gray-500">
                    Esto puede ayudarte a definir horarios estables y propuestas recurrentes.
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
                <p className="text-xs font-black uppercase tracking-widest text-amber-700">Mix de categorías</p>
                <p className="mt-1 text-sm text-gray-800">
                  {mainCategory
                    ? `La categoría con mayor participación es ${mainCategory.category} (${mainCategory.count} apariciones).`
                    : "Todavía no hay categorías suficientes para analizar el mix del club."}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {hasData ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Partidos por día (últimos 30 días)</CardTitle>
              <p className="text-xs text-gray-500">
                {peakDay?.count
                  ? `Pico de actividad: ${peakDay.label} (${peakDay.count})`
                  : "Sin pico detectado todavía"}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.matches_by_weekday.map((row) => {
                  const width = `${Math.round((row.count / maxWeekday) * 100)}%`;
                  return (
                    <div key={row.dow} className="grid grid-cols-[44px_1fr_36px] items-center gap-3">
                      <span className="text-xs font-bold text-gray-600">{row.label}</span>
                      <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{ width: row.count > 0 ? width : "0%" }}
                        />
                      </div>
                      <span className="text-xs font-black text-gray-800 text-right">{row.count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top jugadores (30 días)</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.top_players.length === 0 ? (
                <p className="text-sm text-gray-500">Todavía no hay jugadores suficientes para el ranking.</p>
              ) : (
                <ol className="space-y-2">
                  {stats.top_players.map((p, idx) => (
                    <li
                      key={p.player_id}
                      className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {idx + 1}. {p.display_name}
                        </p>
                      </div>
                      <span className="text-xs font-black text-blue-700">{p.matches_count}</span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Mapa horario (últimos 30 días)</CardTitle>
              <p className="text-xs text-gray-500">
                {peakHour?.count
                  ? `Hora pico: ${String(peakHour.hour).padStart(2, "0")}:00 (${peakHour.count})`
                  : "Sin actividad horaria reciente"}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
                {stats.matches_by_hour.map((h) => {
                  const intensity = h.count === 0 ? 0 : Math.max(0.2, h.count / maxHour);
                  return (
                    <div
                      key={h.hour}
                      className="rounded-lg border border-gray-100 p-2 text-center"
                      style={{
                        backgroundColor:
                          h.count === 0
                            ? "rgb(249 250 251)"
                            : `rgba(37, 99, 235, ${Math.min(1, intensity)})`,
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Participación por categoría</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.matches_by_category.length === 0 ? (
                <p className="text-sm text-gray-500">Sin datos de categorías en los últimos 30 días.</p>
              ) : (
                <div className="space-y-2">
                  {stats.matches_by_category.map((c) => (
                    <div key={c.category} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 truncate pr-3">{c.category}</span>
                      <span className="font-black text-gray-900">{c.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Actividad del club</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Todavía no hay suficientes partidos con resultado para mostrar analítica.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Cuando se registren partidos con resultado en tu club, vas a ver métricas de uso, horarios y jugadores frecuentes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

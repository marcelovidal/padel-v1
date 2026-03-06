import { requireClub } from "@/lib/auth";
import { ClubService } from "@/services/club.service";
import { LeaguesService } from "@/services/leagues.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatInt(value: number) {
  return new Intl.NumberFormat("es-AR").format(value || 0);
}

function KpiCard({
  title,
  value,
  hint,
  accentClassName,
}: {
  title: string;
  value: string | number;
  hint?: string;
  accentClassName: string;
}) {
  return (
    <Card className="overflow-hidden border-gray-200 shadow-sm">
      <div className={`h-1 w-full bg-gradient-to-r ${accentClassName}`} />
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-gray-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-black tracking-tight text-gray-900">{value}</p>
        {hint ? <p className="mt-2 text-xs leading-relaxed text-gray-500">{hint}</p> : null}
      </CardContent>
    </Card>
  );
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

export default async function ClubDashboardPage() {
  const { club } = await requireClub();
  const clubService = new ClubService();
  const leaguesService = new LeaguesService();
  const [stats, leagues] = await Promise.all([
    clubService.getDashboardStats(club.id),
    leaguesService.listClubLeagues(club.id).catch(() => []),
  ]);

  const maxWeekday = Math.max(1, ...stats.matches_by_weekday.map((d) => Number(d.count || 0)));
  const maxHour = Math.max(1, ...stats.matches_by_hour.map((h) => Number(h.count || 0)));
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

  const strategicSignals = [
    {
      label: "Ritmo 7d",
      value: formatInt(stats.matches_last_7_days),
      hint: "Partidos con resultado",
    },
    {
      label: "Jugadores 30d",
      value: formatInt(stats.unique_players_last_30_days),
      hint: "Participacion unica",
    },
    {
      label: "Top 3 share",
      value: `${top3Share}%`,
      hint: "Recurrencia estimada",
    },
    {
      label: "Hora pico",
      value: peakHour?.count ? `${String(peakHour.hour).padStart(2, "0")}:00` : "N/D",
      hint: "Ultimos 30 dias",
    },
    {
      label: "Ligas activas",
      value: formatInt(leagues.filter((l) => l.status === "active").length),
      hint: "Q6 Ligas",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4">
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-white via-cyan-50/60 to-blue-50/60 p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">Club Analytics</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-gray-900">Dashboard del Club</h1>
            <p className="mt-1 text-gray-600">{club.name}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {strategicSignals.map((s) => (
              <div key={s.label} className="rounded-xl border border-white/80 bg-white/80 px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{s.label}</p>
                <p className="text-lg font-black text-gray-900">{s.value}</p>
                <p className="text-[10px] text-gray-500">{s.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard
          title="Partidos (7 dias)"
          value={formatInt(stats.matches_last_7_days)}
          hint="Solo partidos con resultado"
          accentClassName="from-blue-600 to-sky-500"
        />
        <KpiCard
          title="Partidos (30 dias)"
          value={formatInt(stats.matches_last_30_days)}
          hint="Actividad reciente del club"
          accentClassName="from-cyan-600 to-teal-500"
        />
        <KpiCard
          title="Jugadores unicos (30 dias)"
          value={formatInt(stats.unique_players_last_30_days)}
          hint="Participacion de jugadores"
          accentClassName="from-violet-600 to-fuchsia-500"
        />
      </section>

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

      {hasData ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="border-gray-200 shadow-sm xl:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between gap-2">
                <span>Partidos por dia (ultimos 30 dias)</span>
                <span className="text-xs font-semibold text-gray-500">
                  {peakDay?.count ? `Pico: ${peakDay.label} (${peakDay.count})` : "Sin pico detectado"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between gap-2">
                <span>Top jugadores (30 dias)</span>
                <span className="text-xs font-semibold text-gray-500">Ranking de recurrencia</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.top_players.length === 0 ? (
                <p className="text-sm text-gray-500">Todavia no hay jugadores suficientes para el ranking.</p>
              ) : (
                <ol className="space-y-2">
                  {stats.top_players.map((p, idx) => (
                    <li
                      key={p.player_id}
                      className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-900">
                          {idx + 1}. {p.display_name}
                        </p>
                      </div>
                      <span className="inline-flex rounded-full bg-blue-50 px-2 py-1 text-xs font-black text-blue-700">
                        {p.matches_count}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm xl:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between gap-2">
                <span>Mapa horario (ultimos 30 dias)</span>
                <span className="text-xs font-semibold text-gray-500">
                  {peakHour?.count
                    ? `Hora pico: ${String(peakHour.hour).padStart(2, "0")}:00 (${peakHour.count})`
                    : "Sin actividad horaria reciente"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12">
                {stats.matches_by_hour.map((h) => {
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
      ) : (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle>Actividad del club</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Todavia no hay suficientes partidos con resultado para mostrar analitica.</p>
            <p className="mt-2 text-sm text-gray-500">
              Cuando se registren partidos con resultado en tu club, vas a ver metricas de uso, horarios y jugadores frecuentes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

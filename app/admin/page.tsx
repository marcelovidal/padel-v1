import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminService } from "@/services/admin.service";

function formatInt(value: number) {
  return new Intl.NumberFormat("es-AR").format(value || 0);
}

function formatPercent(value: number | null) {
  if (value == null) return "N/D";
  return `${value.toFixed(1)}%`;
}

function formatHours(value: number | null) {
  if (value == null) return "N/D";
  return `${value.toFixed(1)} h`;
}

function growthBadge(value: number | null) {
  if (value == null) {
    return {
      label: "Sin base previa",
      className: "bg-gray-100 text-gray-600 border-gray-200",
    };
  }

  if (value > 0.5) {
    return {
      label: `+${value.toFixed(1)}%`,
      className: "bg-green-50 text-green-700 border-green-200",
    };
  }

  if (value < -0.5) {
    return {
      label: `${value.toFixed(1)}%`,
      className: "bg-red-50 text-red-700 border-red-200",
    };
  }

  return {
    label: `${value.toFixed(1)}%`,
    className: "bg-amber-50 text-amber-700 border-amber-200",
  };
}

function trendTone(value: number | null) {
  if (value == null) return "text-gray-600";
  if (value > 0.5) return "text-green-700";
  if (value < -0.5) return "text-red-700";
  return "text-amber-700";
}

function buildInsights(stats: Awaited<ReturnType<AdminService["getOverviewStats"]>>) {
  const insights: Array<{ title: string; detail: string; level: "info" | "warn" | "good" }> = [];

  const onboardingRate = stats.users.onboarding_completion_rate_30d;
  if (stats.users.player_profiles_created_30d >= 5) {
    if (onboardingRate != null && onboardingRate < 60) {
      insights.push({
        title: "Drop-off en onboarding",
        detail: `Solo ${formatPercent(onboardingRate)} de los perfiles player creados en 30d completaron onboarding. Conviene revisar friccion en el flujo inicial.`,
        level: "warn",
      });
    } else if (onboardingRate != null && onboardingRate >= 80) {
      insights.push({
        title: "Onboarding saludable",
        detail: `La finalizacion de onboarding en 30d esta en ${formatPercent(onboardingRate)}. El cuello de botella probablemente esta mas abajo (primer partido / recurrencia).`,
        level: "good",
      });
    }
  }

  if (stats.clubs.pending_claims > 0) {
    const medianHours = stats.clubs.claim_resolution_median_hours_30d;
    insights.push({
      title: "Claims de club en cola",
      detail:
        medianHours == null
          ? `Hay ${formatInt(stats.clubs.pending_claims)} reclamos pendientes. Todavia no hay suficientes resoluciones recientes para estimar SLA.`
          : `Hay ${formatInt(stats.clubs.pending_claims)} reclamos pendientes y la mediana de resolucion en 30d es ${formatHours(medianHours)}.`,
      level: stats.clubs.pending_claims >= 5 ? "warn" : "info",
    });
  }

  if (
    stats.growth.matches_30d_vs_prev_30d_pct != null &&
    stats.growth.active_clubs_30d_vs_prev_30d_pct != null &&
    stats.growth.matches_30d_vs_prev_30d_pct > 10 &&
    stats.growth.active_clubs_30d_vs_prev_30d_pct <= 2
  ) {
    insights.push({
      title: "Crecimiento concentrado",
      detail:
        "Los partidos con resultado crecen mas rapido que los clubes activos. Puede haber concentracion de uso en pocos clubes y conviene trabajar activacion de nuevos clubes.",
      level: "warn",
    });
  }

  if (stats.matches.result_completion_rate_30d != null && stats.matches.result_completion_rate_30d < 70) {
    insights.push({
      title: "Resultados incompletos",
      detail: `La tasa de partidos con resultado en 30d es ${formatPercent(stats.matches.result_completion_rate_30d)}. Hay oportunidad en UX de carga/cierre de resultados.`,
      level: "warn",
    });
  }

  if (stats.sharing.match_shares_30d > 0) {
    insights.push({
      title: "Senal de crecimiento organico",
      detail: `Se registraron ${formatInt(stats.sharing.match_shares_30d)} shares de partidos en 30d. Conviene seguir midiendo conversion desde links publicos.`,
      level: "good",
    });
  }

  if (insights.length === 0) {
    insights.push({
      title: "Datos iniciales",
      detail:
        "Aun no hay suficiente volumen para insights confiables. Mantener foco en activar carga de partidos y claims de club para consolidar senales.",
      level: "info",
    });
  }

  return insights.slice(0, 5);
}

function InsightCard({
  title,
  detail,
  level,
}: {
  title: string;
  detail: string;
  level: "info" | "warn" | "good";
}) {
  const styles =
    level === "warn"
      ? "border-amber-200 bg-amber-50"
      : level === "good"
      ? "border-green-200 bg-green-50"
      : "border-blue-200 bg-blue-50";

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${styles}`}>
      <p className="text-sm font-black text-gray-900">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-gray-700">{detail}</p>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  accentClassName = "from-blue-600 to-cyan-500",
}: {
  title: string;
  value: string;
  subtitle?: string;
  accentClassName?: string;
}) {
  return (
    <Card className="overflow-hidden border-gray-200 shadow-sm">
      <div className={`h-1 w-full bg-gradient-to-r ${accentClassName}`} />
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-gray-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-black tracking-tight text-gray-900">{value}</div>
        {subtitle ? <p className="mt-2 text-xs leading-relaxed text-gray-500">{subtitle}</p> : null}
      </CardContent>
    </Card>
  );
}

function GrowthCard({
  title,
  badge,
  metricText,
  hint,
  toneClassName,
}: {
  title: string;
  badge: { label: string; className: string };
  metricText: string;
  hint: string;
  toneClassName: string;
}) {
  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${badge.className}`}>
            {badge.label}
          </div>
          <div className={`text-xs font-bold ${toneClassName}`}>Comparado con 30d previos</div>
        </div>
        <p className="text-sm font-semibold text-gray-900">{metricText}</p>
        <p className="text-xs text-gray-500">{hint}</p>
      </CardContent>
    </Card>
  );
}

export default async function AdminDashboardPage() {
  const service = new AdminService();
  const [stats, anchoringStats] = await Promise.all([
    service.getOverviewStats(),
    service.getClubAnchoringStats(),
  ]);
  const insights = buildInsights(stats);

  const matchesGrowth = growthBadge(stats.growth.matches_30d_vs_prev_30d_pct);
  const playersGrowth = growthBadge(stats.growth.active_players_30d_vs_prev_30d_pct);
  const clubsGrowth = growthBadge(stats.growth.active_clubs_30d_vs_prev_30d_pct);

  const generatedAt = stats.window.generated_at
    ? new Date(stats.window.generated_at).toLocaleString("es-AR")
    : "N/D";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-white via-blue-50/60 to-cyan-50/60 p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
              Admin Strategic Overview
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-gray-900">Dashboard Admin</h1>
            <p className="mt-1 text-gray-600">
              Vista estrategica para producto y operacion (ventana principal: ultimos 30 dias).
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-white/80 bg-white/80 px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Usuarios</p>
              <p className="text-lg font-black text-gray-900">{formatInt(stats.users.new_30d)}</p>
            </div>
            <div className="rounded-xl border border-white/80 bg-white/80 px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Partidos</p>
              <p className="text-lg font-black text-gray-900">{formatInt(stats.matches.with_result_30d)}</p>
            </div>
            <div className="rounded-xl border border-white/80 bg-white/80 px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Clubes</p>
              <p className="text-lg font-black text-gray-900">{formatInt(stats.clubs.active_30d)}</p>
            </div>
            <div className="rounded-xl border border-white/80 bg-white/80 px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Claims</p>
              <p className="text-lg font-black text-gray-900">{formatInt(stats.clubs.pending_claims)}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 font-semibold text-blue-700">
            Actualizado: {generatedAt}
          </span>
          <span className="rounded-full border border-gray-200 bg-white px-3 py-1 font-semibold text-gray-600">
            Ventana principal: {stats.window.days || 30} dias
          </span>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Usuarios nuevos (30d)"
          value={formatInt(stats.users.new_30d)}
          subtitle={`${formatInt(stats.users.new_7d)} en 7d`}
          accentClassName="from-blue-600 to-sky-500"
        />
        <KpiCard
          title="Onboarding completion (30d)"
          value={formatPercent(stats.users.onboarding_completion_rate_30d)}
          subtitle={`${formatInt(stats.users.onboarding_completed_30d)} completos / ${formatInt(stats.users.player_profiles_created_30d)} perfiles`}
          accentClassName="from-emerald-600 to-lime-500"
        />
        <KpiCard
          title="Partidos con resultado (30d)"
          value={formatInt(stats.matches.with_result_30d)}
          subtitle={`${formatInt(stats.matches.with_result_7d)} en 7d`}
          accentClassName="from-indigo-600 to-blue-500"
        />
        <KpiCard
          title="Clubes activos claimed (30d)"
          value={formatInt(stats.clubs.active_30d)}
          subtitle={`${formatInt(stats.clubs.claimed_total)} clubes claimed totales`}
          accentClassName="from-cyan-600 to-teal-500"
        />
        <KpiCard
          title="Players activos (30d)"
          value={formatInt(stats.users.active_players_30d)}
          subtitle="Participacion en partidos con resultado"
          accentClassName="from-violet-600 to-fuchsia-500"
        />
        <KpiCard
          title="Completion resultados (30d)"
          value={formatPercent(stats.matches.result_completion_rate_30d)}
          subtitle={`${formatInt(stats.matches.with_result_30d)} con resultado / ${formatInt(stats.matches.created_30d)} creados`}
          accentClassName="from-amber-500 to-orange-500"
        />
        <KpiCard
          title="Claims pendientes"
          value={formatInt(stats.clubs.pending_claims)}
          subtitle={`Mediana resolucion 30d: ${formatHours(stats.clubs.claim_resolution_median_hours_30d)}`}
          accentClassName="from-rose-500 to-pink-500"
        />
        <KpiCard
          title="Shares de partidos (30d)"
          value={formatInt(stats.sharing.match_shares_30d)}
          subtitle="Evento share registrado en app"
          accentClassName="from-slate-700 to-slate-500"
        />
        <KpiCard
          title="Anchoring club_id (30d)"
          value={formatPercent(anchoringStats.anchoring_rate_last_30d)}
          subtitle={`${formatInt(anchoringStats.matches_anchored_last_30d)} de ${formatInt(
            anchoringStats.matches_total_last_30d
          )} partidos`}
          accentClassName="from-purple-600 to-indigo-500"
        />
      </section>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between gap-2">
            <span>Adopcion de anclaje de clubes</span>
            <span className="text-xs font-semibold text-gray-500">Ultimos 30 dias</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          <p>
            Tasa de anclaje actual:{" "}
            <span className="font-black text-gray-900">{formatPercent(anchoringStats.anchoring_rate_last_30d)}</span>
          </p>
          <p>
            Ciudad con mayor deuda de anclaje:{" "}
            <span className="font-black text-gray-900">
              {anchoringStats.top_unanchored_city?.city || "Sin datos"}
              {anchoringStats.top_unanchored_city?.region_code
                ? ` (${anchoringStats.top_unanchored_city.region_code})`
                : ""}
            </span>
          </p>
          <p>
            Partidos sin club en esa ciudad:{" "}
            <span className="font-black text-gray-900">
              {anchoringStats.top_unanchored_city?.unanchored_matches || 0}
            </span>
          </p>
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GrowthCard
          title="Crecimiento de partidos (30d vs prev. 30d)"
          badge={matchesGrowth}
          metricText={`${formatInt(stats.matches.with_result_30d)} partidos con resultado en 30d`}
          hint="Usa partidos con resultado como senal de uso real del producto."
          toneClassName={trendTone(stats.growth.matches_30d_vs_prev_30d_pct)}
        />
        <GrowthCard
          title="Crecimiento de players activos"
          badge={playersGrowth}
          metricText={`${formatInt(stats.users.active_players_30d)} players participaron en partidos con resultado`}
          hint="Mide amplitud de uso, no solo volumen de partidos."
          toneClassName={trendTone(stats.growth.active_players_30d_vs_prev_30d_pct)}
        />
        <GrowthCard
          title="Crecimiento de clubes activos"
          badge={clubsGrowth}
          metricText={`${formatInt(stats.clubs.active_30d)} clubes claimed con actividad en 30d`}
          hint="Sirve para detectar concentracion de uso en pocos clubes."
          toneClassName={trendTone(stats.growth.active_clubs_30d_vs_prev_30d_pct)}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between gap-2">
              <span>Salud operativa</span>
              <span className="text-xs font-semibold text-gray-500">Monitoreo de friccion</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-800">
            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3">
              <div>
                <p className="font-semibold text-gray-900">Claims pendientes</p>
                <p className="text-xs text-gray-500">Backlog de validacion manual</p>
              </div>
              <span className="text-lg font-black">{formatInt(stats.clubs.pending_claims)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3">
              <div>
                <p className="font-semibold text-gray-900">Mediana resolucion claims (30d)</p>
                <p className="text-xs text-gray-500">SLA operativo de revision admin</p>
              </div>
              <span className="text-lg font-black">{formatHours(stats.clubs.claim_resolution_median_hours_30d)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3">
              <div>
                <p className="font-semibold text-gray-900">Partidos creados vs con resultado (30d)</p>
                <p className="text-xs text-gray-500">Calidad del cierre del flujo de partido</p>
              </div>
              <span className="text-lg font-black">
                {formatInt(stats.matches.created_30d)} / {formatInt(stats.matches.with_result_30d)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3">
              <div>
                <p className="font-semibold text-gray-900">Usuarios nuevos (7d)</p>
                <p className="text-xs text-gray-500">Pulso reciente de adquisicion</p>
              </div>
              <span className="text-lg font-black">{formatInt(stats.users.new_7d)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between gap-2">
              <span>Insights para orientar roadmap</span>
              <span className="text-xs font-semibold text-gray-500">Reglas automaticas</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.map((insight, index) => (
              <InsightCard
                key={`${index}-${insight.title}`}
                title={insight.title}
                detail={insight.detail}
                level={insight.level}
              />
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

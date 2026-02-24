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
      title: "Señal de crecimiento organico",
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
    <div className={`rounded-xl border p-4 ${styles}`}>
      <p className="text-sm font-black text-gray-900">{title}</p>
      <p className="mt-1 text-sm text-gray-700">{detail}</p>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-gray-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-black text-gray-900">{value}</div>
        {subtitle ? <p className="mt-1 text-xs text-gray-500">{subtitle}</p> : null}
      </CardContent>
    </Card>
  );
}

export default async function AdminDashboardPage() {
  const service = new AdminService();
  const stats = await service.getOverviewStats();
  const insights = buildInsights(stats);

  const matchesGrowth = growthBadge(stats.growth.matches_30d_vs_prev_30d_pct);
  const playersGrowth = growthBadge(stats.growth.active_players_30d_vs_prev_30d_pct);
  const clubsGrowth = growthBadge(stats.growth.active_clubs_30d_vs_prev_30d_pct);

  const generatedAt = stats.window.generated_at
    ? new Date(stats.window.generated_at).toLocaleString("es-AR")
    : "N/D";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Admin</h1>
          <p className="text-gray-600">
            Vista estrategica para producto y operacion (ventana principal: ultimos 30 dias).
          </p>
        </div>
        <p className="text-xs text-gray-500">Actualizado: {generatedAt}</p>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Usuarios nuevos (30d)"
          value={formatInt(stats.users.new_30d)}
          subtitle={`${formatInt(stats.users.new_7d)} en 7d`}
        />
        <KpiCard
          title="Onboarding completion (30d)"
          value={formatPercent(stats.users.onboarding_completion_rate_30d)}
          subtitle={`${formatInt(stats.users.onboarding_completed_30d)} completos / ${formatInt(stats.users.player_profiles_created_30d)} perfiles`}
        />
        <KpiCard
          title="Partidos con resultado (30d)"
          value={formatInt(stats.matches.with_result_30d)}
          subtitle={`${formatInt(stats.matches.with_result_7d)} en 7d`}
        />
        <KpiCard
          title="Clubes activos claimed (30d)"
          value={formatInt(stats.clubs.active_30d)}
          subtitle={`${formatInt(stats.clubs.claimed_total)} clubes claimed totales`}
        />
        <KpiCard
          title="Players activos (30d)"
          value={formatInt(stats.users.active_players_30d)}
          subtitle="Participacion en partidos con resultado"
        />
        <KpiCard
          title="Completion resultados (30d)"
          value={formatPercent(stats.matches.result_completion_rate_30d)}
          subtitle={`${formatInt(stats.matches.with_result_30d)} con resultado / ${formatInt(stats.matches.created_30d)} creados`}
        />
        <KpiCard
          title="Claims pendientes"
          value={formatInt(stats.clubs.pending_claims)}
          subtitle={`Mediana resolucion 30d: ${formatHours(stats.clubs.claim_resolution_median_hours_30d)}`}
        />
        <KpiCard
          title="Shares de partidos (30d)"
          value={formatInt(stats.sharing.match_shares_30d)}
          subtitle="Evento share registrado en app"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Crecimiento de partidos (30d vs prev. 30d)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${matchesGrowth.className}`}>
              {matchesGrowth.label}
            </div>
            <p className="text-sm text-gray-700">
              {formatInt(stats.matches.with_result_30d)} partidos con resultado en 30d.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Crecimiento de players activos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${playersGrowth.className}`}>
              {playersGrowth.label}
            </div>
            <p className="text-sm text-gray-700">
              {formatInt(stats.users.active_players_30d)} players participaron en partidos con resultado.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Crecimiento de clubes activos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${clubsGrowth.className}`}>
              {clubsGrowth.label}
            </div>
            <p className="text-sm text-gray-700">
              {formatInt(stats.clubs.active_30d)} clubes claimed con actividad en 30d.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Salud operativa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-800">
            <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3">
              <span>Claims pendientes</span>
              <span className="font-black">{formatInt(stats.clubs.pending_claims)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3">
              <span>Mediana resolucion claims (30d)</span>
              <span className="font-black">{formatHours(stats.clubs.claim_resolution_median_hours_30d)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3">
              <span>Partidos creados vs con resultado (30d)</span>
              <span className="font-black">
                {formatInt(stats.matches.created_30d)} / {formatInt(stats.matches.with_result_30d)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3">
              <span>Usuarios nuevos (7d)</span>
              <span className="font-black">{formatInt(stats.users.new_7d)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Insights para orientar roadmap</CardTitle>
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

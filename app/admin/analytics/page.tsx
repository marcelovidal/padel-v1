import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminAnalyticsService } from "@/services/admin.analytics.service";
import { PlayerActivationChart } from "@/components/admin/analytics/PlayerActivationChart";
import { WeeklyMultiLineChart, MonthlyBarChart } from "@/components/admin/analytics/WeeklySeriesChart";
import { FeatureAdoptionChart } from "@/components/admin/analytics/FeatureAdoptionChart";
import { ClubMetricsTable } from "@/components/admin/analytics/ClubMetricsTable";
import type { AnalyticsKpis } from "@/repositories/admin.analytics.repository";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return new Intl.NumberFormat("es-AR").format(v ?? 0);
}
function fmtPct(v: number) {
  return `${(v ?? 0).toFixed(1)}%`;
}

function trendPct(current: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((current - prev) / prev) * 100;
}

function TrendBadge({ current, prev }: { current: number; prev: number }) {
  const pct = trendPct(current, prev);
  if (pct == null) return <span className="text-xs text-gray-400">sin base</span>;
  const up = pct > 0.5;
  const dn = pct < -0.5;
  const label = (up ? "+" : "") + pct.toFixed(1) + "%";
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${
        up ? "bg-green-50 text-green-700" : dn ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
      }`}
    >
      {up ? "↑" : dn ? "↓" : "→"} {label}
    </span>
  );
}

// ── KPI Bar ───────────────────────────────────────────────────────────────────

function KpiBar({ kpis }: { kpis: AnalyticsKpis }) {
  const guestConvPct =
    kpis.guest_total > 0 ? (kpis.guest_converted / kpis.guest_total) * 100 : 0;

  const items = [
    {
      label: "Players activos (30d)",
      value: fmt(kpis.active_players_30d),
      trend: <TrendBadge current={kpis.active_players_30d} prev={kpis.active_players_30d_prev} />,
    },
    {
      label: "Partidos este mes",
      value: fmt(kpis.matches_month),
      trend: <TrendBadge current={kpis.matches_month} prev={kpis.matches_month_prev} />,
    },
    {
      label: "Reservas este mes",
      value: fmt(kpis.bookings_month),
      trend: <TrendBadge current={kpis.bookings_month} prev={kpis.bookings_month_prev} />,
    },
    {
      label: "Torneos activos",
      value: fmt(kpis.active_tournaments),
      trend: null,
    },
    {
      label: "Ligas activas",
      value: fmt(kpis.active_leagues),
      trend: null,
    },
    {
      label: "Share cards (30d)",
      value: fmt(kpis.share_cards_30d),
      trend: <TrendBadge current={kpis.share_cards_30d} prev={kpis.share_cards_30d_prev} />,
    },
    {
      label: "Conv. invitados",
      value: fmtPct(guestConvPct),
      trend: <span className="text-xs text-gray-400">{fmt(kpis.guest_converted)}/{fmt(kpis.guest_total)}</span>,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{item.label}</p>
          <p className="mt-1 text-xl font-black text-gray-900">{item.value}</p>
          {item.trend && <div className="mt-1">{item.trend}</div>}
        </div>
      ))}
    </div>
  );
}

// ── Tab Navigation ────────────────────────────────────────────────────────────

const TABS = [
  { id: "crecimiento",  label: "Crecimiento" },
  { id: "activacion",   label: "Activación" },
  { id: "funnel",       label: "Funnel" },
  { id: "retencion",    label: "Retención" },
  { id: "adopcion",     label: "Adopción" },
  { id: "clubes",       label: "Clubes" },
] as const;

type TabId = typeof TABS[number]["id"];

function TabNav({ current, days }: { current: TabId; days: number }) {
  return (
    <div className="border-b border-gray-200">
      <div className="flex gap-0 overflow-x-auto">
        {TABS.map((tab) => {
          const active = current === tab.id;
          const params = new URLSearchParams({ tab: tab.id, days: String(days) });
          return (
            <Link
              key={tab.id}
              href={`/admin/analytics?${params}`}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                active
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── Period Selector ───────────────────────────────────────────────────────────

function PeriodSelector({ current, tab }: { current: number; tab: TabId }) {
  const options = [30, 60, 90] as const;
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-gray-500 mr-1">Período:</span>
      {options.map((d) => (
        <Link
          key={d}
          href={`/admin/analytics?tab=${tab}&days=${d}`}
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
            current === d
              ? "bg-blue-600 border-blue-600 text-white"
              : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
          }`}
        >
          {d}d
        </Link>
      ))}
    </div>
  );
}

// ── Section 1: Crecimiento ────────────────────────────────────────────────────

async function GrowthSection() {
  const service = new AdminAnalyticsService();
  const [data, geo] = await Promise.all([
    service.getGrowthStats().catch(() => null),
    service.getGeoHealth().catch(() => null),
  ]);
  if (!data) return <SectionError />;

  const convPct = data.total_guests > 0
    ? ((data.guests_converted / data.total_guests) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total jugadores" value={fmt(data.total_players)} sub={`${fmt(data.total_registered)} registrados / ${fmt(data.total_guests)} invitados`} accent="from-blue-600 to-sky-500" />
        <StatCard label="Nuevos esta semana" value={fmt(data.new_players_7d)} sub={`${fmt(data.new_players_30d)} en 30 días`} accent="from-emerald-600 to-lime-500" />
        <StatCard label="Total clubes" value={fmt(data.total_clubs)} sub={`${fmt(data.claimed_clubs)} reclamados / ${fmt(data.unclaimed_clubs)} sin reclamar`} accent="from-cyan-600 to-teal-500" />
        <StatCard label="Conv. invitados→registrados" value={`${convPct}%`} sub={`${fmt(data.guests_converted)} de ${fmt(data.total_guests)} invitados vincularon cuenta`} accent="from-violet-600 to-fuchsia-500" />
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Jugadores por provincia</CardTitle>
        </CardHeader>
        <CardContent>
          {data.players_by_province.length === 0 ? (
            <p className="text-sm text-gray-400">Sin datos de ubicación</p>
          ) : (
            <div className="space-y-2">
              {data.players_by_province.map((row) => {
                const maxCount = data.players_by_province[0]?.count ?? 1;
                const pct = Math.round((row.count / maxCount) * 100);
                return (
                  <div key={row.province} className="flex items-center gap-3">
                    <span className="w-40 truncate text-xs font-semibold text-gray-700">{row.province}</span>
                    <div className="flex-1 rounded-full bg-gray-100 h-2">
                      <div className="h-2 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-10 text-right text-xs font-bold text-gray-900">{fmt(row.count)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {geo && (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              Salud de datos geográficos
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${geo.resolution_pct >= 90 ? "bg-green-50 text-green-700" : geo.resolution_pct >= 70 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                {geo.resolution_pct.toFixed(1)}% resueltos
              </span>
            </CardTitle>
            <p className="text-xs text-gray-500">Jugadores con onboarding completo — resolución automática de ciudad al login</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-green-100 bg-green-50 p-3 text-center">
                <p className="text-2xl font-black text-green-700">{fmt(geo.with_city_id)}</p>
                <p className="text-xs font-semibold text-green-600 mt-0.5">Ciudad verificada</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-center">
                <p className="text-2xl font-black text-amber-700">{fmt(geo.pending_resolution)}</p>
                <p className="text-xs font-semibold text-amber-600 mt-0.5">Pendiente resolución</p>
                <p className="text-[10px] text-amber-500">tienen texto de ciudad</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
                <p className="text-2xl font-black text-gray-500">{fmt(geo.no_geo_data)}</p>
                <p className="text-xs font-semibold text-gray-500 mt-0.5">Sin datos geo</p>
              </div>
            </div>

            {geo.unresolved_sample.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Últimos registros sin city_id</p>
                <div className="space-y-1">
                  {geo.unresolved_sample.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-1.5 text-xs">
                      <span className="font-semibold text-gray-700 w-28 truncate">{p.display_name}</span>
                      <span className="text-gray-500 flex-1">{p.city}{p.region_name ? `, ${p.region_name}` : ""}</span>
                      <span className="text-gray-400 shrink-0">{new Date(p.registered_at).toLocaleDateString("es-AR")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Section 2: Activación (chart) ─────────────────────────────────────────────

async function ActivationSection({ days }: { days: number }) {
  const service = new AdminAnalyticsService();
  const data = await service.getActivationSeries(days).catch(() => null);

  return (
    <div className="space-y-4">
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Serie de activación de jugadores</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Azul = registrados · Amarillo = invitados · Verde = onboarding completado
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data == null ? (
            <SectionError />
          ) : (
            <PlayerActivationChart data={data} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Section 3: Funnel ─────────────────────────────────────────────────────────

async function FunnelSection() {
  const service = new AdminAnalyticsService();
  const data = await service.getActivationFunnel().catch(() => null);
  if (!data) return <SectionError />;

  const steps = [
    { label: "Registrados (base)", count: data.total_registered, pct: 100, color: "bg-blue-500" },
    { label: "Completaron onboarding", count: data.onboarding_count, pct: data.onboarding_pct, color: "bg-emerald-500" },
    { label: "Jugaron ≥1 partido", count: data.played_match_count, pct: data.played_match_pct, color: "bg-indigo-500" },
    { label: "Completaron ≥1 autoevaluación", count: data.assessment_count, pct: data.assessment_pct, color: "bg-violet-500" },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Funnel de activación</CardTitle>
          <p className="text-xs text-gray-500">Sobre el total de jugadores con cuenta vinculada</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {steps.map((step) => (
            <div key={step.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-700">{step.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{fmt(step.count)}</span>
                  <span className="text-xs font-bold text-gray-500">{fmtPct(step.pct)}</span>
                </div>
              </div>
              <div className="h-3 w-full rounded-full bg-gray-100">
                <div
                  className={`h-3 rounded-full ${step.color} transition-all`}
                  style={{ width: `${Math.min(100, step.pct)}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-red-600">Jugadores inactivos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-black text-red-600">{fmtPct(data.never_active_pct)}</div>
            <div>
              <p className="text-sm font-semibold text-gray-700">{fmt(data.never_active_count)} jugadores registrados sin ninguna actividad</p>
              <p className="text-xs text-gray-500">Sin partidos ni autoevaluaciones</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Section 4: Retención ──────────────────────────────────────────────────────

async function RetentionSection() {
  const service = new AdminAnalyticsService();
  const data = await service.getRetention().catch(() => null);
  if (!data) return <SectionError />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Activos últimos 7d"  value={fmt(data.active_7d)}  sub="jugadores con ≥1 partido" accent="from-blue-600 to-sky-500" />
        <StatCard label="Activos últimos 30d" value={fmt(data.active_30d)} sub="jugadores con ≥1 partido" accent="from-indigo-600 to-blue-500" />
        <StatCard label="Activos últimos 90d" value={fmt(data.active_90d)} sub="jugadores con ≥1 partido" accent="from-violet-600 to-fuchsia-500" />
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Actividad semanal — últimas 8 semanas</CardTitle>
        </CardHeader>
        <CardContent>
          <WeeklyMultiLineChart
            datasets={[
              { label: "Partidos",       data: data.matches_by_week,     color: "#2563eb" },
              { label: "Evaluaciones",   data: data.assessments_by_week, color: "#16a34a" },
              { label: "Reservas",       data: data.bookings_by_week,    color: "#d97706" },
            ]}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Torneos creados por mes</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyBarChart
              datasets={[{ label: "Torneos", data: data.tournaments_by_month, color: "#7c3aed" }]}
            />
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ligas creadas por mes</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyBarChart
              datasets={[{ label: "Ligas", data: data.leagues_by_month, color: "#0891b2" }]}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Section 5: Adopción ───────────────────────────────────────────────────────

async function AdopcionSection() {
  const service = new AdminAnalyticsService();
  const data = await service.getFeatureAdoption().catch(() => null);
  if (!data) return <SectionError />;

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Adopción de features</CardTitle>
        <p className="text-xs text-gray-500">% de jugadores activos (30d) que usaron cada feature</p>
      </CardHeader>
      <CardContent>
        <FeatureAdoptionChart
          features={data.features}
          baseActivePlayers={data.base_active_players}
        />
      </CardContent>
    </Card>
  );
}

// ── Section 6: Clubes ─────────────────────────────────────────────────────────

async function ClubesSection() {
  const service = new AdminAnalyticsService();
  const data = await service.getClubMetrics().catch(() => null);
  if (!data) return <SectionError />;

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Métricas por club</CardTitle>
        <p className="text-xs text-gray-500">Jugadores activos = últimos 30d · Partidos/sem = promedio 8 semanas</p>
      </CardHeader>
      <CardContent>
        <ClubMetricsTable rows={data} />
      </CardContent>
    </Card>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <Card className="overflow-hidden border-gray-200 shadow-sm">
      <div className={`h-1 w-full bg-gradient-to-r ${accent}`} />
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-3xl font-black tracking-tight text-gray-900">{value}</div>
        {sub && <p className="mt-1 text-xs text-gray-500 leading-relaxed">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function SectionError() {
  return (
    <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center text-sm text-red-600">
      Error al cargar los datos. Verificar que la migración SQL esté aplicada en Supabase.
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; days?: string }>;
}) {
  const params  = await searchParams;
  const rawTab  = params.tab ?? "crecimiento";
  const tab     = TABS.find((t) => t.id === rawTab)?.id ?? "crecimiento";
  const days    = Math.max(7, Math.min(90, parseInt(params.days ?? "30", 10) || 30));

  const service = new AdminAnalyticsService();
  const kpis    = await service.getKpis().catch(
    () => null as unknown as AnalyticsKpis
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-white via-blue-50/60 to-cyan-50/60 p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
          Admin Analytics
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-gray-900">Dashboard de métricas</h1>
        <p className="mt-1 text-gray-600">Crecimiento, activación, retención y adopción de features.</p>
      </div>

      {/* KPI Bar */}
      {kpis ? (
        <KpiBar kpis={kpis} />
      ) : (
        <SectionError />
      )}

      {/* Tab Nav */}
      <TabNav current={tab} days={days} />

      {/* Period selector for activation chart */}
      {tab === "activacion" && (
        <div className="flex justify-end">
          <PeriodSelector current={days} tab={tab} />
        </div>
      )}

      {/* Tab content */}
      {tab === "crecimiento" && <GrowthSection />}
      {tab === "activacion"  && <ActivationSection days={days} />}
      {tab === "funnel"      && <FunnelSection />}
      {tab === "retencion"   && <RetentionSection />}
      {tab === "adopcion"    && <AdopcionSection />}
      {tab === "clubes"      && <ClubesSection />}
    </div>
  );
}

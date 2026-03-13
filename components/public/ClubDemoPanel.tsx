"use client";

import { useState } from "react";
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock3,
  LayoutDashboard,
  ListOrdered,
  Settings,
  Trophy,
  Users,
} from "lucide-react";

// ─── Static demo data ────────────────────────────────────────────────────────

const CLUB_NAME = "Tu Club";

const DEMO_STATS = [
  { label: "Jugadores rankeados", value: "18", tone: "blue" },
  { label: "Partidos este mes", value: "24", tone: "emerald" },
  { label: "Reservas esta semana", value: "7", tone: "violet" },
  { label: "Eventos activos", value: "2", tone: "amber" },
] as const;

const DEMO_EVENTS = [
  {
    id: "e1",
    type: "league" as const,
    name: "Liga Verano",
    season: "2026",
    status: "active" as const,
    startDate: "15/03",
    endDate: "30/06",
    pending: 3,
    confirmed: 8,
  },
  {
    id: "e2",
    type: "tournament" as const,
    name: "Torneo Apertura",
    season: "Mar 2026",
    status: "active" as const,
    startDate: "22/03",
    endDate: "05/04",
    pending: 0,
    confirmed: 12,
  },
  {
    id: "e3",
    type: "league" as const,
    name: "Liga Invierno",
    season: "2025",
    status: "finished" as const,
    startDate: "01/06",
    endDate: "30/09",
    pending: 0,
    confirmed: 16,
  },
];

const DEMO_RANKING = [
  { rank: 1, name: "Gonzalez, M.", category: "4ª", pts: 320, mp: 18, wl: "14/4" },
  { rank: 2, name: "Perez, A.", category: "4ª", pts: 298, mp: 16, wl: "12/4" },
  { rank: 3, name: "Vidal, C.", category: "5ª", pts: 275, mp: 20, wl: "13/7" },
  { rank: 4, name: "Martinez, R.", category: "4ª", pts: 241, mp: 14, wl: "10/4" },
  { rank: 5, name: "Torres, L.", category: "5ª", pts: 220, mp: 17, wl: "10/7" },
];

const DEMO_BOOKINGS = [
  { day: "Lun 10/03", time: "19:00", court: "Cancha 1", player: "Gonzalez / Perez", status: "confirmed" as const },
  { day: "Mié 12/03", time: "08:00", court: "Cancha 2", player: "Vidal / Torres", status: "confirmed" as const },
  { day: "Vie 14/03", time: "20:00", court: "Cancha 1", player: "Martinez / Ruiz", status: "requested" as const },
];

const DEMO_WEEKDAY = [
  { label: "Lun", pct: 45 },
  { label: "Mar", pct: 30 },
  { label: "Mié", pct: 60 },
  { label: "Jue", pct: 50 },
  { label: "Vie", pct: 100 },
  { label: "Sáb", pct: 85 },
  { label: "Dom", pct: 40 },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

type Tab = "dashboard" | "eventos" | "ranking" | "reservas";

function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-black uppercase tracking-wide transition-colors ${
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </button>
  );
}

function StatBox({ label, value, tone }: (typeof DEMO_STATS)[number]) {
  const tones = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    violet: "border-violet-100 bg-violet-50 text-violet-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
  };
  return (
    <div className={`rounded-2xl border p-3 ${tones[tone]}`}>
      <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function EventCard({ ev }: { ev: (typeof DEMO_EVENTS)[number] }) {
  const isLeague = ev.type === "league";
  const badgeClass = isLeague ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700";
  const hasPending = ev.pending > 0;

  const stateClass = hasPending
    ? "border-amber-200 bg-amber-50/40"
    : ev.status === "finished"
      ? "border-slate-200 bg-slate-50"
      : "border-emerald-200 bg-emerald-50/30";

  return (
    <div className={`rounded-2xl border p-3 ${stateClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${badgeClass}`}>
            {isLeague ? "Liga" : "Torneo"}
          </span>
          <p className="mt-1.5 truncate text-sm font-black text-slate-900">{ev.name}</p>
          <p className="text-[10px] text-slate-500">{ev.season}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
            ev.status === "active"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {ev.status === "active" ? "Activo" : "Finalizado"}
        </span>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-1.5">
        <div className="rounded-xl border border-white/70 bg-white/80 px-2 py-1.5">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Pendientes</p>
          <p className={`mt-0.5 text-base font-black ${hasPending ? "text-amber-600" : "text-slate-900"}`}>
            {ev.pending}
          </p>
        </div>
        <div className="rounded-xl border border-white/70 bg-white/80 px-2 py-1.5">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Confirmadas</p>
          <p className="mt-0.5 text-base font-black text-slate-900">{ev.confirmed}</p>
        </div>
      </div>
      {hasPending && (
        <p className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-amber-700">
          <Clock3 className="h-3 w-3" /> {ev.pending} inscripcion{ev.pending > 1 ? "es" : ""} pendiente{ev.pending > 1 ? "s" : ""} por revisar
        </p>
      )}
      {!hasPending && ev.status === "active" && (
        <p className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
          <CheckCircle2 className="h-3 w-3" /> Participantes confirmados
        </p>
      )}
    </div>
  );
}

function TabDashboard() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {DEMO_STATS.map((s) => (
          <StatBox key={s.label} {...s} />
        ))}
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
          Actividad semanal (últimos 30 días)
        </p>
        <div className="flex items-end gap-1.5 h-16">
          {DEMO_WEEKDAY.map((d) => (
            <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-t-md bg-blue-600/90" style={{ height: `${d.pct}%` }} />
              <span className="text-[9px] font-bold text-slate-400">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Top jugadores</p>
          <span className="text-[9px] text-slate-400">Ranking del club</span>
        </div>
        <div className="space-y-1.5">
          {DEMO_RANKING.slice(0, 3).map((r) => (
            <div key={r.rank} className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2">
              <span className="w-4 text-xs font-black text-blue-600">#{r.rank}</span>
              <span className="flex-1 truncate text-xs font-semibold text-slate-800">{r.name}</span>
              <span className="text-[10px] text-slate-500">{r.category}</span>
              <span className="text-xs font-black text-blue-700">{r.pts} pts</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabEventos() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          {DEMO_EVENTS.length} eventos en seguimiento
        </p>
        <button className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-600">
          + Nueva liga/torneo
        </button>
      </div>
      <div className="space-y-2">
        {DEMO_EVENTS.map((ev) => (
          <EventCard key={ev.id} ev={ev} />
        ))}
      </div>
    </div>
  );
}

function TabRanking() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Jugadores</p>
          <p className="mt-1 text-2xl font-black text-slate-900">18</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Partidos</p>
          <p className="mt-1 text-2xl font-black text-slate-900">72</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Actualizado</p>
          <p className="mt-1 text-sm font-black text-slate-900">08/03</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[9px] uppercase tracking-wide text-slate-400">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Jugador</th>
              <th className="px-3 py-2">Cat.</th>
              <th className="px-3 py-2 text-blue-700">Pts</th>
              <th className="px-3 py-2">W/L</th>
              <th className="px-3 py-2">PJ</th>
            </tr>
          </thead>
          <tbody>
            {DEMO_RANKING.map((r) => (
              <tr key={r.rank} className="border-b border-slate-50">
                <td className="px-3 py-2 font-black text-slate-700">{r.rank}</td>
                <td className="px-3 py-2 font-semibold text-slate-900">{r.name}</td>
                <td className="px-3 py-2 text-slate-600">{r.category}</td>
                <td className="px-3 py-2 font-black text-blue-700">{r.pts}</td>
                <td className="px-3 py-2 text-slate-600">{r.wl}</td>
                <td className="px-3 py-2 text-slate-600">{r.mp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabReservas() {
  const statusCls = {
    confirmed: "bg-emerald-100 text-emerald-800",
    requested: "bg-amber-100 text-amber-800",
  };
  const statusLabel = { confirmed: "Confirmada", requested: "Pendiente" };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Reservas esta semana</p>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-600">
          3 / 7 turnos
        </span>
      </div>
      <div className="space-y-2">
        {DEMO_BOOKINGS.map((b, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black text-slate-900">
                {b.day} · {b.time}
              </p>
              <p className="text-[10px] text-slate-500">
                {b.court} · {b.player}
              </p>
            </div>
            <span className={`w-fit rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${statusCls[b.status]}`}>
              {statusLabel[b.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function ClubDemoPanel() {
  const [tab, setTab] = useState<Tab>("dashboard");

  const navItems: { id: Tab; icon: React.ElementType; label: string }[] = [
    { id: "dashboard", icon: LayoutDashboard, label: "Resumen" },
    { id: "eventos", icon: Trophy, label: "Eventos" },
    { id: "ranking", icon: ListOrdered, label: "Ranking" },
    { id: "reservas", icon: Calendar, label: "Reservas" },
  ];

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 shadow-[0_20px_60px_rgba(2,6,23,0.10)]">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-rose-300" />
          <div className="h-3 w-3 rounded-full bg-amber-300" />
          <div className="h-3 w-3 rounded-full bg-emerald-300" />
        </div>
        <div className="mx-auto flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1 text-[11px] text-slate-500">
          <span className="text-slate-400">🔒</span>
          pasla.com.ar/club/dashboard
        </div>
        <div className="w-[52px]" />
      </div>

      <div className="flex min-h-[420px]">
        {/* Sidebar */}
        <aside className="flex w-[120px] shrink-0 flex-col gap-1 border-r border-slate-200 bg-white p-3 sm:w-[140px]">
          <div className="mb-3 px-1">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Club</p>
            <p className="mt-0.5 truncate text-sm font-black text-slate-900">{CLUB_NAME}</p>
          </div>
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={tab === item.id}
              onClick={() => setTab(item.id)}
            />
          ))}
          <div className="mt-auto pt-3">
            <NavItem icon={Users} label="Jugadores" active={false} onClick={() => {}} />
            <NavItem icon={Settings} label="Config." active={false} onClick={() => {}} />
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 overflow-auto p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">
                  {tab === "dashboard" && "Resumen del club"}
                  {tab === "eventos" && "Ligas y torneos"}
                  {tab === "ranking" && "Ranking interno"}
                  {tab === "reservas" && "Reservas de canchas"}
                </h2>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-blue-600">
                  Demo
                </span>
              </div>
              <p className="text-[10px] text-slate-400">{CLUB_NAME}</p>
            </div>
            <button className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white">
              {tab === "eventos" ? "+ Crear" : "Ver todo"}
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          {tab === "dashboard" && <TabDashboard />}
          {tab === "eventos" && <TabEventos />}
          {tab === "ranking" && <TabRanking />}
          {tab === "reservas" && <TabReservas />}
        </main>
      </div>

      {/* Footer label */}
      <div className="border-t border-slate-200 bg-white px-4 py-2 text-center">
        <p className="text-[10px] text-slate-400">
          Vista simulada del panel de administracion · Los datos son de ejemplo
        </p>
      </div>
    </div>
  );
}

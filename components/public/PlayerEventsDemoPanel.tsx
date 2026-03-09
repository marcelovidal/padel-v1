"use client";

import { useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  ListOrdered,
  Search,
  Trophy,
  User,
  X,
  XCircle,
} from "lucide-react";

// ─── Static demo data ────────────────────────────────────────────────────────

const PLAYER_NAME = "Axel Perez";
const PLAYER_CITY = "Cipolletti, RN";

const DEMO_MATCHES = [
  {
    id: "m1",
    date: "06/03/2026",
    result: "won" as const,
    score: "6-3 / 7-5",
    partner: "Gonzalez, M.",
    rivals: "Torres, L. / Vidal, C.",
    event: "Liga Verano",
  },
  {
    id: "m2",
    date: "02/03/2026",
    result: "lost" as const,
    score: "4-6 / 5-7",
    partner: "Gonzalez, M.",
    rivals: "Ruiz, F. / Martinez, R.",
    event: "Liga Verano",
  },
  {
    id: "m3",
    date: "22/02/2026",
    result: "won" as const,
    score: "6-1 / 6-4",
    partner: "Torres, L.",
    rivals: "Sánchez, P. / Díaz, E.",
    event: "Torneo Apertura",
  },
  {
    id: "m4",
    date: "18/02/2026",
    result: "won" as const,
    score: "7-6 / 6-3",
    partner: "Torres, L.",
    rivals: "Rojas, N. / Vera, G.",
    event: "Torneo Apertura",
  },
];

const DEMO_OPEN_EVENTS = [
  {
    id: "t1",
    type: "tournament" as const,
    name: "Torneo Apertura",
    season: "Mar 2026",
    club: "Tu Club",
    clubInitials: "TC",
    clubColor: { bg: "bg-blue-100", text: "text-blue-700" },
    start: "22/03/2026",
    end: "05/04/2026",
    description: "Torneo de dobles mixto, categoría 5ª. Inscripción abierta.",
    spots: "4 lugares disponibles",
  },
  {
    id: "l1",
    type: "league" as const,
    name: "Liga Verano",
    season: "2026",
    club: "Club Norpatagonia",
    clubInitials: "CN",
    clubColor: { bg: "bg-purple-100", text: "text-purple-700" },
    start: "15/03/2026",
    end: "30/06/2026",
    description: "Liga de dobles, categoría 4ª y 5ª. Fixture grupal + playoffs.",
    spots: "2 equipos más",
  },
  {
    id: "t2",
    type: "tournament" as const,
    name: "Torneo Invierno",
    season: "Jun 2026",
    club: "Padel Sur",
    clubInitials: "PS",
    clubColor: { bg: "bg-emerald-100", text: "text-emerald-700" },
    start: "07/06/2026",
    end: "22/06/2026",
    description: "Torneo 7ª categoría. Open a todos los niveles.",
    spots: "8 lugares disponibles",
  },
] as const;

const DEMO_TEAMMATES = [
  { id: "p1", name: "Gonzalez, M.", city: "Cipolletti" },
  { id: "p2", name: "Vidal, C.", city: "Neuquén" },
  { id: "p3", name: "Martinez, R.", city: "Cipolletti" },
  { id: "p4", name: "Torres, L.", city: "Roca" },
  { id: "p5", name: "Ruiz, F.", city: "Neuquén" },
];

const DEMO_MY_REGISTRATIONS = [
  {
    id: "r1",
    type: "league" as const,
    name: "Liga Verano",
    season: "2026",
    club: "Club Norpatagonia",
    clubInitials: "CN",
    clubColor: { bg: "bg-purple-100", text: "text-purple-700" },
    start: "15/03/2026",
    end: "30/06/2026",
    status: "confirmed" as const,
    role: "requester" as const,
    partner: "Gonzalez, M.",
  },
  {
    id: "r2",
    type: "tournament" as const,
    name: "Torneo Apertura",
    season: "Mar 2026",
    club: "Tu Club",
    clubInitials: "TC",
    clubColor: { bg: "bg-blue-100", text: "text-blue-700" },
    start: "22/03/2026",
    end: "05/04/2026",
    status: "pending" as const,
    role: "requester" as const,
    partner: "Torres, L.",
  },
  {
    id: "r3",
    type: "tournament" as const,
    name: "Copa Otoño",
    season: "Abr 2026",
    club: "Padel Sur",
    clubInitials: "PS",
    clubColor: { bg: "bg-emerald-100", text: "text-emerald-700" },
    start: "10/04/2026",
    end: "25/04/2026",
    status: "rejected" as const,
    role: "teammate" as const,
    partner: "Ruiz, F.",
  },
];

const DEMO_RANKING = [
  { pos: 1, name: "Torres, L.", pts: 342, mp: 18, wl: "14-4", isMe: false },
  { pos: 2, name: "Axel Perez", pts: 298, mp: 16, wl: "10-6", isMe: true },
  { pos: 3, name: "Gonzalez, M.", pts: 271, mp: 15, wl: "9-6", isMe: false },
  { pos: 4, name: "Ruiz, F.", pts: 245, mp: 17, wl: "8-9", isMe: false },
  { pos: 5, name: "Vidal, C.", pts: 218, mp: 14, wl: "7-7", isMe: false },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

type MainTab = "partidos" | "eventos" | "ranking" | "perfil";
type EventsSubTab = "disponibles" | "mis-inscripciones";

function StatusBadge({ status }: { status: "confirmed" | "pending" | "rejected" }) {
  if (status === "confirmed")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> Confirmada
      </span>
    );
  if (status === "pending")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-700">
        <Clock3 className="h-3 w-3" /> Pendiente
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-red-600">
      <XCircle className="h-3 w-3" /> Rechazada
    </span>
  );
}

function TypeBadge({ type }: { type: "tournament" | "league" }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${
        type === "tournament" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
      }`}
    >
      {type === "tournament" ? "Torneo" : "Liga"}
    </span>
  );
}

function TeammateSelector({
  onSelect,
  selected,
  onClear,
}: {
  onSelect: (name: string) => void;
  selected: string | null;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = DEMO_TEAMMATES.filter((t) =>
    t.name.toLowerCase().includes(query.toLowerCase()),
  );

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
        <div className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-blue-600" />
          <span className="text-xs font-black text-blue-800">{selected}</span>
        </div>
        <button onClick={onClear} className="text-blue-400 hover:text-blue-600">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
        <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <input
          className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400"
          placeholder="Buscar companero..."
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {filtered.slice(0, 4).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                onSelect(t.name);
                setQuery("");
                setOpen(false);
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50"
            >
              <span className="text-xs font-semibold text-slate-800">{t.name}</span>
              <span className="text-[10px] text-slate-400">{t.city}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function OpenEventCard({ ev }: { ev: (typeof DEMO_OPEN_EVENTS)[number] }) {
  const [expanded, setExpanded] = useState(false);
  const [teammate, setTeammate] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    setSubmitted(true);
    setExpanded(false);
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        <div>
          <p className="text-xs font-black text-emerald-800">Solicitud enviada</p>
          <p className="text-[10px] text-emerald-700">
            {ev.name} · {teammate ? `Con ${teammate}` : "Sin companero"}. El club la revisará pronto.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border bg-white shadow-sm transition-all ${
        expanded ? "border-blue-200" : "border-slate-100"
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black ${ev.clubColor.bg} ${ev.clubColor.text}`}
        >
          {ev.clubInitials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black text-slate-900">{ev.name}</p>
            <TypeBadge type={ev.type} />
          </div>
          <p className="text-[11px] text-slate-500">{ev.club} · {ev.season}</p>
          <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
            <Calendar className="h-3 w-3" />
            {ev.start} → {ev.end}
          </div>
          <p className="mt-1 text-[10px] font-semibold text-blue-600">{ev.spots}</p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className={`shrink-0 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-wide transition-colors ${
            expanded
              ? "bg-slate-100 text-slate-600"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <span className="flex items-center gap-1">Inscribirme <ChevronRight className="h-3 w-3" /></span>
          )}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
            Seleccioná tu companero (opcional)
          </p>
          <TeammateSelector
            selected={teammate}
            onSelect={setTeammate}
            onClear={() => setTeammate(null)}
          />
          <p className="mt-1.5 text-[9px] text-slate-400">
            Podés inscribirte sin companero — el club lo completará luego.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleSubmit}
              className="flex-1 rounded-xl bg-blue-600 py-2 text-xs font-black uppercase tracking-wide text-white hover:bg-blue-700"
            >
              Enviar solicitud
            </button>
            <button
              onClick={() => setExpanded(false)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-500 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MyRegistrationCard({
  reg,
}: {
  reg: (typeof DEMO_MY_REGISTRATIONS)[number];
}) {
  const isRejected = reg.status === "rejected";
  const shellClass = isRejected
    ? "border-slate-100 bg-slate-50 opacity-60"
    : reg.status === "confirmed"
      ? "border-emerald-200 bg-emerald-50/30"
      : "border-amber-200 bg-amber-50/20";

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${shellClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black ${reg.clubColor.bg} ${reg.clubColor.text}`}
          >
            {reg.clubInitials}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-black text-slate-900">{reg.name}</p>
              <TypeBadge type={reg.type} />
            </div>
            <p className="text-[11px] text-slate-500">{reg.club} · {reg.season}</p>
            <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
              <Calendar className="h-3 w-3" />
              {reg.start} → {reg.end}
            </div>
            <p className="mt-1.5 text-[10px] text-slate-600">
              {reg.role === "requester" ? "Solicitud enviada por vos" : "Te inscribieron como companero"}
              {reg.partner ? ` · Con ${reg.partner}` : ""}
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <StatusBadge status={reg.status} />
        </div>
      </div>
    </div>
  );
}

// ─── Tab panels ──────────────────────────────────────────────────────────────

function PartidosTab() {
  return (
    <div className="space-y-3">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Partidos", value: "128", tone: "blue" },
          { label: "Win rate", value: "62%", tone: "emerald" },
          { label: "Racha actual", value: "+4", tone: "violet" },
        ].map(({ label, value, tone }) => (
          <div
            key={label}
            className={`rounded-2xl border p-3 text-center ${
              tone === "blue"
                ? "border-blue-100 bg-blue-50"
                : tone === "emerald"
                  ? "border-emerald-100 bg-emerald-50"
                  : "border-violet-100 bg-violet-50"
            }`}
          >
            <p
              className={`text-lg font-black ${
                tone === "blue"
                  ? "text-blue-700"
                  : tone === "emerald"
                    ? "text-emerald-700"
                    : "text-violet-700"
              }`}
            >
              {value}
            </p>
            <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent matches */}
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Últimos partidos</p>
      <div className="space-y-2">
        {DEMO_MATCHES.map((m) => (
          <div
            key={m.id}
            className={`flex items-center gap-3 rounded-2xl border p-3 ${
              m.result === "won"
                ? "border-emerald-100 bg-emerald-50/40"
                : "border-rose-100 bg-rose-50/30"
            }`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[10px] font-black ${
                m.result === "won"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-rose-100 text-rose-600"
              }`}
            >
              {m.result === "won" ? "G" : "P"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-slate-800">{m.score}</p>
                <p className="text-[9px] text-slate-400">{m.date}</p>
              </div>
              <p className="truncate text-[10px] text-slate-500">Con {m.partner} · vs {m.rivals}</p>
              <p className="text-[9px] text-slate-400">{m.event}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventosTab() {
  const [subTab, setSubTab] = useState<EventsSubTab>("disponibles");

  return (
    <div className="space-y-3">
      {/* Sub-tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-100 bg-white p-1 shadow-sm">
        <button
          onClick={() => setSubTab("disponibles")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-black uppercase tracking-wide transition-colors ${
            subTab === "disponibles"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Trophy className="h-3 w-3" />
          Disponibles
          <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${subTab === "disponibles" ? "bg-blue-500" : "bg-slate-100 text-slate-500"}`}>
            {DEMO_OPEN_EVENTS.length}
          </span>
        </button>
        <button
          onClick={() => setSubTab("mis-inscripciones")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-black uppercase tracking-wide transition-colors ${
            subTab === "mis-inscripciones"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <ListOrdered className="h-3 w-3" />
          Mis inscripciones
          <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${subTab === "mis-inscripciones" ? "bg-blue-500" : "bg-slate-100 text-slate-500"}`}>
            {DEMO_MY_REGISTRATIONS.length}
          </span>
        </button>
      </div>

      {subTab === "disponibles" && (
        <div className="space-y-3">
          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Torneos</p>
            <div className="space-y-2">
              {DEMO_OPEN_EVENTS.filter((e) => e.type === "tournament").map((ev) => (
                <OpenEventCard key={ev.id} ev={ev} />
              ))}
            </div>
          </div>
          <div className="pt-1">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ligas</p>
            <div className="space-y-2">
              {DEMO_OPEN_EVENTS.filter((e) => e.type === "league").map((ev) => (
                <OpenEventCard key={ev.id} ev={ev} />
              ))}
            </div>
          </div>
        </div>
      )}

      {subTab === "mis-inscripciones" && (
        <div className="space-y-2">
          {DEMO_MY_REGISTRATIONS.map((reg) => (
            <MyRegistrationCard key={reg.id} reg={reg} />
          ))}
        </div>
      )}
    </div>
  );
}

function RankingTab() {
  return (
    <div className="space-y-3">
      {/* Position highlight */}
      <div className="flex items-center gap-4 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-black text-white shadow">
          #2
        </div>
        <div>
          <p className="text-base font-black text-slate-900">{PLAYER_NAME}</p>
          <p className="text-[11px] text-slate-500">{PLAYER_CITY}</p>
          <div className="mt-1.5 flex items-center gap-3">
            <span className="text-xs font-black text-blue-700">298 pts</span>
            <span className="text-[10px] text-slate-400">·</span>
            <span className="text-[10px] text-slate-500">16 partidos · 10-6</span>
          </div>
        </div>
      </div>

      {/* Top 5 table */}
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ranking del club</p>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="py-2 pl-3 text-left text-[9px] font-black uppercase tracking-wide text-slate-400">#</th>
              <th className="py-2 text-left text-[9px] font-black uppercase tracking-wide text-slate-400">Jugador</th>
              <th className="py-2 text-right text-[9px] font-black uppercase tracking-wide text-slate-400">Pts</th>
              <th className="py-2 pr-3 text-right text-[9px] font-black uppercase tracking-wide text-slate-400">W/L</th>
            </tr>
          </thead>
          <tbody>
            {DEMO_RANKING.map((row, i) => (
              <tr
                key={row.pos}
                className={`border-b border-slate-50 last:border-0 ${
                  row.isMe ? "bg-blue-50" : ""
                }`}
              >
                <td className="py-2.5 pl-3 font-black text-slate-400">{row.pos}</td>
                <td className="py-2.5 font-semibold text-slate-800">
                  {row.name}
                  {row.isMe && (
                    <span className="ml-1.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-blue-600">
                      VOS
                    </span>
                  )}
                </td>
                <td className="py-2.5 text-right font-black text-slate-700">{row.pts}</td>
                <td className="py-2.5 pr-3 text-right text-slate-500">{row.wl}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PerfilTab() {
  const bars = [
    { label: "Consistencia", pct: 65, color: "bg-blue-500" },
    { label: "Win rate", pct: 62, color: "bg-emerald-500" },
    { label: "Racha actual", pct: 74, color: "bg-violet-500" },
  ];

  return (
    <div className="space-y-3">
      {/* PasalaIndex */}
      <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-blue-200">
          <span className="text-xl font-black text-blue-700">78</span>
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wide text-white">
            IDX
          </span>
        </div>
        <div>
          <p className="text-base font-black text-slate-900">Índice PASALA</p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Calculado sobre rendimiento, consistencia y racha. Actualizado automáticamente.
          </p>
          <p className="mt-1.5 text-[10px] font-semibold text-blue-600">Top 15% del club</p>
        </div>
      </div>

      {/* Progress bars */}
      <div className="space-y-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Métricas de juego</p>
        {bars.map(({ label, pct, color }) => (
          <div key={label}>
            <div className="mb-1 flex justify-between text-[10px]">
              <span className="font-semibold text-slate-600">{label}</span>
              <span className="font-black text-slate-700">{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Stat boxes */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Partidos jugados", value: "128" },
          { label: "Torneos disputados", value: "6" },
          { label: "Ligas activas", value: "1" },
          { label: "Reservas este mes", value: "4" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
            <p className="text-lg font-black text-slate-800">{value}</p>
            <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

const NAV_TABS: { id: MainTab; label: string }[] = [
  { id: "partidos", label: "Partidos" },
  { id: "eventos", label: "Eventos" },
  { id: "ranking", label: "Ranking" },
  { id: "perfil", label: "Mi perfil" },
];

export function PlayerEventsDemoPanel() {
  const [tab, setTab] = useState<MainTab>("eventos");

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
          pasala.com.ar/player
        </div>
        <div className="w-[52px]" />
      </div>

      {/* Top nav */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
        <span className="text-sm font-black tracking-tight text-blue-600">PASALA</span>
        <div className="flex items-center gap-3">
          {NAV_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`text-[11px] font-bold transition-colors ${
                tab === t.id
                  ? "border-b-2 border-blue-600 pb-0.5 font-black text-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white">
            AP
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Page header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900">
                {tab === "partidos" && "Mis partidos"}
                {tab === "eventos" && "Eventos disponibles"}
                {tab === "ranking" && "Ranking del club"}
                {tab === "perfil" && "Mi perfil"}
              </h2>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-blue-600">
                Demo
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {PLAYER_NAME} · {PLAYER_CITY}
            </p>
          </div>
        </div>

        {tab === "partidos" && <PartidosTab />}
        {tab === "eventos" && <EventosTab />}
        {tab === "ranking" && <RankingTab />}
        {tab === "perfil" && <PerfilTab />}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 bg-white px-4 py-2 text-center">
        <p className="text-[10px] text-slate-400">
          Vista simulada del panel del jugador · Los datos son de ejemplo
        </p>
      </div>
    </div>
  );
}

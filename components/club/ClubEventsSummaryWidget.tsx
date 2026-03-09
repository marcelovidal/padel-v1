import Link from "next/link";
import { ArrowRight, Calendar, CheckCircle2, Clock3, Trophy } from "lucide-react";

type ClubDashboardEventSummary = {
  entityType: "league" | "tournament";
  entityId: string;
  name: string;
  seasonLabel: string | null;
  description: string | null;
  status: "draft" | "active" | "finished";
  startDate: string | null;
  endDate: string | null;
  targetCityIds: string[] | null;
  pendingRegistrations: number;
  confirmedRegistrations: number;
  href: string;
};

const CLUB_PALETTE = [
  { bg: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-cyan-100", text: "text-cyan-700" },
  { bg: "bg-orange-100", text: "text-orange-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
  { bg: "bg-violet-100", text: "text-violet-700" },
];

function formatDate(date: string | null) {
  if (!date) return null;
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function eventPalette(eventId: string) {
  let hash = 0;
  for (let i = 0; i < eventId.length; i++) {
    hash = (hash * 31 + eventId.charCodeAt(i)) % CLUB_PALETTE.length;
  }
  return CLUB_PALETTE[hash];
}

function entityBadgeClasses(entityType: ClubDashboardEventSummary["entityType"]) {
  return entityType === "tournament"
    ? "bg-blue-50 text-blue-600"
    : "bg-purple-50 text-purple-600";
}

function getVisualState(event: ClubDashboardEventSummary) {
  if (event.pendingRegistrations > 0) {
    return {
      shell: "border-amber-200 bg-amber-50/20",
      footer: "Pendientes por revisar",
      footerClass: "text-amber-700",
      summaryClass: "bg-amber-100 text-amber-800",
      summaryIcon: Clock3,
      summaryText: `${event.pendingRegistrations} pendiente${event.pendingRegistrations === 1 ? "" : "s"}`,
    };
  }

  if (event.confirmedRegistrations > 0) {
    return {
      shell: "border-emerald-200 bg-emerald-50/20",
      footer: "Participantes confirmados",
      footerClass: "text-emerald-700",
      summaryClass: "bg-emerald-100 text-emerald-800",
      summaryIcon: CheckCircle2,
      summaryText: `${event.confirmedRegistrations} confirmada${event.confirmedRegistrations === 1 ? "" : "s"}`,
    };
  }

  if (event.status === "finished") {
    return {
      shell: "border-slate-200 bg-slate-50/50",
      footer: "Evento finalizado",
      footerClass: "text-slate-600",
      summaryClass: "bg-slate-100 text-slate-700",
      summaryIcon: CheckCircle2,
      summaryText: "Cerrado",
    };
  }

  return {
    shell: "border-gray-100 bg-white",
    footer: event.status === "active" ? "Inscripcion abierta" : "Borrador en configuracion",
    footerClass: event.status === "active" ? "text-blue-600" : "text-amber-700",
    summaryClass: event.status === "active" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-800",
    summaryIcon: event.status === "active" ? Trophy : Clock3,
    summaryText: event.status === "active" ? "Abierto" : "Borrador",
  };
}

function EventCard({ event }: { event: ClubDashboardEventSummary }) {
  const palette = eventPalette(event.entityId);
  const visual = getVisualState(event);
  const SummaryIcon = visual.summaryIcon;
  const initials = getInitials(event.name);
  const startFmt = formatDate(event.startDate);
  const endFmt = formatDate(event.endDate);

  return (
    <article className={`flex w-72 shrink-0 flex-col gap-3 rounded-[24px] border p-4 shadow-sm transition-shadow hover:shadow-md ${visual.shell}`}>
      <div className="flex items-center justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-black ${palette.bg} ${palette.text}`}>
          {initials}
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${entityBadgeClasses(event.entityType)}`}>
          {event.entityType === "tournament" ? "Torneo" : "Liga"}
        </span>
      </div>

      <div className="min-h-0 flex-1">
        <p className="line-clamp-2 text-xl font-black leading-tight text-gray-900">{event.name}</p>
        {event.seasonLabel ? <p className="mt-1 text-sm text-gray-500">{event.seasonLabel}</p> : null}
        <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-gray-400">
          {event.status === "active" ? "Publicado" : event.status === "finished" ? "Finalizado" : "Borrador"}
        </p>
      </div>

      {(startFmt || endFmt) && (
        <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>
            {startFmt ?? "Sin inicio"} {endFmt ? `→ ${endFmt}` : ""}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${visual.summaryClass}`}>
          <SummaryIcon className="h-3 w-3" />
          {visual.summaryText}
        </span>
        <Link
          href={event.href}
          className="flex items-center gap-0.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-blue-600"
        >
          Administrar <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-gray-100 bg-white/80 px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">Pendientes</p>
          <p className="mt-1 text-lg font-black text-gray-900">{event.pendingRegistrations}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white/80 px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">Confirmadas</p>
          <p className="mt-1 text-lg font-black text-gray-900">{event.confirmedRegistrations}</p>
        </div>
      </div>

      <p className={`text-[11px] font-semibold ${visual.footerClass}`}>{visual.footer}</p>
    </article>
  );
}

export function ClubEventsSummaryWidget({ events }: { events: ClubDashboardEventSummary[] }) {
  if (events.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Eventos</h2>
          <p className="mt-0.5 text-[11px] text-gray-500">
            {events.length} evento{events.length === 1 ? "" : "s"} en seguimiento
          </p>
        </div>
        <Link
          href="/club/dashboard"
          className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700"
        >
          Ver gestion <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {events.map((event) => (
          <EventCard key={`${event.entityType}-${event.entityId}`} event={event} />
        ))}
      </div>
    </section>
  );
}

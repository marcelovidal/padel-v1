import Link from "next/link";
import { Calendar, ArrowRight } from "lucide-react";
import type { OpenEvent } from "@/repositories/registrations.repository";

/* ─────────────── helpers ─────────────── */

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(d: string | null): string | null {
  if (!d) return null;
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

const PALETTE = [
  { bg: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-purple-100", text: "text-purple-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-orange-100", text: "text-orange-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
  { bg: "bg-cyan-100", text: "text-cyan-700" },
  { bg: "bg-yellow-100", text: "text-yellow-700" },
];

function clubPalette(clubId: string) {
  let h = 0;
  for (let i = 0; i < clubId.length; i++) {
    h = (h * 31 + clubId.charCodeAt(i)) % PALETTE.length;
  }
  return PALETTE[h];
}

/* ─────────────── sub-components ─────────────── */

function StatusBadge({ status }: { status: string | null }) {
  if (!status || status === "rejected") return null;
  if (status === "pending")
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-700">
        Pendiente
      </span>
    );
  if (status === "confirmed")
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">
        ✓ Confirmada
      </span>
    );
  return null;
}

function EventCard({ event }: { event: OpenEvent }) {
  const { bg, text } = clubPalette(event.club_id);
  const initials = getInitials(event.club_name);
  const startFmt = formatDate(event.start_date);
  const endFmt = formatDate(event.end_date);
  const hasReg = !!event.registration_status && event.registration_status !== "rejected";

  const borderClass = hasReg
    ? event.registration_status === "confirmed"
      ? "border-emerald-200 bg-emerald-50/30"
      : "border-amber-200 bg-amber-50/20"
    : "border-gray-100 bg-white";

  return (
    <div
      className={`flex w-60 shrink-0 flex-col gap-3 rounded-[24px] border p-4 shadow-sm transition-shadow hover:shadow-md ${borderClass}`}
    >
      {/* Club avatar + entity type badge */}
      <div className="flex items-center justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-black ${bg} ${text}`}
        >
          {initials}
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${
            event.entity_type === "tournament"
              ? "bg-blue-50 text-blue-600"
              : "bg-purple-50 text-purple-600"
          }`}
        >
          {event.entity_type === "tournament" ? "Torneo" : "Liga"}
        </span>
      </div>

      {/* Event & club name */}
      <div className="min-h-0 flex-1">
        <p className="line-clamp-2 text-sm font-black leading-tight text-gray-900">
          {event.entity_name}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-gray-500">{event.club_name}</p>
        {event.season_label && (
          <p className="text-[10px] font-medium text-gray-400">{event.season_label}</p>
        )}
      </div>

      {/* Dates */}
      {(startFmt || endFmt) && (
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <Calendar className="h-3 w-3 shrink-0" />
          <span>
            {startFmt ?? "—"} → {endFmt ?? "—"}
          </span>
        </div>
      )}

      {/* Footer: status + CTA */}
      <div className="flex items-center justify-between pt-1">
        {hasReg ? (
          <StatusBadge status={event.registration_status} />
        ) : (
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">
            Abierto
          </span>
        )}
        <Link
          href="/player/events"
          className="flex items-center gap-0.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-blue-600"
        >
          Ver <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>
    </div>
  );
}

/* ─────────────── main widget ─────────────── */

type Props = { events: OpenEvent[] };

export function PlayerEventsWidget({ events }: Props) {
  if (events.length === 0) return null;

  // Registrations first (pending/confirmed), then open events
  const registered = events.filter(
    (e) => e.registration_status && e.registration_status !== "rejected",
  );
  const available = events.filter(
    (e) => !e.registration_status || e.registration_status === "rejected",
  );
  const ordered = [...registered, ...available].slice(0, 12);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Eventos</h2>
          {registered.length > 0 && (
            <p className="mt-0.5 text-[11px] text-gray-500">
              {registered.length} inscripción{registered.length !== 1 ? "es" : ""} activa
              {registered.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Link
          href="/player/events"
          className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700"
        >
          Ver todos <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Horizontal scroll row */}
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ordered.map((event) => (
          <EventCard key={`${event.entity_type}-${event.entity_id}`} event={event} />
        ))}
      </div>
    </section>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { ChevronLeft, ChevronRight, CalendarDays, List, X, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { coachCancelBookingAction } from "@/lib/actions/coach.actions";

// ── Types ─────────────────────────────────────────────────────────────────────

type CalEventType = "match" | "tournament" | "league" | "booking" | "training";

interface CalEvent {
  id: string;
  type: CalEventType;
  title: string;
  start_at: string;
  end_at: string | null;
  status: string;
  club_name: string;
  court_name: string | null;
  metadata: Record<string, unknown>;
}

// ── Config ────────────────────────────────────────────────────────────────────

const EVENT_CONFIG: Record<CalEventType, { label: string; dot: string; badge: string }> = {
  match:      { label: "Partido",       dot: "bg-blue-500",   badge: "bg-blue-100 text-blue-700" },
  tournament: { label: "Torneo",        dot: "bg-purple-500", badge: "bg-purple-100 text-purple-700" },
  league:     { label: "Liga",          dot: "bg-green-500",  badge: "bg-green-100 text-green-700" },
  booking:    { label: "Reserva",       dot: "bg-yellow-500", badge: "bg-yellow-100 text-yellow-800" },
  training:   { label: "Entrenamiento", dot: "bg-red-500",    badge: "bg-red-100 text-red-700" },
};

const CAL_FILTERS: { key: CalEventType | "all"; label: string }[] = [
  { key: "all",        label: "Todos" },
  { key: "match",      label: "Partidos" },
  { key: "booking",    label: "Reservas" },
  { key: "training",   label: "Entrenamientos" },
  { key: "tournament", label: "Torneos" },
  { key: "league",     label: "Ligas" },
];

const DAY_ACTIONS = [
  {
    key: "match_club",
    icon: "🎾",
    label: "Registrar partido en club",
    href: (date: string) => `/player/matches/new?date=${date}&mode=club`,
  },
  {
    key: "match_direct",
    icon: "🎾",
    label: "Registrar partido sin club",
    href: (date: string) => `/player/matches/new?date=${date}&mode=direct`,
  },
  {
    key: "booking",
    icon: "🏟️",
    label: "Reservar cancha",
    href: (date: string) => `/player/bookings/new?date=${date}`,
  },
  {
    key: "training",
    icon: "👨‍🏫",
    label: "Reservar clase",
    href: (date: string) => `/player/entrenadores?date=${date}`,
  },
] as const;

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfWeek(d: Date): Date {
  const result = new Date(d);
  result.setDate(d.getDate() - d.getDay()); // Sunday = 0
  result.setHours(0, 0, 0, 0);
  return result;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}

function isAllDay(iso: string): boolean {
  // Supabase returns dates cast to timestamptz as midnight UTC or midnight with offset
  const t = new Date(iso);
  return t.getUTCHours() === 0 && t.getUTCMinutes() === 0 && t.getUTCSeconds() === 0;
}

function calcPeriodLabel(view: "monthly" | "weekly", currentMonth: Date, weekAnchor: Date): string {
  if (view === "monthly") {
    return `${MONTHS_ES[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
  }
  const sw = startOfWeek(weekAnchor);
  const ew = new Date(sw);
  ew.setDate(sw.getDate() + 6);
  const sameMon = sw.getMonth() === ew.getMonth();
  return sameMon
    ? `${sw.getDate()}–${ew.getDate()} ${MONTHS_ES[sw.getMonth()].slice(0, 3)} ${sw.getFullYear()}`
    : `${sw.getDate()} ${MONTHS_ES[sw.getMonth()].slice(0, 3)} – ${ew.getDate()} ${MONTHS_ES[ew.getMonth()].slice(0, 3)}`;
}

function toDateParam(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDayLabel(d: Date): string {
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} de ${MONTHS_ES[d.getMonth()]}`;
}

// ── Main component ────────────────────────────────────────────────────────────

interface CalendarioViewProps {
  isCoach?: boolean;
}

export function CalendarioView({ isCoach = false }: CalendarioViewProps) {
  // mounted — evita hydration mismatch por new Date() y localStorage en SSR.
  const [mounted, setMounted] = useState(false);

  // Valores estables en servidor (nunca se renderizan — se devuelve skeleton hasta mounted)
  const [view, setView] = useState<"monthly" | "weekly">("monthly");
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(2000, 0, 1));
  const [selectedDay, setSelectedDay] = useState<Date>(new Date(2000, 0, 1));
  const [weekAnchor, setWeekAnchor] = useState<Date>(new Date(2000, 0, 1));

  // Un solo useEffect inicializa todo con valores reales del cliente
  useEffect(() => {
    const saved = localStorage.getItem("padel:calendar:view");
    if (saved === "monthly" || saved === "weekly") setView(saved);

    const now = new Date();
    const month = new Date(now.getFullYear(), now.getMonth(), 1);
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    setCurrentMonth(month);
    setSelectedDay(day);
    setWeekAnchor(day);
    setMounted(true);
  }, []);

  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [showDaySheet, setShowDaySheet] = useState(false);
  const [activeFilter, setActiveFilter] = useState<CalEventType | "all">("all");

  // Date range for the current view (month or week visible)
  const { dateFrom, dateTo } = useMemo(() => {
    if (view === "monthly") {
      const from = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const to = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      return {
        dateFrom: from.toISOString().slice(0, 10),
        dateTo: to.toISOString().slice(0, 10),
      };
    } else {
      const sw = startOfWeek(weekAnchor);
      const ew = new Date(sw);
      ew.setDate(sw.getDate() + 6);
      return {
        dateFrom: sw.toISOString().slice(0, 10),
        dateTo: ew.toISOString().slice(0, 10),
      };
    }
  }, [view, currentMonth, weekAnchor]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const supabase = createBrowserSupabase();
    const { data, error } = await (supabase as any).rpc("get_player_calendar", {
      p_date_from: dateFrom,
      p_date_to: dateTo,
    });
    if (!error && Array.isArray(data)) {
      setEvents(data as CalEvent[]);
    }
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  function handleDayClick(day: Date) {
    const isPast = day < today;
    // Past day with no events: do nothing
    const key = toDateParam(day);
    const hasEventsOnDay = eventsListByDay.has(key);
    if (isPast && !hasEventsOnDay) return;
    setSelectedDay(day);
    setShowDaySheet(true);
  }

  function toggleView(v: "monthly" | "weekly") {
    setView(v);
    localStorage.setItem("padel:calendar:view", v);
  }

  function prevPeriod() {
    if (view === "monthly") {
      setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    } else {
      setWeekAnchor(d => {
        const prev = new Date(d);
        prev.setDate(d.getDate() - 7);
        return prev;
      });
    }
  }

  function nextPeriod() {
    if (view === "monthly") {
      setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    } else {
      setWeekAnchor(d => {
        const next = new Date(d);
        next.setDate(d.getDate() + 7);
        return next;
      });
    }
  }

  // Filtered events (respects active filter pill)
  const filteredEvents = useMemo(
    () => (activeFilter === "all" ? events : events.filter(e => e.type === activeFilter)),
    [events, activeFilter]
  );

  // Events for selected day (filtered)
  const dayEvents = useMemo(
    () =>
      filteredEvents
        .filter(e => isSameDay(new Date(e.start_at), selectedDay))
        .sort((a, b) => a.start_at.localeCompare(b.start_at)),
    [filteredEvents, selectedDay]
  );

  // Map: "YYYY-MM-DD" → CalEvent[] sorted by start_at (for chips in grid, filtered)
  const eventsListByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    filteredEvents.forEach(e => {
      const key = new Date(e.start_at).toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    map.forEach(evts => evts.sort((a, b) => a.start_at.localeCompare(b.start_at)));
    return map;
  }, [filteredEvents]);

  const monthGrid = useMemo<(Date | null)[]>(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDOW = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDOW; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [currentMonth]);

  const weekDays = useMemo<Date[]>(() => {
    const sw = startOfWeek(weekAnchor);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sw);
      d.setDate(sw.getDate() + i);
      return d;
    });
  }, [weekAnchor]);

  // periodLabel — calculado solo en cliente para evitar hydration mismatch
  const [periodLabel, setPeriodLabel] = useState("");
  useEffect(() => {
    setPeriodLabel(calcPeriodLabel(view, currentMonth, weekAnchor));
  }, [view, currentMonth, weekAnchor]);

  // Skeleton hasta que el cliente haya inicializado todos los valores de fecha
  if (!mounted) {
    return (
      <div className="animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-8 w-8 rounded-xl bg-slate-200" />
          <div className="h-5 w-40 rounded bg-slate-200" />
          <div className="h-8 w-8 rounded-xl bg-slate-200" />
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-4 rounded bg-slate-100" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={prevPeriod}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Período anterior"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-base font-bold text-gray-900 min-w-[200px] text-center select-none">
            {periodLabel}
          </span>
          <button
            onClick={nextPeriod}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Período siguiente"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="flex rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleView("monthly")}
            className={`px-3 py-2 text-sm font-semibold flex items-center gap-1.5 transition-colors ${
              view === "monthly" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            Mes
          </button>
          <button
            onClick={() => toggleView("weekly")}
            className={`px-3 py-2 text-sm font-semibold flex items-center gap-1.5 transition-colors border-l border-gray-200 ${
              view === "weekly" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <List className="w-4 h-4" />
            Semana
          </button>
        </div>
      </div>

      {/* ── Filtros (reemplaza la leyenda estática) ── */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-0.5 scrollbar-hide">
        {CAL_FILTERS.map(f => {
          const cfg = f.key !== "all" ? EVENT_CONFIG[f.key] : null;
          const active = activeFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                active
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600"
              }`}
            >
              {cfg && (
                <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot} ${active ? "opacity-100" : ""}`} />
              )}
              {f.label}
            </button>
          );
        })}
      </div>

      {/* ── Monthly view ── */}
      {view === "monthly" && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-100">
            {WEEKDAYS.map(d => (
              <div key={d} className="py-2 text-center text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">Cargando...</div>
          ) : (
            <div className="grid grid-cols-7">
              {monthGrid.map((day, i) => {
                if (!day) {
                  return (
                    <div
                      key={`empty-${i}`}
                      className="h-14 sm:h-16 bg-gray-50/50 border-b border-r border-gray-100"
                    />
                  );
                }
                const key = toDateParam(day);
                const dayEvts = eventsListByDay.get(key) ?? [];
                const isToday = isSameDay(day, today);
                const isSelected = isSameDay(day, selectedDay);
                const isPast = day < today;
                const MAX_CHIPS = 2;
                const visibleChips = dayEvts.slice(0, MAX_CHIPS);
                const extraCount = dayEvts.length - MAX_CHIPS;

                return (
                  <button
                    key={key}
                    onClick={() => handleDayClick(day)}
                    className={`min-h-[3.5rem] sm:min-h-[4.5rem] w-full border-b border-r border-gray-100 p-1 text-left align-top transition-colors hover:bg-blue-50/40 ${
                      isSelected ? "bg-blue-50" : ""
                    }`}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        isToday
                          ? "bg-blue-600 text-white"
                          : isSelected
                          ? "text-blue-700 font-black"
                          : isPast
                          ? "text-gray-300"
                          : "text-gray-700"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    {dayEvts.length > 0 && (
                      <div className="mt-0.5 flex flex-col gap-0.5 px-0.5">
                        {visibleChips.map(ev => {
                          const evCfg = EVENT_CONFIG[ev.type];
                          const timeStr = !isAllDay(ev.start_at) ? formatTime(ev.start_at) : null;
                          return (
                            <div
                              key={ev.id}
                              className={`flex items-center gap-0.5 rounded px-1 py-[2px] ${evCfg.badge} ${isPast ? "opacity-60" : ""}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${evCfg.dot}`} />
                              <span className="truncate text-[10px] leading-none min-w-0">
                                {timeStr && <span className="font-bold">{timeStr} </span>}
                                {ev.title.slice(0, 11)}{ev.title.length > 11 ? "…" : ""}
                              </span>
                            </div>
                          );
                        })}
                        {extraCount > 0 && (
                          <span className={`pl-1 text-[9px] leading-none text-gray-400 ${isPast ? "opacity-60" : ""}`}>
                            +{extraCount} más
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Weekly view ── */}
      {view === "weekly" && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">Cargando...</div>
          ) : (
            <div>
              {weekDays.map((day, i) => {
                const dayEvts = filteredEvents
                  .filter(e => isSameDay(new Date(e.start_at), day))
                  .sort((a, b) => a.start_at.localeCompare(b.start_at));
                const isToday = isSameDay(day, today);
                const isSelected = isSameDay(day, selectedDay);
                const isPast = day < today;

                return (
                  <div
                    key={i}
                    className={`border-b border-gray-100 last:border-b-0 ${isSelected ? "bg-blue-50/30" : ""}`}
                  >
                    <div className="flex items-start gap-3 px-4 py-3">
                      <button
                        onClick={() => handleDayClick(day)}
                        className={`flex-shrink-0 w-10 h-10 rounded-xl flex flex-col items-center justify-center transition-colors ${
                          isToday
                            ? "bg-blue-600 text-white"
                            : isSelected
                            ? "bg-blue-100 text-blue-700"
                            : isPast
                            ? "bg-gray-50 text-gray-300"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        <span className="text-xs font-black leading-tight">{day.getDate()}</span>
                        <span className="text-[9px] font-semibold uppercase leading-tight">
                          {WEEKDAYS[day.getDay()]}
                        </span>
                      </button>

                      <div className="flex-1 min-w-0">
                        {dayEvts.length === 0 ? (
                          <span className="pt-2.5 block text-sm text-gray-400">Sin actividad</span>
                        ) : (
                          <div className={`flex flex-wrap gap-1.5 pt-1.5 ${isPast ? "opacity-60" : ""}`}>
                            {dayEvts.map(e => {
                              const cfg = EVENT_CONFIG[e.type];
                              return (
                                <button
                                  key={e.id}
                                  onClick={() => setSelectedEvent(e)}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-opacity hover:opacity-80 ${cfg.badge}`}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                                  <span className="truncate max-w-[140px]">
                                    {!isAllDay(e.start_at) && (
                                      <span className="font-black">{formatTime(e.start_at)} </span>
                                    )}
                                    {e.title.length > 18 ? e.title.slice(0, 18) + "…" : e.title}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* + Agregar — solo días no pasados */}
                      {!isPast && (
                        <button
                          onClick={() => handleDayClick(day)}
                          className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors mt-1.5"
                          aria-label={`Agregar al ${formatDayLabel(day)}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Agregar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Day sheet (events + actions) ── */}
      {showDaySheet && (
        <DaySheet
          day={selectedDay}
          events={dayEvents}
          isPast={selectedDay < today}
          onSelectEvent={(e) => { setShowDaySheet(false); setSelectedEvent(e); }}
          onClose={() => setShowDaySheet(false)}
        />
      )}

      {/* ── Event detail modal ── */}
      {selectedEvent && (
        <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}

// ── Day sheet ─────────────────────────────────────────────────────────────────

function DaySheet({
  day,
  events,
  isPast,
  onSelectEvent,
  onClose,
}: {
  day: Date;
  events: CalEvent[];
  isPast: boolean;
  onSelectEvent: (e: CalEvent) => void;
  onClose: () => void;
}) {
  const dateParam = toDateParam(day);
  const hasEvents = events.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
          <p className="text-sm font-bold text-gray-900">{formatDayLabel(day)}</p>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Section 1: Events */}
          {hasEvents ? (
            <div>
              <p className="px-4 pt-3 pb-1 text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                Actividad
              </p>
              <ul className="divide-y divide-gray-100">
                {events.map(e => {
                  const cfg = EVENT_CONFIG[e.type];
                  const allDay = isAllDay(e.start_at);
                  const meta = e.metadata;
                  const link =
                    e.type !== "training" && typeof meta?.link === "string"
                      ? (meta.link as string)
                      : null;
                  const ctaLabel =
                    typeof meta?.cta_label === "string" ? (meta.cta_label as string) : null;
                  const coachName =
                    e.type === "training" && typeof meta?.coach_name === "string"
                      ? (meta.coach_name as string)
                      : null;
                  const durationMin =
                    typeof meta?.duration_minutes === "number"
                      ? (meta.duration_minutes as number)
                      : null;
                  const statusLabels: Record<string, string> = {
                    pending: "Pendiente",
                    confirmed: "Confirmado",
                    completed: "Completado",
                    cancelled: "Cancelado",
                  };
                  const statusLabel = statusLabels[e.status] ?? e.status;

                  return (
                    <li key={e.id} className="px-4 py-3">
                      <div className="flex items-start gap-2.5">
                        <span className={`mt-0.5 h-2.5 w-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        <div className="min-w-0 flex-1 space-y-1">
                          {/* Título + hora */}
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-bold text-gray-900 leading-tight">{e.title}</p>
                            {!allDay && (
                              <span className="text-xs font-bold text-gray-500 flex-shrink-0">
                                {formatTime(e.start_at)}
                              </span>
                            )}
                          </div>
                          {/* Subtítulo: entrenador / club+cancha */}
                          {coachName ? (
                            <p className="text-xs text-gray-500">
                              Clase con <span className="font-semibold">{coachName}</span>
                            </p>
                          ) : e.club_name ? (
                            <p className="text-xs text-gray-500 truncate">
                              {e.club_name}
                              {e.court_name ? ` · ${e.court_name}` : ""}
                            </p>
                          ) : null}
                          {/* Duración */}
                          {durationMin && (
                            <p className="text-xs text-gray-400">⏱ {durationMin} min</p>
                          )}
                          {/* Badge tipo + estado */}
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.badge}`}>
                              {cfg.label}
                            </span>
                            {e.status && (
                              <span className="text-[10px] text-gray-400">{statusLabel}</span>
                            )}
                          </div>
                          {/* CTA */}
                          {link && (
                            <Link
                              href={link}
                              onClick={onClose}
                              className="inline-flex items-center gap-0.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              {ctaLabel ?? "Ver detalle"} →
                            </Link>
                          )}
                          {e.type === "training" && (
                            <button
                              onClick={() => onSelectEvent(e)}
                              className="inline-flex items-center gap-0.5 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"
                            >
                              Ver detalle →
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="px-4 pt-4 pb-2 text-sm text-gray-400">Sin actividad este día.</p>
          )}

          {/* Section 2: Actions — solo días no pasados */}
          {!isPast && (
            <>
              {hasEvents && <div className="mx-4 my-2 border-t border-gray-100" />}
              <div className="px-4 pb-4 pt-2">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-3">
                  ¿Qué querés hacer el {formatDayLabel(day)}?
                </p>
                <div className="flex flex-col gap-2">
                  {DAY_ACTIONS.map(action => (
                    <Link
                      key={action.key}
                      href={action.href(dateParam)}
                      onClick={onClose}
                      className="flex items-center gap-3 w-full px-3 py-3 rounded-lg border border-[#E2E8F0] bg-white text-[13px] font-semibold text-[#0F172A] hover:border-blue-500 hover:bg-[#EFF6FF] transition-colors"
                    >
                      <span className="text-xl leading-none">{action.icon}</span>
                      {action.label}
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Padding bottom for past days with no actions */}
          {isPast && <div className="pb-4" />}
        </div>
      </div>
    </div>
  );
}

// ── Event detail modal ────────────────────────────────────────────────────────

function EventDetailModal({ event, onClose }: { event: CalEvent; onClose: () => void }) {
  const cfg = EVENT_CONFIG[event.type];
  const meta = event.metadata;
  // Training events don't use a link CTA — they have their own cancel button
  const link = event.type !== "training" && typeof meta?.link === "string" ? meta.link : null;
  const allDay = isAllDay(event.start_at);
  const router = useRouter();
  const [isCancelling, startCancel] = useTransition();
  const [cancelError, setCancelError] = useState<string | null>(null);

  const isFuture = new Date(event.start_at) > new Date();
  const isTraining = event.type === "training";
  const showPending = isTraining && event.status === "pending";
  const showCancel = isTraining && event.status === "confirmed" && isFuture;

  function handleCancel() {
    setCancelError(null);
    startCancel(async () => {
      const result = await coachCancelBookingAction(event.id);
      if (result?.error) {
        setCancelError(result.error);
      } else {
        onClose();
        router.refresh();
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
              {cfg.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal body */}
        <div className="px-4 py-4 space-y-2.5">
          <p className="text-base font-black text-gray-900">{event.title}</p>

          {/* Date/time */}
          <p className="text-sm text-gray-600">
            🗓{" "}
            {new Date(event.start_at).toLocaleDateString("es-AR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
            {!allDay && (
              <>
                {" "}· {formatTime(event.start_at)}
                {event.end_at ? ` – ${formatTime(event.end_at)}` : ""}
              </>
            )}
          </p>

          {/* Club + court */}
          {event.club_name && (
            <p className="text-sm text-gray-600">
              📍 {event.club_name}
              {event.court_name ? ` · ${event.court_name}` : ""}
            </p>
          )}

          {/* Status */}
          {event.status && event.status !== "confirmed" && (
            <p className="text-sm text-gray-500 capitalize">
              Estado: <span className="font-semibold">{event.status}</span>
            </p>
          )}

          {/* Coach name (for training) */}
          {typeof meta?.coach_name === "string" && event.type === "training" && (
            <p className="text-sm text-gray-600">
              👤 Entrenador:{" "}
              <span className="font-semibold">{meta.coach_name as string}</span>
              {typeof meta.coach_pasala_index === "number" && (
                <span className="text-xs text-gray-400">
                  {" · "}PASALA {(meta.coach_pasala_index as number).toFixed(1)}
                </span>
              )}
            </p>
          )}

          {/* Duration */}
          {typeof meta?.duration_minutes === "number" && (
            <p className="text-sm text-gray-500">
              ⏱ {meta.duration_minutes as number} min
            </p>
          )}

          {/* Tarifa (solo si pública) */}
          {typeof meta?.tarifa_por_hora === "number" && (
            <p className="text-sm text-gray-600">
              💲 ${(meta.tarifa_por_hora as number).toLocaleString("es-AR")} / hora
            </p>
          )}

          {/* Notes */}
          {typeof meta?.notes === "string" && meta.notes && (
            <p className="text-sm text-gray-500 italic">&ldquo;{meta.notes as string}&rdquo;</p>
          )}

          {/* Training: pending message */}
          {showPending && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              Esperando confirmación del entrenador
            </p>
          )}

          {/* Cancel error */}
          {cancelError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {cancelError}
            </p>
          )}
        </div>

        {/* CTA */}
        {(link || showCancel) && (
          <div className="px-4 pb-4 flex flex-col gap-2">
            {link && (
              <Link
                href={link}
                onClick={onClose}
                className="block w-full text-center px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
              >
                {typeof meta?.cta_label === "string" ? (meta.cta_label as string) : "Ver detalle"}
              </Link>
            )}
            {showCancel && (
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="w-full px-4 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCancelling ? "Cancelando..." : "Cancelar clase"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

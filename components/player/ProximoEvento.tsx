"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase/client";

type CalEventType = "match" | "tournament" | "league" | "booking" | "training";

interface CalEvent {
  id: string;
  type: CalEventType;
  title: string;
  start_at: string;
  club_name: string;
}

const EVENT_CONFIG: Record<CalEventType, { label: string; dot: string }> = {
  match:      { label: "Partido",       dot: "bg-blue-500" },
  tournament: { label: "Torneo",        dot: "bg-purple-500" },
  league:     { label: "Liga",          dot: "bg-green-500" },
  booking:    { label: "Reserva",       dot: "bg-yellow-500" },
  training:   { label: "Entrenamiento", dot: "bg-red-500" },
};

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function formatEventTime(startAt: string): string {
  const eventDate = new Date(startAt);
  const time = eventDate.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const eventDay = new Date(
    eventDate.getFullYear(),
    eventDate.getMonth(),
    eventDate.getDate()
  );

  if (eventDay.getTime() === today.getTime()) return `Hoy ${time}`;
  if (eventDay.getTime() === tomorrow.getTime()) return `Mañana ${time}`;
  return `${WEEKDAYS[eventDate.getDay()]} ${time}`;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function ProximoEvento() {
  const [event, setEvent] = useState<CalEvent | null | undefined>(undefined); // undefined = loading
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabase();
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await (supabase as any).rpc("get_player_calendar", {
        p_date_from: toDateStr(today),
        p_date_to: toDateStr(tomorrow),
      });

      if (error || !Array.isArray(data)) {
        setFailed(true);
        return;
      }

      const now = new Date();
      const next = (data as CalEvent[])
        .filter((e) => new Date(e.start_at) > now)
        .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())[0] ?? null;

      setEvent(next);
    }
    void load();
  }, []);

  // fail silently — no romper el sidebar
  if (failed) return null;

  // skeleton mientras carga
  if (event === undefined) {
    return (
      <div className="mx-2 mb-2 rounded-lg border border-slate-100 bg-slate-50 p-3 animate-pulse">
        <div className="h-2 w-12 rounded bg-slate-200 mb-2" />
        <div className="h-3 w-24 rounded bg-slate-200 mb-1.5" />
        <div className="h-2.5 w-16 rounded bg-slate-200" />
      </div>
    );
  }

  const containerBase =
    "mx-2 mb-2 rounded-lg border border-slate-200 p-3 text-left transition-colors";

  // sin evento
  if (event === null) {
    return (
      <div className={`${containerBase} bg-slate-50`}>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
          Próximo
        </p>
        <p className="text-xs text-slate-500">Sin actividad programada</p>
        <Link
          href="/player/calendario"
          className="mt-1.5 inline-block text-[11px] font-semibold text-blue-600 hover:underline"
        >
          + Reservar cancha
        </Link>
      </div>
    );
  }

  const cfg = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.match;

  return (
    <Link
      href="/player/calendario"
      className={`${containerBase} bg-slate-50 hover:border-blue-400 hover:bg-blue-50/40 block`}
    >
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
        Próximo
      </p>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
        <span className="text-[13px] font-semibold text-slate-900 leading-none">
          {cfg.label}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500 leading-snug">
        {formatEventTime(event.start_at)}
      </p>
      {event.club_name && (
        <p className="text-[11px] text-slate-400 truncate">{event.club_name}</p>
      )}
    </Link>
  );
}

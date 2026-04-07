"use client";

import { CalendarX } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { CoachProfile, CoachBooking } from "@/repositories/coach.repository";

interface Props {
  bookings: CoachBooking[];
  coachProfile: CoachProfile | null;
}

const STATUS_CONFIG: Record<CoachBooking["status"], { label: string; className: string }> = {
  pending:   { label: "Pendiente",  className: "bg-amber-50 text-amber-700 border border-amber-200" },
  confirmed: { label: "Confirmada", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  cancelled: { label: "Cancelada",  className: "bg-slate-100 text-slate-600 border border-slate-200" },
  completed: { label: "Completada", className: "bg-blue-50 text-blue-700 border border-blue-200" },
};

export function CoachAgenda({ bookings, coachProfile }: Props) {
  const upcoming = bookings.filter(
    (b) => b.status !== "cancelled" && b.status !== "completed" && new Date(b.scheduled_at) >= new Date()
  );
  const past = bookings.filter(
    (b) => b.status === "completed" || new Date(b.scheduled_at) < new Date()
  );

  if (bookings.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center space-y-3">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gray-50">
          <CalendarX className="h-8 w-8 text-gray-300" />
        </div>
        <div>
          <p className="font-bold text-gray-900">Sin reservas</p>
          <p className="text-sm text-gray-500 mt-1">
            Las clases reservadas por tus alumnos aparecerán acá.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Próximas</h2>
          <div className="space-y-2">
            {upcoming.map((b) => (
              <BookingRow key={b.id} booking={b} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Historial</h2>
          <div className="space-y-2">
            {past.slice(0, 10).map((b) => (
              <BookingRow key={b.id} booking={b} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function BookingRow({ booking }: { booking: CoachBooking }) {
  const { label, className } = STATUS_CONFIG[booking.status];
  const dt = new Date(booking.scheduled_at);
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-4">
      <div className="flex items-center gap-4">
        <div className="text-center min-w-[48px]">
          <p className="text-lg font-black text-gray-900 leading-none">
            {dt.getDate()}
          </p>
          <p className="text-[11px] font-semibold text-gray-500 uppercase">
            {dt.toLocaleString("es-AR", { month: "short" })}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {dt.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} · {booking.duration_minutes} min
          </p>
          {booking.notes_player && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{booking.notes_player}</p>
          )}
        </div>
      </div>
      <Badge className={className}>{label}</Badge>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarX, Plus, Check, X, Clock, User } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { UserAvatar } from "@/components/ui/UserAvatar";
import type { CoachProfile, CoachStudentRow, CoachBookingEnriched } from "@/repositories/coach.repository";
import {
  coachCreateBookingAction,
  coachConfirmBookingAction,
  coachRejectBookingAction,
} from "@/lib/actions/coach.actions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  bookings: CoachBookingEnriched[];
  coachProfile: CoachProfile | null;
  students: CoachStudentRow[];
}

const STATUS_CONFIG: Record<CoachBookingEnriched["status"], { label: string; className: string }> = {
  pending:   { label: "Pendiente",  className: "bg-amber-50 text-amber-700 border border-amber-200" },
  confirmed: { label: "Confirmada", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  cancelled: { label: "Cancelada",  className: "bg-slate-100 text-slate-600 border border-slate-200" },
  completed: { label: "Completada", className: "bg-blue-50 text-blue-700 border border-blue-200" },
};

const DURATIONS = [30, 45, 60] as const;

// ── Main component ────────────────────────────────────────────────────────────

export function CoachAgenda({ bookings, coachProfile, students }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  // Optimistic statuses: bookingId → new status
  const [optimisticStatus, setOptimisticStatus] = useState<
    Record<string, CoachBookingEnriched["status"]>
  >({});

  const now = new Date();

  const effectiveStatus = (b: CoachBookingEnriched): CoachBookingEnriched["status"] =>
    optimisticStatus[b.id] ?? b.status;

  const pending = bookings.filter(
    (b) => effectiveStatus(b) === "pending" && new Date(b.scheduled_at) >= now
  );

  const upcoming = bookings.filter(
    (b) => effectiveStatus(b) === "confirmed" && new Date(b.scheduled_at) >= now
  );

  const past = bookings
    .filter((b) => {
      const s = effectiveStatus(b);
      return s === "completed" || (s !== "cancelled" && new Date(b.scheduled_at) < now);
    })
    .slice(0, 15);

  function handleConfirm(id: string) {
    setOptimisticStatus((prev) => ({ ...prev, [id]: "confirmed" }));
    coachConfirmBookingAction(id).then((result) => {
      if (result?.error) {
        setOptimisticStatus((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      } else {
        router.refresh();
      }
    });
  }

  function handleReject(id: string) {
    setOptimisticStatus((prev) => ({ ...prev, [id]: "cancelled" }));
    coachRejectBookingAction(id).then((result) => {
      if (result?.error) {
        setOptimisticStatus((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      } else {
        router.refresh();
      }
    });
  }

  const hasContent = pending.length + upcoming.length + past.length > 0;

  return (
    <div className="space-y-6">
      {/* Header action */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Agenda</h2>
        {coachProfile && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Nueva sesión
          </button>
        )}
      </div>

      {!hasContent && pending.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gray-50">
            <CalendarX className="h-8 w-8 text-gray-300" />
          </div>
          <div>
            <p className="font-bold text-gray-900">Sin sesiones agendadas</p>
            <p className="text-sm text-gray-500 mt-1">
              Usá "Nueva sesión" para agendar una clase con un alumno.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Pending approvals */}
          {pending.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-amber-600 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Solicitudes pendientes ({pending.length})
              </h3>
              <div className="space-y-2">
                {pending.map((b) => (
                  <PendingRow
                    key={b.id}
                    booking={b}
                    onConfirm={() => handleConfirm(b.id)}
                    onReject={() => handleReject(b.id)}
                    isOptimistic={!!optimisticStatus[b.id]}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Upcoming confirmed */}
          {upcoming.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Próximas</h3>
              <div className="space-y-2">
                {upcoming.map((b) => (
                  <BookingRow key={b.id} booking={b} />
                ))}
              </div>
            </section>
          )}

          {/* History */}
          {past.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Historial</h3>
              <div className="space-y-2">
                {past.map((b) => (
                  <BookingRow key={b.id} booking={b} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* New session modal */}
      {showModal && coachProfile && (
        <NewSessionModal
          coachProfile={coachProfile}
          students={students}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

// ── Pending row (with confirm/reject) ─────────────────────────────────────────

function PendingRow({
  booking,
  onConfirm,
  onReject,
  isOptimistic,
}: {
  booking: CoachBookingEnriched;
  onConfirm: () => void;
  onReject: () => void;
  isOptimistic: boolean;
}) {
  const dt = new Date(booking.scheduled_at);
  const playerName = booking.player?.display_name ?? "Jugador";
  const playerAvatar = booking.player?.avatar_url ?? null;

  return (
    <div className={`rounded-2xl border bg-white p-4 transition-opacity ${isOptimistic ? "opacity-50 pointer-events-none" : "border-amber-200 bg-amber-50/30"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar src={playerAvatar} initials={playerName.slice(0, 2)} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{playerName}</p>
            <p className="text-xs text-gray-600">
              {dt.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}
              {" · "}
              {dt.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
              {" · "}
              {booking.duration_minutes} min
            </p>
            {(booking.club?.name || booking.court?.name) && (
              <p className="text-xs text-gray-500 mt-0.5">
                {[booking.club?.name, booking.court?.name].filter(Boolean).join(" · ")}
              </p>
            )}
            {booking.notes_player && (
              <p className="text-xs text-gray-500 mt-0.5 italic line-clamp-1">"{booking.notes_player}"</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onReject}
            className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-red-200 bg-white text-red-500 hover:bg-red-50 transition-colors"
            title="Rechazar"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
            title="Confirmar"
          >
            <Check className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Regular booking row ───────────────────────────────────────────────────────

function BookingRow({ booking }: { booking: CoachBookingEnriched }) {
  const { label, className } = STATUS_CONFIG[booking.status];
  const dt = new Date(booking.scheduled_at);
  const playerName = booking.player?.display_name ?? "Jugador";
  const playerAvatar = booking.player?.avatar_url ?? null;

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-4">
      <div className="flex items-center gap-3 min-w-0">
        <UserAvatar src={playerAvatar} initials={playerName.slice(0, 2)} size="sm" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{playerName}</p>
          <p className="text-xs text-gray-600">
            {dt.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}
            {" · "}
            {dt.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
            {" · "}
            {booking.duration_minutes} min
          </p>
          {booking.notes_player && (
            <p className="text-xs text-gray-500 mt-0.5 italic line-clamp-1">"{booking.notes_player}"</p>
          )}
        </div>
      </div>
      <Badge className={`${className} flex-shrink-0`}>{label}</Badge>
    </div>
  );
}

// ── New session modal ─────────────────────────────────────────────────────────

function NewSessionModal({
  coachProfile,
  students,
  onClose,
  onSuccess,
}: {
  coachProfile: CoachProfile;
  students: CoachStudentRow[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [playerId, setPlayerId] = useState(students[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState<30 | 45 | 60>(60);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSubmit =
    !!playerId &&
    !!date &&
    !!time &&
    !!coachProfile.primary_club_id;

  function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      const result = await coachCreateBookingAction({
        playerId,
        scheduledAt: `${date}T${time}:00`,
        durationMinutes: duration,
        clubId: coachProfile.primary_club_id!,
        notesCoach: notes.trim() || null,
      });
      if ("error" in result && result.error) {
        setError(result.error);
      } else {
        onSuccess();
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
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <p className="text-base font-black text-gray-900">Nueva sesión</p>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-5 space-y-4">
          {/* Player selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1">
              <User className="h-3 w-3" />
              Alumno
            </label>
            {students.length === 0 ? (
              <p className="text-sm text-gray-400 italic">
                No tenés alumnos activos. Invitá a un jugador primero.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {students.map((s) => (
                  <label
                    key={s.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      playerId === s.id
                        ? "border-blue-300 bg-blue-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="player"
                      value={s.id}
                      checked={playerId === s.id}
                      onChange={() => setPlayerId(s.id)}
                      className="sr-only"
                    />
                    <UserAvatar
                      src={s.avatar_url}
                      initials={s.display_name.slice(0, 2)}
                      size="xs"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {s.display_name}
                      </p>
                      {s.pasala_index != null && (
                        <p className="text-[11px] text-gray-400">
                          PASALA {s.pasala_index.toFixed(1)}
                        </p>
                      )}
                    </div>
                    {playerId === s.id && (
                      <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Fecha</label>
              <input
                type="date"
                value={date}
                min={today}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Hora</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Duración</label>
            <div className="flex gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`flex-1 py-2 rounded-xl border text-sm font-bold transition-colors ${
                    duration === d
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
              Notas para el alumno <span className="font-normal normal-case text-gray-400">(opcional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ej: Traé raqueta, trabajamos volea..."
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>

          {!coachProfile.primary_club_id && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              Necesitás configurar tu club principal antes de agendar sesiones.
            </p>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isPending || students.length === 0}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-black uppercase tracking-widest transition-colors"
          >
            {isPending ? "Agendando..." : "Agendar sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}

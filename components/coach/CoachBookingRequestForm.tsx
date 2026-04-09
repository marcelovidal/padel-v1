"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Clock } from "lucide-react";
import { playerRequestCoachBookingAction } from "@/lib/actions/coach.actions";

// ── Types ─────────────────────────────────────────────────────────────────────

type AvailabilitySlot = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  club_id: string;
};

interface Props {
  coachId: string;
  coachName: string;
  availability: AvailabilitySlot[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAYS_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function generateTimeSlots(start: string, end: string, durationMin: number): string[] {
  const slots: string[] = [];
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let current = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  while (current + durationMin <= endMinutes) {
    const h = Math.floor(current / 60).toString().padStart(2, "0");
    const m = (current % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
    current += durationMin;
  }
  return slots;
}

// ── Main component ────────────────────────────────────────────────────────────

export function CoachBookingRequestForm({ coachId, coachName, availability }: Props) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState("");
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const hasAvailability = availability.length > 0;

  // Días disponibles (para hint)
  const availableDayNumbers = useMemo(
    () => [...new Set(availability.map((a) => a.day_of_week))].sort(),
    [availability]
  );

  // Slots para el día seleccionado
  const slotsForDate = useMemo(() => {
    if (!date || !hasAvailability) return [];
    const dow = new Date(date + "T12:00:00").getDay(); // evitar offset UTC
    const dayAvailability = availability.filter((a) => a.day_of_week === dow);
    return dayAvailability.flatMap((a) =>
      generateTimeSlots(a.start_time, a.end_time, a.slot_duration_minutes).map((time) => ({
        time,
        duration: a.slot_duration_minutes,
      }))
    );
  }, [date, availability, hasAvailability]);

  const dayIsAvailable = date ? slotsForDate.length > 0 : true;
  const canSubmit = !!date && !!selectedTime && !!selectedDuration;

  function handleDateChange(newDate: string) {
    setDate(newDate);
    setSelectedTime(null);
    setSelectedDuration(null);
  }

  function handleSlotSelect(time: string, duration: number) {
    setSelectedTime(time);
    setSelectedDuration(duration);
  }

  function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      const result = await playerRequestCoachBookingAction({
        coachId,
        scheduledAt: `${date}T${selectedTime}:00`,
        durationMinutes: selectedDuration!,
        notesPlayer: notes.trim() || null,
      });
      if ("error" in result && result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  }

  // ── Success state ─────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
          <Check className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <p className="font-bold text-emerald-900">¡Solicitud enviada!</p>
          <p className="text-sm text-emerald-700 mt-1">
            {coachName} va a confirmar la clase a la brevedad.
          </p>
        </div>
        <button
          onClick={() => router.push("/player/calendario")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors"
        >
          <CalendarDays className="h-4 w-4" />
          Ver en mi calendario
        </button>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Días disponibles (hint) */}
      {hasAvailability && (
        <div className="flex flex-wrap gap-1.5">
          {DAYS_ES.map((label, i) => {
            const active = availableDayNumbers.includes(i);
            return (
              <span
                key={i}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  active
                    ? "bg-blue-50 border border-blue-200 text-blue-700"
                    : "bg-gray-50 border border-gray-100 text-gray-300"
                }`}
              >
                {label.slice(0, 3)}
              </span>
            );
          })}
        </div>
      )}

      {/* Date */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Fecha</label>
        <input
          type="date"
          value={date}
          min={today}
          onChange={e => handleDateChange(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
        {date && !dayIsAvailable && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {coachName} no tiene disponibilidad este día. Elegí otro.
          </p>
        )}
      </div>

      {/* Time slots */}
      {date && dayIsAvailable && slotsForDate.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
            Horario disponible
          </label>
          <div className="flex flex-wrap gap-2">
            {slotsForDate.map(({ time, duration }) => {
              const isSelected = selectedTime === time && selectedDuration === duration;
              const [h, m] = time.split(":").map(Number);
              const endMin = h * 60 + m + duration;
              const endH = Math.floor(endMin / 60).toString().padStart(2, "0");
              const endM = (endMin % 60).toString().padStart(2, "0");
              return (
                <button
                  key={`${time}-${duration}`}
                  type="button"
                  onClick={() => handleSlotSelect(time, duration)}
                  className={`px-3 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                    isSelected
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                  }`}
                >
                  {time} – {endH}:{endM}
                  <span className={`ml-1.5 text-[11px] ${isSelected ? "text-blue-100" : "text-gray-400"}`}>
                    {duration}min
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Fallback: sin disponibilidad configurada → inputs libres */}
      {!hasAvailability && (
        <div className="space-y-4">
          <p className="text-xs text-gray-400 italic">
            Este entrenador no configuró horarios fijos. Proponé el horario que te convenga.
          </p>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Hora</label>
            <input
              type="time"
              value={selectedTime ?? "10:00"}
              onChange={e => { setSelectedTime(e.target.value); setSelectedDuration(60); }}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Duración</label>
            <div className="flex gap-2">
              {[30, 45, 60].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDuration(d)}
                  className={`flex-1 py-2 rounded-xl border text-sm font-bold transition-colors ${
                    selectedDuration === d
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
          Notas para el entrenador{" "}
          <span className="font-normal normal-case text-gray-400">(opcional)</span>
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Ej: Quiero trabajar volea, soy principiante..."
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || isPending}
        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-black uppercase tracking-widest transition-colors"
      >
        {isPending ? "Enviando solicitud..." : "Solicitar clase"}
      </button>

      <p className="text-xs text-center text-gray-400">
        El entrenador confirmará o rechazará tu solicitud.
      </p>
    </div>
  );
}

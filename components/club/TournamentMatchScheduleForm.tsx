"use client";

import { useEffect, useMemo, useState } from "react";
import { scheduleTournamentMatchAction } from "@/lib/actions/tournaments.actions";

type CourtOption = {
  id: string;
  name: string;
  opening_time: string;
  closing_time: string;
  slot_interval_minutes: number | null;
};

type Props = {
  tournamentId: string;
  tournamentMatchId: string;
  courts: CourtOption[];
  defaultDate: string;
  defaultTime: string;
  defaultCourtId: string;
  isScheduled: boolean;
  defaultSlotDurationMinutes: number;
};

function parseTimeToMinutes(value: string): number {
  const [h = "0", m = "0"] = value.split(":");
  return Number(h) * 60 + Number(m);
}

function formatMinutesToTime(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function buildSlots(opening: string, closing: string, intervalMinutes: number): string[] {
  const openMinutes = parseTimeToMinutes(opening);
  const closeMinutes = parseTimeToMinutes(closing);
  const slots: string[] = [];
  for (let current = openMinutes; current + intervalMinutes <= closeMinutes; current += intervalMinutes) {
    slots.push(formatMinutesToTime(current));
  }
  return slots;
}

export function TournamentMatchScheduleForm({
  tournamentId,
  tournamentMatchId,
  courts,
  defaultDate,
  defaultTime,
  defaultCourtId,
  isScheduled,
  defaultSlotDurationMinutes,
}: Props) {
  const [courtId, setCourtId] = useState(defaultCourtId || "");
  const [matchDate, setMatchDate] = useState(defaultDate || "");
  const [matchTime, setMatchTime] = useState(defaultTime || "");
  const [isEditing, setIsEditing] = useState(!isScheduled);

  const selectedCourt = useMemo(() => courts.find((c) => c.id === courtId) || null, [courts, courtId]);
  const slotInterval = selectedCourt?.slot_interval_minutes || defaultSlotDurationMinutes || 90;
  const timeOptions = useMemo(() => {
    if (!selectedCourt) return [];
    return buildSlots(selectedCourt.opening_time, selectedCourt.closing_time, slotInterval);
  }, [selectedCourt, slotInterval]);

  useEffect(() => {
    if (!selectedCourt) { setMatchTime(""); return; }
    if (!timeOptions.includes(matchTime)) setMatchTime(timeOptions[0] || "");
  }, [selectedCourt, timeOptions, matchTime]);

  const inputsLocked = isScheduled && !isEditing;
  const canSubmit = Boolean(courtId && matchDate && matchTime) && (!isScheduled || isEditing);

  return (
    <form action={scheduleTournamentMatchAction} className="mt-2 grid gap-2 md:grid-cols-5">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <input type="hidden" name="tournament_match_id" value={tournamentMatchId} />
      <select
        name="court_id"
        value={courtId}
        onChange={(e) => setCourtId(e.target.value)}
        className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
        required
        disabled={inputsLocked}
      >
        <option value="">Cancha</option>
        {courts.map((court) => (
          <option key={court.id} value={court.id}>{court.name}</option>
        ))}
      </select>
      <input
        type="date"
        name="match_date"
        value={matchDate}
        onChange={(e) => setMatchDate(e.target.value)}
        className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
        required
        disabled={inputsLocked}
      />
      <select
        name="match_time"
        value={matchTime}
        onChange={(e) => setMatchTime(e.target.value)}
        className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
        required
        disabled={inputsLocked || !selectedCourt || !matchDate}
      >
        <option value="">
          {!selectedCourt ? "Primero selecciona cancha" : !matchDate ? "Luego selecciona fecha" : "Selecciona horario"}
        </option>
        {timeOptions.map((time) => (
          <option key={time} value={time}>{time}</option>
        ))}
      </select>
      <div className="md:col-span-2">
        {isScheduled && !isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="rounded-lg border border-green-300 bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700"
          >
            Partido programado (editar)
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              disabled={!canSubmit}
              className={
                canSubmit
                  ? isScheduled
                    ? "rounded-lg border border-green-300 bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700"
                    : "rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                  : "rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-400"
              }
            >
              {isScheduled ? "Guardar cambios" : "Guardar programacion"}
            </button>
            {isScheduled ? (
              <button
                type="button"
                onClick={() => {
                  setCourtId(defaultCourtId || "");
                  setMatchDate(defaultDate || "");
                  setMatchTime(defaultTime || "");
                  setIsEditing(false);
                }}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
            ) : null}
          </div>
        )}
        {selectedCourt ? (
          <p className="mt-1 text-[11px] text-gray-500">
            Slots validos: {selectedCourt.opening_time.slice(0, 5)}-{selectedCourt.closing_time.slice(0, 5)} cada {slotInterval} min.
          </p>
        ) : (
          <p className="mt-1 text-[11px] text-gray-500">Orden recomendado: cancha, fecha y luego horario.</p>
        )}
      </div>
    </form>
  );
}

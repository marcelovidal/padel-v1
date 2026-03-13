"use client";

import { useState, useTransition, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import { ChevronLeft, ChevronRight, X, CheckCircle2, XCircle, Calendar, Plus } from "lucide-react";
import type { AgendaSlot, ClubCourtRow } from "@/repositories/booking.repository";

// ─── Constantes visuales ──────────────────────────────────────────────────────

const HOUR_PX = 64; // px por hora
const MIN_PX = HOUR_PX / 60; // px por minuto
const GRID_START_HOUR = 8; // 08:00
const GRID_END_HOUR = 23; // 23:00
const GRID_START_MIN = GRID_START_HOUR * 60;
const GRID_END_MIN = GRID_END_HOUR * 60;
const GRID_TOTAL_PX = (GRID_END_MIN - GRID_START_MIN) * MIN_PX;
const COURT_COL_W = 176; // px por columna de cancha
const TIME_COL_W = 52; // px columna de hora

// ─── Colores por tipo ─────────────────────────────────────────────────────────

const SLOT_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  booking_requested: {
    bg: "bg-amber-50",
    border: "border-amber-300",
    text: "text-amber-800",
    label: "Solicitud",
  },
  booking_confirmed: {
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    text: "text-emerald-800",
    label: "Confirmada",
  },
  league_match: {
    bg: "bg-purple-50",
    border: "border-purple-300",
    text: "text-purple-800",
    label: "Liga",
  },
  tournament_match: {
    bg: "bg-indigo-50",
    border: "border-indigo-300",
    text: "text-indigo-800",
    label: "Torneo",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convierte "HH:mm" o "HH:mm:ss" a minutos desde medianoche */
function timeStrToMinutes(t: string | null | undefined): number {
  if (!t) return 0;
  const parts = String(t).split(":");
  return parseInt(parts[0] || "0", 10) * 60 + parseInt(parts[1] || "0", 10);
}

// ─── Helpers de fecha/hora ────────────────────────────────────────────────────

function toLocalMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDate(raw: string): Date {
  const d = new Date(`${raw}T00:00:00`);
  return isNaN(d.getTime()) ? new Date() : d;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function startOfWeekMonday(d: Date): Date {
  const copy = new Date(d);
  const dow = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - dow);
  return copy;
}

function formatDateLabel(d: Date): string {
  return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
}

function slotsForDay(slots: AgendaSlot[], dateStr: string): AgendaSlot[] {
  return slots.filter((s) => {
    const d = new Date(s.start_at);
    return toDateStr(d) === dateStr;
  });
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function SlotPill({ slot, onClick }: { slot: AgendaSlot; onClick: () => void }) {
  const style = SLOT_STYLES[slot.slot_type] ?? SLOT_STYLES.booking_confirmed;
  const startMin = toLocalMinutes(slot.start_at);
  const endMin = toLocalMinutes(slot.end_at);
  const top = Math.max(0, (startMin - GRID_START_MIN) * MIN_PX);
  const height = Math.max(24, (endMin - startMin) * MIN_PX - 2);

  const label =
    slot.slot_type === "booking_requested" || slot.slot_type === "booking_confirmed"
      ? slot.requester_name || "Reserva"
      : slot.entity_name || slot.slot_type;

  const sub =
    slot.team_a && slot.team_b ? `${slot.team_a} vs ${slot.team_b}` : null;

  return (
    <button
      onClick={onClick}
      style={{ top, height, left: 4, right: 4 }}
      className={`absolute rounded-lg border px-2 py-1 text-left transition-shadow hover:shadow-md ${style.bg} ${style.border} ${style.text} overflow-hidden`}
    >
      <p className="truncate text-[10px] font-black uppercase tracking-wide">{style.label}</p>
      <p className="truncate text-xs font-semibold leading-tight">{label}</p>
      {sub && <p className="truncate text-[9px] opacity-70">{sub}</p>}
      <p className="text-[9px] opacity-60">
        {formatTime(slot.start_at)} – {formatTime(slot.end_at)}
      </p>
    </button>
  );
}

function TimeAxis() {
  const labels: string[] = [];
  for (let h = GRID_START_HOUR; h <= GRID_END_HOUR; h++) {
    labels.push(`${String(h).padStart(2, "0")}:00`);
  }
  return (
    <div className="relative shrink-0" style={{ width: TIME_COL_W, height: GRID_TOTAL_PX }}>
      {labels.map((label, i) => (
        <div
          key={label}
          style={{ top: i * HOUR_PX - 8 }}
          className="absolute right-2 text-[10px] text-gray-400 tabular-nums"
        >
          {label}
        </div>
      ))}
    </div>
  );
}

function GridLines() {
  const lines: number[] = [];
  for (let h = GRID_START_HOUR; h <= GRID_END_HOUR; h++) {
    lines.push(h);
  }
  return (
    <>
      {lines.map((h) => (
        <div
          key={h}
          style={{ top: (h - GRID_START_HOUR) * HOUR_PX }}
          className="absolute inset-x-0 border-t border-gray-100"
        />
      ))}
    </>
  );
}

// ─── Tipos de creación ────────────────────────────────────────────────────────

type PlayerOption = { id: string; label: string };

type CreateTarget = {
  courtId: string;
  courtName: string;
  dateStr: string;   // YYYY-MM-DD
  time: string;      // HH:mm
  slotMinutes: number;
};

// ─── Modal de detalle ─────────────────────────────────────────────────────────

function SlotModal({
  slot,
  onClose,
  confirmAction,
  rejectAction,
  cancelAction,
}: {
  slot: AgendaSlot;
  onClose: () => void;
  confirmAction: (fd: FormData) => Promise<any>;
  rejectAction: (fd: FormData) => Promise<any>;
  cancelAction: (fd: FormData) => Promise<any>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  const style = SLOT_STYLES[slot.slot_type] ?? SLOT_STYLES.booking_confirmed;
  const isBookingRequested = slot.slot_type === "booking_requested";
  const isBookingConfirmed = slot.slot_type === "booking_confirmed";
  const isEvent = slot.slot_type === "league_match" || slot.slot_type === "tournament_match";

  function runAction(action: (fd: FormData) => Promise<any>, extraFields?: Record<string, string>) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("booking_id", slot.entity_id);
      if (extraFields) {
        Object.entries(extraFields).forEach(([k, v]) => fd.set(k, v));
      }
      await action(fd);
      router.refresh();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Cerrar"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="relative z-51 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${style.bg} ${style.border} ${style.text} border`}>
              {style.label}
            </span>
            <p className="mt-1.5 text-base font-black text-slate-900">{slot.court_name}</p>
            <p className="text-sm text-slate-500">
              {formatTime(slot.start_at)} – {formatTime(slot.end_at)}
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-xl p-1.5 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* Detalle */}
        <div className="space-y-2 text-sm">
          {slot.requester_name && (
            <div className="flex justify-between">
              <span className="text-slate-500">Solicitante</span>
              <span className="font-semibold text-slate-800">{slot.requester_name}</span>
            </div>
          )}
          {slot.entity_name && (
            <div className="flex justify-between">
              <span className="text-slate-500">Evento</span>
              <span className="font-semibold text-slate-800">{slot.entity_name}</span>
            </div>
          )}
          {slot.team_a && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs space-y-1">
              <p><span className="font-black text-slate-400 uppercase tracking-wide">Pareja A </span>{slot.team_a}</p>
              <p><span className="font-black text-slate-400 uppercase tracking-wide">Pareja B </span>{slot.team_b}</p>
            </div>
          )}
          {slot.note && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
              {slot.note}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="mt-4 space-y-2">
          {isBookingRequested && !showReject && (
            <>
              <button
                disabled={isPending}
                onClick={() => runAction(confirmAction)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirmar reserva
              </button>
              <button
                disabled={isPending}
                onClick={() => setShowReject(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                <XCircle className="h-4 w-4" />
                Rechazar
              </button>
            </>
          )}

          {isBookingRequested && showReject && (
            <div className="space-y-2">
              <textarea
                rows={2}
                placeholder="Motivo (opcional)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
              />
              <div className="flex gap-2">
                <button
                  disabled={isPending}
                  onClick={() => runAction(rejectAction, { reason: rejectReason })}
                  className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  Confirmar rechazo
                </button>
                <button
                  onClick={() => setShowReject(false)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Volver
                </button>
              </div>
            </div>
          )}

          {isBookingConfirmed && (
            <button
              disabled={isPending}
              onClick={() => runAction(cancelAction)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              <XCircle className="h-4 w-4" />
              Cancelar reserva
            </button>
          )}

          {isEvent && slot.match_id && (
            <a
              href={`/club/matches/${slot.match_id}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Ver partido
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Modal de creación ────────────────────────────────────────────────────────

function CreateBookingModal({
  target,
  clubId,
  players,
  createAction,
  onClose,
}: {
  target: CreateTarget;
  clubId: string;
  players: PlayerOption[];
  createAction: (prev: any, fd: FormData) => Promise<{ success: boolean; error?: string }>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(createAction, null);
  const [query, setQuery] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [playerLabel, setPlayerLabel] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? players.filter((p) => p.label.toLowerCase().includes(query.toLowerCase()))
    : players.slice(0, 8);

  // Cierra dropdown al hacer click fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Cierra el modal al crear con éxito
  useEffect(() => {
    if ((state as any)?.success) {
      router.refresh();
      onClose();
    }
  }, [state, router, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Cerrar"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="relative z-[51] w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-blue-700">
              Nueva reserva
            </span>
            <p className="mt-1.5 text-base font-black text-slate-900">{target.courtName}</p>
            <p className="text-sm text-slate-500">
              {target.dateStr} · {target.time} ({target.slotMinutes} min)
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-xl p-1.5 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <form action={formAction} className="space-y-3">
          {/* Campos ocultos */}
          <input type="hidden" name="club_id" value={clubId} />
          <input type="hidden" name="court_id" value={target.courtId} />
          <input type="hidden" name="selected_date" value={target.dateStr} />
          <input type="hidden" name="start_time" value={target.time} />
          <input type="hidden" name="slot_minutes" value={target.slotMinutes} />
          <input type="hidden" name="player_id" value={playerId} />

          {/* Selector de jugador */}
          <div ref={dropdownRef} className="relative">
            <label className="mb-1 block text-xs font-bold text-slate-600">Jugador</label>
            <input
              type="text"
              value={playerLabel || query}
              placeholder="Buscar jugador..."
              onChange={(e) => {
                setQuery(e.target.value);
                setPlayerLabel("");
                setPlayerId("");
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              autoComplete="off"
            />
            {showDropdown && filtered.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setPlayerId(p.id);
                      setPlayerLabel(p.label);
                      setQuery("");
                      setShowDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-700"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Nota */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Nota (opcional)</label>
            <textarea
              name="note"
              rows={2}
              placeholder="Agrega una nota..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
            />
          </div>

          {/* Error */}
          {(state as any)?.error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {(state as any).error}
            </p>
          )}

          {/* Botón */}
          <button
            type="submit"
            disabled={!playerId}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            Crear reserva confirmada
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Vista diaria ─────────────────────────────────────────────────────────────

function DayView({
  courts,
  slots,
  dateStr,
  onSelect,
  onCellClick,
}: {
  courts: ClubCourtRow[];
  slots: AgendaSlot[];
  dateStr: string;
  onSelect: (slot: AgendaSlot) => void;
  onCellClick?: (courtId: string, courtName: string, time: string, slotMinutes: number) => void;
}) {
  if (courts.length === 0) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400">
        No hay canchas activas configuradas.
      </div>
    );
  }

  function handleColumnClick(
    e: React.MouseEvent<HTMLDivElement>,
    court: ClubCourtRow,
  ) {
    if ((e.target as HTMLElement).closest("button")) return; // click en slot existente
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const totalMinutes = GRID_START_MIN + y / MIN_PX;
    const rounded = Math.floor(totalMinutes / 30) * 30; // snap a 30 min

    // Validar horario de la cancha
    const openMin = timeStrToMinutes(court.opening_time);
    const closeMin = timeStrToMinutes(court.closing_time);
    const slotMinutes = court.slot_interval_minutes || 90;
    if (rounded < openMin || rounded + slotMinutes > closeMin) return; // fuera de horario

    const clamped = Math.max(GRID_START_MIN, Math.min(GRID_END_MIN - 30, rounded));
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    onCellClick?.(court.id, court.name, time, slotMinutes);
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Cabecera de canchas */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <div style={{ minWidth: TIME_COL_W, width: TIME_COL_W }} className="shrink-0" />
        {courts.map((court) => (
          <div
            key={court.id}
            style={{ minWidth: COURT_COL_W }}
            className="flex-1 border-l border-gray-200 px-3 py-2.5 text-center"
          >
            <p className="text-xs font-black text-gray-700">{court.name}</p>
            <p className="text-[10px] text-gray-400">
              {court.opening_time?.slice(0, 5)} – {court.closing_time?.slice(0, 5)}
            </p>
          </div>
        ))}
      </div>

      {/* Grid de tiempo */}
      <div className="flex" style={{ height: GRID_TOTAL_PX }}>
        {/* Eje de tiempo */}
        <div style={{ minWidth: TIME_COL_W, width: TIME_COL_W }} className="shrink-0 relative">
          <TimeAxis />
        </div>

        {/* Columnas de cancha */}
        {courts.map((court) => {
          const courtSlots = slots.filter((s) => s.court_id === court.id);
          const openMin = timeStrToMinutes(court.opening_time);
          const closeMin = timeStrToMinutes(court.closing_time);
          // Zonas cerradas en px relativas al grid
          const closedTopHeight = Math.max(0, (openMin - GRID_START_MIN) * MIN_PX);
          const closedBottomTop = Math.min(GRID_TOTAL_PX, (closeMin - GRID_START_MIN) * MIN_PX);
          const closedBottomHeight = Math.max(0, GRID_TOTAL_PX - closedBottomTop);

          return (
            <div
              key={court.id}
              style={{ minWidth: COURT_COL_W, height: GRID_TOTAL_PX }}
              className="relative flex-1 border-l border-gray-100 cursor-crosshair"
              onClick={(e) => handleColumnClick(e, court)}
            >
              <GridLines />

              {/* Zona cerrada superior (antes de apertura) */}
              {closedTopHeight > 0 && (
                <div
                  style={{ top: 0, height: closedTopHeight }}
                  className="absolute inset-x-0 pointer-events-none"
                  aria-hidden
                >
                  <div className="w-full h-full bg-gray-100/80" style={{
                    backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.04) 4px, rgba(0,0,0,0.04) 8px)"
                  }} />
                </div>
              )}

              {/* Zona cerrada inferior (después de cierre) */}
              {closedBottomHeight > 0 && (
                <div
                  style={{ top: closedBottomTop, height: closedBottomHeight }}
                  className="absolute inset-x-0 pointer-events-none"
                  aria-hidden
                >
                  <div className="w-full h-full bg-gray-100/80" style={{
                    backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.04) 4px, rgba(0,0,0,0.04) 8px)"
                  }} />
                </div>
              )}

              {courtSlots.map((slot) => (
                <SlotPill key={slot.slot_id} slot={slot} onClick={() => onSelect(slot)} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Vista semanal ────────────────────────────────────────────────────────────

function WeekView({
  courts,
  slots,
  weekStart,
  onSelect,
}: {
  courts: ClubCourtRow[];
  slots: AgendaSlot[];
  weekStart: Date;
  onSelect: (slot: AgendaSlot) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wide text-gray-400">
              Cancha
            </th>
            {days.map((d) => (
              <th
                key={toDateStr(d)}
                className="px-2 py-2.5 text-center text-[10px] font-black uppercase tracking-wide text-gray-500"
              >
                {formatDateLabel(d)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {courts.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-8 text-center text-sm text-gray-400">
                No hay canchas activas configuradas.
              </td>
            </tr>
          ) : (
            courts.map((court) => (
              <tr key={court.id} className="border-b border-gray-100 last:border-0">
                <td className="whitespace-nowrap px-3 py-3 font-semibold text-gray-700">
                  {court.name}
                </td>
                {days.map((d) => {
                  const dayStr = toDateStr(d);
                  const daySlots = slotsForDay(slots, dayStr).filter(
                    (s) => s.court_id === court.id,
                  );
                  return (
                    <td key={dayStr} className="px-2 py-2 align-top">
                      {daySlots.length === 0 ? (
                        <span className="text-[10px] text-gray-300">—</span>
                      ) : (
                        <div className="space-y-1">
                          {daySlots.map((slot) => {
                            const style = SLOT_STYLES[slot.slot_type];
                            return (
                              <button
                                key={slot.slot_id}
                                onClick={() => onSelect(slot)}
                                className={`w-full rounded-lg border px-2 py-1 text-left text-[10px] ${style.bg} ${style.border} ${style.text}`}
                              >
                                <span className="font-black">{formatTime(slot.start_at)}</span>{" "}
                                {slot.requester_name || slot.entity_name || style.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

type View = "day" | "week";

type Props = {
  courts: ClubCourtRow[];
  slots: AgendaSlot[];
  initialDate: string;
  initialView: View;
  confirmAction: (fd: FormData) => Promise<any>;
  rejectAction: (fd: FormData) => Promise<any>;
  cancelAction: (fd: FormData) => Promise<any>;
  createAction?: (prev: any, fd: FormData) => Promise<{ success: boolean; error?: string }>;
  clubId?: string;
  players?: PlayerOption[];
  baseHref?: string;
};

export function AgendaGrid({
  courts,
  slots,
  initialDate,
  initialView,
  confirmAction,
  rejectAction,
  cancelAction,
  createAction,
  clubId,
  players = [],
  baseHref = "/club/dashboard/bookings",
}: Props) {
  const router = useRouter();
  const [view, setView] = useState<View>(initialView);
  const [selectedSlot, setSelectedSlot] = useState<AgendaSlot | null>(null);
  const [createTarget, setCreateTarget] = useState<CreateTarget | null>(null);

  const currentDate = parseDate(initialDate);
  const weekStart = startOfWeekMonday(currentDate);

  const navigate = useCallback(
    (date: Date, v: View) => {
      const dateStr = toDateStr(date);
      router.push(`${baseHref}?date=${dateStr}&view=${v}`);
    },
    [router, baseHref],
  );

  function prevPeriod() {
    if (view === "week") navigate(addDays(weekStart, -7), "week");
    else navigate(addDays(currentDate, -1), "day");
  }

  function nextPeriod() {
    if (view === "week") navigate(addDays(weekStart, 7), "week");
    else navigate(addDays(currentDate, 1), "day");
  }

  function switchView(v: View) {
    setView(v);
    navigate(currentDate, v);
  }

  const periodLabel =
    view === "week"
      ? `${formatDateLabel(weekStart)} – ${formatDateLabel(addDays(weekStart, 6))}`
      : formatDateLabel(currentDate);

  return (
    <div className="space-y-3">
      {/* Barra de navegación */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={prevPeriod}
            className="rounded-xl border border-gray-200 p-2 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2">
            <Calendar className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-sm font-semibold text-gray-700 capitalize">{periodLabel}</span>
          </div>
          <button
            onClick={nextPeriod}
            className="rounded-xl border border-gray-200 p-2 hover:bg-gray-50"
          >
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
          <button
            onClick={() => switchView("day")}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-colors ${
              view === "day"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Día
          </button>
          <button
            onClick={() => switchView("week")}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-colors ${
              view === "week"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Semana
          </button>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(SLOT_STYLES).map(([type, style]) => (
          <span key={type} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${style.bg} ${style.border} ${style.text}`}>
            {style.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-gray-400">
          Libre
        </span>
      </div>

      {/* Grid */}
      {view === "day" ? (
        <DayView
          courts={courts}
          slots={slots}
          dateStr={toDateStr(currentDate)}
          onSelect={setSelectedSlot}
          onCellClick={
            createAction && clubId
              ? (courtId, courtName, time, slotMinutes) =>
                  setCreateTarget({ courtId, courtName, dateStr: toDateStr(currentDate), time, slotMinutes })
              : undefined
          }
        />
      ) : (
        <WeekView
          courts={courts}
          slots={slots}
          weekStart={weekStart}
          onSelect={setSelectedSlot}
        />
      )}

      {/* Modal detalle */}
      {selectedSlot && (
        <SlotModal
          slot={selectedSlot}
          onClose={() => setSelectedSlot(null)}
          confirmAction={confirmAction}
          rejectAction={rejectAction}
          cancelAction={cancelAction}
        />
      )}

      {/* Modal creación */}
      {createTarget && createAction && clubId && (
        <CreateBookingModal
          target={createTarget}
          clubId={clubId}
          players={players}
          createAction={createAction}
          onClose={() => setCreateTarget(null)}
        />
      )}
    </div>
  );
}

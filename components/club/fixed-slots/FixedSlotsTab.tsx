"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import { X, Plus, RefreshCw, MessageCircle } from "lucide-react";
import { createGuestPlayerAction } from "@/lib/actions/player.actions";
import type { assignFixedSlotAction, releaseFixedSlotAction } from "@/lib/actions/fixed-slot.actions";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type FixedSlotRow = {
  id: string;
  club_id: string;
  court_id: string;
  player_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  status: string;
  note: string | null;
  court_name: string;
  player_display_name: string | null;
};

type CourtOption = {
  id: string;
  name: string;
  opening_time: string;
  closing_time: string;
  slot_interval_minutes: number | null;
};

type PlayerOption = { id: string; label: string };

// ─── Constantes ───────────────────────────────────────────────────────────────

const DOW_OPTIONS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

const DOW_LABEL: Record<number, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSlotOptions(opening: string, closing: string, slotMin: number): string[] {
  const parse = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return isNaN(h) || isNaN(m) ? null : h * 60 + m;
  };
  const open = parse(opening);
  const close = parse(closing);
  if (open === null || close === null || close <= open || slotMin <= 0) return [];
  const options: string[] = [];
  for (let cur = open; cur + slotMin <= close; cur += slotMin) {
    options.push(`${String(Math.floor(cur / 60)).padStart(2, "0")}:${String(cur % 60).padStart(2, "0")}`);
  }
  return options;
}

function addTimeMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// ─── Modal "Nuevo turno fijo" ─────────────────────────────────────────────────

function NewFixedSlotModal({
  clubId,
  clubName,
  courts,
  players,
  assignAction,
  onClose,
}: {
  clubId: string;
  clubName: string;
  courts: CourtOption[];
  players: PlayerOption[];
  assignAction: typeof assignFixedSlotAction;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(assignAction, null);

  const [selectedCourtId, setSelectedCourtId] = useState(courts[0]?.id ?? "");
  const [selectedDow, setSelectedDow] = useState<number>(1);
  const [selectedTime, setSelectedTime] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [playerLabel, setPlayerLabel] = useState("");
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestFirstName, setGuestFirstName] = useState("");
  const [guestLastName, setGuestLastName] = useState("");
  const [guestSubmitting, setGuestSubmitting] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);
  const [isGuestSelected, setIsGuestSelected] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCourt = courts.find((c) => c.id === selectedCourtId);
  const slotMin = selectedCourt?.slot_interval_minutes || 90;
  const slotOptions = selectedCourt
    ? buildSlotOptions(
        selectedCourt.opening_time?.slice(0, 5) || "09:00",
        selectedCourt.closing_time?.slice(0, 5) || "23:00",
        slotMin,
      )
    : [];

  const endTime = selectedTime ? addTimeMinutes(selectedTime, slotMin) : "";

  useEffect(() => {
    if (slotOptions.length > 0) setSelectedTime(slotOptions[0]);
    else setSelectedTime("");
  }, [selectedCourtId]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if ((state as any)?.success) {
      if ((state as any).isGuest && isGuestSelected) {
        setShowWhatsApp(true);
      } else {
        router.refresh();
        onClose();
      }
    }
  }, [state]);

  async function handleAddGuest() {
    const displayName = [guestFirstName.trim(), guestLastName.trim()].filter(Boolean).join(" ");
    if (!displayName) return;
    setGuestSubmitting(true);
    setGuestError(null);
    const fd = new FormData();
    fd.set("display_name", displayName);
    fd.set("first_name", guestFirstName.trim());
    if (guestLastName.trim()) fd.set("last_name", guestLastName.trim());
    const result = await createGuestPlayerAction(fd);
    setGuestSubmitting(false);
    if (result.error) { setGuestError(result.error); return; }
    setPlayerId(result.data!);
    setPlayerLabel(displayName);
    setIsGuestSelected(true);
    setShowGuestForm(false);
    setGuestFirstName("");
    setGuestLastName("");
  }

  const filtered = query.trim()
    ? players.filter((p) => p.label.toLowerCase().includes(query.toLowerCase()))
    : players.slice(0, 8);

  // WhatsApp message after guest assign
  const courtName = selectedCourt?.name ?? "";
  const dowLabel = DOW_LABEL[selectedDow] ?? "";
  const waMessage = `Hola ${playerLabel}, tu turno fijo en ${clubName} quedó reservado: ${dowLabel} ${selectedTime} en ${courtName}.`;

  if (showWhatsApp) {
    return (
      <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-4">
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]" />
        <div className="relative z-[41] w-full max-w-sm rounded-t-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-2xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-violet-700">
                Turno fijo asignado
              </span>
              <p className="mt-1.5 text-base font-black text-slate-900">{playerLabel}</p>
              <p className="text-sm text-slate-500">{dowLabel} · {selectedTime} · {courtName}</p>
            </div>
            <button onClick={() => { router.refresh(); onClose(); }} className="shrink-0 rounded-xl p-1.5 hover:bg-slate-100">
              <X className="h-4 w-4 text-slate-500" />
            </button>
          </div>
          <p className="mb-3 text-sm text-slate-600">
            El jugador es invitado — no recibirá notificación automática. Podés avisarle por WhatsApp:
          </p>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(waMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-sm font-bold text-white hover:bg-[#128C7E]"
          >
            <MessageCircle className="h-4 w-4 fill-current" />
            Enviar por WhatsApp
          </a>
          <button
            onClick={() => { router.refresh(); onClose(); }}
            className="mt-2 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Listo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-4">
      <button
        aria-label="Cerrar"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="relative z-[41] w-full max-w-sm rounded-t-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-violet-700">
              <RefreshCw className="h-2.5 w-2.5" />
              Nuevo turno fijo
            </span>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-xl p-1.5 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <form action={formAction} className="space-y-3">
          <input type="hidden" name="club_id" value={clubId} />
          <input type="hidden" name="player_id" value={playerId} />
          <input type="hidden" name="end_time" value={endTime} />

          {/* Cancha */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Cancha</label>
            <select
              name="court_id"
              value={selectedCourtId}
              onChange={(e) => setSelectedCourtId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            >
              {courts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Día de semana */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Día de semana</label>
            <select
              name="day_of_week"
              value={selectedDow}
              onChange={(e) => setSelectedDow(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            >
              {DOW_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          {/* Horario */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Horario</label>
            {slotOptions.length === 0 ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Configurá los horarios de la cancha primero.
              </p>
            ) : (
              <select
                name="start_time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
              >
                {slotOptions.map((t) => (
                  <option key={t} value={t}>{t} ({slotMin} min)</option>
                ))}
              </select>
            )}
          </div>

          {/* Jugador */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Jugador</label>
            {showGuestForm ? (
              <div className="space-y-2 rounded-xl border border-violet-100 bg-violet-50/40 p-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-violet-700">Nuevo jugador</p>
                <input
                  type="text"
                  placeholder="Nombre *"
                  value={guestFirstName}
                  onChange={(e) => setGuestFirstName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-violet-500"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Apellido"
                  value={guestLastName}
                  onChange={(e) => setGuestLastName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-violet-500"
                />
                {guestError && <p className="text-xs text-red-600">{guestError}</p>}
                <div className="flex gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={handleAddGuest}
                    disabled={!guestFirstName.trim() || guestSubmitting}
                    className="flex-1 rounded-lg bg-violet-600 py-1.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-40"
                  >
                    {guestSubmitting ? "Agregando..." : "Agregar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowGuestForm(false); setGuestFirstName(""); setGuestLastName(""); setGuestError(null); }}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : playerId && isGuestSelected ? (
              <div className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2">
                <span className="text-[10px] font-black uppercase tracking-wide text-violet-600">Nuevo jugador</span>
                <span className="flex-1 text-sm font-semibold text-slate-800">{playerLabel}</span>
                <button
                  type="button"
                  onClick={() => { setPlayerId(""); setPlayerLabel(""); setIsGuestSelected(false); }}
                  className="rounded p-0.5 hover:bg-violet-100"
                >
                  <X className="h-3.5 w-3.5 text-violet-500" />
                </button>
              </div>
            ) : (
              <>
                <div ref={dropdownRef} className="relative">
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
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
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
                          className="w-full px-3 py-2 text-left text-sm hover:bg-violet-50 hover:text-violet-700"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuestForm(true)}
                  className="mt-1.5 text-xs font-semibold text-violet-600 hover:text-violet-800"
                >
                  + Cargar jugador nuevo
                </button>
              </>
            )}
          </div>

          {/* Nota */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Nota (opcional)</label>
            <textarea
              name="note"
              rows={2}
              placeholder="Agrega una nota..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
          </div>

          {(state as any)?.error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {(state as any).error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={!playerId || slotOptions.length === 0 || !selectedTime}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-40"
            >
              <RefreshCw className="h-4 w-4" />
              Asignar turno fijo
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal de confirmación "Liberar" ─────────────────────────────────────────

function ReleaseConfirmModal({
  slot,
  releaseAction,
  onClose,
}: {
  slot: FixedSlotRow;
  releaseAction: typeof releaseFixedSlotAction;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRelease() {
    startTransition(async () => {
      setError(null);
      const fd = new FormData();
      fd.set("fixed_slot_id", slot.id);
      const result = await releaseAction(fd);
      if (result.success) {
        router.refresh();
        onClose();
      } else {
        setError(result.error ?? "Error al liberar.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative z-[51] w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <p className="text-base font-black text-slate-900">¿Liberar turno fijo?</p>
        <p className="mt-1 text-sm text-slate-600">
          ¿Liberar el turno fijo de{" "}
          <span className="font-semibold">{slot.player_display_name || "invitado"}</span> los{" "}
          <span className="font-semibold">{DOW_LABEL[slot.day_of_week]}</span> a las{" "}
          <span className="font-semibold">{slot.start_time?.slice(0, 5)}</span>?
        </p>
        {error && (
          <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <div className="mt-4 flex gap-2">
          <button
            disabled={isPending}
            onClick={handleRelease}
            className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {isPending ? "Liberando..." : "Sí, liberar"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function FixedSlotsTab({
  clubId,
  clubName,
  courts,
  players,
  initialFixedSlots,
  assignAction,
  releaseAction,
}: {
  clubId: string;
  clubName: string;
  courts: CourtOption[];
  players: PlayerOption[];
  initialFixedSlots: FixedSlotRow[];
  assignAction: typeof assignFixedSlotAction;
  releaseAction: typeof releaseFixedSlotAction;
}) {
  const [showNewModal, setShowNewModal] = useState(false);
  const [releaseTarget, setReleaseTarget] = useState<FixedSlotRow | null>(null);

  // Group by day_of_week for display
  const byDay = DOW_OPTIONS.map((dow) => ({
    ...dow,
    slots: initialFixedSlots.filter((s) => s.day_of_week === dow.value),
  })).filter((d) => d.slots.length > 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-violet-600" />
            Turnos fijos
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Reservas recurrentes semanales asignadas a jugadores.
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo turno fijo
        </button>
      </div>

      {/* Lista */}
      {initialFixedSlots.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/30 p-8 text-center">
          <RefreshCw className="mx-auto mb-2 h-8 w-8 text-violet-300" />
          <p className="text-sm font-semibold text-violet-700">No hay turnos fijos activos</p>
          <p className="mt-1 text-xs text-violet-500">
            Asigná turnos recurrentes semanales a tus jugadores habituales.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {byDay.map((group) => (
            <div key={group.value} className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
              <div className="border-b border-gray-100 bg-gray-50 px-4 py-2">
                <p className="text-xs font-black uppercase tracking-wider text-gray-500">{group.label}</p>
              </div>
              <div className="divide-y divide-gray-50">
                {group.slots.map((slot) => (
                  <div key={slot.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0 rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-center">
                        <p className="text-xs font-black text-violet-700 tabular-nums">
                          {slot.start_time?.slice(0, 5)}
                        </p>
                        <p className="text-[9px] text-violet-400 tabular-nums">
                          {slot.end_time?.slice(0, 5)}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {slot.player_display_name || "Invitado"}
                        </p>
                        <p className="text-xs text-gray-500">{slot.court_name}</p>
                        {slot.note && (
                          <p className="truncate text-xs text-gray-400">{slot.note}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setReleaseTarget(slot)}
                      className="shrink-0 rounded-xl border border-red-100 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                    >
                      Liberar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modales */}
      {showNewModal && (
        <NewFixedSlotModal
          clubId={clubId}
          clubName={clubName}
          courts={courts}
          players={players}
          assignAction={assignAction}
          onClose={() => setShowNewModal(false)}
        />
      )}
      {releaseTarget && (
        <ReleaseConfirmModal
          slot={releaseTarget}
          releaseAction={releaseAction}
          onClose={() => setReleaseTarget(null)}
        />
      )}
    </div>
  );
}

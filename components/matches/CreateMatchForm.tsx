"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { GuestPlayerModal } from "@/components/players/GuestPlayerModal";
import { PlayerSearchSelect } from "@/components/players/PlayerSearchSelect";
import { ClubSelector } from "@/components/clubs/ClubSelector";
import { createMatchAsPlayer } from "@/lib/actions/player-match.actions";

interface PlayerOption {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name?: string | null;
  city?: string | null;
  city_id?: string | null;
  region_code?: string | null;
  region_name?: string | null;
}

type CalendarMode = "week" | "month";

function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfWeekMonday(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function CreateMatchForm({
  currentPlayerId,
  currentPlayerLocation,
  availablePlayers: initialPlayers,
  initialDate,
  initialTime,
  initialClub,
  fromBooking = false,
  bookingId,
  clubRequired = true,
}: {
  currentPlayerId: string;
  currentPlayerLocation?: { city?: string; city_id?: string; region_code?: string; region_name?: string };
  availablePlayers: PlayerOption[];
  initialDate?: string;
  initialTime?: string;
  initialClub?: { id: string; name: string; claim_status?: "unclaimed" | "pending" | "claimed" | "rejected" } | null;
  fromBooking?: boolean;
  bookingId?: string;
  clubRequired?: boolean;
}) {
  const initialDateValue = initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate) ? initialDate : toDateInputValue(new Date());
  const initialTimeValue = initialTime && /^\d{2}:\d{2}$/.test(initialTime) ? initialTime : "20:00";
  const initialCursor = useMemo(() => new Date(`${initialDateValue}T00:00:00`), [initialDateValue]);
  const router = useRouter();
  const [players, setPlayers] = useState(initialPlayers);
  const [partnerId, setPartnerId] = useState("");
  const [opp1Id, setOpp1Id] = useState("");
  const [opp2Id, setOpp2Id] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSelector, setActiveSelector] = useState<"partner" | "opp1" | "opp2" | null>(null);
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("week");
  const [calendarCursor, setCalendarCursor] = useState<Date>(initialCursor);
  const [selectedDate, setSelectedDate] = useState<string>(initialDateValue);
  const [selectedTime, setSelectedTime] = useState<string>(initialTimeValue);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(fromBooking);

  const openGuestModal = (selector: "partner" | "opp1" | "opp2") => {
    setActiveSelector(selector);
    setIsCreateModalOpen(true);
  };

  const handleGuestSuccess = (newId: string, displayName: string) => {
    const newPlayer = {
      id: newId,
      first_name: displayName.split(" ")[0] || "",
      last_name: displayName.split(" ").slice(1).join(" ") || "",
      display_name: displayName,
    };

    setPlayers((prev) => [newPlayer, ...prev]);
    if (activeSelector === "partner") setPartnerId(newId);
    if (activeSelector === "opp1") setOpp1Id(newId);
    if (activeSelector === "opp2") setOpp2Id(newId);
  };

  const selectedIds = useMemo(() => {
    const ids = new Set([currentPlayerId]);
    if (partnerId) ids.add(partnerId);
    if (opp1Id) ids.add(opp1Id);
    if (opp2Id) ids.add(opp2Id);
    return ids;
  }, [partnerId, opp1Id, opp2Id, currentPlayerId]);

  const isFormValid =
    !!partnerId && !!opp1Id && !!opp2Id && partnerId !== opp1Id && partnerId !== opp2Id && opp1Id !== opp2Id;

  const otherPlayers = useMemo(() => {
    const filtered = players.filter((p) => p.id !== currentPlayerId);

    return [...filtered].sort((a, b) => {
      let weightA = 0;
      let weightB = 0;

      if (currentPlayerLocation) {
        const sameCityId = a.city_id && a.city_id === currentPlayerLocation.city_id;
        const sameCityName = !a.city_id && a.city && a.city.toLowerCase() === currentPlayerLocation.city?.toLowerCase();
        if (sameCityId || sameCityName) weightA += 100;
        if (a.region_code === currentPlayerLocation.region_code) weightA += 50;

        const sameCityIdB = b.city_id && b.city_id === currentPlayerLocation.city_id;
        const sameCityNameB = !b.city_id && b.city && b.city.toLowerCase() === currentPlayerLocation.city?.toLowerCase();
        if (sameCityIdB || sameCityNameB) weightB += 100;
        if (b.region_code === currentPlayerLocation.region_code) weightB += 50;
      }

      if (weightA !== weightB) return weightB - weightA;
      const nameA = a.display_name || `${a.first_name} ${a.last_name}`;
      const nameB = b.display_name || `${b.first_name} ${b.last_name}`;
      return nameA.localeCompare(nameB);
    });
  }, [players, currentPlayerId, currentPlayerLocation]);

  const weekDays = useMemo(() => {
    const start = startOfWeekMonday(calendarCursor);
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [calendarCursor]);

  const monthGrid = useMemo(() => {
    const monthStart = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1);
    const monthEnd = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 0);
    const leading = (monthStart.getDay() + 6) % 7;
    const days = monthEnd.getDate();

    const cells: Array<Date | null> = [];
    for (let i = 0; i < leading; i++) cells.push(null);
    for (let day = 1; day <= days; day++) {
      cells.push(new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), day));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calendarCursor]);

  const formattedHeader = useMemo(
    () => calendarCursor.toLocaleDateString("es-AR", { month: "long", year: "numeric" }),
    [calendarCursor]
  );

  const openCreateModalForDate = (date: Date) => {
    setSelectedDate(toDateInputValue(date));
    setError(null);
    setIsCreateModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const rawClubName = String(formData.get("club_name") || "").trim();
    const rawClubId = String(formData.get("club_id") || "").trim();

    if (clubRequired && !rawClubId && !rawClubName) {
      setError("Selecciona un club publicado o escribe el nombre del club.");
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await createMatchAsPlayer(null, formData);
      if (result?.error) {
        setError(result.error);
        setIsSubmitting(false);
      } else {
        setIsCreateModalOpen(false);
        router.push(`/player/matches/${result?.matchId || ""}`);
        router.refresh();
      }
    } catch {
      setError("Ocurrio un error inesperado");
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-xl shadow-blue-900/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Agenda de partidos</h3>
            <p className="text-lg font-bold text-gray-900">{formattedHeader}</p>
          </div>
          <div className="inline-flex rounded-xl border border-gray-200 p-1">
            <button
              type="button"
              onClick={() => setCalendarMode("week")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${calendarMode === "week" ? "bg-blue-600 text-white" : "text-gray-700"}`}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => setCalendarMode("month")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${calendarMode === "month" ? "bg-blue-600 text-white" : "text-gray-700"}`}
            >
              Mes
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setCalendarCursor((prev) => {
                const d = new Date(prev);
                if (calendarMode === "week") d.setDate(d.getDate() - 7);
                else d.setMonth(d.getMonth() - 1);
                return d;
              })
            }
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() => setCalendarCursor(new Date())}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() =>
              setCalendarCursor((prev) => {
                const d = new Date(prev);
                if (calendarMode === "week") d.setDate(d.getDate() + 7);
                else d.setMonth(d.getMonth() + 1);
                return d;
              })
            }
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Siguiente
          </button>
        </div>

        {calendarMode === "week" ? (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
            {weekDays.map((day) => {
              const value = toDateInputValue(day);
              const isToday = value === toDateInputValue(new Date());
              return (
                <button
                  type="button"
                  key={value}
                  onClick={() => openCreateModalForDate(day)}
                  className={`rounded-xl border px-3 py-4 text-left hover:border-blue-300 hover:bg-blue-50 ${
                    isToday ? "border-blue-300 bg-blue-50" : "border-gray-200"
                  }`}
                >
                  <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">
                    {day.toLocaleDateString("es-AR", { weekday: "short" })}
                  </p>
                  <p className="text-lg font-bold text-gray-900">{day.getDate()}</p>
                  <p className="text-xs text-blue-700 font-semibold mt-1">Crear partido</p>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-7 gap-2 text-[11px] font-black uppercase tracking-wider text-gray-500">
              <div>Lun</div>
              <div>Mar</div>
              <div>Mie</div>
              <div>Jue</div>
              <div>Vie</div>
              <div>Sab</div>
              <div>Dom</div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {monthGrid.map((cell, index) =>
                cell ? (
                  <button
                    key={`${cell.toISOString()}-${index}`}
                    type="button"
                    onClick={() => openCreateModalForDate(cell)}
                    className="min-h-[68px] rounded-xl border border-gray-200 px-2 py-2 text-left hover:border-blue-300 hover:bg-blue-50"
                  >
                    <p className="text-sm font-bold text-gray-900">{cell.getDate()}</p>
                    <p className="text-[11px] text-blue-700 font-semibold">Crear</p>
                  </button>
                ) : (
                  <div key={`empty-${index}`} className="min-h-[68px] rounded-xl border border-dashed border-gray-100 bg-gray-50/40" />
                )
              )}
            </div>
          </div>
        )}
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 md:items-center">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {fromBooking ? "Completar partido desde reserva" : "Crear partido"}
                </h3>
                <p className="text-sm text-gray-500">
                  Fecha seleccionada: {new Date(`${selectedDate}T00:00:00`).toLocaleDateString("es-AR")}
                </p>
                {fromBooking && (
                  <p className="mt-1 text-xs font-semibold text-blue-700">
                    La reserva ya fue enviada. Ahora completa los jugadores del partido.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-xl border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <input type="hidden" name="player_id" value={currentPlayerId} />
              <input type="hidden" name="date" value={selectedDate} />
              <input type="hidden" name="time" value={selectedTime} />
              <input type="hidden" name="booking_id" value={bookingId || ""} />
              {fromBooking ? (
                <>
                  <input type="hidden" name="club_id" value={initialClub?.id || ""} />
                  <input type="hidden" name="club_name" value={initialClub?.name || ""} />
                </>
              ) : null}

              {error && (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
                  <span className="font-bold">{error}</span>
                </div>
              )}

              {fromBooking ? (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-gray-500">Datos de la reserva</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">
                    {new Date(`${selectedDate}T${selectedTime}:00`).toLocaleDateString("es-AR")} - {selectedTime}
                  </p>
                  <p className="text-sm text-gray-700">{initialClub?.name || "Club seleccionado"}</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-gray-400">Fecha</Label>
                      <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time" className="text-xs font-black uppercase tracking-widest text-gray-400">
                        Hora
                      </Label>
                      <Input
                        type="time"
                        id="time"
                        required
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <ClubSelector
                    currentLocation={currentPlayerLocation}
                    initialClub={initialClub || null}
                    required={clubRequired}
                    allowUnlisted
                  />
                </>
              )}

              <div className="space-y-6 rounded-3xl border border-gray-100 bg-gray-50/50 p-6">
                <h4 className="border-b border-gray-100 pb-3 text-xs font-black uppercase tracking-widest text-gray-400">
                  Formacion de equipos
                </h4>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                        Tu companero (Equipo A)
                      </Label>
                      <button
                        type="button"
                        onClick={() => openGuestModal("partner")}
                        className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700 hover:bg-blue-100"
                      >
                        <span className="text-xs leading-none">+</span>
                        Cargar invitado
                      </button>
                    </div>
                    <PlayerSearchSelect
                      name="partner_id"
                      placeholder="Escribe nombre, apellido o ciudad"
                      required
                      selectedId={partnerId}
                      onSelectId={setPartnerId}
                      players={otherPlayers.filter((p) => !selectedIds.has(p.id) || p.id === partnerId)}
                    />
                  </div>

                  <div className="space-y-4 rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
                    <Label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-red-600">
                      Rivales (Equipo B)
                    </Label>

                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <Label className="text-[10px] font-bold uppercase text-gray-400">Rival 1</Label>
                        <button
                          type="button"
                          onClick={() => openGuestModal("opp1")}
                          className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-red-700 hover:bg-red-100"
                        >
                          <span className="text-xs leading-none">+</span>
                          Cargar invitado
                        </button>
                      </div>
                      <PlayerSearchSelect
                        name="opponent1_id"
                        placeholder="Escribe nombre, apellido o ciudad"
                        required
                        selectedId={opp1Id}
                        onSelectId={setOpp1Id}
                        players={otherPlayers.filter((p) => !selectedIds.has(p.id) || p.id === opp1Id)}
                      />
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <Label className="text-[10px] font-bold uppercase text-gray-400">Rival 2</Label>
                        <button
                          type="button"
                          onClick={() => openGuestModal("opp2")}
                          className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-red-700 hover:bg-red-100"
                        >
                          <span className="text-xs leading-none">+</span>
                          Cargar invitado
                        </button>
                      </div>
                      <PlayerSearchSelect
                        name="opponent2_id"
                        placeholder="Escribe nombre, apellido o ciudad"
                        required
                        selectedId={opp2Id}
                        onSelectId={setOpp2Id}
                        players={otherPlayers.filter((p) => !selectedIds.has(p.id) || p.id === opp2Id)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <Button
                  type="submit"
                  className="w-full rounded-2xl bg-blue-600 py-6 text-white"
                  disabled={!isFormValid || isSubmitting}
                >
                  {isSubmitting ? "Guardando..." : fromBooking ? "Continuar generando partido" : "Crear partido"}
                </Button>
                <Link
                  href={bookingId ? `/player/bookings/${bookingId}` : "/player/matches"}
                  className="text-center text-sm font-bold text-gray-400 hover:text-gray-600"
                >
                  Cancelar
                </Link>
              </div>
            </form>
          </div>
        </div>
      )}

      <GuestPlayerModal
        isOpen={isCreateModalOpen && activeSelector !== null}
        onClose={() => {
          setIsCreateModalOpen(true);
          setActiveSelector(null);
        }}
        onSuccess={handleGuestSuccess}
        defaultLocation={currentPlayerLocation}
      />
    </>
  );
}

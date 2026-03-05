"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { CalendarClock, CheckCircle2, CircleDashed, History } from "lucide-react";
import { useRouter } from "next/navigation";
import { clubCreateBookingAndMatchAction } from "@/lib/actions/booking.actions";

type DayBucket = {
  date: string;
  weekdayLabel: string;
  dayLabel: string;
  bookings: Array<any>;
  requested: number;
  confirmed: number;
  history: number;
};

type CourtOption = {
  id: string;
  label: string;
  opening_time: string;
  closing_time: string;
  slot_interval_minutes: number | null;
};

type Option = { id: string; label: string };

type SlotSelection = {
  date: string;
  time: string;
  courtId: string;
  bookingId?: string;
};

function buildSlotOptions(openingTime: string, closingTime: string, slotMinutes: number) {
  const parse = (hhmm: string) => {
    const [hh, mm] = hhmm.split(":").map(Number);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    return hh * 60 + mm;
  };
  const open = parse(openingTime);
  const close = parse(closingTime);
  if (open === null || close === null || close <= open || slotMinutes <= 0) return [] as string[];

  const options: string[] = [];
  for (let cur = open; cur + slotMinutes <= close; cur += slotMinutes) {
    const hh = String(Math.floor(cur / 60)).padStart(2, "0");
    const mm = String(cur % 60).padStart(2, "0");
    options.push(`${hh}:${mm}`);
  }
  return options;
}

function toDateKeyLocal(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toTimeLocal(iso: string) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function ClubBookingsCalendarPanel({
  weekLabel,
  prevWeekHref,
  nextWeekHref,
  buckets,
  totalRequested,
  totalConfirmed,
  totalHistory,
  clubId,
  slotMinutes,
  courts,
  players,
}: {
  weekLabel: string;
  prevWeekHref: string;
  nextWeekHref: string;
  buckets: DayBucket[];
  totalRequested: number;
  totalConfirmed: number;
  totalHistory: number;
  clubId: string;
  slotMinutes: number;
  courts: CourtOption[];
  players: Option[];
}) {
  const router = useRouter();
  const [rawState, formAction] = useFormState(clubCreateBookingAndMatchAction as any, null);
  const state = rawState as { success?: boolean; error?: string; matchId?: string } | null;
  const [selectedCourtId, setSelectedCourtId] = useState<string>(courts[0]?.id || "");
  const [selectedSlot, setSelectedSlot] = useState<SlotSelection | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string>("");
  const [playerQuery, setPlayerQuery] = useState<string>("");
  const [manualPlayerId, setManualPlayerId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const canCreate = courts.length > 0 && players.length > 0;
  const selectedCourt = useMemo(
    () => courts.find((court) => court.id === selectedCourtId) || courts[0] || null,
    [courts, selectedCourtId]
  );
  const effectiveSlotMinutes = selectedCourt?.slot_interval_minutes || slotMinutes;
  const slotOptions = useMemo(() => {
    if (!selectedCourt) return [] as string[];
    return buildSlotOptions(selectedCourt.opening_time, selectedCourt.closing_time, effectiveSlotMinutes);
  }, [selectedCourt, effectiveSlotMinutes]);

  const bookingByDayAndTime = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const bucket of buckets) {
      for (const booking of bucket.bookings || []) {
        if (booking.court_id !== selectedCourt?.id) continue;
        const key = `${toDateKeyLocal(booking.start_at)}|${toTimeLocal(booking.start_at)}`;
        const list = map.get(key) || [];
        list.push(booking);
        map.set(key, list);
      }
    }
    return map;
  }, [buckets, selectedCourt?.id]);

  useEffect(() => {
    if (state?.success) {
      setIsSubmitting(false);
      setSelectedSlot(null);
      setSelectedBookingId("");
      setPlayerQuery("");
      setManualPlayerId("");
      router.refresh();
      return;
    }

    if (state?.error) {
      setIsSubmitting(false);
    }
  }, [state?.success, state?.error, router]);

  const requestedBookingsForSlot = useMemo(() => {
    if (!selectedSlot) return [] as any[];
    const key = `${selectedSlot.date}|${selectedSlot.time}`;
    return (bookingByDayAndTime.get(key) || [])
      .filter((booking) => booking.status === "requested")
      .sort((a, b) => a.start_at.localeCompare(b.start_at));
  }, [bookingByDayAndTime, selectedSlot]);
  const selectedBookingFromSlot = useMemo(() => {
    if (!selectedSlot?.bookingId) return null;
    return requestedBookingsForSlot.find((booking) => booking.id === selectedSlot.bookingId) || null;
  }, [requestedBookingsForSlot, selectedSlot?.bookingId]);
  const selectedBooking = useMemo(() => {
    if (requestedBookingsForSlot.length === 0) return null;
    const selected = requestedBookingsForSlot.find((booking) => booking.id === selectedBookingId);
    if (selected) return selected;
    if (selectedBookingFromSlot) return selectedBookingFromSlot;
    return null;
  }, [requestedBookingsForSlot, selectedBookingId, selectedBookingFromSlot]);
  const selectedBookingTime = useMemo(() => {
    if (selectedSlot?.time) return selectedSlot.time;
    if (!selectedBooking?.start_at) return "20:00";
    return toTimeLocal(selectedBooking.start_at);
  }, [selectedBooking, selectedSlot?.time]);
  const selectedBookingPlayerLabel = useMemo(() => {
    if (!selectedBooking) return "Jugador sin perfil";
    return players.find((p) => p.id === selectedBooking.requested_by_player_id)?.label || "Jugador sin perfil";
  }, [players, selectedBooking]);
  const selectedBookingCourtLabel = useMemo(() => {
    if (!selectedBooking) return "";
    return courts.find((c) => c.id === selectedBooking.court_id)?.label || selectedBooking.club_courts?.name || "Cancha";
  }, [courts, selectedBooking]);
  const filteredPlayers = useMemo(() => {
    const q = playerQuery.trim().toLowerCase();
    if (!q) return players.slice(0, 8);
    const tokens = q.split(/\s+/).filter(Boolean);
    return players
      .filter((player) => {
        const haystack = player.label.toLowerCase();
        return tokens.every((token) => haystack.includes(token));
      })
      .slice(0, 8);
  }, [players, playerQuery]);
  const selectedManualPlayer = useMemo(
    () => players.find((player) => player.id === manualPlayerId) || null,
    [players, manualPlayerId]
  );

  return (
    <div className="rounded-2xl border bg-white p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700">
          <CalendarClock className="h-4 w-4 text-blue-600" />
          {weekLabel}
        </div>
        <div className="flex gap-2">
          <Link
            href={prevWeekHref}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Semana anterior
          </Link>
          <Link
            href={nextWeekHref}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Semana siguiente
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs font-semibold">
        <div className="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-2.5 py-1 text-amber-800">
          <CircleDashed className="h-3.5 w-3.5" />
          Solicitudes ({totalRequested})
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-2.5 py-1 text-green-800">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Confirmadas ({totalConfirmed})
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700">
          <History className="h-3.5 w-3.5" />
          Historial ({totalHistory})
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-500">Cancha para segmentacion</label>
          <select
            value={selectedCourtId}
            onChange={(event) => setSelectedCourtId(event.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            {courts.map((court) => (
              <option key={court.id} value={court.id}>
                {court.label}
              </option>
            ))}
          </select>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
          Turnos cada <span className="font-semibold text-gray-900">{effectiveSlotMinutes} min</span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-[11px] font-black uppercase tracking-wider text-gray-500">
        {buckets.map((bucket) => (
          <div key={`${bucket.date}-head`} className="px-2">
            {bucket.weekdayLabel} {bucket.dayLabel}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
        {buckets.map((bucket) => (
          <div key={bucket.date} className="rounded-xl border border-gray-200 bg-white p-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-black text-gray-900">{bucket.dayLabel}</span>
              <span className="text-[11px] text-gray-400">{bucket.bookings.length}</span>
            </div>
            <div className="mb-2 space-y-1">
              {bucket.requested > 0 ? (
                <div className="rounded-md bg-amber-50 px-1.5 py-1 text-[11px] font-semibold text-amber-800">
                  Solicitudes: {bucket.requested}
                </div>
              ) : null}
              {bucket.confirmed > 0 ? (
                <div className="rounded-md bg-green-50 px-1.5 py-1 text-[11px] font-semibold text-green-800">
                  Confirmadas: {bucket.confirmed}
                </div>
              ) : null}
              {bucket.history > 0 ? (
                <div className="rounded-md bg-slate-100 px-1.5 py-1 text-[11px] font-semibold text-slate-700">
                  Historial: {bucket.history}
                </div>
              ) : null}
            </div>
            <div className="space-y-1">
              {slotOptions.map((slot) => {
                const key = `${bucket.date}|${slot}`;
                const inSlot = bookingByDayAndTime.get(key) || [];
                const requested = inSlot.find((booking) => booking.status === "requested");
                const confirmed = inSlot.find((booking) => booking.status === "confirmed");
                const status = confirmed ? "confirmed" : requested ? "requested" : "free";
                return (
                  <button
                    key={`${bucket.date}-${slot}`}
                    type="button"
                    disabled={status === "confirmed"}
                    onClick={() => {
                      setSelectedSlot({
                        date: bucket.date,
                        time: slot,
                        courtId: selectedCourt?.id || "",
                        bookingId: requested?.id,
                      });
                      setSelectedBookingId(requested?.id || "");
                    }}
                    className={`w-full rounded-md border px-2 py-1 text-left text-[11px] font-semibold ${
                      status === "confirmed"
                        ? "cursor-not-allowed border-green-200 bg-green-50 text-green-700"
                        : status === "requested"
                          ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                          : "border-gray-200 text-gray-700 hover:bg-blue-50"
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {!canCreate ? (
        <p className="text-sm text-amber-700">
          Para crear partidos desde calendario necesitas al menos una cancha activa y un jugador.
        </p>
      ) : null}

      {selectedSlot ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-lg rounded-2xl border bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Crear partido desde segmento</h3>
              <button
                type="button"
                onClick={() => {
                  setIsSubmitting(false);
                  setSelectedSlot(null);
                  setSelectedBookingId("");
                  setPlayerQuery("");
                  setManualPlayerId("");
                }}
                className="rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Fecha seleccionada: <span className="font-semibold text-gray-800">{selectedSlot.date}</span>
            </p>

            <form
              action={formAction}
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                if (isSubmitting) {
                  event.preventDefault();
                  return;
                }
                setIsSubmitting(true);
              }}
            >
              <input type="hidden" name="club_id" value={clubId} />
              <input type="hidden" name="selected_date" value={selectedSlot.date} />
              <input type="hidden" name="slot_minutes" value={String(effectiveSlotMinutes)} />
              {selectedBooking?.id ? <input type="hidden" name="booking_id" value={selectedBooking.id} /> : null}

              {requestedBookingsForSlot.length > 0 ? (
                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-500">Solicitud</label>
                  <select
                    value={selectedBooking?.id || ""}
                    onChange={(event) => setSelectedBookingId(event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    {requestedBookingsForSlot.map((booking) => (
                      <option key={booking.id} value={booking.id}>
                        {new Date(booking.start_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} -{" "}
                        {booking.club_courts?.name || "Cancha"} -{" "}
                        {players.find((p) => p.id === booking.requested_by_player_id)?.label || "Jugador sin perfil"}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-500">Hora</label>
                <input type="hidden" name="start_time" value={selectedBookingTime} />
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
                  {selectedBookingTime}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-500">Cancha</label>
                <input type="hidden" name="court_id" value={selectedSlot.courtId} />
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
                  {selectedBookingCourtLabel || selectedCourt?.label || "Cancha"}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-500">
                  Jugador que reserva
                </label>
                {selectedBooking?.requested_by_player_id ? (
                  <>
                    <input type="hidden" name="player_id" value={selectedBooking.requested_by_player_id || ""} />
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
                      {selectedBookingPlayerLabel}
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={playerQuery}
                      onChange={(event) => {
                        setPlayerQuery(event.target.value);
                        setManualPlayerId("");
                      }}
                      placeholder="Buscar por nombre y apellido"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                    <input type="hidden" name="player_id" value={manualPlayerId} />
                    <div className="max-h-40 overflow-auto rounded-lg border border-gray-200 bg-white">
                      {filteredPlayers.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-gray-500">No hay coincidencias.</p>
                      ) : (
                        filteredPlayers.map((player) => (
                          <button
                            key={player.id}
                            type="button"
                            onClick={() => {
                              setManualPlayerId(player.id);
                              setPlayerQuery(player.label);
                            }}
                            className={`block w-full px-3 py-2 text-left text-sm ${
                              manualPlayerId === player.id
                                ? "bg-blue-50 font-semibold text-blue-700"
                                : "text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            {player.label}
                          </button>
                        ))
                      )}
                    </div>
                    {selectedManualPlayer ? (
                      <p className="text-xs text-gray-600">
                        Seleccionado: <span className="font-semibold text-gray-800">{selectedManualPlayer.label}</span>
                      </p>
                    ) : null}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-500">
                  Nota (opcional)
                </label>
                <textarea
                  name="note"
                  rows={2}
                  placeholder="Ej: reserva gestionada por WhatsApp"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              {state?.error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
              ) : null}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || (!selectedBooking?.requested_by_player_id && !manualPlayerId)}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {isSubmitting ? "Creando..." : "Crear partido confirmado"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

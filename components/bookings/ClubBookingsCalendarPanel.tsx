"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { CalendarClock, CheckCircle2, CircleDashed, History } from "lucide-react";
import { useRouter } from "next/navigation";
import { clubCreateBookingAndMatchAction } from "@/lib/actions/booking.actions";

type DayBucket = {
  day: number;
  date: string;
  bookings: Array<any>;
  requested: number;
  confirmed: number;
  history: number;
};

type Option = { id: string; label: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
    >
      {pending ? "Creando..." : "Crear partido confirmado"}
    </button>
  );
}

export function ClubBookingsCalendarPanel({
  monthLabel,
  prevMonthHref,
  nextMonthHref,
  firstWeekdayMondayBased,
  buckets,
  totalRequested,
  totalConfirmed,
  totalHistory,
  clubId,
  slotMinutes,
  courts,
  players,
}: {
  monthLabel: string;
  prevMonthHref: string;
  nextMonthHref: string;
  firstWeekdayMondayBased: number;
  buckets: DayBucket[];
  totalRequested: number;
  totalConfirmed: number;
  totalHistory: number;
  clubId: string;
  slotMinutes: number;
  courts: Option[];
  players: Option[];
}) {
  const router = useRouter();
  const [rawState, formAction] = useFormState(clubCreateBookingAndMatchAction as any, null);
  const state = rawState as { success?: boolean; error?: string; matchId?: string } | null;
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string>("");

  const canCreate = courts.length > 0 && players.length > 0;

  useEffect(() => {
    if (state?.success) {
      setSelectedDate(null);
      setSelectedBookingId("");
      router.refresh();
    }
  }, [state?.success, router]);

  const defaultDate = useMemo(() => selectedDate || "", [selectedDate]);
  const selectedBucket = useMemo(
    () => (selectedDate ? buckets.find((bucket) => bucket.date === selectedDate) || null : null),
    [buckets, selectedDate]
  );
  const requestedBookingsForDay = useMemo(
    () =>
      (selectedBucket?.bookings || [])
        .filter((booking) => booking.status === "requested")
        .sort((a, b) => a.start_at.localeCompare(b.start_at)),
    [selectedBucket]
  );
  const selectedBooking = useMemo(() => {
    if (requestedBookingsForDay.length === 0) return null;
    const selected = requestedBookingsForDay.find((booking) => booking.id === selectedBookingId);
    return selected || requestedBookingsForDay[0];
  }, [requestedBookingsForDay, selectedBookingId]);
  const selectedBookingTime = useMemo(() => {
    if (!selectedBooking?.start_at) return "20:00";
    const d = new Date(selectedBooking.start_at);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }, [selectedBooking]);
  const selectedBookingPlayerLabel = useMemo(() => {
    if (!selectedBooking) return "Jugador sin perfil";
    return players.find((p) => p.id === selectedBooking.requested_by_player_id)?.label || "Jugador sin perfil";
  }, [players, selectedBooking]);
  const selectedBookingCourtLabel = useMemo(() => {
    if (!selectedBooking) return "Cancha";
    return courts.find((c) => c.id === selectedBooking.court_id)?.label || selectedBooking.club_courts?.name || "Cancha";
  }, [courts, selectedBooking]);

  return (
    <div className="rounded-2xl border bg-white p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700">
          <CalendarClock className="h-4 w-4 text-blue-600" />
          {monthLabel}
        </div>
        <div className="flex gap-2">
          <Link
            href={prevMonthHref}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Mes anterior
          </Link>
          <Link
            href={nextMonthHref}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Mes siguiente
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

      <div className="grid grid-cols-7 gap-2 text-[11px] font-black uppercase tracking-wider text-gray-500">
        <div className="px-2">Lun</div>
        <div className="px-2">Mar</div>
        <div className="px-2">Mie</div>
        <div className="px-2">Jue</div>
        <div className="px-2">Vie</div>
        <div className="px-2">Sab</div>
        <div className="px-2">Dom</div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: firstWeekdayMondayBased }).map((_, idx) => (
          <div key={`empty-${idx}`} className="min-h-[100px] rounded-xl border border-dashed border-gray-100 bg-gray-50/40" />
        ))}
        {buckets.map((bucket) => (
          <button
            key={bucket.date}
            type="button"
            onClick={() => {
              const requested = (bucket.bookings || [])
                .filter((booking) => booking.status === "requested")
                .sort((a, b) => a.start_at.localeCompare(b.start_at));
              setSelectedDate(bucket.date);
              setSelectedBookingId(requested[0]?.id || "");
            }}
            className="min-h-[100px] rounded-xl border border-gray-200 bg-white p-2 text-left transition hover:border-blue-300 hover:bg-blue-50/30"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-gray-900">{bucket.day}</span>
              <span className="text-[11px] text-gray-400">{bucket.bookings.length}</span>
            </div>
            <div className="mt-2 space-y-1">
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
          </button>
        ))}
      </div>

      {!canCreate ? (
        <p className="text-sm text-amber-700">
          Para crear partidos desde calendario necesitas al menos una cancha activa y un jugador.
        </p>
      ) : null}

      {selectedDate ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-lg rounded-2xl border bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Crear partido desde reserva</h3>
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(null);
                  setSelectedBookingId("");
                }}
                className="rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Fecha seleccionada: <span className="font-semibold text-gray-800">{defaultDate}</span>
            </p>

            <form action={formAction} className="mt-4 space-y-3">
              <input type="hidden" name="club_id" value={clubId} />
              <input type="hidden" name="selected_date" value={defaultDate} />
              <input type="hidden" name="slot_minutes" value={String(slotMinutes)} />

              {requestedBookingsForDay.length > 0 ? (
                <div>
                  <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-500">Solicitud</label>
                  <select
                    value={selectedBooking?.id || ""}
                    onChange={(event) => setSelectedBookingId(event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    {requestedBookingsForDay.map((booking) => (
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
                <input
                  key={`time-${selectedBooking?.id || "default"}`}
                  type="time"
                  name="start_time"
                  defaultValue={selectedBookingTime}
                  required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-500">Cancha</label>
                {selectedBooking ? (
                  <>
                    <input type="hidden" name="court_id" value={selectedBooking.court_id || ""} />
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
                      {selectedBookingCourtLabel}
                    </div>
                  </>
                ) : (
                  <select
                    key={`court-${selectedBooking?.id || "default"}`}
                    name="court_id"
                    required
                    defaultValue=""
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar cancha</option>
                    {courts.map((court) => (
                      <option key={court.id} value={court.id}>
                        {court.label}
                      </option>
                    ))}
                  </select>
                )}
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
                  <select
                    key={`player-${selectedBooking?.id || "default"}`}
                    name="player_id"
                    required
                    defaultValue=""
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar jugador</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.label}
                      </option>
                    ))}
                  </select>
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
                <SubmitButton />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

import Link from "next/link";
import { requireClub } from "@/lib/auth";
import { BookingService } from "@/services/booking.service";
import { PlayerService } from "@/services/player.service";
import {
  confirmBookingAction,
  createMatchFromBookingAction,
  rejectBookingAction,
} from "@/lib/actions/booking.actions";
import { BookingStatusBadge } from "@/components/bookings/BookingStatusBadge";
import { ClubBookingsCalendarPanel } from "@/components/bookings/ClubBookingsCalendarPanel";

type DayBucket = {
  day: number;
  date: string;
  bookings: Array<any>;
  requested: number;
  confirmed: number;
  history: number;
};

function asDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseMonth(raw?: string) {
  if (!raw || !/^\d{4}-\d{2}$/.test(raw)) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  const [y, m] = raw.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  return { year: y, month: m };
}

function monthString(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export default async function ClubBookingsPage({
  searchParams,
}: {
  searchParams?: { month?: string };
}) {
  const params = searchParams || {};
  const { year, month } = parseMonth(params.month);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const firstWeekdayMondayBased = (monthStart.getDay() + 6) % 7;
  const daysInMonth = monthEnd.getDate();
  const monthLabel = monthStart.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  const prevMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

  const { club } = await requireClub();
  const bookingService = new BookingService();
  const playerService = new PlayerService();
  const [bookings, settings, courts, allPlayers] = await Promise.all([
    bookingService.listClubBookings(club.id),
    bookingService.getClubBookingSettings(club.id),
    bookingService.listActiveClubCourts(club.id),
    playerService.searchPlayersWeighted(""),
  ]);

  const monthBookings = bookings.filter((booking) => {
    const d = new Date(booking.start_at);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });
  const requestedPlayerIds = Array.from(
    new Set(
      monthBookings
        .map((booking) => booking.requested_by_player_id as string | null)
        .filter((id): id is string => !!id)
    )
  );
  const weightedPlayerIds = new Set((allPlayers || []).map((player: any) => player.id as string));
  const missingRequestedPlayerIds = requestedPlayerIds.filter((id) => !weightedPlayerIds.has(id));
  const missingRequestedPlayers = await Promise.all(
    missingRequestedPlayerIds.map(async (playerId) => {
      try {
        return await playerService.getPlayerById(playerId);
      } catch {
        return null;
      }
    })
  );
  const mergedPlayersMap = new Map<string, any>();
  for (const player of allPlayers || []) {
    if (player?.id) mergedPlayersMap.set(player.id, player);
  }
  for (const player of missingRequestedPlayers) {
    if (player?.id) mergedPlayersMap.set(player.id, player);
  }
  const mergedPlayers = Array.from(mergedPlayersMap.values());

  const byDay = new Map<string, DayBucket>();
  for (let day = 1; day <= daysInMonth; day++) {
    const key = asDateKey(new Date(year, month - 1, day));
    byDay.set(key, { day, date: key, bookings: [], requested: 0, confirmed: 0, history: 0 });
  }

  for (const booking of monthBookings) {
    const start = new Date(booking.start_at);
    const key = asDateKey(start);
    const bucket = byDay.get(key);
    if (!bucket) continue;
    bucket.bookings.push(booking);
    if (booking.status === "requested") bucket.requested += 1;
    else if (booking.status === "confirmed") bucket.confirmed += 1;
    else bucket.history += 1;
  }

  const buckets = Array.from(byDay.values());
  const totalRequested = buckets.reduce((acc, b) => acc + b.requested, 0);
  const totalConfirmed = buckets.reduce((acc, b) => acc + b.confirmed, 0);
  const totalHistory = buckets.reduce((acc, b) => acc + b.history, 0);
  const sortedBookings = [...monthBookings].sort((a, b) => a.start_at.localeCompare(b.start_at));
  const courtOptions = courts.map((court) => ({ id: court.id, label: court.name }));
  const playerOptions = mergedPlayers.map((player: any) => ({
    id: player.id,
    label: player.display_name || `${player.first_name || ""} ${player.last_name || ""}`.trim(),
  }));
  const submitConfirm = async (formData: FormData) => {
    "use server";
    await confirmBookingAction(formData);
  };
  const submitReject = async (formData: FormData) => {
    "use server";
    await rejectBookingAction(formData);
  };
  const submitCreateMatch = async (formData: FormData) => {
    "use server";
    await createMatchFromBookingAction(formData);
  };

  return (
    <div className="container mx-auto px-4 max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reservas</h1>
        <p className="text-sm text-gray-500">Calendario unificado con solicitudes, confirmaciones e historial.</p>
      </div>

      <ClubBookingsCalendarPanel
        monthLabel={monthLabel}
        prevMonthHref={`/club/dashboard/bookings?month=${monthString(prevMonth.year, prevMonth.month)}`}
        nextMonthHref={`/club/dashboard/bookings?month=${monthString(nextMonth.year, nextMonth.month)}`}
        firstWeekdayMondayBased={firstWeekdayMondayBased}
        buckets={buckets}
        totalRequested={totalRequested}
        totalConfirmed={totalConfirmed}
        totalHistory={totalHistory}
        clubId={club.id}
        slotMinutes={settings?.slot_duration_minutes || 90}
        courts={courtOptions}
        players={playerOptions}
      />

      <section className="rounded-2xl border bg-white p-5 space-y-3">
        <h2 className="text-sm font-black uppercase tracking-wider text-gray-500">Detalle del mes</h2>
        {sortedBookings.length === 0 ? (
          <p className="text-sm text-gray-500">No hay reservas en {monthLabel}.</p>
        ) : (
          sortedBookings.map((booking) => (
            <div key={booking.id} className="rounded-xl border border-gray-100 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{booking.club_courts?.name || "Cancha"}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(booking.start_at).toLocaleString("es-AR")} -{" "}
                    {new Date(booking.end_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <BookingStatusBadge status={booking.status} />
              </div>

              {booking.note ? <p className="mt-2 text-sm text-gray-700">Nota: {booking.note}</p> : null}
              {booking.rejection_reason ? (
                <p className="mt-2 text-sm text-red-700">Motivo rechazo: {booking.rejection_reason}</p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {booking.status === "requested" ? (
                  <>
                    <form action={submitConfirm}>
                      <input type="hidden" name="booking_id" value={booking.id} />
                      <button className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700">
                        Confirmar
                      </button>
                    </form>
                    <form action={submitReject} className="flex gap-2">
                      <input type="hidden" name="booking_id" value={booking.id} />
                      <input
                        name="reason"
                        placeholder="Motivo (opcional)"
                        className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
                      />
                      <button className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50">
                        Rechazar
                      </button>
                    </form>
                  </>
                ) : null}

                {booking.status === "confirmed" && !booking.match_id ? (
                  <form action={submitCreateMatch}>
                    <input type="hidden" name="booking_id" value={booking.id} />
                    <button className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                      Crear partido desde reserva
                    </button>
                  </form>
                ) : null}

                {booking.match_id ? (
                  <Link
                    href="/club/matches"
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Ver partido
                  </Link>
                ) : null}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

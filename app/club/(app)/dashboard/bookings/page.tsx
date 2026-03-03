import Link from "next/link";
import { requireClub } from "@/lib/auth";
import { BookingService } from "@/services/booking.service";
import {
  confirmBookingAction,
  createMatchFromBookingAction,
  rejectBookingAction,
} from "@/lib/actions/booking.actions";
import { BookingStatusBadge } from "@/components/bookings/BookingStatusBadge";
import { CalendarClock, CheckCircle2, History, CircleDashed } from "lucide-react";

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
  const bookings = await bookingService.listClubBookings(club.id);

  const monthBookings = bookings.filter((booking) => {
    const d = new Date(booking.start_at);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });

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

      <div className="rounded-2xl border bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700">
            <CalendarClock className="h-4 w-4 text-blue-600" />
            {monthLabel}
          </div>
          <div className="flex gap-2">
            <Link
              href={`/club/dashboard/bookings?month=${monthString(prevMonth.year, prevMonth.month)}`}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Mes anterior
            </Link>
            <Link
              href={`/club/dashboard/bookings?month=${monthString(nextMonth.year, nextMonth.month)}`}
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
            <div key={bucket.date} className="min-h-[100px] rounded-xl border border-gray-200 bg-white p-2">
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
            </div>
          ))}
        </div>
      </div>

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

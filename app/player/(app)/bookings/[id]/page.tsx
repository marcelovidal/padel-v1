import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlayer } from "@/lib/auth";
import { BookingService } from "@/services/booking.service";
import {
  cancelBookingAction,
  createMatchFromBookingAction,
} from "@/lib/actions/booking.actions";
import { BookingStatusBadge } from "@/components/bookings/BookingStatusBadge";

export default async function PlayerBookingDetailPage({ params }: { params: { id: string } }) {
  await requirePlayer();
  const { id } = params;

  const bookingService = new BookingService();
  const booking = await bookingService.getBookingById(id);
  if (!booking) notFound();
  const submitCancel = async (formData: FormData) => {
    "use server";
    await cancelBookingAction(formData);
  };
  const submitCreateMatch = async (formData: FormData) => {
    "use server";
    await createMatchFromBookingAction(formData);
  };

  return (
    <div className="container mx-auto px-4 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Detalle de reserva</h1>
        <BookingStatusBadge status={booking.status} />
      </div>

      <section className="rounded-2xl border bg-white p-5 space-y-3">
        <p className="text-sm text-gray-500">Club</p>
        <p className="font-semibold">{booking.clubs?.name || "-"}</p>
        <p className="text-sm text-gray-500">Cancha</p>
        <p className="font-semibold">{booking.club_courts?.name || "-"}</p>
        <p className="text-sm text-gray-500">Fecha y hora</p>
        <p className="font-semibold">
          {new Date(booking.start_at).toLocaleString("es-AR")} -{" "}
          {new Date(booking.end_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
        </p>
        {booking.note ? (
          <>
            <p className="text-sm text-gray-500">Nota</p>
            <p>{booking.note}</p>
          </>
        ) : null}
        {booking.rejection_reason ? (
          <>
            <p className="text-sm text-gray-500">Motivo rechazo</p>
            <p className="text-red-700">{booking.rejection_reason}</p>
          </>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-2">
        {booking.status === "requested" ? (
          <>
            <Link
              href={`/player/matches/new?from_booking=1&booking_id=${booking.id}&date=${booking.start_at.slice(0, 10)}&time=${booking.start_at.slice(11, 16)}&club_id=${booking.club_id}&club_name=${encodeURIComponent(booking.clubs?.name || "")}`}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Continuar generando partido
            </Link>
            <form action={submitCancel}>
              <input type="hidden" name="booking_id" value={booking.id} />
              <button className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
                Cancelar solicitud
              </button>
            </form>
          </>
        ) : null}

        {booking.status === "confirmed" && !booking.match_id ? (
          <form action={submitCreateMatch}>
            <input type="hidden" name="booking_id" value={booking.id} />
            <button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Crear partido desde esta reserva
            </button>
          </form>
        ) : null}

        {booking.match_id ? (
          <Link
            href={`/player/matches/${booking.match_id}`}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Ver partido
          </Link>
        ) : null}

        <Link
          href="/player/bookings"
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Volver
        </Link>
      </div>
    </div>
  );
}

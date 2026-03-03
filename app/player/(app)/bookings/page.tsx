import Link from "next/link";
import { requirePlayer } from "@/lib/auth";
import { BookingService } from "@/services/booking.service";
import { BookingStatusBadge } from "@/components/bookings/BookingStatusBadge";

export default async function PlayerBookingsPage() {
  await requirePlayer();
  const bookingService = new BookingService();
  const bookings = await bookingService.listMyBookings();

  return (
    <div className="container mx-auto px-4 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mis reservas</h1>
          <p className="text-sm text-gray-500">Seguimiento de solicitudes, confirmaciones y cancelaciones.</p>
        </div>
        <Link
          href="/player/bookings/new"
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
        >
          Nueva reserva
        </Link>
      </div>

      <section className="rounded-2xl border bg-white p-5 space-y-3">
        {bookings.length === 0 ? (
          <p className="text-sm text-gray-500">Todavia no tienes reservas.</p>
        ) : (
          bookings.map((booking) => (
            <Link
              key={booking.id}
              href={`/player/bookings/${booking.id}`}
              className="block rounded-xl border border-gray-100 p-4 hover:border-blue-200 hover:bg-blue-50/20"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{booking.clubs?.name || "Club"}</p>
                  <p className="text-sm text-gray-500">
                    {booking.club_courts?.name || "Cancha"} - {new Date(booking.start_at).toLocaleString("es-AR")}
                  </p>
                </div>
                <BookingStatusBadge status={booking.status} />
              </div>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}

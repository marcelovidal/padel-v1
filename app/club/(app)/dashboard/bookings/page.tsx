import Link from "next/link";
import { requireClub } from "@/lib/auth";
import { BookingService } from "@/services/booking.service";
import {
  confirmBookingAction,
  createMatchFromBookingAction,
  rejectBookingAction,
} from "@/lib/actions/booking.actions";
import { BookingStatusBadge } from "@/components/bookings/BookingStatusBadge";

const TABS = [
  { key: "requested", label: "Solicitudes" },
  { key: "confirmed", label: "Confirmadas" },
  { key: "all", label: "Historial" },
] as const;

export default async function ClubBookingsPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  const params = searchParams || {};
  const status = params.status === "requested" || params.status === "confirmed" ? params.status : "all";

  const { club } = await requireClub();
  const bookingService = new BookingService();
  const bookings =
    status === "all"
      ? await bookingService.listClubBookings(club.id)
      : await bookingService.listClubBookings(club.id, status);
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
        <p className="text-sm text-gray-500">Gestiona solicitudes y confirmaciones de canchas.</p>
      </div>

      <div className="flex gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/club/dashboard/bookings?status=${tab.key}`}
            className={`rounded-xl px-3 py-2 text-sm font-semibold ${
              status === tab.key ? "bg-blue-600 text-white" : "border border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <section className="rounded-2xl border bg-white p-5 space-y-3">
        {bookings.length === 0 ? (
          <p className="text-sm text-gray-500">No hay reservas en este estado.</p>
        ) : (
          bookings.map((booking) => (
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

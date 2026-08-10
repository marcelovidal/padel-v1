import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookingService } from "@/services/booking.service";
import { findPublicClub, publicClubHref } from "@/lib/clubs/publicClub";

export default async function ClubPublicProfilePage({ params }: { params: { slug: string } }) {
  const resolved = await findPublicClub(params.slug);
  if (!resolved) notFound();

  const { club, matchedBy } = resolved;

  // Un link viejo con UUID sigue funcionando, pero manda a la URL canonica.
  if (matchedBy === "id" && club.slug) {
    redirect(publicClubHref(club));
  }

  const bookingService = new BookingService();
  const courts = await bookingService.listActiveClubCourts(club.id);

  return (
    <div className="container mx-auto px-4 max-w-4xl py-8 space-y-6">
      <section className="rounded-2xl border bg-white p-6 space-y-2">
        <h1 className="text-3xl font-bold">{club.name}</h1>
        <p className="text-gray-600">
          {club.city || "Ciudad no informada"}
          {club.region_name ? ` - ${club.region_name}` : ""}
        </p>
        <p className="text-sm text-gray-500">Canchas: {club.courts_count ?? 0}</p>
        <p className="text-sm text-gray-500">Canchas activas para reserva: {courts.length}</p>
      </section>

      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-lg font-semibold mb-3">Reserva de cancha</h2>
        <p className="text-sm text-gray-600 mb-4">
          Solicita una reserva y espera confirmacion del club. Luego podras crear partido desde la reserva confirmada.
        </p>
        <Link
          href={`/clubs/${club.slug || club.id}/book`}
          className="inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
        >
          Reservar cancha
        </Link>
      </section>
    </div>
  );
}

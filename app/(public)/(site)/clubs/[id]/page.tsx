import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookingService } from "@/services/booking.service";

export default async function ClubPublicProfilePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const supabase = await createClient();
  const bookingService = new BookingService();

  const [{ data, error }, courts] = await Promise.all([
    (supabase as any).rpc("club_get_public_profile", { p_club_id: id }),
    bookingService.listActiveClubCourts(id),
  ]);

  if (error) throw error;
  const profile = Array.isArray(data) ? data[0] : data;
  if (!profile) notFound();

  return (
    <div className="container mx-auto px-4 max-w-4xl py-8 space-y-6">
      <section className="rounded-2xl border bg-white p-6 space-y-2">
        <h1 className="text-3xl font-bold">{profile.name}</h1>
        <p className="text-gray-600">
          {profile.city || "Ciudad no informada"}
          {profile.region_name ? ` - ${profile.region_name}` : ""}
        </p>
        <p className="text-sm text-gray-500">Canchas: {profile.courts_count ?? 0}</p>
        <p className="text-sm text-gray-500">Canchas activas para reserva: {courts.length}</p>
      </section>

      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-lg font-semibold mb-3">Reserva de cancha</h2>
        <p className="text-sm text-gray-600 mb-4">
          Solicita una reserva y espera confirmacion del club. Luego podras crear partido desde la reserva confirmada.
        </p>
        <Link
          href={`/clubs/${id}/book`}
          className="inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
        >
          Reservar cancha
        </Link>
      </section>
    </div>
  );
}

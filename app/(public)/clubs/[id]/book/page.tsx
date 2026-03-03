import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlayer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BookingService } from "@/services/booking.service";
import { requestBookingAction } from "@/lib/actions/booking.actions";

function defaultStartLocal() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(20, 0, 0, 0);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

export default async function BookClubCourtPage({ params }: { params: { id: string } }) {
  await requirePlayer();
  const { id } = params;

  const supabase = await createClient();
  const bookingService = new BookingService();

  const [{ data, error }, courts, settings] = await Promise.all([
    (supabase as any).rpc("club_get_public_profile", { p_club_id: id }),
    bookingService.listActiveClubCourts(id),
    bookingService.getClubBookingSettings(id),
  ]);

  if (error) throw error;
  const profile = Array.isArray(data) ? data[0] : data;
  if (!profile) notFound();

  const slotMinutes = settings?.slot_duration_minutes || 90;
  const submitRequestBooking = async (formData: FormData) => {
    "use server";
    await requestBookingAction(formData);
  };

  return (
    <div className="container mx-auto px-4 max-w-3xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reservar cancha</h1>
        <p className="text-sm text-gray-500">{profile.name}</p>
      </div>

      <form action={submitRequestBooking} className="rounded-2xl border bg-white p-6 space-y-4">
        <input type="hidden" name="club_id" value={id} />
        <input type="hidden" name="slot_minutes" value={slotMinutes} />

        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Cancha</label>
          <select
            name="court_id"
            required
            disabled={courts.length === 0}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          >
            {courts.length === 0 ? <option value="">No hay canchas activas</option> : null}
            {courts.map((court) => (
              <option key={court.id} value={court.id}>
                {court.name} - {court.surface_type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Fecha y hora</label>
          <input
            type="datetime-local"
            name="start_local"
            required
            defaultValue={defaultStartLocal()}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">Duracion por defecto: {slotMinutes} minutos.</p>
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Nota (opcional)</label>
          <textarea
            name="note"
            rows={3}
            maxLength={500}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            placeholder="Ej: llegamos 10 minutos antes"
          />
        </div>

        <div className="flex gap-2">
          <button
            disabled={courts.length === 0}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Enviar solicitud
          </button>
          <Link
            href={`/clubs/${id}`}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Volver
          </Link>
        </div>
      </form>
    </div>
  );
}

import { requireClubOwner } from "@/lib/auth";
import { BookingService } from "@/services/booking.service";
import { upsertBookingSettingsAction } from "@/lib/actions/booking.actions";

export default async function MiClubAjustesPage() {
  const { club } = await requireClubOwner();
  const bookingService = new BookingService();
  const settings = await bookingService.getClubBookingSettings(club.id);
  const submitSettings = async (formData: FormData) => {
    "use server";
    await upsertBookingSettingsAction(formData);
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ajustes del Club</h1>
        <p className="text-sm text-gray-500">Define la duracion del turno y el tiempo entre turnos.</p>
      </div>

      <form action={submitSettings} className="rounded-2xl border bg-white p-5 space-y-4">
        <input type="hidden" name="club_id" value={club.id} />
        <input type="hidden" name="timezone" value={settings?.timezone || "America/Argentina/Buenos_Aires"} />
        <input type="hidden" name="opening_hours" value="{}" />
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
              Duracion del turno (min)
            </label>
            <input
              type="number"
              min={30}
              max={240}
              name="slot_duration_minutes"
              defaultValue={settings?.slot_duration_minutes || 90}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
              Tiempo entre turnos (min)
            </label>
            <input
              type="number"
              min={0}
              max={120}
              name="buffer_minutes"
              defaultValue={settings?.buffer_minutes ?? 0}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
          Guardar ajustes
        </button>
      </form>
    </div>
  );
}

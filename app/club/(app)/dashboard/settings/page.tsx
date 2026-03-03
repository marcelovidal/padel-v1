import { requireClub } from "@/lib/auth";
import { BookingService } from "@/services/booking.service";
import { upsertBookingSettingsAction } from "@/lib/actions/booking.actions";

export default async function ClubBookingSettingsPage() {
  const { club } = await requireClub();
  const bookingService = new BookingService();
  const settings = await bookingService.getClubBookingSettings(club.id);
  const submitSettings = async (formData: FormData) => {
    "use server";
    await upsertBookingSettingsAction(formData);
  };

  const openingHoursValue = JSON.stringify(
    settings?.opening_hours || {
      mon: [{ from: "08:00", to: "23:00" }],
      tue: [{ from: "08:00", to: "23:00" }],
      wed: [{ from: "08:00", to: "23:00" }],
      thu: [{ from: "08:00", to: "23:00" }],
      fri: [{ from: "08:00", to: "23:00" }],
      sat: [{ from: "08:00", to: "23:00" }],
      sun: [],
    },
    null,
    2
  );

  return (
    <div className="container mx-auto px-4 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuracion de reservas</h1>
        <p className="text-sm text-gray-500">Duracion del turno, buffer y horarios base del club.</p>
      </div>

      <form action={submitSettings} className="rounded-2xl border bg-white p-5 space-y-4">
        <input type="hidden" name="club_id" value={club.id} />
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Timezone</label>
            <input
              type="text"
              name="timezone"
              defaultValue={settings?.timezone || "America/Argentina/Buenos_Aires"}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
              Duracion (min)
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
              Buffer (min)
            </label>
            <input
              type="number"
              min={0}
              max={120}
              name="buffer_minutes"
              defaultValue={settings?.buffer_minutes || 10}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Opening hours (JSON)</label>
          <textarea
            name="opening_hours"
            defaultValue={openingHoursValue}
            rows={12}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono"
          />
        </div>

        <button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
          Guardar configuracion
        </button>
      </form>
    </div>
  );
}

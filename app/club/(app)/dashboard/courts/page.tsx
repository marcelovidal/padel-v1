import { requireClub } from "@/lib/auth";
import { BookingService } from "@/services/booking.service";
import { createCourtAction, updateCourtAction } from "@/lib/actions/booking.actions";

const SURFACE_OPTIONS = [
  { value: "synthetic", label: "Cesped sintetico" },
  { value: "hard", label: "Cemento" },
  { value: "clay", label: "Polvo de ladrillo" },
  { value: "other", label: "Otra" },
] as const;

export default async function ClubCourtsPage() {
  const { club } = await requireClub();
  const bookingService = new BookingService();
  const courts = await bookingService.listClubCourts(club.id);
  const submitCreateCourt = async (formData: FormData) => {
    "use server";
    await createCourtAction(formData);
  };
  const submitUpdateCourt = async (formData: FormData) => {
    "use server";
    await updateCourtAction(formData);
  };

  return (
    <div className="container mx-auto px-4 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Canchas</h1>
        <p className="text-sm text-gray-500">Gestiona canchas activas para reservas.</p>
      </div>

      <section className="rounded-2xl border bg-white p-5">
        <h2 className="text-sm font-black uppercase tracking-wider text-gray-500 mb-4">Nueva cancha</h2>
        <form action={submitCreateCourt} className="grid gap-3 md:grid-cols-8">
          <input type="hidden" name="club_id" value={club.id} />
          <input
            type="text"
            name="name"
            required
            placeholder="Ej: Cancha 1"
            className="md:col-span-2 rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <select name="surface_type" className="rounded-xl border border-gray-200 px-3 py-2 text-sm">
            {SURFACE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm">
            <input type="checkbox" name="is_indoor" />
            Indoor
          </label>
          <input
            type="time"
            name="opening_time"
            defaultValue="09:00"
            required
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            type="time"
            name="closing_time"
            defaultValue="23:00"
            required
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            type="number"
            name="slot_interval_minutes"
            defaultValue={90}
            min={30}
            max={240}
            step={5}
            required
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
            Crear
          </button>
        </form>
      </section>

      <section className="rounded-2xl border bg-white p-5 space-y-3">
        <h2 className="text-sm font-black uppercase tracking-wider text-gray-500">Canchas registradas</h2>
        {courts.length === 0 ? (
          <p className="text-sm text-gray-500">Aun no hay canchas cargadas.</p>
        ) : (
          courts.map((court) => (
            <form
              key={court.id}
              action={submitUpdateCourt}
              className="grid gap-3 md:grid-cols-9 rounded-xl border border-gray-100 p-3"
            >
              <input type="hidden" name="court_id" value={court.id} />
              <input
                type="text"
                name="name"
                defaultValue={court.name}
                className="md:col-span-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <select
                name="surface_type"
                defaultValue={court.surface_type}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {SURFACE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                <input type="checkbox" name="is_indoor" defaultChecked={court.is_indoor} />
                Indoor
              </label>
              <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
                <input type="checkbox" name="active" defaultChecked={court.active} />
                Activa
              </label>
              <input
                type="time"
                name="opening_time"
                defaultValue={court.opening_time?.slice(0, 5) || "09:00"}
                required
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <input
                type="time"
                name="closing_time"
                defaultValue={court.closing_time?.slice(0, 5) || "23:00"}
                required
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <input
                type="number"
                name="slot_interval_minutes"
                defaultValue={court.slot_interval_minutes || 90}
                min={30}
                max={240}
                step={5}
                required
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <button className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                Guardar
              </button>
            </form>
          ))
        )}
      </section>
    </div>
  );
}

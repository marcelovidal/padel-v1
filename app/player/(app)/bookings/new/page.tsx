import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePlayer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BookingService } from "@/services/booking.service";
import { requestBookingAction } from "@/lib/actions/booking.actions";

function defaultDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function defaultTime() {
  return "20:00";
}

function toDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateInput(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function startOfWeekMonday(d: Date) {
  const copy = new Date(d);
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function buildStartAt(date: string, time: string) {
  if (!date || !time) return null;
  const raw = `${date}T${time}:00`;
  const start = new Date(raw);
  if (Number.isNaN(start.getTime())) return null;
  return start;
}

function buildSlotOptions(openingTime: string, closingTime: string, slotMinutes: number) {
  const parse = (hhmm: string) => {
    const [hh, mm] = hhmm.split(":").map(Number);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    return hh * 60 + mm;
  };
  const open = parse(openingTime);
  const close = parse(closingTime);
  if (open === null || close === null || close <= open || slotMinutes <= 0) return [] as string[];

  const options: string[] = [];
  for (let cur = open; cur + slotMinutes <= close; cur += slotMinutes) {
    const hh = String(Math.floor(cur / 60)).padStart(2, "0");
    const mm = String(cur % 60).padStart(2, "0");
    options.push(`${hh}:${mm}`);
  }
  return options;
}

export default async function PlayerNewBookingPage({
  searchParams,
}: {
  searchParams?: {
    date?: string;
    time?: string;
    club_id?: string;
    court_id?: string;
    view?: string;
    cursor?: string;
    error?: string;
  };
}) {
  await requirePlayer();
  const supabase = await createClient();
  const bookingService = new BookingService();

  const selectedDate = String(searchParams?.date || defaultDate());
  const selectedTime = String(searchParams?.time || defaultTime());
  const selectedClubId = String(searchParams?.club_id || "");
  const selectedCourtId = String(searchParams?.court_id || "");
  const calendarView = searchParams?.view === "month" ? "month" : "week";
  const errorMessage = searchParams?.error ? String(searchParams.error) : "";
  const cursorDate =
    parseDateInput(searchParams?.cursor) || parseDateInput(selectedDate) || parseDateInput(defaultDate()) || new Date();

  const weekStart = startOfWeekMonday(cursorDate);
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const monthStart = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), 1);
  const monthEnd = new Date(cursorDate.getFullYear(), cursorDate.getMonth() + 1, 0);
  const leading = (monthStart.getDay() + 6) % 7;
  const monthDays = monthEnd.getDate();
  const monthCells: Array<Date | null> = [];
  for (let i = 0; i < leading; i++) monthCells.push(null);
  for (let day = 1; day <= monthDays; day++) {
    monthCells.push(new Date(cursorDate.getFullYear(), cursorDate.getMonth(), day));
  }

  const { data: clubs, error: clubsError } = await (supabase as any)
    .from("clubs")
    .select("id,name,city,region_name,claim_status")
    .is("deleted_at", null)
    .is("archived_at", null)
    .is("merged_into", null)
    .order("claim_status", { ascending: false })
    .order("name", { ascending: true });
  if (clubsError) throw clubsError;

  let slotMinutes = 90;
  let effectiveTime = selectedTime;
  let activeCourtsForClub: Array<{
    id: string;
    name: string;
    surface_type: string;
    is_indoor: boolean;
    opening_time: string;
    closing_time: string;
    slot_interval_minutes: number | null;
  }> = [];
  let slotOptions: string[] = [];
  let availableCourts: Array<{
    id: string;
    name: string;
    surface_type: string;
    is_indoor: boolean;
    opening_time: string;
    closing_time: string;
    slot_interval_minutes: number | null;
  }> = [];
  let checkedAvailability = false;

  if (selectedClubId) {
    const settings = await bookingService.getClubBookingSettings(selectedClubId);
    const fallbackSlotMinutes = settings?.slot_duration_minutes || 90;
    slotMinutes = fallbackSlotMinutes;

    const courts = await bookingService.listActiveClubCourts(selectedClubId);
    activeCourtsForClub = courts.map((c) => ({
      id: c.id,
      name: c.name,
      surface_type: c.surface_type,
      is_indoor: c.is_indoor,
      opening_time: String(c.opening_time || "09:00").slice(0, 5),
      closing_time: String(c.closing_time || "23:00").slice(0, 5),
      slot_interval_minutes: c.slot_interval_minutes,
    }));

    const selectedCourt = activeCourtsForClub.find((c) => c.id === selectedCourtId) || null;
    if (selectedCourt) {
      slotMinutes = selectedCourt.slot_interval_minutes || fallbackSlotMinutes;
      slotOptions = buildSlotOptions(selectedCourt.opening_time, selectedCourt.closing_time, slotMinutes);
      if (slotOptions.length > 0 && !slotOptions.includes(selectedTime)) {
        effectiveTime = slotOptions[0];
      }
    }

    const selectedStart = buildStartAt(selectedDate, effectiveTime);
    if (selectedStart) {
      checkedAvailability = true;
      const endAt = new Date(selectedStart.getTime() + slotMinutes * 60_000);
      const { data: blockedRows, error: blockedError } = await (supabase as any)
        .from("court_bookings")
        .select("court_id")
        .eq("club_id", selectedClubId)
        .eq("status", "confirmed")
        .lt("start_at", endAt.toISOString())
        .gt("end_at", selectedStart.toISOString());
      if (blockedError) throw blockedError;

      const blockedSet = new Set((blockedRows || []).map((b: any) => b.court_id));
      availableCourts = activeCourtsForClub
        .filter((c) => !selectedCourtId || c.id === selectedCourtId)
        .filter((c) => !blockedSet.has(c.id));
    }
  }

  const buildHref = (
    overrides: Partial<{ date: string; time: string; club_id: string; court_id: string; view: string; cursor: string }>
  ) => {
    const qs = new URLSearchParams();
    qs.set("date", overrides.date ?? selectedDate);
    if (overrides.time ?? effectiveTime) qs.set("time", overrides.time ?? effectiveTime);
    if (overrides.club_id ?? selectedClubId) qs.set("club_id", overrides.club_id ?? selectedClubId);
    if (overrides.court_id ?? selectedCourtId) qs.set("court_id", overrides.court_id ?? selectedCourtId);
    qs.set("view", overrides.view ?? calendarView);
    qs.set("cursor", overrides.cursor ?? toDateInput(cursorDate));
    return `/player/bookings/new?${qs.toString()}`;
  };

  const prevCursor = new Date(cursorDate);
  if (calendarView === "week") prevCursor.setDate(prevCursor.getDate() - 7);
  else prevCursor.setMonth(prevCursor.getMonth() - 1);
  const nextCursor = new Date(cursorDate);
  if (calendarView === "week") nextCursor.setDate(nextCursor.getDate() + 7);
  else nextCursor.setMonth(nextCursor.getMonth() + 1);

  const submitBooking = async (formData: FormData) => {
    "use server";
    const result = await requestBookingAction(formData);
    if (!result.success) {
      const params = new URLSearchParams();
      params.set("date", String(formData.get("start_local") || "").slice(0, 10) || selectedDate);
      params.set("time", String(formData.get("start_local") || "").slice(11, 16) || effectiveTime);
      params.set("club_id", String(formData.get("club_id") || selectedClubId));
      if (selectedCourtId) params.set("court_id", selectedCourtId);
      params.set("view", calendarView);
      params.set("cursor", toDateInput(cursorDate));
      params.set("error", result.error || "No pudimos enviar la solicitud");
      redirect(`/player/bookings/new?${params.toString()}`);
    }
    const next = new URLSearchParams();
    next.set("from_booking", "1");
    next.set("booking_id", result.bookingId);
    next.set("date", selectedDate);
    next.set("time", effectiveTime);
    next.set("club_id", selectedClubId);
    const selectedClub = (clubs || []).find((club: any) => club.id === selectedClubId);
    if (selectedClub?.name) next.set("club_name", selectedClub.name);
    redirect(`/player/matches/new?${next.toString()}`);
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-6 px-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Nueva reserva</h1>
          <p className="text-sm text-gray-500">Elige dia, club y horario. Luego reserva una cancha disponible.</p>
        </div>
        <Link
          href="/player/bookings"
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Volver
        </Link>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-2xl border bg-white p-5 space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-gray-500">1) Dia, club y horario</h2>
        <div className="space-y-3 rounded-xl border border-gray-100 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border border-gray-200 p-1">
              <Link
                href={buildHref({ view: "week" })}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${calendarView === "week" ? "bg-blue-600 text-white" : "text-gray-700"}`}
              >
                Semana
              </Link>
              <Link
                href={buildHref({ view: "month" })}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${calendarView === "month" ? "bg-blue-600 text-white" : "text-gray-700"}`}
              >
                Mes
              </Link>
            </div>
            <div className="flex gap-2">
              <Link
                href={buildHref({ cursor: toDateInput(prevCursor) })}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Anterior
              </Link>
              <Link
                href={buildHref({ cursor: toDateInput(nextCursor) })}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Siguiente
              </Link>
            </div>
          </div>

          {calendarView === "week" ? (
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const dayValue = toDateInput(day);
                const selected = dayValue === selectedDate;
                return (
                  <Link
                    key={dayValue}
                    href={buildHref({ date: dayValue, cursor: dayValue })}
                    className={`rounded-xl border px-2 py-3 text-center ${selected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}
                  >
                    <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">
                      {day.toLocaleDateString("es-AR", { weekday: "short" })}
                    </p>
                    <p className="text-base font-black text-gray-900">{day.getDate()}</p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {monthCells.map((cell, idx) =>
                cell ? (
                  <Link
                    key={`${toDateInput(cell)}-${idx}`}
                    href={buildHref({ date: toDateInput(cell), cursor: toDateInput(cell) })}
                    className={`rounded-xl border px-2 py-2 text-center ${toDateInput(cell) === selectedDate ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}
                  >
                    <p className="text-sm font-bold text-gray-900">{cell.getDate()}</p>
                  </Link>
                ) : (
                  <div key={`empty-${idx}`} className="rounded-xl border border-dashed border-gray-100 bg-gray-50/40" />
                )
              )}
            </div>
          )}
        </div>

        <form method="get" className="grid gap-3 md:grid-cols-4">
          <input type="hidden" name="date" value={selectedDate} />
          <input type="hidden" name="view" value={calendarView} />
          <input type="hidden" name="cursor" value={toDateInput(cursorDate)} />

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-500">Club</label>
            <select
              name="club_id"
              defaultValue={selectedClubId}
              required
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Selecciona club</option>
              {(clubs || []).map((club: any) => (
                <option key={club.id} value={club.id}>
                  {club.name}
                  {club.city ? ` - ${club.city}` : ""}
                  {club.region_name ? ` (${club.region_name})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-500">Cancha</label>
            <select
              name="court_id"
              defaultValue={selectedCourtId}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              {activeCourtsForClub.map((court) => (
                <option key={court.id} value={court.id}>
                  {court.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-500">Hora</label>
            {selectedCourtId && slotOptions.length > 0 ? (
              <select
                name="time"
                defaultValue={effectiveTime}
                required
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              >
                {slotOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="time"
                name="time"
                defaultValue={effectiveTime}
                required
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            )}
          </div>

          <div className="md:col-span-4">
            <button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
              Ver canchas disponibles
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border bg-white p-5 space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-gray-500">2) Selecciona cancha y solicita</h2>
        {!checkedAvailability ? (
          <p className="text-sm text-gray-500">Primero selecciona dia, club y hora para consultar disponibilidad.</p>
        ) : availableCourts.length === 0 ? (
          <p className="text-sm text-amber-700">
            No hay canchas disponibles para ese club y horario. Prueba otra hora o club.
          </p>
        ) : (
          <form action={submitBooking} className="space-y-4">
            <input type="hidden" name="club_id" value={selectedClubId} />
            <input type="hidden" name="slot_minutes" value={slotMinutes} />
            <input type="hidden" name="start_local" value={`${selectedDate}T${effectiveTime}`} />

            <div>
              <p className="text-sm text-gray-600">
                Duracion del turno: <span className="font-semibold text-gray-900">{slotMinutes} min</span>
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-500">Cancha</label>
              <select name="court_id" required className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm">
                <option value="">Selecciona cancha</option>
                {availableCourts.map((court) => (
                  <option key={court.id} value={court.id}>
                    {court.name} - {court.surface_type}
                    {court.is_indoor ? " (indoor)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-500">Nota (opcional)</label>
              <textarea
                name="note"
                rows={3}
                maxLength={500}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                placeholder="Ej: llegamos 10 minutos antes"
              />
            </div>

            <button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
              Enviar solicitud
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

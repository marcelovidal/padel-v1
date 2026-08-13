import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePlayer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BookingService } from "@/services/booking.service";
import { requestBookingAction } from "@/lib/actions/booking.actions";
import { ClubAutoSubmit } from "@/components/bookings/ClubAutoSubmit";
import { CourtAvailabilityGrid } from "@/components/bookings/CourtAvailabilityGrid";
import {
  computeClubAvailability,
  type AvailabilityCourt,
  type ClubSlotState,
} from "@/lib/bookings/availability";

/**
 * Ruta propia de esta pagina. Sale de una constante y no literal en cada href
 * porque la reserva publica va a repetir este mismo `buildHref` apuntando a su
 * propia ruta.
 */
const BASE_PATH = "/player/bookings/new";

function defaultDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
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
  const selectedTime = String(searchParams?.time || "");
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
  let activeCourtsForClub: AvailabilityCourt[] = [];
  let clubSlotStates: ClubSlotState[] = [];
  let availableCourts: AvailabilityCourt[] = [];
  let effectiveCourtId = selectedCourtId;
  let courtSlotMap = new Map<string, Set<string>>();

  if (selectedClubId) {
    const availability = await computeClubAvailability({
      bookingService,
      clubId: selectedClubId,
      date: selectedDate,
      selectedTime,
      selectedCourtId,
    });
    slotMinutes = availability.slotMinutes;
    activeCourtsForClub = availability.activeCourts;
    clubSlotStates = availability.clubSlotStates;
    courtSlotMap = availability.courtSlotMap;
    effectiveTime = availability.effectiveTime;
    effectiveCourtId = availability.effectiveCourtId;
    availableCourts = availability.availableCourts;
  }

  const buildHref = (
    overrides: Partial<{ date: string; time: string; club_id: string; court_id: string; view: string; cursor: string }>
  ) => {
    const qs = new URLSearchParams();
    qs.set("date", overrides.date ?? selectedDate);
    if (overrides.time ?? effectiveTime) qs.set("time", overrides.time ?? effectiveTime);
    if (overrides.club_id ?? selectedClubId) qs.set("club_id", overrides.club_id ?? selectedClubId);
    if (overrides.court_id ?? effectiveCourtId) qs.set("court_id", overrides.court_id ?? effectiveCourtId);
    qs.set("view", overrides.view ?? calendarView);
    qs.set("cursor", overrides.cursor ?? toDateInput(cursorDate));
    return `${BASE_PATH}?${qs.toString()}`;
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
      if (effectiveCourtId) params.set("court_id", effectiveCourtId);
      params.set("view", calendarView);
      params.set("cursor", toDateInput(cursorDate));
      params.set("error", result.error || "No pudimos enviar la solicitud");
      redirect(`${BASE_PATH}?${params.toString()}`);
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

  const canBook = !!selectedClubId && !!effectiveTime && !!effectiveCourtId;

  return (
    <div className="space-y-6">
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
        <h2 className="text-sm font-black uppercase tracking-wider text-gray-500">1) Semana y segmento de turno</h2>
        <div className="space-y-3 rounded-xl border border-gray-100 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border border-gray-200 p-1">
              <Link
                href={buildHref({ view: "week" })}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${calendarView === "week" ? "bg-blue-600 text-white" : "text-gray-700"}`}
              >
                Semana
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

        <div className="space-y-2">
          <label className="block text-xs font-black uppercase tracking-wider text-gray-500">Club</label>
          <ClubAutoSubmit
            clubs={(clubs || []).map((c: any) => ({
              id: c.id,
              name: c.name,
              city: c.city,
              region_name: c.region_name,
            }))}
            selectedClubId={selectedClubId}
            currentParams={{
              date: selectedDate,
              view: calendarView,
              cursor: toDateInput(cursorDate),
            }}
          />
        </div>

        {selectedClubId && activeCourtsForClub.length > 0 ? (
          <CourtAvailabilityGrid
            courts={activeCourtsForClub}
            slotStates={clubSlotStates}
            courtSlotMap={courtSlotMap}
            selectedTime={effectiveTime}
            selectedCourtId={effectiveCourtId}
            buildSlotHref={({ time, courtId }) => buildHref({ time, court_id: courtId })}
          />
        ) : selectedClubId && activeCourtsForClub.length === 0 ? (
          <p className="text-sm text-amber-700">Este club no tiene canchas activas configuradas.</p>
        ) : null}
      </section>

      <section className="rounded-2xl border bg-white p-5 space-y-4">
        {!canBook ? (
          <p className="text-sm text-gray-500">
            Selecciona un club y elige un horario disponible en el timeline para continuar.
          </p>
        ) : (
          <form action={submitBooking} className="space-y-4">
            <input type="hidden" name="club_id" value={selectedClubId} />
            <input type="hidden" name="slot_minutes" value={slotMinutes} />
            <input type="hidden" name="start_local" value={`${selectedDate}T${effectiveTime}`} />
            <input type="hidden" name="court_id" value={effectiveCourtId} />

            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-500">
                Nota (opcional)
              </label>
              <textarea
                name="note"
                rows={3}
                maxLength={500}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                placeholder="Ej: llegamos 10 minutos antes"
              />
            </div>

            <button className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700">
              Reservar
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

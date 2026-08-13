import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOptionalPlayer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BookingService } from "@/services/booking.service";
import { requestBookingAction } from "@/lib/actions/booking.actions";
import { findPublicClub } from "@/lib/clubs/publicClub";
import { TimeSlotPicker } from "@/components/bookings/TimeSlotPicker";
import { computeClubAvailability } from "@/lib/bookings/availability";

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

export default async function BookClubCourtPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { date?: string; time?: string; court_id?: string; cursor?: string; error?: string };
}) {
  // La grilla se muestra a todos. La sesion solo se necesita al confirmar.
  const { user } = await getOptionalPlayer();

  // El segmento puede ser el slug nuevo o un UUID de un link viejo. Se resuelve
  // a id porque todo lo de abajo — RPC, settings, canchas — trabaja con el id.
  const resolved = await findPublicClub(params.slug);
  if (!resolved) notFound();
  const id = resolved.club.id;
  const slug = params.slug;

  const supabase = await createClient();
  const bookingService = new BookingService();

  const { data, error } = await (supabase as any).rpc("club_get_public_profile", { p_club_id: id });
  if (error) throw error;
  const profile = Array.isArray(data) ? data[0] : data;
  if (!profile) notFound();

  const selectedDate = String(searchParams?.date || defaultDate());
  const selectedTime = String(searchParams?.time || "");
  const selectedCourtId = String(searchParams?.court_id || "");
  const errorMessage = searchParams?.error ? String(searchParams.error) : "";
  const cursorDate =
    parseDateInput(searchParams?.cursor) ||
    parseDateInput(selectedDate) ||
    parseDateInput(defaultDate()) ||
    new Date();

  const weekStart = startOfWeekMonday(cursorDate);
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const availability = await computeClubAvailability({
    bookingService,
    clubId: id,
    date: selectedDate,
    selectedTime,
    selectedCourtId,
  });

  const { slotMinutes, activeCourts, clubSlotStates, effectiveTime, effectiveCourtId } = availability;

  const BASE_PATH = `/clubs/${slug}/book`;

  const buildHref = (overrides: Partial<{ date: string; time: string; court_id: string; cursor: string }>) => {
    const qs = new URLSearchParams();
    qs.set("date", overrides.date ?? selectedDate);
    if (overrides.time ?? effectiveTime) qs.set("time", overrides.time ?? effectiveTime);
    if (overrides.court_id ?? effectiveCourtId) qs.set("court_id", overrides.court_id ?? effectiveCourtId);
    qs.set("cursor", overrides.cursor ?? toDateInput(cursorDate));
    return `${BASE_PATH}?${qs.toString()}`;
  };

  const prevCursor = new Date(cursorDate);
  prevCursor.setDate(prevCursor.getDate() - 7);
  const nextCursor = new Date(cursorDate);
  nextCursor.setDate(nextCursor.getDate() + 7);

  const canBook = !!effectiveTime && !!effectiveCourtId;

  // Si el usuario volvio del login con un turno especifico en la URL y ese
  // turno ya no esta disponible, mostramos un aviso en lugar de seleccionar
  // silenciosamente otro horario.
  const slotWasTaken =
    !!selectedTime &&
    !!selectedCourtId &&
    !clubSlotStates.some(
      (s) => s.time === selectedTime && s.availableCourts.includes(selectedCourtId)
    );

  // URL a la que volver despues del login, con el turno ya elegido.
  // El usuario elige el horario, va al login, y vuelve con todo preservado.
  const loginNextUrl = (() => {
    const qs = new URLSearchParams();
    qs.set("date", selectedDate);
    if (effectiveTime) qs.set("time", effectiveTime);
    if (effectiveCourtId) qs.set("court_id", effectiveCourtId);
    qs.set("cursor", toDateInput(cursorDate));
    return `${BASE_PATH}?${qs.toString()}`;
  })();

  const submitBooking = async (formData: FormData) => {
    "use server";

    // Pre-flight: entre elegir el turno y volver del registro pueden pasar
    // minutos. Si ya no esta, redirigir a la grilla con el dia (sin time/court_id)
    // para que el usuario vea el estado actualizado y elija otro horario.
    // El RPC lo rechazaria de todos modos (BOOKING_OVERLAP), pero este mensaje
    // es mas claro que un error de solapamiento generico.
    const { BookingService: BS } = await import("@/services/booking.service");
    const { computeClubAvailability: checkAvail } = await import("@/lib/bookings/availability");
    const freshCheck = await checkAvail({
      bookingService: new BS(),
      clubId: id,
      date: selectedDate,
      selectedTime: effectiveTime,
      selectedCourtId: effectiveCourtId,
    });
    const isStillAvailable = freshCheck.clubSlotStates.some(
      (s) => s.time === effectiveTime && s.availableCourts.includes(effectiveCourtId)
    );
    if (!isStillAvailable) {
      const unavailableParams = new URLSearchParams();
      unavailableParams.set("date", selectedDate);
      unavailableParams.set("cursor", toDateInput(cursorDate));
      unavailableParams.set(
        "error",
        "El turno que elegiste ya no está disponible. Elegí otro horario."
      );
      redirect(`${BASE_PATH}?${unavailableParams.toString()}`);
    }

    const result = await requestBookingAction(formData);
    if (!result.success) {
      if (result.code === "NOT_AUTHENTICATED") {
        // Alguien llego a la action sin sesion (race condition, cookie expirada).
        // Lo mandamos al login con next para que vuelva al turno elegido.
        redirect(`/player/login?next=${encodeURIComponent(loginNextUrl)}`);
      }
      // Propagar el error a la grilla con el dia y horario preservados,
      // igual que en /player/bookings/new.
      const errorParams = new URLSearchParams();
      errorParams.set("date", selectedDate);
      if (effectiveTime) errorParams.set("time", effectiveTime);
      if (effectiveCourtId) errorParams.set("court_id", effectiveCourtId);
      errorParams.set("cursor", toDateInput(cursorDate));
      errorParams.set("error", result.error || "No pudimos enviar la solicitud");
      redirect(`${BASE_PATH}?${errorParams.toString()}`);
    }
    const next = new URLSearchParams();
    next.set("from_booking", "1");
    next.set("booking_id", result.bookingId);
    next.set("date", selectedDate);
    next.set("time", effectiveTime);
    next.set("club_id", id);
    next.set("club_name", profile.name);
    redirect(`/player/matches/new?${next.toString()}`);
  };

  return (
    <div className="container mx-auto px-4 max-w-3xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reservar cancha</h1>
          <p className="text-sm text-[var(--text-muted)]">{profile.name}</p>
        </div>
        <Link
          href={`/clubs/${slug}`}
          className="rounded-xl border border-[var(--border-soft)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
        >
          Volver
        </Link>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      ) : slotWasTaken ? (
        <div className="rounded-xl border border-brand-amarillo-50 bg-brand-amarillo-50 px-4 py-3 text-sm font-medium text-brand-amarillo">
          El turno que elegiste ya no está disponible. Elegí otro horario en la grilla.
        </div>
      ) : null}

      <section className="rounded-[14px] border border-[var(--border-soft)] bg-[var(--bg-card)] p-5 space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-[var(--text-muted)]">
          1) Elegí el día
        </h2>

        <div className="space-y-3 rounded-xl border border-[var(--border-soft)] p-3">
          <div className="flex gap-2 justify-end">
            <Link
              href={buildHref({ cursor: toDateInput(prevCursor) })}
              className="rounded-lg border border-[var(--border-soft)] px-3 py-1.5 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
            >
              Anterior
            </Link>
            <Link
              href={buildHref({ cursor: toDateInput(nextCursor) })}
              className="rounded-lg border border-[var(--border-soft)] px-3 py-1.5 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
            >
              Siguiente
            </Link>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const dayValue = toDateInput(day);
              const selected = dayValue === selectedDate;
              return (
                <Link
                  key={dayValue}
                  href={buildHref({ date: dayValue, cursor: dayValue, time: "", court_id: "" })}
                  className={`rounded-xl border px-2 py-3 text-center ${
                    selected
                      ? "border-brand-azul bg-brand-azul-50"
                      : "border-[var(--border-soft)] hover:bg-[var(--bg-elevated)]"
                  }`}
                >
                  <p className="text-[11px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                    {day.toLocaleDateString("es-AR", { weekday: "short" })}
                  </p>
                  <p className="text-base font-black text-[var(--text-primary)]">{day.getDate()}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="rounded-[14px] border border-[var(--border-soft)] bg-[var(--bg-card)] p-5 space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-[var(--text-muted)]">
          2) Elegí un turno disponible
        </h2>

        {activeCourts.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            Este club no tiene canchas activas configuradas.
          </p>
        ) : (
          <TimeSlotPicker
            clubSlotStates={clubSlotStates}
            activeCourts={activeCourts}
            slotMinutes={slotMinutes}
            selectedTime={effectiveTime}
            selectedCourtId={effectiveCourtId}
            buildSlotHref={({ time, courtId }) => buildHref({ time, court_id: courtId })}
          />
        )}
      </section>

      <section className="rounded-[14px] border border-[var(--border-soft)] bg-[var(--bg-card)] p-5 space-y-4">
        {!canBook ? (
          <p className="text-sm text-[var(--text-muted)]">
            Elegí un horario disponible en la grilla para continuar.
          </p>
        ) : !user ? (
          /* Sin sesion: el turno esta elegido, falta logueo. */
          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">
                {selectedDate} · {effectiveTime} hs
              </span>
              {" — "}
              {activeCourts.find((c) => c.id === effectiveCourtId)?.name || "cancha"}
              {" · "}
              {slotMinutes} min
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              Para confirmar la reserva necesitas una cuenta. El turno te espera del otro lado.
            </p>
            <Link
              href={`/player/login?next=${encodeURIComponent(loginNextUrl)}`}
              className="block w-full rounded-xl bg-brand-rojo px-4 py-3 text-center text-sm font-bold text-white hover:bg-brand-rojo-dark"
            >
              Iniciar sesión y reservar
            </Link>
            <Link
              href={`/welcome?next=${encodeURIComponent(loginNextUrl)}`}
              className="block w-full rounded-xl border border-[var(--border-soft)] px-4 py-3 text-center text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
            >
              Crear cuenta
            </Link>
          </div>
        ) : (
          /* Con sesion (con o sin onboarding): reserva directa. */
          <form action={submitBooking} className="space-y-4">
            <input type="hidden" name="club_id" value={id} />
            <input type="hidden" name="slot_minutes" value={slotMinutes} />
            <input type="hidden" name="start_local" value={`${selectedDate}T${effectiveTime}`} />
            <input type="hidden" name="court_id" value={effectiveCourtId} />

            <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">
                {selectedDate} · {effectiveTime} hs
              </span>
              {" — "}
              {activeCourts.find((c) => c.id === effectiveCourtId)?.name || "cancha"}
              {" · "}
              {slotMinutes} min
            </div>

            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                Nota (opcional)
              </label>
              <textarea
                name="note"
                rows={3}
                maxLength={500}
                className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)]"
                placeholder="Ej: llegamos 10 minutos antes"
              />
            </div>

            <button className="w-full rounded-xl bg-brand-rojo px-4 py-3 text-sm font-bold text-white hover:bg-brand-rojo-dark">
              Reservar
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

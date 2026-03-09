import Link from "next/link";
import { requireClub } from "@/lib/auth";
import { BookingService } from "@/services/booking.service";
import { PlayerService } from "@/services/player.service";
import { ClubService } from "@/services/club.service";
import {
  confirmBookingAction,
  createMatchFromBookingAction,
  rejectBookingAction,
  cancelBookingAction,
} from "@/lib/actions/booking.actions";
import { BookingStatusBadge } from "@/components/bookings/BookingStatusBadge";
import { ClubBookingsCalendarPanel } from "@/components/bookings/ClubBookingsCalendarPanel";
import { AgendaGrid } from "@/components/club/agenda/AgendaGrid";
import { BookingsViewToggle } from "@/components/bookings/BookingsViewToggle";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type WeekDayBucket = {
  date: string;
  weekdayLabel: string;
  dayLabel: string;
  bookings: Array<any>;
  requested: number;
  confirmed: number;
  history: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TZ_OFFSET = "-03:00"; // Argentina, sin DST

function asDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDate(raw?: string): Date {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date();
  const d = new Date(`${raw}T00:00:00`);
  return isNaN(d.getTime()) ? new Date() : d;
}

function parseDateTZ(raw?: string): Date {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date();
  const d = new Date(`${raw}T00:00:00${TZ_OFFSET}`);
  return isNaN(d.getTime()) ? new Date() : d;
}

function toDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeekMonday(d: Date) {
  const copy = new Date(d);
  const dow = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - dow);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function matchStatusLabel(status: string) {
  if (status === "scheduled") return "Programado";
  if (status === "completed") return "Completado";
  if (status === "cancelled") return "Cancelado";
  return status;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function ClubBookingsPage({
  searchParams,
}: {
  searchParams?: {
    view_mode?: string;
    // agenda params
    date?: string;
    view?: string;
    // lista params
    cursor?: string;
  };
}) {
  const params = searchParams || {};
  const viewMode = params.view_mode === "lista" ? "lista" : "agenda";
  const { club } = await requireClub();
  const bookingService = new BookingService();

  // ── Vista Agenda ──────────────────────────────────────────────────────────
  if (viewMode === "agenda") {
    const agendaView = params.view === "week" ? "week" : "day";
    const selectedDate = parseDateTZ(params.date);
    const selectedDateStr = toDateInput(selectedDate);

    let from: Date;
    let to: Date;
    if (agendaView === "week") {
      from = startOfWeekMonday(selectedDate);
      to = new Date(from);
      to.setDate(to.getDate() + 7);
    } else {
      from = new Date(`${selectedDateStr}T00:00:00${TZ_OFFSET}`);
      to = new Date(`${selectedDateStr}T00:00:00${TZ_OFFSET}`);
      to.setDate(to.getDate() + 1);
    }

    const [courts, slots] = await Promise.all([
      bookingService.listActiveClubCourts(club.id),
      bookingService.getAgendaSlots(club.id, from.toISOString(), to.toISOString()),
    ]);

    return (
      <div className="container mx-auto max-w-7xl space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reservas</h1>
            <p className="mt-1 text-sm text-gray-500">
              Vista unificada de reservas, ligas y torneos por cancha.
            </p>
          </div>
          <BookingsViewToggle current="agenda" />
        </div>

        <AgendaGrid
          courts={courts}
          slots={slots}
          initialDate={selectedDateStr}
          initialView={agendaView}
          confirmAction={confirmBookingAction}
          rejectAction={rejectBookingAction}
          cancelAction={cancelBookingAction}
          baseHref="/club/dashboard/bookings"
        />
      </div>
    );
  }

  // ── Vista Lista ───────────────────────────────────────────────────────────
  const cursorDate = parseDate(params.cursor);
  const weekStart = startOfWeekMonday(cursorDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekLabel = `${weekStart.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
  })} - ${weekEnd.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`;
  const prevWeek = new Date(weekStart);
  prevWeek.setDate(prevWeek.getDate() - 7);
  const nextWeek = new Date(weekStart);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const playerService = new PlayerService();
  const clubService = new ClubService();
  const [bookings, settings, courts, allPlayers, clubMatches] = await Promise.all([
    bookingService.listClubBookings(club.id),
    bookingService.getClubBookingSettings(club.id),
    bookingService.listActiveClubCourts(club.id),
    playerService.searchPlayersWeighted("", 200),
    clubService.listMyClubMatches(200),
  ]);
  const matchesById = new Map((clubMatches || []).map((match) => [match.id, match]));

  const weekDateSet = new Set(
    Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + idx);
      return asDateKey(d);
    })
  );
  const weekBookings = bookings.filter((booking) =>
    weekDateSet.has(asDateKey(new Date(booking.start_at)))
  );

  const requestedPlayerIds = Array.from(
    new Set(
      weekBookings
        .map((b) => b.requested_by_player_id as string | null)
        .filter((id): id is string => !!id)
    )
  );
  const weightedPlayerIds = new Set((allPlayers || []).map((p: any) => p.id as string));
  const missingPlayers = await Promise.all(
    requestedPlayerIds
      .filter((id) => !weightedPlayerIds.has(id))
      .map(async (id) => {
        try { return await playerService.getPlayerById(id); } catch { return null; }
      })
  );
  const mergedPlayersMap = new Map<string, any>();
  for (const p of allPlayers || []) { if (p?.id) mergedPlayersMap.set(p.id, p); }
  for (const p of missingPlayers) { if (p?.id) mergedPlayersMap.set(p.id, p); }
  const mergedPlayers = Array.from(mergedPlayersMap.values());

  const byDay = new Map<string, WeekDayBucket>();
  for (let idx = 0; idx < 7; idx++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + idx);
    const key = asDateKey(d);
    byDay.set(key, {
      date: key,
      weekdayLabel: d.toLocaleDateString("es-AR", { weekday: "short" }),
      dayLabel: String(d.getDate()),
      bookings: [],
      requested: 0,
      confirmed: 0,
      history: 0,
    });
  }
  for (const booking of weekBookings) {
    const key = asDateKey(new Date(booking.start_at));
    const bucket = byDay.get(key);
    if (!bucket) continue;
    bucket.bookings.push(booking);
    if (booking.status === "requested") bucket.requested += 1;
    else if (booking.status === "confirmed") bucket.confirmed += 1;
    else bucket.history += 1;
  }

  const buckets = Array.from(byDay.values());
  const totalRequested = buckets.reduce((acc, b) => acc + b.requested, 0);
  const totalConfirmed = buckets.reduce((acc, b) => acc + b.confirmed, 0);
  const totalHistory = buckets.reduce((acc, b) => acc + b.history, 0);
  const sortedBookings = [...weekBookings].sort((a, b) => a.start_at.localeCompare(b.start_at));
  const courtOptions = courts.map((court) => ({
    id: court.id,
    label: court.name,
    opening_time: String(court.opening_time || "09:00").slice(0, 5),
    closing_time: String(court.closing_time || "23:00").slice(0, 5),
    slot_interval_minutes: court.slot_interval_minutes,
  }));
  const playerOptions = mergedPlayers.map((player: any) => ({
    id: player.id,
    label:
      `${player.first_name || ""} ${player.last_name || ""}`.trim() ||
      player.display_name ||
      "Jugador",
  }));

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reservas</h1>
          <p className="text-sm text-gray-500">
            Calendario unificado con solicitudes, confirmaciones e historial.
          </p>
        </div>
        <BookingsViewToggle current="lista" />
      </div>

      <ClubBookingsCalendarPanel
        weekLabel={weekLabel}
        prevWeekHref={`/club/dashboard/bookings?view_mode=lista&cursor=${toDateInput(prevWeek)}`}
        nextWeekHref={`/club/dashboard/bookings?view_mode=lista&cursor=${toDateInput(nextWeek)}`}
        buckets={buckets}
        totalRequested={totalRequested}
        totalConfirmed={totalConfirmed}
        totalHistory={totalHistory}
        clubId={club.id}
        slotMinutes={settings?.slot_duration_minutes || 90}
        courts={courtOptions}
        players={playerOptions}
      />

      <section className="rounded-2xl border bg-white p-5 space-y-3">
        <h2 className="text-sm font-black uppercase tracking-wider text-gray-500">
          Detalle de la semana
        </h2>
        {sortedBookings.length === 0 ? (
          <p className="text-sm text-gray-500">No hay reservas en la semana seleccionada.</p>
        ) : (
          sortedBookings.map((booking) => (
            <div key={booking.id} className="rounded-xl border border-gray-100 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">
                    {booking.club_courts?.name || "Cancha"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(booking.start_at).toLocaleString("es-AR")} -{" "}
                    {new Date(booking.end_at).toLocaleTimeString("es-AR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <BookingStatusBadge status={booking.status} />
              </div>

              {booking.note ? (
                <p className="mt-2 text-sm text-gray-700">Nota: {booking.note}</p>
              ) : null}
              {booking.rejection_reason ? (
                <p className="mt-2 text-sm text-red-700">
                  Motivo rechazo: {booking.rejection_reason}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {booking.status === "requested" ? (
                  <>
                    <form action={submitConfirm}>
                      <input type="hidden" name="booking_id" value={booking.id} />
                      <button className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700">
                        Confirmar y crear partido
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
                  <details className="w-full rounded-lg border border-gray-200 bg-gray-50/40 p-3">
                    <summary className="cursor-pointer list-none text-sm font-semibold text-gray-700">
                      Ver partido
                    </summary>
                    <div className="mt-3 space-y-2 text-sm">
                      {(() => {
                        const match = matchesById.get(booking.match_id as string);
                        if (!match) {
                          return (
                            <p className="text-gray-500">
                              No pudimos cargar el detalle del partido. Podés verlo desde Partidos.
                            </p>
                          );
                        }
                        return (
                          <>
                            <p className="text-gray-700">
                              Estado:{" "}
                              <span className="font-semibold text-gray-900">
                                {matchStatusLabel(match.status)}
                              </span>
                            </p>
                            <p className="text-gray-700">
                              Fecha/Hora:{" "}
                              <span className="font-semibold text-gray-900">
                                {new Date(match.match_at).toLocaleString("es-AR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </p>
                            <div className="grid gap-2 md:grid-cols-2">
                              <div>
                                <p className="text-xs font-black uppercase tracking-wider text-gray-500">
                                  Equipo A
                                </p>
                                {(match.playersByTeam.A || []).length === 0 ? (
                                  <p className="text-gray-500">Sin jugadores</p>
                                ) : (
                                  <ul className="space-y-1 text-gray-900">
                                    {(match.playersByTeam.A || []).map((player: any) => (
                                      <li key={player.id}>
                                        {`${player.first_name || ""} ${player.last_name || ""}`.trim()}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              <div>
                                <p className="text-xs font-black uppercase tracking-wider text-gray-500">
                                  Equipo B
                                </p>
                                {(match.playersByTeam.B || []).length === 0 ? (
                                  <p className="text-gray-500">Sin jugadores</p>
                                ) : (
                                  <ul className="space-y-1 text-gray-900">
                                    {(match.playersByTeam.B || []).map((player: any) => (
                                      <li key={player.id}>
                                        {`${player.first_name || ""} ${player.last_name || ""}`.trim()}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                            <div>
                              <Link
                                href="/club/matches"
                                className="text-sm font-semibold text-blue-700 hover:underline"
                              >
                                Ir a Partidos
                              </Link>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </details>
                ) : null}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

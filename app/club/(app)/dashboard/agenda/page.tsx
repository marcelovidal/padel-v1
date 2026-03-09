import { requireClub } from "@/lib/auth";
import { BookingService } from "@/services/booking.service";
import { AgendaGrid } from "@/components/club/agenda/AgendaGrid";
import {
  confirmBookingAction,
  rejectBookingAction,
  cancelBookingAction,
} from "@/lib/actions/booking.actions";

// Argentina no observa horario de verano → UTC-3 fijo
const TZ_OFFSET = "-03:00";

function parseDate(raw?: string): Date {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date();
  const d = new Date(`${raw}T00:00:00${TZ_OFFSET}`);
  return isNaN(d.getTime()) ? new Date() : d;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeekMonday(d: Date): Date {
  const copy = new Date(d);
  const dow = (copy.getDay() + 6) % 7; // 0=Mon
  copy.setDate(copy.getDate() - dow);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export default async function ClubAgendaPage({
  searchParams,
}: {
  searchParams?: { date?: string; view?: string };
}) {
  const { club } = await requireClub();
  const service = new BookingService();

  const view = searchParams?.view === "week" ? "week" : "day";
  const selectedDate = parseDate(searchParams?.date);
  const selectedDateStr = toDateStr(selectedDate);

  // Rango UTC según vista
  let from: Date;
  let to: Date;

  if (view === "week") {
    from = startOfWeekMonday(selectedDate);
    to = new Date(from);
    to.setDate(to.getDate() + 7);
  } else {
    from = new Date(`${selectedDateStr}T00:00:00${TZ_OFFSET}`);
    to = new Date(`${selectedDateStr}T00:00:00${TZ_OFFSET}`);
    to.setDate(to.getDate() + 1);
  }

  const [courts, slots] = await Promise.all([
    service.listActiveClubCourts(club.id),
    service.getAgendaSlots(club.id, from.toISOString(), to.toISOString()),
  ]);

  return (
    <div className="container mx-auto max-w-7xl space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agenda de canchas</h1>
        <p className="mt-1 text-sm text-gray-500">
          Vista unificada de reservas, ligas y torneos por cancha.
        </p>
      </div>

      <AgendaGrid
        courts={courts}
        slots={slots}
        initialDate={selectedDateStr}
        initialView={view}
        confirmAction={confirmBookingAction}
        rejectAction={rejectBookingAction}
        cancelAction={cancelBookingAction}
      />
    </div>
  );
}

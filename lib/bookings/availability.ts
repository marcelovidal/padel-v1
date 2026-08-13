import type { BookingService } from "@/services/booking.service";

/**
 * Una cancha activa con lo que la grilla necesita para dibujar su fila.
 * `opening_time` y `closing_time` vienen normalizados a `HH:MM`.
 */
export type AvailabilityCourt = {
  id: string;
  name: string;
  surface_type: string;
  is_indoor: boolean;
  opening_time: string;
  closing_time: string;
  slot_interval_minutes: number | null;
};

/**
 * Estado de una franja horaria a nivel club: cuantas canchas la tienen
 * configurada y cuales estan libres.
 */
export type ClubSlotState = {
  time: string;
  totalCourts: number;
  availableCourts: string[];
};

export type ClubAvailability = {
  /** Duracion de turno del club, para el `slot_minutes` del formulario. */
  slotMinutes: number;
  activeCourts: AvailabilityCourt[];
  clubSlotStates: ClubSlotState[];
  /**
   * Que franjas aplican a cada cancha. Dos canchas del mismo club pueden tener
   * horarios y duraciones distintas, asi que una franja de la grilla no existe
   * necesariamente para todas.
   */
  courtSlotMap: Map<string, Set<string>>;
  /** La franja pedida si sirve; si no, la primera con disponibilidad. */
  effectiveTime: string;
  /** La cancha pedida si sigue libre; si no, la primera disponible. */
  effectiveCourtId: string;
  availableCourts: AvailabilityCourt[];
};

export function buildSlotOptions(
  openingTime: string,
  closingTime: string,
  slotMinutes: number
): string[] {
  const parse = (hhmm: string) => {
    const [hh, mm] = hhmm.split(":").map(Number);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    return hh * 60 + mm;
  };
  const open = parse(openingTime);
  const close = parse(closingTime);
  if (open === null || close === null || close <= open || slotMinutes <= 0) return [];

  const options: string[] = [];
  for (let cur = open; cur + slotMinutes <= close; cur += slotMinutes) {
    const hh = String(Math.floor(cur / 60)).padStart(2, "0");
    const mm = String(cur % 60).padStart(2, "0");
    options.push(`${hh}:${mm}`);
  }
  return options;
}

export function buildStartAt(date: string, time: string): Date | null {
  if (!date || !time) return null;
  const start = new Date(`${date}T${time}:00`);
  if (Number.isNaN(start.getTime())) return null;
  return start;
}

/**
 * Disponibilidad de un club para un dia, lista para alimentar la grilla.
 *
 * Se extrajo del server component de `/player/bookings/new`, donde vivia
 * inline, porque la reserva publica tiene que mostrar exactamente la misma
 * disponibilidad. No lee sesion: recibe el club y la fecha y nada mas.
 *
 * La ocupacion sale entera de `club_get_occupied_slots`, que es la fuente
 * unica con las siete fuentes de ocupacion — reservas confirmadas y pedidas,
 * turnos fijos, partidos de liga y torneo, clases y bloqueos.
 */
export async function computeClubAvailability({
  bookingService,
  clubId,
  date,
  selectedTime = "",
  selectedCourtId = "",
}: {
  bookingService: BookingService;
  clubId: string;
  /** `YYYY-MM-DD`. */
  date: string;
  selectedTime?: string;
  selectedCourtId?: string;
}): Promise<ClubAvailability> {
  const settings = await bookingService.getClubBookingSettings(clubId);
  const fallbackSlotMinutes = settings?.slot_duration_minutes || 90;

  const courts = await bookingService.listActiveClubCourts(clubId);
  const activeCourts: AvailabilityCourt[] = courts.map((c: any) => ({
    id: c.id,
    name: c.name,
    surface_type: c.surface_type,
    is_indoor: c.is_indoor,
    opening_time: String(c.opening_time || "09:00").slice(0, 5),
    closing_time: String(c.closing_time || "23:00").slice(0, 5),
    slot_interval_minutes: c.slot_interval_minutes,
  }));

  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const occupiedSlots = await bookingService.getOccupiedSlots(
    clubId,
    dayStart.toISOString(),
    dayEnd.toISOString()
  );

  const courtSlotMap = new Map<string, Set<string>>();
  const byTime = new Map<string, { totalCourts: number; availableCourts: string[] }>();

  for (const court of activeCourts) {
    const courtSlotMinutes = court.slot_interval_minutes || fallbackSlotMinutes;
    const slots = buildSlotOptions(court.opening_time, court.closing_time, courtSlotMinutes);
    courtSlotMap.set(court.id, new Set(slots));

    for (const slot of slots) {
      const start = buildStartAt(date, slot);
      if (!start) continue;
      const end = new Date(start.getTime() + courtSlotMinutes * 60_000);
      // Mismo criterio de solapamiento semiabierto [inicio, fin) que aplica
      // club_get_occupied_slots: un turno que termina donde arranca el
      // siguiente no lo bloquea.
      const blocked = occupiedSlots.some((row: any) => {
        if (row.court_id !== court.id) return false;
        const rowStart = new Date(row.start_at);
        const rowEnd = new Date(row.end_at);
        return start < rowEnd && end > rowStart;
      });

      const current = byTime.get(slot) || { totalCourts: 0, availableCourts: [] as string[] };
      current.totalCourts += 1;
      if (!blocked) current.availableCourts.push(court.id);
      byTime.set(slot, current);
    }
  }

  const clubSlotStates: ClubSlotState[] = Array.from(byTime.entries())
    .map(([time, value]) => ({
      time,
      totalCourts: value.totalCourts,
      availableCourts: value.availableCourts,
    }))
    .sort((a, b) => a.time.localeCompare(b.time));

  const selectedState = clubSlotStates.find(
    (state) => state.time === selectedTime && state.availableCourts.length > 0
  );
  const effectiveTime = selectedState
    ? selectedState.time
    : clubSlotStates.find((state) => state.availableCourts.length > 0)?.time || selectedTime;

  const currentSlotState = clubSlotStates.find((state) => state.time === effectiveTime);
  const availableCourtIds = new Set(currentSlotState?.availableCourts || []);
  const availableCourts = activeCourts.filter((court) => availableCourtIds.has(court.id));

  let effectiveCourtId = selectedCourtId;
  if (effectiveCourtId && !availableCourtIds.has(effectiveCourtId)) {
    effectiveCourtId = "";
  }
  if (!effectiveCourtId && availableCourts.length > 0) {
    effectiveCourtId = availableCourts[0].id;
  }

  return {
    slotMinutes: fallbackSlotMinutes,
    activeCourts,
    clubSlotStates,
    courtSlotMap,
    effectiveTime,
    effectiveCourtId,
    availableCourts,
  };
}

import Link from "next/link";
import type { AvailabilityCourt, ClubSlotState } from "@/lib/bookings/availability";

/**
 * Seleccion de turno por horario.
 *
 * Un boton por franja — libre u ocupado, sin matriz de canchas.
 * Al elegir una franja, la primera cancha disponible (orden alfabetico) queda
 * asignada. Si hay mas de una libre, aparece un selector.
 *
 * El atributo diferenciador (superficie, cubierta) solo se muestra si las
 * canchas del club difieren entre si. En un club con cuatro canchas iguales,
 * el jugador nunca lo ve.
 *
 * Server component a proposito: toda la interaccion es via Link. Sirve tanto
 * para la pagina de reserva (seleccion vive en la URL) como para el perfil
 * del club (un clic va directo a la pagina de reserva).
 */

function courtLabel(
  court: AvailabilityCourt,
  surfaceDiffers: boolean,
  indoorDiffers: boolean
): string {
  const parts: string[] = [court.name];
  if (surfaceDiffers && court.surface_type) parts.push(court.surface_type);
  if (indoorDiffers) parts.push(court.is_indoor ? "cubierta" : "al aire libre");
  return parts.join(" · ");
}

export function TimeSlotPicker({
  clubSlotStates,
  activeCourts,
  slotMinutes,
  selectedTime,
  selectedCourtId,
  buildSlotHref,
}: {
  clubSlotStates: ClubSlotState[];
  activeCourts: AvailabilityCourt[];
  /** Duracion del turno, para mostrar en el panel de cancha asignada. */
  slotMinutes: number;
  /**
   * Franja seleccionada actualmente. "" cuando se usa en el perfil del club
   * (no hay seleccion ahi — un clic va directo a la pagina de reserva).
   */
  selectedTime: string;
  /**
   * Cancha seleccionada dentro de la franja. "" si no hay seleccion o si la
   * cancha pedida no esta libre y se usa la primera disponible.
   */
  selectedCourtId: string;
  /**
   * Construye el href al que navega una celda libre. Parametrizado para no
   * atar el componente a una ruta concreta.
   */
  buildSlotHref: (slot: { time: string; courtId: string }) => string;
}) {
  if (clubSlotStates.length === 0) {
    return (
      <p className="text-sm text-brand-amarillo">
        No hay horarios configurados para este club.
      </p>
    );
  }

  // Detectar si las canchas difieren en superficie o cubierta/descubierta.
  // Si todas son iguales, el selector y los labels de detalle no aparecen.
  const surfaceDiffers =
    new Set(activeCourts.map((c) => c.surface_type ?? "")).size > 1;
  const indoorDiffers =
    new Set(activeCourts.map((c) => String(c.is_indoor))).size > 1;

  const courtById = new Map(activeCourts.map((c) => [c.id, c]));

  // Estado de la franja seleccionada y cancha asignada.
  const selectedSlotState = clubSlotStates.find((s) => s.time === selectedTime);
  const assignedCourtId =
    selectedCourtId &&
    selectedSlotState?.availableCourts.includes(selectedCourtId)
      ? selectedCourtId
      : (selectedSlotState?.availableCourts[0] ?? "");
  const assignedCourt = courtById.get(assignedCourtId);
  const courtsForSelected = (selectedSlotState?.availableCourts ?? [])
    .map((id) => courtById.get(id))
    .filter((c): c is AvailabilityCourt => !!c);

  return (
    <div className="space-y-3">
      {/* Botones de franja horaria */}
      <div className="flex flex-wrap gap-2">
        {clubSlotStates.map((state) => {
          const isFree = state.availableCourts.length > 0;
          const isSelected = isFree && state.time === selectedTime;
          const defaultCourtId = state.availableCourts[0] ?? "";

          if (!isFree) {
            return (
              <div
                key={state.time}
                className="rounded-xl px-3 py-2 text-sm font-bold bg-brand-gris-100 text-brand-gris-mid select-none"
                title="Ocupado"
              >
                {state.time}
              </div>
            );
          }

          return (
            <Link
              key={state.time}
              href={buildSlotHref({ time: state.time, courtId: defaultCourtId })}
              className={`rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
                isSelected
                  ? "bg-brand-rojo text-white"
                  : "bg-brand-verde-50 text-brand-verde hover:bg-brand-verde-50/80"
              }`}
            >
              {state.time}
            </Link>
          );
        })}
      </div>

      {/* Panel de cancha asignada — solo cuando hay una franja seleccionada */}
      {selectedTime && assignedCourt && (
        <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-elevated)] p-3 space-y-2">
          <p className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
            Cancha asignada · {slotMinutes} min
          </p>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {courtLabel(assignedCourt, surfaceDiffers, indoorDiffers)}
          </p>

          {/* Selector de cancha — solo si hay mas de una disponible */}
          {courtsForSelected.length > 1 && (
            <div className="space-y-1.5 pt-0.5">
              <p className="text-xs text-[var(--text-muted)]">Cambiar cancha:</p>
              <div className="flex flex-wrap gap-1.5">
                {courtsForSelected.map((court) => {
                  const isCurrent = court.id === assignedCourtId;
                  return (
                    <Link
                      key={court.id}
                      href={buildSlotHref({ time: selectedTime, courtId: court.id })}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        isCurrent
                          ? "bg-brand-rojo text-white"
                          : "border border-[var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)]"
                      }`}
                    >
                      {courtLabel(court, surfaceDiffers, indoorDiffers)}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

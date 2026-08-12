import Link from "next/link";
import type { AvailabilityCourt, ClubSlotState } from "@/lib/bookings/availability";

/**
 * Matriz cancha x franja horaria de un club para un dia.
 *
 * Server component a proposito: no tiene estado de cliente. La seleccion de
 * turno es un `<Link>`, asi que la intencion vive en la URL y no en React —
 * por eso el mismo componente sirve para una pagina con sesion y para una
 * publica, sin tocar nada.
 *
 * No lee sesion ni auth: recibe canchas, franjas y que hay seleccionado, y
 * emite links. Quien lo usa decide a donde apuntan con `buildSlotHref`.
 */
export function CourtAvailabilityGrid({
  courts,
  slotStates,
  courtSlotMap,
  selectedTime,
  selectedCourtId,
  buildSlotHref,
}: {
  courts: AvailabilityCourt[];
  slotStates: ClubSlotState[];
  /** Que franjas aplican a cada cancha — ver `computeClubAvailability`. */
  courtSlotMap: Map<string, Set<string>>;
  selectedTime: string;
  selectedCourtId: string;
  /** Destino de una celda libre. Parametrizado para no atar la grilla a una ruta. */
  buildSlotHref: (slot: { time: string; courtId: string }) => string;
}) {
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `140px repeat(${slotStates.length}, minmax(60px, 1fr))`,
    gap: "3px",
  } as const;

  return (
    <div className="rounded-xl border border-gray-100 p-3 space-y-2">
      <p className="text-xs font-black uppercase tracking-wider text-gray-500">Disponibilidad</p>
      {slotStates.length === 0 ? (
        <p className="text-sm text-amber-700">No hay horarios configurados para este club.</p>
      ) : (
        <div className="overflow-x-auto">
          {/* Header */}
          <div style={gridStyle} className="mb-[3px]">
            <div className="py-1.5 px-2 text-[10px] font-black uppercase text-gray-400">Cancha</div>
            {slotStates.map((slot) => (
              <div
                key={slot.time}
                className="py-1.5 text-[10px] font-black text-gray-500 text-center"
              >
                {slot.time}
              </div>
            ))}
          </div>
          {/* Court rows */}
          {courts.map((court) => (
            <div key={court.id} style={gridStyle} className="mb-[3px]">
              <div className="flex items-center px-2 py-2 text-xs font-semibold text-gray-700 truncate">
                {court.name}
              </div>
              {slotStates.map((slot) => {
                const isApplicable = courtSlotMap.get(court.id)?.has(slot.time) ?? false;
                const isAvailable = isApplicable && slot.availableCourts.includes(court.id);
                const isSelected = selectedTime === slot.time && selectedCourtId === court.id;

                if (!isApplicable) {
                  return (
                    <div
                      key={`${court.id}-${slot.time}`}
                      className="rounded-md bg-gray-50 border border-dashed border-gray-100"
                    />
                  );
                }
                if (!isAvailable) {
                  return (
                    <div
                      key={`${court.id}-${slot.time}`}
                      className="rounded-md bg-gray-200 py-2 text-center text-[10px] font-semibold text-gray-500"
                    >
                      Ocupado
                    </div>
                  );
                }
                return (
                  <Link
                    key={`${court.id}-${slot.time}`}
                    href={buildSlotHref({ time: slot.time, courtId: court.id })}
                    className={`relative rounded-md py-2 text-center text-[10px] font-bold ${
                      isSelected
                        ? "border-2 border-blue-600 bg-blue-50 text-blue-600"
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-0.5 right-1 text-[8px] font-black text-blue-600">
                        ✓
                      </span>
                    )}
                    {slot.time}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

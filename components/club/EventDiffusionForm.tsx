"use client";

import { CityTagSelector } from "@/components/geo/CityTagSelector";
import { updateTournamentInfoAction, updateLeagueInfoAction } from "@/lib/actions/registrations.actions";

interface EventDiffusionFormProps {
  entityType: "tournament" | "league";
  entityId: string;
  startDate?: string | null;
  endDate?: string | null;
  registrationStartDate?: string | null;
  registrationEndDate?: string | null;
  targetCityIds?: string[];
}

/**
 * Ojo con el vacio: el RPC hace COALESCE(p_x, x), asi que dejar una fecha en
 * blanco NO la borra, mantiene la que estaba. Se puede cargar y cambiar, no
 * limpiar.
 */
export function EventDiffusionForm({
  entityType,
  entityId,
  startDate,
  endDate,
  registrationStartDate,
  registrationEndDate,
  targetCityIds = [],
}: EventDiffusionFormProps) {
  const action = entityType === "tournament" ? updateTournamentInfoAction : updateLeagueInfoAction;
  const idField = entityType === "tournament" ? "tournament_id" : "league_id";

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name={idField} value={entityId} />

      <div>
        <p className="mb-2 text-xs font-black uppercase tracking-wider text-gray-500">
          Fechas del evento
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Inicio</label>
            <input
              type="date"
              name="start_date"
              defaultValue={startDate ?? ""}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Fin</label>
            <input
              type="date"
              name="end_date"
              defaultValue={endDate ?? ""}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-black uppercase tracking-wider text-gray-500">
          Fechas de inscripción
        </p>
        <p className="mb-2 text-xs text-gray-500">
          Informativas: se le muestran al jugador en la página pública. No abren ni cierran
          las inscripciones — eso se hace a mano desde la card del evento.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Apertura <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <input
              type="date"
              name="registration_start_date"
              defaultValue={registrationStartDate ?? ""}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Cierre <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <input
              type="date"
              name="registration_end_date"
              defaultValue={registrationEndDate ?? ""}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-gray-600">
          Ciudades objetivo
        </label>
        <CityTagSelector
          name="target_city_ids"
          initialCityIds={targetCityIds}
          placeholder="Buscar ciudad (ej: General Roca, Neuquén...)"
        />
      </div>

      <div>
        <button
          type="submit"
          className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-900 transition-colors"
        >
          Guardar fechas y difusión
        </button>
      </div>
    </form>
  );
}

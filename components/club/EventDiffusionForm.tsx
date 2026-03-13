"use client";

import { CityTagSelector } from "@/components/geo/CityTagSelector";
import { updateTournamentInfoAction, updateLeagueInfoAction } from "@/lib/actions/registrations.actions";

interface EventDiffusionFormProps {
  entityType: "tournament" | "league";
  entityId: string;
  startDate?: string | null;
  endDate?: string | null;
  targetCityIds?: string[];
}

export function EventDiffusionForm({
  entityType,
  entityId,
  startDate,
  endDate,
  targetCityIds = [],
}: EventDiffusionFormProps) {
  const action = entityType === "tournament" ? updateTournamentInfoAction : updateLeagueInfoAction;
  const idField = entityType === "tournament" ? "tournament_id" : "league_id";

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name={idField} value={entityId} />

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Fecha de inicio</label>
          <input
            type="date"
            name="start_date"
            defaultValue={startDate ?? ""}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Fecha de cierre de inscripción</label>
          <input
            type="date"
            name="end_date"
            defaultValue={endDate ?? ""}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
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
          Guardar difusión
        </button>
      </div>
    </form>
  );
}

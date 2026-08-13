"use client";

import { useState } from "react";
import { EventDiffusionForm } from "./EventDiffusionForm";

function formatDate(d: string | null | undefined): string | null {
  if (!d) return null;
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

interface Props {
  entityType: "tournament" | "league";
  entityId: string;
  startDate?: string | null;
  endDate?: string | null;
  registrationStartDate?: string | null;
  registrationEndDate?: string | null;
  targetCityIds?: string[];
}

/**
 * Cuatro fechas, no dos. Hasta la migracion 20260819 esta seccion mostraba
 * start_date/end_date rotuladas como "inicio/cierre de inscripciones", que es
 * lo que son las dos columnas nuevas: start_date/end_date son las fechas del
 * evento, las que la pagina publica muestra en el header y las que
 * q6_notify_event_open manda en el mensaje de difusion.
 */
export function EventDiffusionSection({
  entityType,
  entityId,
  startDate,
  endDate,
  registrationStartDate,
  registrationEndDate,
  targetCityIds = [],
}: Props) {
  const hasData = !!(
    startDate ||
    endDate ||
    registrationStartDate ||
    registrationEndDate ||
    targetCityIds.length > 0
  );
  const [editing, setEditing] = useState(!hasData);

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Inicio del evento</p>
            <p className="mt-0.5 font-medium text-gray-800">{formatDate(startDate) ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Fin del evento</p>
            <p className="mt-0.5 font-medium text-gray-800">{formatDate(endDate) ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Apertura inscripciones</p>
            <p className="mt-0.5 font-medium text-gray-800">{formatDate(registrationStartDate) ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Cierre inscripciones</p>
            <p className="mt-0.5 font-medium text-gray-800">{formatDate(registrationEndDate) ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Ciudades</p>
            <p className="mt-0.5 font-medium text-gray-800">
              {targetCityIds.length > 0
                ? `${targetCityIds.length} configurada${targetCityIds.length !== 1 ? "s" : ""}`
                : "—"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
        >
          ✏ Editar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hasData && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            × Cancelar
          </button>
        </div>
      )}
      <EventDiffusionForm
        entityType={entityType}
        entityId={entityId}
        startDate={startDate}
        endDate={endDate}
        registrationStartDate={registrationStartDate}
        registrationEndDate={registrationEndDate}
        targetCityIds={targetCityIds}
      />
    </div>
  );
}

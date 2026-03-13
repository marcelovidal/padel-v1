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
  targetCityIds?: string[];
}

export function EventDiffusionSection({
  entityType,
  entityId,
  startDate,
  endDate,
  targetCityIds = [],
}: Props) {
  const hasData = !!(startDate || endDate || targetCityIds.length > 0);
  const [editing, setEditing] = useState(!hasData);

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Inicio inscripciones</p>
            <p className="mt-0.5 font-medium text-gray-800">{formatDate(startDate) ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Cierre inscripciones</p>
            <p className="mt-0.5 font-medium text-gray-800">{formatDate(endDate) ?? "—"}</p>
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
        targetCityIds={targetCityIds}
      />
    </div>
  );
}

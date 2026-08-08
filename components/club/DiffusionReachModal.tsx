"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { countPlayersInCitiesAction } from "@/lib/actions/registrations.actions";

interface Props {
  entityType: "tournament" | "league";
  targetCityIds: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function DiffusionReachModal({ entityType, targetCityIds, onConfirm, onCancel }: Props) {
  // null = todavia no resuelto o no disponible; el modal se muestra igual
  const [count, setCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(true);
  const [cityLabels, setCityLabels] = useState<string[]>([]);

  const entityLabel = entityType === "tournament" ? "el torneo" : "la liga";

  useEffect(() => {
    let cancelled = false;

    countPlayersInCitiesAction(targetCityIds)
      .then((value) => {
        if (!cancelled) setCount(value);
      })
      .catch(() => {
        if (!cancelled) setCount(null);
      })
      .finally(() => {
        if (!cancelled) setCountLoading(false);
      });

    // Nombres de ciudad: mismo endpoint que usa CityTagSelector
    fetch(`/api/geo/cities?ids=${targetCityIds.join(",")}`)
      .then((r) => r.json())
      .then((cities: { id: string; nombre: string; provincia: string | null }[]) => {
        if (cancelled || !Array.isArray(cities)) return;
        setCityLabels(
          cities.map((c) => (c.provincia ? `${c.nombre}, ${c.provincia}` : c.nombre))
        );
      })
      .catch(() => {
        /* fallback: se muestran los IDs */
      });

    return () => {
      cancelled = true;
    };
  }, [targetCityIds]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const labels = cityLabels.length > 0 ? cityLabels : targetCityIds;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="diffusion-reach-title"
        className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-5 w-5 text-amber-700" />
          </div>
          <div>
            <h3 id="diffusion-reach-title" className="text-lg font-bold text-gray-900">
              Confirmar difusión
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Al activar {entityLabel} se notificará a los jugadores de las ciudades objetivo.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
          <p className="text-xs font-black uppercase tracking-wider text-gray-500">Alcance</p>
          {countLoading ? (
            <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Calculando…
            </p>
          ) : count === null ? (
            <p className="mt-1 text-sm font-semibold text-amber-700">
              No disponible. No se pudo calcular cuántos jugadores serán notificados.
            </p>
          ) : (
            <p className="mt-1 text-sm text-gray-900">
              <span className="text-2xl font-black">{count}</span>{" "}
              {count === 1 ? "jugador recibirá" : "jugadores recibirán"} la notificación.
            </p>
          )}
        </div>

        <div className="mt-3">
          <p className="text-xs font-black uppercase tracking-wider text-gray-500">
            Ciudades ({labels.length})
          </p>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {labels.map((label) => (
              <li
                key={label}
                className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800"
              >
                {label}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
          Esta acción no se puede deshacer. Una vez enviadas, las notificaciones no se pueden retirar.
        </p>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
          >
            Confirmar y activar
          </button>
        </div>
      </div>
    </>
  );
}

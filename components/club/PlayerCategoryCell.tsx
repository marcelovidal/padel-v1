"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  assignPlayerCategoryAction,
  removePlayerCategoryAction,
} from "@/lib/actions/club-player-category.actions";

type OtherClubCategory = { club_name: string; category: number };

const ERROR_LABELS: Record<string, string> = {
  NOT_AUTHENTICATED: "Tu sesión expiró. Vuelve a ingresar.",
  NOT_AUTHORIZED: "No tenés permiso para esta operación.",
  INVALID_CATEGORY: "La categoría debe estar entre 1 y 7.",
  PLAYER_NOT_FOUND: "El jugador no existe o está inactivo.",
  NO_CLUB_MEMBERSHIP: "Sin relación con el club: no se puede asignar categoría.",
  UNKNOWN: "Error inesperado. Intenta de nuevo.",
};

function categoryLabel(value?: number | null) {
  if (!value) return "-";
  return `${value}ta`;
}

export function PlayerCategoryCell({
  clubId,
  playerId,
  displayName,
  clubCategory,
  selfCategory,
  otherCategories,
  hasMembership,
}: {
  clubId: string;
  playerId: string;
  displayName: string;
  clubCategory: number | null;
  selfCategory: number | null;
  otherCategories: OtherClubCategory[];
  hasMembership: boolean;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openModal() {
    setSelected(clubCategory ? String(clubCategory) : "");
    setError(null);
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
  }

  async function runAction(action: () => Promise<{ error?: string } | undefined>) {
    setIsSaving(true);
    setError(null);
    try {
      const result = await action();
      if (result?.error) {
        setError(ERROR_LABELS[result.error] || result.error);
        return;
      }
      setIsOpen(false);
      router.refresh();
    } catch {
      setError(ERROR_LABELS.UNKNOWN);
    } finally {
      setIsSaving(false);
    }
  }

  function handleSave() {
    const value = selected ? Number(selected) : null;
    if (value == null) {
      setError("Elegí una categoría o quitá la actual.");
      return;
    }
    runAction(() => assignPlayerCategoryAction(clubId, playerId, value));
  }

  function handleRemove() {
    runAction(() => removePlayerCategoryAction(clubId, playerId));
  }

  return (
    <>
      <div className="flex flex-col items-start gap-1">
        {clubCategory ? (
          <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
            Club {categoryLabel(clubCategory)}
          </span>
        ) : null}
        <span className="rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
          Auto {categoryLabel(selfCategory)}
        </span>
        {otherCategories.map((other, idx) => (
          <span
            key={`${other.club_name}-${idx}`}
            title={`${categoryLabel(other.category)} en ${other.club_name}`}
            className="max-w-[120px] truncate rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
          >
            {categoryLabel(other.category)} · {other.club_name}
          </span>
        ))}
        {hasMembership ? (
          <button
            type="button"
            onClick={openModal}
            className="text-[10px] font-black uppercase tracking-wide text-blue-600 hover:text-blue-800"
          >
            Editar
          </button>
        ) : (
          <span
            title="Sin relación con este club: sin reserva, inscripción ni partido registrado."
            className="text-[10px] font-medium text-gray-400"
          >
            Sin vínculo
          </span>
        )}
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between border-b border-gray-100 p-5">
              <h2 className="text-lg font-black uppercase tracking-tight text-gray-900">
                Categoría del club
              </h2>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Cerrar"
                className="text-xl leading-none text-gray-400 transition-colors hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
              className="space-y-4 p-5"
            >
              {error ? (
                <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-bold text-red-600">
                  {error}
                </div>
              ) : null}

              <div>
                <p className="text-sm font-bold text-gray-900">{displayName}</p>
                <div className="mt-2 space-y-1 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
                  <p>
                    <span className="font-semibold text-gray-500">Autoasignada:</span>{" "}
                    {selfCategory ? categoryLabel(selfCategory) : "-"}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-500">Este club:</span>{" "}
                    {clubCategory ? categoryLabel(clubCategory) : "sin asignar"}
                  </p>
                  {otherCategories.length > 0 ? (
                    <div>
                      <span className="font-semibold text-gray-500">Otros clubes:</span>
                      <ul className="mt-1 space-y-0.5">
                        {otherCategories.map((other, idx) => (
                          <li key={`${other.club_name}-${idx}`}>
                            {categoryLabel(other.category)} · {other.club_name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor={`club-category-${playerId}`}
                  className="text-[10px] font-black uppercase tracking-wider text-gray-400"
                >
                  Categoría que asigna este club
                </label>
                <select
                  id={`club-category-${playerId}`}
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sin categoría del club</option>
                  {[1, 2, 3, 4, 5, 6, 7].map((cat) => (
                    <option key={cat} value={String(cat)}>
                      {categoryLabel(cat)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="h-11 flex-1 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                {clubCategory ? (
                  <button
                    type="button"
                    onClick={handleRemove}
                    disabled={isSaving}
                    className="h-11 flex-1 rounded-xl border border-red-200 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    Quitar
                  </button>
                ) : null}
                <button
                  type="submit"
                  disabled={isSaving || !selected}
                  className="h-11 flex-1 rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
                >
                  {isSaving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

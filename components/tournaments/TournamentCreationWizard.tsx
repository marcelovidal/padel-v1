"use client";

import { useState } from "react";
import { CityTagSelector } from "@/components/geo/CityTagSelector";
import { createTournamentWizardAction } from "@/lib/actions/tournaments.actions";

const STEPS = [
  { label: "Identidad", hint: "Nombre y temporada del torneo" },
  { label: "Categoría", hint: "Nivel de juego y restricciones" },
  { label: "Difusión", hint: "Descripción, fechas y ciudades" },
];

function StepBubble({ index, current }: { index: number; current: number }) {
  const done = index < current;
  const active = index === current;
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
        done
          ? "bg-blue-600 text-white"
          : active
            ? "bg-blue-600 text-white ring-4 ring-blue-100"
            : "bg-gray-100 text-gray-400"
      }`}
    >
      {done ? "✓" : index + 1}
    </div>
  );
}

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-1">
            <StepBubble index={i} current={step} />
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-10 transition-colors ${i < step ? "bg-blue-600" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>
      <div>
        <p className="text-xs text-gray-400">Paso {step + 1} de {STEPS.length}</p>
        <p className="text-base font-bold text-gray-900">{STEPS[step].label}</p>
        <p className="text-sm text-gray-500">{STEPS[step].hint}</p>
      </div>
    </div>
  );
}

type Props = { clubId: string };

export function TournamentCreationWizard({ clubId }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [seasonLabel, setSeasonLabel] = useState("");
  const [categoryRaw, setCategoryRaw] = useState("");
  const [allowLower, setAllowLower] = useState(false);
  const [description, setDescription] = useState("");

  const canNext1 = name.trim().length > 0;
  const canNext2 = categoryRaw.trim().length > 0 && Number(categoryRaw) >= 1;

  return (
    <div className="space-y-6">
      <ProgressBar step={step} />

      <hr className="border-gray-100" />

      {/* Paso 1 — Identidad */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Nombre del torneo <span className="text-red-400">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Torneo de Pádel Marzo 2026"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Temporada</label>
            <input
              value={seasonLabel}
              onChange={(e) => setSeasonLabel(e.target.value)}
              placeholder="Ej: Marzo 2026"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex justify-end">
            <button
              disabled={!canNext1}
              onClick={() => setStep(1)}
              className={
                canNext1
                  ? "rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  : "cursor-not-allowed rounded-lg bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-400"
              }
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* Paso 2 — Categoría */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Categoría objetivo <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={categoryRaw}
              onChange={(e) => setCategoryRaw(e.target.value)}
              placeholder="Ej: 5"
              className="w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              autoFocus
            />
            <p className="mt-1 text-xs text-gray-400">
              Número del 1 al 10 que define el nivel del torneo.
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50">
            <input
              type="checkbox"
              checked={allowLower}
              onChange={(e) => setAllowLower(e.target.checked)}
              className="rounded"
            />
            <div>
              <p className="text-sm font-semibold text-gray-800">Aceptar categorías menores</p>
              <p className="text-xs text-gray-500">
                Permite inscribir parejas de categoría inferior (ej: 6ta en torneo de 5ta).
              </p>
            </div>
          </label>
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              ← Atrás
            </button>
            <button
              disabled={!canNext2}
              onClick={() => setStep(2)}
              className={
                canNext2
                  ? "rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  : "cursor-not-allowed rounded-lg bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-400"
              }
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* Paso 3 — Difusión + submit */}
      {step === 2 && (
        <form action={createTournamentWizardAction} className="space-y-4">
          <input type="hidden" name="club_id" value={clubId} />
          <input type="hidden" name="name" value={name} />
          <input type="hidden" name="season_label" value={seasonLabel} />
          <input type="hidden" name="target_category_int" value={categoryRaw} />
          <input type="hidden" name="allow_lower_category" value={allowLower ? "on" : ""} />
          <input type="hidden" name="description" value={description} />

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Descripción{" "}
              <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Información adicional sobre el torneo, premios, requisitos..."
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Inicio de inscripciones{" "}
                <span className="font-normal text-gray-400">(opcional)</span>
              </label>
              <input
                type="date"
                name="start_date"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Cierre de inscripciones{" "}
                <span className="font-normal text-gray-400">(opcional)</span>
              </label>
              <input
                type="date"
                name="end_date"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">
              Ciudades objetivo{" "}
              <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <CityTagSelector
              name="target_city_ids"
              placeholder="Buscar ciudad (ej: Neuquén, General Roca...)"
            />
          </div>

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              ← Atrás
            </button>
            <button
              type="submit"
              className="rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              Crear torneo ✓
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

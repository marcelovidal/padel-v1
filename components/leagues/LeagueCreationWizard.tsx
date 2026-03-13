"use client";

import { useState } from "react";
import { CityTagSelector } from "@/components/geo/CityTagSelector";
import { createLeagueWizardAction } from "@/lib/actions/leagues.actions";

const STEPS = [
  { label: "Identidad", hint: "Nombre y temporada de la liga" },
  { label: "Perfil", hint: "Descripción opcional" },
  { label: "Difusión", hint: "Fechas y ciudades objetivo" },
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

export function LeagueCreationWizard({ clubId }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [seasonLabel, setSeasonLabel] = useState("");
  const [description, setDescription] = useState("");

  const canNext1 = name.trim().length > 0;

  return (
    <div className="space-y-6">
      <ProgressBar step={step} />

      <hr className="border-gray-100" />

      {/* Paso 1 — Identidad */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Nombre de la liga <span className="text-red-400">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Liga de Pádel 2026"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Temporada</label>
            <input
              value={seasonLabel}
              onChange={(e) => setSeasonLabel(e.target.value)}
              placeholder="Ej: Apertura 2026"
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

      {/* Paso 2 — Perfil */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Descripción{" "}
              <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Información adicional sobre la liga, requisitos, premios..."
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              autoFocus
            />
          </div>
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              ← Atrás
            </button>
            <button
              onClick={() => setStep(2)}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* Paso 3 — Difusión (submit final) */}
      {step === 2 && (
        <form action={createLeagueWizardAction} className="space-y-4">
          <input type="hidden" name="club_id" value={clubId} />
          <input type="hidden" name="name" value={name} />
          <input type="hidden" name="season_label" value={seasonLabel} />
          <input type="hidden" name="description" value={description} />

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
              Crear liga ✓
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

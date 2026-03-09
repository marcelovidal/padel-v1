"use client";

import { useState } from "react";
import { submitTournamentMatchResultAction } from "@/lib/actions/tournaments.actions";

type Props = {
  tournamentId: string;
  tournamentMatchId: string;
  canSubmit: boolean;
  hasResult: boolean;
  setsLabel: string;
  winnerLabel: string;
  inlineError?: string;
  inlineErrorDebug?: string;
};

export function TournamentMatchResultForm({
  tournamentId,
  tournamentMatchId,
  canSubmit,
  hasResult,
  setsLabel,
  winnerLabel,
  inlineError,
  inlineErrorDebug,
}: Props) {
  const [open, setOpen] = useState(Boolean(inlineError));

  if (hasResult) {
    return (
      <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
        <p className="text-xs font-semibold text-emerald-800">
          Resultado cargado: {setsLabel} · {winnerLabel}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-gray-700">Resultado del partido</p>
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={!canSubmit}
            title={!canSubmit ? "Primero agenda el partido y espera a que quede finalizado." : undefined}
            className={
              canSubmit
                ? "rounded-lg border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                : "cursor-not-allowed rounded-lg border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-400"
            }
          >
            Cargar resultado
          </button>
        ) : null}
      </div>

      {!canSubmit ? (
        <p className="mt-1 text-[11px] text-amber-700">Disponible cuando el partido este finalizado.</p>
      ) : null}

      {open && canSubmit ? (
        <form action={submitTournamentMatchResultAction} className="mt-2 space-y-2">
          <input type="hidden" name="tournament_id" value={tournamentId} />
          <input type="hidden" name="tournament_match_id" value={tournamentMatchId} />

          <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            <span className="text-center">Equipo A</span>
            <span className="text-center">Set</span>
            <span className="text-center">Equipo B</span>
          </div>

          {[1, 2, 3].map((set) => (
            <div key={set} className="grid grid-cols-3 gap-2">
              <input
                type="number"
                name={`set${set}_a`}
                min={0}
                required={set < 3}
                className="rounded-lg border border-gray-200 px-2 py-1.5 text-center text-sm font-semibold"
              />
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5 text-center text-xs font-bold text-gray-500">
                SET {set}{set === 3 ? " (opt)" : ""}
              </div>
              <input
                type="number"
                name={`set${set}_b`}
                min={0}
                required={set < 3}
                className="rounded-lg border border-gray-200 px-2 py-1.5 text-center text-sm font-semibold"
              />
            </div>
          ))}

          {inlineError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
              <p>{inlineError}</p>
              {inlineErrorDebug ? (
                <p className="mt-1 text-[11px] font-normal text-red-700">Detalle tecnico: {inlineErrorDebug}</p>
              ) : null}
            </div>
          ) : null}

          <div className="flex gap-2">
            <button className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50">
              Guardar resultado
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

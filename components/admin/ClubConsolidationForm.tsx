"use client";

import { useMemo } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { mergeClubClusterAction } from "@/app/admin/clubs/duplicates/actions";
import type { ClubDuplicateCandidate } from "@/repositories/club-admin.repository";

type MergeState =
  | {
      success: true;
      mergedCount: number;
      affectedMatchesCount: number;
      idempotentCount: number;
      message: string;
    }
  | {
      success: false;
      error: string;
    }
  | {
      success: null;
    };

const INITIAL_STATE: MergeState = { success: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
    >
      {pending ? "Consolidando..." : "Consolidar clubes seleccionados"}
    </button>
  );
}

export function ClubConsolidationForm({
  clusterKey,
  candidates,
}: {
  clusterKey: string;
  candidates: ClubDuplicateCandidate[];
}) {
  const [state, formAction] = useFormState(mergeClubClusterAction as any, INITIAL_STATE);

  const totalPotentialMoves = useMemo(
    () => candidates.reduce((acc, club) => acc + (club.matches_count || 0), 0),
    [candidates]
  );

  return (
    <form
      action={formAction}
      className="space-y-4"
      onSubmit={(event) => {
        const ok = window.confirm(
          "Esta accion reasignara partidos y archivara clubes origen. Deseas continuar?"
        );
        if (!ok) event.preventDefault();
      }}
    >
      <input type="hidden" name="clusterKey" value={clusterKey} />

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm font-bold text-gray-900">Club objetivo</p>
        <p className="text-xs text-gray-500">Recibe partidos y aliases de los clubes origen.</p>
        <div className="mt-3 space-y-2">
          {candidates.map((club) => (
            <label
              key={`target-${club.id}`}
              className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
            >
              <span className="flex items-center gap-2 text-sm text-gray-800">
                <input type="radio" name="targetClubId" value={club.id} required />
                <span className="font-semibold">{club.name}</span>
              </span>
              <span className="text-xs text-gray-500">{club.matches_count} partidos</span>
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm font-bold text-gray-900">Clubes a fusionar (origen)</p>
        <p className="text-xs text-gray-500">Selecciona uno o mas clubes. El objetivo no debe marcarse aqui.</p>
        <div className="mt-3 space-y-2">
          {candidates.map((club) => (
            <label
              key={`source-${club.id}`}
              className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
            >
              <span className="flex items-center gap-2 text-sm text-gray-800">
                <input type="checkbox" name="sourceClubIds" value={club.id} />
                <span className="font-semibold">{club.name}</span>
              </span>
              <span className="text-xs text-gray-500">
                {club.matches_count} partidos
                {club.claimed ? " - claimed" : ""}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <label className="text-sm font-bold text-gray-900" htmlFor="merge-note">
          Nota de auditoria (opcional)
        </label>
        <textarea
          id="merge-note"
          name="note"
          rows={3}
          placeholder="Motivo del merge, criterio aplicado, ticket, etc."
          className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500"
        />
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        Impacto potencial del cluster: hasta {totalPotentialMoves} partidos reasignados segun seleccion.
      </div>

      {state.success === false ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{state.error}</div>
      ) : null}

      {state.success === true ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {state.message}
        </div>
      ) : null}

      <SubmitButton />
    </form>
  );
}

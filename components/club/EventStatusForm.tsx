"use client";

import { useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { updateTournamentStatusAction } from "@/lib/actions/tournaments.actions";
import { updateLeagueStatusAction } from "@/lib/actions/leagues.actions";
import { DiffusionReachModal } from "./DiffusionReachModal";

type EventStatus = "draft" | "active" | "finished";

interface Props {
  entityType: "tournament" | "league";
  entityId: string;
  currentStatus: EventStatus;
  targetCityIds: string[];
  /** Partidos generados sin resultado cargado. Solo advierte, no bloquea. */
  pendingMatches: number;
}

const STATUS_OPTIONS: { value: EventStatus; tournament: string; league: string }[] = [
  { value: "draft", tournament: "Borrador", league: "Borrador" },
  { value: "active", tournament: "Activo", league: "Activa" },
  { value: "finished", tournament: "Finalizado", league: "Finalizada" },
];

/**
 * Selector de estado, el mismo para torneo y liga.
 *
 * La liga tenia dos botones —"Publicar liga" solo en draft, "Finalizar liga"
 * solo en active— que no dejaban volver atras: una liga finalizada por error
 * quedaba trabada, sin forma de reabrirla desde la UI. Con el selector los
 * tres estados son alcanzables desde cualquiera de los otros, en las dos
 * entidades.
 *
 * Dos confirmaciones posibles, nunca las dos a la vez porque miran estados
 * destino distintos:
 *   -> active   : dispara la difusion geografica, que es irreversible.
 *   -> finished : puede haber partidos sin resultado. Advierte y deja seguir —
 *                 un club tiene derecho a cerrar una liga abandonada.
 */
export function EventStatusForm({
  entityType,
  entityId,
  currentStatus,
  targetCityIds,
  pendingMatches,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  // Un ref, no un state: el submit programatico tiene que ver el valor ya
  // actualizado, y un setState no habria commiteado todavia.
  const confirmedRef = useRef(false);
  const [nextStatus, setNextStatus] = useState<EventStatus>(currentStatus);
  const [showDiffusion, setShowDiffusion] = useState(false);
  const [showPending, setShowPending] = useState(false);

  const isTournament = entityType === "tournament";
  const action = isTournament ? updateTournamentStatusAction : updateLeagueStatusAction;
  const idField = isTournament ? "tournament_id" : "league_id";
  const entityLabel = isTournament ? "el torneo" : "la liga";

  const needsDiffusionConfirm =
    nextStatus === "active" && currentStatus !== "active" && targetCityIds.length > 0;
  const needsPendingConfirm =
    nextStatus === "finished" && currentStatus !== "finished" && pendingMatches > 0;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (confirmedRef.current) return;
    if (needsDiffusionConfirm) {
      e.preventDefault();
      setShowDiffusion(true);
      return;
    }
    if (needsPendingConfirm) {
      e.preventDefault();
      setShowPending(true);
    }
  }

  function confirmAndSubmit() {
    confirmedRef.current = true;
    setShowDiffusion(false);
    setShowPending(false);
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form ref={formRef} action={action} onSubmit={handleSubmit} className="flex items-center gap-2">
        <input type="hidden" name={idField} value={entityId} />
        <select
          name="next_status"
          aria-label="Estado del evento"
          value={nextStatus}
          onChange={(e) => setNextStatus(e.target.value as EventStatus)}
          className="rounded-lg border border-[var(--border-strong)] bg-[var(--bg-input)] px-2.5 py-1.5 text-sm font-semibold text-[var(--text-primary)]"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {isTournament ? option.tournament : option.league}
            </option>
          ))}
        </select>
        <button
          disabled={nextStatus === currentStatus}
          className="rounded-lg border border-[var(--border-strong)] px-3 py-1.5 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Cambiar estado
        </button>
      </form>

      {showDiffusion ? (
        <DiffusionReachModal
          entityType={entityType}
          targetCityIds={targetCityIds}
          onConfirm={confirmAndSubmit}
          onCancel={() => setShowDiffusion(false)}
        />
      ) : null}

      {showPending ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowPending(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pending-matches-title"
            className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-6 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--pill-amber-bg)]">
                <AlertTriangle className="h-5 w-5 text-[var(--pill-amber-text)]" />
              </div>
              <div>
                <h3 id="pending-matches-title" className="text-lg font-bold text-[var(--text-primary)]">
                  Quedan partidos sin resultado
                </h3>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {pendingMatches === 1
                    ? "Hay 1 partido generado sin resultado cargado."
                    : `Hay ${pendingMatches} partidos generados sin resultado cargado.`}{" "}
                  Si finalizás {entityLabel} ahora, esos partidos quedan sin jugar en la tabla.
                </p>
              </div>
            </div>

            <p className="mt-4 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-muted)]">
              Se puede finalizar igual —una liga abandonada se cierra así— y también volver a
              activarla más adelante desde este mismo selector.
            </p>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowPending(false)}
                className="rounded-lg border border-[var(--border-strong)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmAndSubmit}
                className="rounded-lg bg-[var(--color-grafito)] px-4 py-2 text-sm font-bold text-[var(--color-blanco)] hover:opacity-90"
              >
                Finalizar igual
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

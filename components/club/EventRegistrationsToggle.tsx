"use client";

import { setTournamentRegistrationsOpenAction } from "@/lib/actions/tournaments.actions";
import { setLeagueRegistrationsOpenAction } from "@/lib/actions/leagues.actions";

interface Props {
  entityType: "tournament" | "league";
  entityId: string;
  registrationsOpen: boolean;
}

/**
 * Abrir o cerrar las inscripciones. Es manual y reversible a proposito: las
 * inscripciones se cierran cuando se llena el cupo o cuando el club decide
 * armar los grupos, no cuando llega una fecha. Las fechas de inscripcion que
 * carga el club son informativas y no tocan esto.
 *
 * Nada de optimistic UI: el estado que se muestra es el que devolvio la base
 * en el ultimo render. Si el RPC falla, la pagina redirige con el error y el
 * estado sigue siendo el real.
 */
export function EventRegistrationsToggle({ entityType, entityId, registrationsOpen }: Props) {
  const isTournament = entityType === "tournament";
  const action = isTournament
    ? setTournamentRegistrationsOpenAction
    : setLeagueRegistrationsOpenAction;
  const idField = isTournament ? "tournament_id" : "league_id";

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name={idField} value={entityId} />
      <input type="hidden" name="open" value={registrationsOpen ? "false" : "true"} />
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
          registrationsOpen
            ? "bg-[var(--pill-green-bg)] text-[var(--pill-green-text)]"
            : "bg-[var(--bg-pill-soft)] text-[var(--text-muted)]"
        }`}
      >
        {registrationsOpen ? "Inscripciones abiertas" : "Inscripciones cerradas"}
      </span>
      <button
        className="rounded-lg border border-[var(--border-strong)] px-3 py-1.5 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
      >
        {registrationsOpen ? "Cerrar inscripciones" : "Abrir inscripciones"}
      </button>
    </form>
  );
}

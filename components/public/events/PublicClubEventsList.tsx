import Link from "next/link";
import { publicEventHref, type PublicEventSummary } from "@/lib/clubs/publicEvent";
import { formatDateRange } from "@/lib/clubs/publicEventLabels";

/**
 * Lista de torneos y ligas del club, para enlazar desde su perfil publico.
 *
 * En tokens de brand v2, a diferencia del resto del perfil del club, que sigue
 * en slate/blue. Es deuda conocida y no se arregla en este bloque — pero lo
 * nuevo no la agranda.
 */

interface Props {
  events: PublicEventSummary[];
  clubSlugOrId: string;
  emptyLabel: string;
  /**
   * Chip uniforme para toda la lista: el grupo ya decide el estado, no hace
   * falta derivarlo evento por evento. Sin este prop se cae al comportamiento
   * previo, que leia el status de cada fila.
   *
   * `className` permite subir la jerarquia visual de una seccion: las
   * inscripciones abiertas son un llamado a la accion y van en brand-rojo,
   * no en un pill informativo.
   */
  badge?: { label: string; className?: string };
}

export function PublicClubEventsList({ events, clubSlugOrId, emptyLabel, badge }: Props) {
  if (events.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-2">
      {events.map((event) => {
        const when = formatDateRange(event.start_date, event.end_date);
        const badgeLabel = badge?.label ?? (event.status === "active" ? "En juego" : "Finalizado");
        const badgeClass =
          badge?.className ??
          (badgeLabel === "Finalizado"
            ? "bg-[var(--bg-pill-soft)] text-[var(--text-muted)]"
            : "bg-[var(--pill-green-bg)] text-[var(--pill-green-text)]");

        return (
          <li key={`${event.kind}-${event.id}`}>
            <Link
              href={publicEventHref(clubSlugOrId, event)}
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-elevated)] px-4 py-3 transition hover:border-[var(--border-strong)]"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-faint)]">
                  {event.kind === "tournament" ? "Torneo" : "Liga"}
                  {event.season_label ? ` · ${event.season_label}` : ""}
                </p>
                <p className="truncate font-bold text-[var(--text-primary)]">{event.name}</p>
                {when ? (
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">{when}</p>
                ) : null}
              </div>

              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${badgeClass}`}
              >
                {badgeLabel}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

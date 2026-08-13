import type { ReactNode } from "react";
import Link from "next/link";
import { formatDateRange } from "@/lib/clubs/publicEventLabels";

type EventStatus = "draft" | "active" | "finished";

interface Props {
  backHref: string;
  backLabel: string;
  name: string;
  /** Temporada, categoria — lo que identifica la edicion. */
  meta: string;
  description?: string | null;
  status: EventStatus;
  statusLabel: string;
  startDate?: string | null;
  endDate?: string | null;
  registrationStartDate?: string | null;
  registrationEndDate?: string | null;
  registrationsOpen: boolean;
  statusControl: ReactNode;
  registrationsControl: ReactNode;
  shareControl?: ReactNode;
}

const STATUS_PILL: Record<EventStatus, string> = {
  draft: "bg-[var(--bg-pill-soft)] text-[var(--text-muted)]",
  active: "bg-[var(--pill-green-bg)] text-[var(--pill-green-text)]",
  finished: "bg-[var(--pill-blue-bg)] text-[var(--pill-blue-text)]",
};

/**
 * Card de informacion del evento en la gestion del club.
 *
 * Antes esto era un header suelto —un h1 y una linea gris— con el selector de
 * estado tirado en la esquina superior derecha, donde no se veia. Ahora el
 * estado y el control de inscripciones viven adentro de la card, junto al
 * nombre, la temporada y las fechas, que es la informacion con la que el club
 * decide si abrir o cerrar.
 *
 * Las dos filas de fechas son distintas y por eso van separadas: las del
 * evento (cuando se juega) y las de inscripcion (informativas, para el
 * jugador). Hasta la migracion 20260819 eran el mismo par de columnas con dos
 * rotulos contradictorios.
 */
export function EventInfoCard({
  backHref,
  backLabel,
  name,
  meta,
  description,
  status,
  statusLabel,
  startDate,
  endDate,
  registrationStartDate,
  registrationEndDate,
  registrationsOpen,
  statusControl,
  registrationsControl,
  shareControl,
}: Props) {
  const eventWhen = formatDateRange(startDate, endDate);
  const registrationWhen = formatDateRange(registrationStartDate, registrationEndDate);

  return (
    <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-5">
      <Link href={backHref} className="text-sm text-[var(--text-faint)] hover:text-[var(--text-secondary)]">
        ← {backLabel}
      </Link>

      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{name}</h1>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_PILL[status]}`}>
              {statusLabel}
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{meta}</p>
          {description ? (
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{description}</p>
          ) : null}
        </div>
        {shareControl}
      </div>

      <dl className="mt-4 flex flex-wrap gap-x-10 gap-y-3 border-t border-[var(--border-soft)] pt-4">
        <div>
          <dt className="text-xs font-black uppercase tracking-wider text-[var(--text-faint)]">
            Fechas del evento
          </dt>
          <dd className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">
            {eventWhen ?? "Sin cargar"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-black uppercase tracking-wider text-[var(--text-faint)]">
            Fechas de inscripción
          </dt>
          <dd className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">
            {registrationWhen ?? "Sin cargar"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-col gap-3 border-t border-[var(--border-soft)] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-[var(--text-faint)]">
            Estado
          </span>
          {statusControl}
        </div>
        <div className="flex flex-wrap items-center gap-2">{registrationsControl}</div>
      </div>

      {registrationsOpen && status === "finished" ? (
        <p className="mt-3 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-muted)]">
          El evento está finalizado pero las inscripciones siguen abiertas. La página pública
          muestra el formulario igual.
        </p>
      ) : null}
    </div>
  );
}

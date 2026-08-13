import { PublicSectionCard } from "./PublicSectionCard";
import { PublicRegistrationForm } from "./PublicRegistrationForm";
import { formatDateRange, formatRegistrationWindow } from "@/lib/clubs/publicEventLabels";

interface Props {
  kind: "tournament" | "league";
  eventId: string;
  eventName: string;
  /** El unico dato que decide. Lo maneja el club a mano. */
  registrationsOpen: boolean;
  registrationStartDate?: string | null;
  registrationEndDate?: string | null;
}

/**
 * Inscripcion en la pagina publica: el formulario, o el aviso de que esta
 * cerrada.
 *
 * Va en un componente compartido y no inline en cada pagina porque torneo y
 * liga tienen que decir exactamente lo mismo. Cuando esto estaba duplicado, el
 * torneo llevaba un comentario explicando la regla y la liga no.
 *
 * Cerrada no es lo mismo que terminada: el evento sigue abajo con posiciones,
 * fixture y resultados. Por eso el aviso es una linea y no un vacio.
 */
export function PublicRegistrationSection({
  kind,
  eventId,
  eventName,
  registrationsOpen,
  registrationStartDate,
  registrationEndDate,
}: Props) {
  const window = formatRegistrationWindow(registrationStartDate, registrationEndDate);

  if (!registrationsOpen) {
    const closedWindow = formatDateRange(registrationStartDate, registrationEndDate);

    return (
      <PublicSectionCard id="inscripcion" title="Inscripciones cerradas">
        <p className="text-sm text-[var(--text-muted)]">
          El club cerró las inscripciones{closedWindow ? ` (${closedWindow.toLowerCase()})` : ""}. Más
          abajo seguís el desarrollo: posiciones, fixture y resultados.
        </p>
      </PublicSectionCard>
    );
  }

  return (
    <PublicSectionCard
      id="inscripcion"
      title="Inscribirse"
      subtitle="Anotate con tu compañero. No hace falta tener cuenta."
      aside={
        window ? (
          <span className="rounded-full bg-[var(--pill-amber-bg)] px-3 py-1 text-xs font-bold text-[var(--pill-amber-text)]">
            {window}
          </span>
        ) : null
      }
    >
      <PublicRegistrationForm kind={kind} eventId={eventId} eventName={eventName} />
    </PublicSectionCard>
  );
}

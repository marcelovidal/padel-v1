import Link from "next/link";
import { UserAvatar } from "@/components/ui/UserAvatar";

/**
 * Header de un torneo o liga en su pagina publica.
 *
 * Usa UserAvatar para el logo del club en vez de armar un `<img>` crudo con
 * placeholder inline, que es lo que hace hoy el perfil del club y lo que no
 * queremos repetir.
 *
 * Es un header de entidad generico a proposito: recibe eyebrow, titulo, meta y
 * chips, sin saber si atras hay un torneo o una liga. Cuando se unifiquen los
 * perfiles publicos, este es el que deberia crecer hasta ProfileHero.
 */

export type EventChip = {
  label: string;
  tone?: "neutral" | "accent" | "success" | "warning" | "cta";
};

const CHIP_TONES: Record<NonNullable<EventChip["tone"]>, string> = {
  neutral: "bg-[var(--bg-pill-soft)] text-[var(--text-muted)]",
  accent: "bg-[var(--pill-blue-bg)] text-[var(--pill-blue-text)]",
  success: "bg-[var(--pill-green-bg)] text-[var(--pill-green-text)]",
  warning: "bg-[var(--pill-amber-bg)] text-[var(--pill-amber-text)]",
  // Llamado a la accion: inscripciones abiertas. Solido en brand-rojo, no un
  // pill suave — tiene que ganarle la mirada al resto de los chips.
  cta: "bg-brand-rojo text-white",
};

interface Props {
  eyebrow: string;
  title: string;
  clubName: string;
  clubHref: string;
  clubAvatarSrc: string | null;
  clubInitials: string;
  /** Fechas ya formateadas, ubicacion, etc. */
  meta?: string | null;
  description?: string | null;
  chips?: EventChip[];
  /** CTA principal — el formulario de inscripcion cuando corresponde. */
  action?: React.ReactNode;
}

export function PublicEventHeader({
  eyebrow,
  title,
  clubName,
  clubHref,
  clubAvatarSrc,
  clubInitials,
  meta,
  description,
  chips = [],
  action,
}: Props) {
  return (
    <section className="overflow-hidden rounded-3xl bg-brand-negro text-brand-crema">
      <div className="flex flex-col gap-5 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <Link href={clubHref} className="shrink-0">
            <UserAvatar
              src={clubAvatarSrc}
              initials={clubInitials}
              size="lg"
              className="rounded-2xl border-white/15 bg-white/10 text-brand-crema"
            />
          </Link>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-azul-light">
              {eyebrow}
            </p>
            <h1 className="mt-1 font-display text-3xl font-black uppercase leading-none tracking-tight sm:text-5xl">
              {title}
            </h1>
            <Link
              href={clubHref}
              className="mt-2 inline-block text-sm font-semibold text-brand-crema/70 underline-offset-4 hover:text-brand-crema hover:underline"
            >
              {clubName}
            </Link>
            {meta ? (
              <p className="mt-1 text-sm text-brand-crema/50">{meta}</p>
            ) : null}
          </div>
        </div>

        {chips.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <span
                key={chip.label}
                className={`rounded-full px-3 py-1 text-xs font-bold ${CHIP_TONES[chip.tone ?? "neutral"]}`}
              >
                {chip.label}
              </span>
            ))}
          </div>
        ) : null}

        {description ? (
          <p className="whitespace-pre-line text-sm leading-relaxed text-brand-crema/70">
            {description}
          </p>
        ) : null}

        {action ? <div>{action}</div> : null}
      </div>
    </section>
  );
}

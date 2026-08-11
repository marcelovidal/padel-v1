import { cn } from "@/lib/utils";

/**
 * Tarjeta de seccion del sitio publico, en tokens de brand v2.
 *
 * Existe como componente y no inline porque el perfil del club repite tres
 * veces la misma `<section className="rounded-2xl border ...">` copiada a mano,
 * y esa duplicacion es exactamente lo que estamos pagando ahora. Todo lo que se
 * agregue de aca en mas usa esta.
 */
export function PublicSectionCard({
  id,
  title,
  subtitle,
  aside,
  className,
  children,
}: {
  id?: string;
  title?: string;
  subtitle?: string;
  /** Contenido alineado a la derecha del titulo — un contador, un estado. */
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-20 rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-5 sm:p-6",
        className
      )}
    >
      {(title || aside) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h2 className="font-display text-xl font-black uppercase tracking-tight text-[var(--text-primary)]">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
            )}
          </div>
          {aside ? <div className="shrink-0">{aside}</div> : null}
        </header>
      )}
      {children}
    </section>
  );
}

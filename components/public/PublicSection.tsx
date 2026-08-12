import { cn } from "@/lib/utils";
import { PublicContainer } from "@/components/public/PublicContainer";

export function PublicSection({
  id,
  eyebrow,
  title,
  description,
  className,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn("py-16 sm:py-20", className)}>
      <PublicContainer>
        {(eyebrow || title || description) && (
          <header className="mb-8 max-w-3xl space-y-2">
            {eyebrow && (
              <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-rojo">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="font-display text-3xl font-black uppercase tracking-tight text-[var(--text-primary)]">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-base text-[var(--text-muted)]">{description}</p>
            )}
          </header>
        )}
        {children}
      </PublicContainer>
    </section>
  );
}


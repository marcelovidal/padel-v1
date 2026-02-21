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
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
                {eyebrow}
              </p>
            )}
            {title && <h2 className="text-3xl font-black tracking-tight text-slate-900">{title}</h2>}
            {description && <p className="text-base text-slate-600">{description}</p>}
          </header>
        )}
        {children}
      </PublicContainer>
    </section>
  );
}


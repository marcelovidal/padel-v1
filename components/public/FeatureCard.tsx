import { cn } from "@/lib/utils";

export function FeatureCard({
  title,
  description,
  icon,
  className,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "rounded-3xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-6 shadow-[0_8px_30px_rgba(2,6,23,0.04)]",
        className
      )}
    >
      {icon ? (
        <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--pill-blue-bg)] text-[var(--pill-blue-text)]">
          {icon}
        </div>
      ) : null}
      <h3 className="font-display text-lg font-black uppercase tracking-tight text-[var(--text-primary)]">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{description}</p>
    </article>
  );
}


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
        "rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(2,6,23,0.04)]",
        className
      )}
    >
      {icon ? (
        <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          {icon}
        </div>
      ) : null}
      <h3 className="text-lg font-black tracking-tight text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
    </article>
  );
}


export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text-faint)]">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-black tracking-tight text-[var(--text-primary)]">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p> : null}
    </div>
  );
}


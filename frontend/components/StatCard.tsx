export function StatCard({
  value,
  label,
  detail,
}: {
  value: string;
  label: string;
  detail?: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-ink/8 bg-white/60 p-6 shadow-[var(--shadow-panel)]">
      <p className="font-data text-3xl text-ink tracking-tight">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate">{label}</p>
      {detail ? <p className="mt-2 text-xs text-slate-soft">{detail}</p> : null}
    </div>
  );
}

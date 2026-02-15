import { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
}

export function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-cyan-900/50 bg-panel/95 p-4 shadow-neon">
      <p className="font-mono text-xs uppercase tracking-[0.15em] text-cyan-300/80">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-cyan-100">{value}</p>
      {hint ? <p className="mt-2 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

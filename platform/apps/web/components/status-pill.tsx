interface StatusPillProps {
  label: string;
}

const statusClass = (label: string): string => {
  switch (label.toUpperCase()) {
    case 'COMPLETED':
    case 'PASS':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'RUNNING':
      return 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40';
    case 'QUEUED':
      return 'bg-amber-500/20 text-amber-200 border-amber-500/40';
    case 'FAILED':
    case 'CRITICAL':
      return 'bg-rose-500/20 text-rose-200 border-rose-500/40';
    case 'MAJOR':
      return 'bg-orange-500/20 text-orange-200 border-orange-500/40';
    default:
      return 'bg-slate-500/20 text-slate-200 border-slate-500/40';
  }
};

export function StatusPill({ label }: StatusPillProps) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide ${statusClass(label)}`}
    >
      {label}
    </span>
  );
}

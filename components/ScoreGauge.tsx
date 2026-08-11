'use client';

export default function ScoreGauge({ score }: { score: number }) {
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference * (1 - clamped / 100);
  const color = clamped >= 85 ? 'var(--success)' : clamped >= 60 ? 'var(--warning)' : 'var(--error)';
  const label = clamped >= 85 ? 'Mostly agent-ready' : clamped >= 60 ? 'Partially agent-ready' : 'High friction for agents';

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative h-40 w-40 shrink-0">
        <svg viewBox="0 0 168 168" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="84" cy="84" r={radius} fill="none" stroke="var(--surface-strong)" strokeWidth="12" />
          <circle
            cx="84"
            cy="84"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-4xl font-bold tracking-[-0.03em] text-[color:var(--ink)]">{clamped}</p>
          <p className="text-xs text-[color:var(--muted)]">/ 100</p>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">Agent-Readiness Score</p>
        <p className="mt-2 text-lg font-medium text-[color:var(--ink)]">{label}</p>
        <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">How well a headless agent can parse and act on this page.</p>
      </div>
    </div>
  );
}

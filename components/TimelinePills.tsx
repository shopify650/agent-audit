import { timelineStages } from '../lib/stages';

export default function TimelinePills({ stage }: { stage: number }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {timelineStages.map((s, i) => {
        const done = i < stage;
        const active = i === stage;
        return (
          <span
            key={s.key}
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]"
            style={{
              backgroundColor: done || active ? s.color : 'var(--surface-strong)',
              color: done || active ? (s.key === 'done' ? 'var(--on-primary)' : 'var(--ink)') : 'var(--muted-soft)',
              opacity: active ? 0.9 : 1,
            }}
          >
            {s.label}
          </span>
        );
      })}
    </div>
  );
}

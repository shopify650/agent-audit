import type { Issue } from '../lib/audit';

const severityBadge: Record<string, string> = {
  critical: 'bg-[var(--error)]/10 text-[var(--error)]',
  warning: 'bg-[var(--warning)]/10 text-[var(--warning)]',
  optimization: 'bg-[var(--surface-strong)] text-[color:var(--muted)]',
};

export default function IssueList({ issues }: { issues: Issue[] }) {
  const order = { critical: 0, warning: 1, optimization: 2 } as const;
  const sorted = [...issues].sort((a, b) => order[a.severity] - order[b.severity]);

  return (
    <div className="space-y-3">
      {sorted.map((issue) => (
        <div key={issue.id} className="card p-5">
          <div className="flex items-start justify-between gap-4">
            <p className="text-base font-medium text-[color:var(--ink)]">{issue.title}</p>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${severityBadge[issue.severity]}`}>
              {issue.severity}
              {issue.count ? ` ×${issue.count}` : ''}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-[color:var(--body)]">{issue.description}</p>
          {issue.evidence && (
            <p className="mt-2 font-mono text-xs text-[color:var(--muted)]">Evidence: {issue.evidence}</p>
          )}
          <div className="mt-3 rounded-md border border-[var(--hairline)] bg-[var(--canvas-soft)] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">Fix</p>
            <p className="mt-1 text-sm text-[color:var(--ink)]">{issue.fix}</p>
          </div>
          {issue.snippet && (
            <pre className="mt-3 overflow-x-auto rounded-md border border-[var(--hairline)] bg-[var(--canvas-soft)] p-3 font-mono text-xs text-[color:var(--ink)]">
              {issue.snippet}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}

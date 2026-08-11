'use client';

const blockedActions = [
  {
    id: 'large-purchase',
    action: 'Large purchases',
    detail: 'Orders above your approval threshold',
    severity: 'Financial',
  },
  {
    id: 'data-deletion',
    action: 'Data deletions',
    detail: 'Permanent removal of user or company records',
    severity: 'Destructive',
  },
  {
    id: 'account-changes',
    action: 'Account changes',
    detail: 'Email, password, or plan modifications',
    severity: 'Account',
  },
  {
    id: 'data-exports',
    action: 'Data exports',
    detail: 'Bulk downloads of proprietary data or pricing',
    severity: 'Data',
  },
  {
    id: 'refunds',
    action: 'Refunds & credits',
    detail: 'Issuing refunds or adjusting balances',
    severity: 'Financial',
  },
];

export default function SettingsPermissionsPage() {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--primary)]">Permissions</p>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--primary)]">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
            <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" stroke="currentColor" />
            <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeLinecap="round" />
          </svg>
          Coming Soon
        </span>
      </div>
      <h1 className="mt-2 text-3xl font-normal tracking-[-0.02em]">Agentic Approval</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Set hard limits on what AI agents can do on your site. Require manual human approval for high-value actions.
      </p>

      <div className="card mt-8 overflow-hidden bg-[var(--surface-card)]/60 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--hairline)] px-6 py-4">
          <div>
            <p className="text-sm font-medium text-[color:var(--ink)]">Blocked Actions</p>
            <p className="mt-0.5 text-xs text-[color:var(--muted)]">
              Any agent attempt matching a blocked action will pause and wait for human sign-off.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-[var(--hairline-strong)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">
            {blockedActions.length} rules · locked
          </span>
        </div>

        <ul className="divide-y divide-[var(--hairline)]">
          {blockedActions.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-4 px-6 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-[color:var(--ink)]">{b.action}</p>
                  <span className="rounded-full bg-[var(--surface-strong)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">
                    {b.severity}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[color:var(--muted)]">{b.detail}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-[color:var(--muted-soft)]">Requires approval</span>
                <svg viewBox="0 0 16 16" className="h-4 w-4 text-[var(--muted-soft)]" fill="none" aria-hidden="true">
                  <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" stroke="currentColor" />
                  <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeLinecap="round" />
                </svg>
              </div>
            </li>
          ))}
        </ul>

        <div className="border-t border-[var(--hairline)] bg-[var(--canvas-soft)] px-6 py-4">
          <p className="text-xs leading-5 text-[color:var(--muted)]">
            The Agentic Approval layer is under development. When it ships, every rule here becomes a switch you can turn on — with per-action approval channels routed to Slack, email, or your own review tool.
          </p>
        </div>
      </div>
    </div>
  );
}

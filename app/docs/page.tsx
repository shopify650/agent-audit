import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { allDocs, type Severity } from '../../lib/content';
import { SITE_URL } from '../../lib/site';

export const metadata: Metadata = {
  title: 'Docs — agent-readiness rules',
  description: 'Every check our audit runs: why it matters, how to fix it, and what to ship instead.',
  alternates: { canonical: `${SITE_URL}/docs` },
};

const severityBadge: Record<Severity, string> = {
  critical: 'bg-[var(--error)]/10 text-[var(--error)]',
  warning: 'bg-[var(--warning)]/10 text-[var(--warning)]',
  optimization: 'bg-[var(--surface-strong)] text-[color:var(--muted)]',
};

const severityOrder: Record<Severity, number> = { critical: 0, warning: 1, optimization: 2 };

const groups = [
  { key: 'critical', label: 'Critical — blocks agents from completing a task' },
  { key: 'warning', label: 'Warning — slows or confuses automation' },
  { key: 'optimization', label: 'Optimization — polish that raises trust' },
] as const;

export default function DocsIndex() {
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-8 sm:py-20">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">Documentation</p>
        <h1 className="mt-4 text-4xl font-normal tracking-[-0.03em] sm:text-5xl">Agent-readiness rules.</h1>
        <p className="mt-4 text-lg leading-8 text-[color:var(--body)]">
          Every check the audit runs, documented: what it tests, why it matters, and the exact markup that fixes it.
        </p>
      </div>

      <div className="mt-12 space-y-10">
        {groups.map((group) => {
          const rules = allDocs
            .filter((d) => d.severity === group.key)
            .sort((a, b) => b.weight - a.weight || a.title.localeCompare(b.title));
          if (rules.length === 0) return null;
          return (
            <section key={group.key}>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">{group.label}</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {rules.map((rule) => (
                  <Link
                    key={rule.slug}
                    href={`/docs/${rule.slug}`}
                    className="card group flex flex-col p-6 transition hover:border-[var(--hairline-strong)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${severityBadge[rule.severity]}`}>
                        {rule.severity}
                      </span>
                      <span className="font-mono text-xs text-[color:var(--muted)]">weight {rule.weight}</span>
                    </div>
                    <p className="mt-4 text-lg font-medium leading-snug text-[color:var(--ink)] group-hover:text-[var(--primary-active)]">
                      {rule.title}
                    </p>
                    <p className="mt-2 flex-1 text-sm leading-6 text-[color:var(--body)]">{rule.summary}</p>
                    <p className="mt-5 text-xs text-[color:var(--muted)]">
                      Checks: <span className="font-medium text-[color:var(--body)]">{rule.capability}</span>
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="card mt-14 flex flex-wrap items-center justify-between gap-4 p-8">
        <div className="max-w-xl">
          <p className="text-lg font-medium text-[color:var(--ink)]">Curious which rules your site trips?</p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--body)]">
            Run the real thing. Each rule on this page links to the code and markup that fixes it.
          </p>
        </div>
        <Link href="/dashboard/new" className="btn btn-primary">
          <span className="btn-chip">
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          </span>
          Run your first audit
        </Link>
      </div>
    </div>
  );
}

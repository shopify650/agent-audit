'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, Gauge, Ghost, ScanEye, ShieldAlert, Trophy } from 'lucide-react';
import { loadAudits, deleteAudit, updateAudit, runAudit, getQuota, loadScans, deleteScan, type StoredAudit, type StoredScan, type Quota } from '../../lib/audit';
import { useUser } from '../../lib/auth';

const scoreColor = (s: number) => (s >= 85 ? 'var(--success)' : s >= 60 ? 'var(--warning)' : 'var(--error)');
const scoreLabel = (s: number) => (s >= 85 ? 'Agent-ready' : s >= 60 ? 'Needs work' : 'High friction');

export default function DashboardPage() {
  const [audits, setAudits] = useState<StoredAudit[]>([]);
  const [rerunning, setRerunning] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'critical' | 'warnings'>('all');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'score'>('newest');
  const [quota, setQuota] = useState<Quota | null>(null);
  const [scans, setScans] = useState<StoredScan[]>([]);
  const [scanLimit, setScanLimit] = useState(10);

  useEffect(() => {
    const load = async () => {
      setAudits(await loadAudits());
      setScans(await loadScans(scanLimit));
      setQuota(await getQuota());
    };
    load();
  }, [scanLimit]);

  const refresh = async () => {
    setAudits(await loadAudits());
  };

  const remove = async (id: string) => {
    await deleteAudit(id);
    await refresh();
  };

  const removeScan = async (id: string) => {
    await deleteScan(id);
    setScans(await loadScans(scanLimit));
  };

  const rerun = async (audit: StoredAudit) => {
    setRerunning(audit.id);
    setError('');
    try {
      const result = await runAudit(audit.url);
      await updateAudit(audit.id, { result, createdAt: Date.now() });
      await refresh();
    } catch (err: any) {
      setError(err.message || 'Rerun failed');
    } finally {
      setRerunning(null);
    }
  };

  const sortedAsc = useMemo(() => [...audits].sort((a, b) => a.createdAt - b.createdAt), [audits]);
  const trend = sortedAsc.slice(-12);
  const scores = sortedAsc.map((a) => a.result.score);
  const latest = scores.length ? scores[scores.length - 1] : null;
  const previous = scores.length > 1 ? scores[scores.length - 2] : null;
  const delta = latest !== null && previous !== null ? latest - previous : null;

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => {
    let list = audits.filter((a) => !q || a.url.toLowerCase().includes(q));
    if (filter === 'critical') list = list.filter((a) => a.result.issues.some((i) => i.severity === 'critical'));
    if (filter === 'warnings') list = list.filter((a) => a.result.issues.some((i) => i.severity === 'warning'));
    if (sort === 'oldest') list = [...list].sort((a, b) => a.createdAt - b.createdAt);
    if (sort === 'score') list = [...list].sort((a, b) => b.result.score - a.result.score);
    return list;
  }, [audits, q, filter, sort]);

  const user = useUser();
  const firstName = user?.name?.split(' ')[0] || 'there';
  const avg = audits.length ? Math.round(audits.reduce((sum, a) => sum + a.result.score, 0) / audits.length) : null;
  const best = audits.length ? Math.max(...audits.map((a) => a.result.score)) : null;
  const critical = audits.reduce((sum, a) => sum + a.result.issues.filter((i) => i.severity === 'critical').length, 0);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--primary)]">Dashboard</p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--success)]/30 bg-[var(--success)]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--success)]">
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="6.25" stroke="currentColor" />
                <path d="M5.75 8.25l1.6 1.6 2.9-3.2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Human Verification: Beta
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.02em]">Good to see you, {firstName}.</h1>
          <p className="mt-2 text-sm text-[color:var(--muted)]">Track agent-readiness across everything you&apos;ve scanned.</p>
        </div>
        <Link href="/dashboard/new" className="btn btn-primary btn-sm">
          <span className="btn-chip">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          New audit
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total audits', value: audits.length, icon: Activity },
          {
            label: 'Average score',
            value: avg === null ? '—' : `${avg}`,
            icon: Trophy,
            sub: delta === null ? null : delta > 0 ? `▲ +${delta} vs previous` : delta < 0 ? `▼ ${delta} vs previous` : 'No change',
            color: avg === null ? undefined : scoreColor(avg),
          },
          { label: 'Open critical issues', value: critical, icon: ShieldAlert },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-[var(--card-border)] bg-[var(--canvas-soft)] px-6 py-6">
            <div className="flex items-center gap-2">
              <stat.icon className="h-4 w-4 text-[var(--primary)]" strokeWidth={1.75} aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">{stat.label}</p>
            </div>
            <p className="mt-2 text-3xl font-normal tracking-[-0.02em]" style={stat.color ? { color: stat.color } : undefined}>
              {stat.value}
            </p>
            {stat.sub && <p className="mt-1 text-xs text-[color:var(--muted)]">{stat.sub}</p>}
          </div>
        ))}
        {quota && (
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--canvas-soft)] px-6 py-6">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-[var(--primary)]" strokeWidth={1.75} aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">Audits this month</p>
            </div>
            <p className="mt-2 text-3xl font-normal tracking-[-0.02em]">
              {Number.isFinite(quota.limit) ? `${quota.used}/${quota.limit}` : 'Unlimited'}
            </p>
            {Number.isFinite(quota.limit) && (
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--hairline-strong)]">
                <div
                  className="h-full rounded-full bg-[var(--primary)] transition-all"
                  style={{ width: `${Math.min(100, (quota.used / quota.limit) * 100)}%` }}
                />
              </div>
            )}
            <p className="mt-1 text-xs text-[color:var(--muted)]">
              {Number.isFinite(quota.limit)
                ? `${quota.remaining} remaining on the ${quota.plan} plan`
                : `${quota.plan} plan`}
            </p>
          </div>
        )}
      </div>

      {trend.length > 0 && (
<div className="mt-4 rounded-xl border border-[var(--card-border)] bg-[var(--canvas-soft)] px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">Score trend · last {trend.length}</p>
            <p className="font-mono text-xs text-[color:var(--muted)]">
              best: {best} · avg: {avg}
            </p>
          </div>
          <div className="mt-5 flex h-28 items-end gap-1.5">
            {trend.map((a, i) => (
              <div key={a.id} className="group relative flex h-full flex-1 items-end">
                <div
                  className="w-full rounded-t-sm transition-opacity group-hover:opacity-80"
                  style={{ height: `${Math.max(a.result.score, 4)}%`, backgroundColor: scoreColor(a.result.score) }}
                  title={`${a.result.score} · ${a.url}`}
                />
                {trend.length > 1 && (
                  <span className="pointer-events-none absolute -top-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded border border-[var(--hairline)] bg-[var(--surface-card)] px-1.5 py-0.5 font-mono text-[10px] text-[color:var(--ink)] opacity-0 transition group-hover:opacity-100">
                    {a.result.score}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--surface-card)]/60 p-5 backdrop-blur-xl sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 20 20" className="h-4.5 w-4.5 shrink-0 text-[var(--accent)]" fill="none" aria-hidden="true">
                  <path d="M10 1.75l6.5 2.6v4.05c0 3.9-2.6 7.3-6.5 8.85-3.9-1.55-6.5-4.95-6.5-8.85V4.35l6.5-2.6z" stroke="currentColor" strokeLinejoin="round" />
                  <path d="M7.25 9.75l1.8 1.8 3.7-4.1" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="text-sm font-medium text-[color:var(--ink)]">Anti-Scrape Shield</p>
                <span className="rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--primary)]">Coming Soon</span>
              </div>
              <p className="mt-1.5 text-xs leading-5 text-[color:var(--muted)]">Block aggressive AI scrapers while staying open to helpful customer agents.</p>
            </div>
            <div className="flex shrink-0 items-center gap-2" title="Locked — coming soon">
              <span className="text-xs text-[color:var(--muted-soft)]">Shield Active</span>
              <span className="relative inline-flex h-6 w-11 cursor-not-allowed items-center rounded-full bg-[var(--hairline-strong)] opacity-60">
                <span className="absolute left-0.5 h-5 w-5 rounded-full bg-[var(--surface-card)]" />
                <svg viewBox="0 0 16 16" className="absolute right-1 h-3 w-3 text-[var(--muted-soft)]" fill="none" aria-hidden="true">
                  <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" stroke="currentColor" />
                  <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeLinecap="round" />
                </svg>
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--surface-card)]/60 p-5 backdrop-blur-xl sm:p-6">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 20 20" className="h-4.5 w-4.5 shrink-0 text-[var(--success)]" fill="none" aria-hidden="true">
              <circle cx="10" cy="10" r="8.25" stroke="currentColor" />
              <path d="M6.75 10.25l2.2 2.2 4.3-4.9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm font-medium text-[color:var(--ink)]">Verified Human Zone</p>
            <span className="rounded-full border border-[var(--success)]/30 bg-[var(--success)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--success)]">Beta</span>
          </div>
          <p className="mt-1.5 text-xs leading-5 text-[color:var(--muted)]">High-trust areas reserved for real customers. Non-intrusive “Proof of Humanity” UI — now active on this dashboard.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-[var(--success)]/10 px-2.5 py-1 text-[11px] font-medium text-[var(--success)]">You passed ✓</span>
            <span className="text-xs text-[color:var(--muted-soft)]">verified {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {error && <p className="mt-6 rounded-md border border-[var(--error)]/20 bg-[var(--error)]/10 p-3 text-sm text-[var(--error)]">{error}</p>}

      {audits.length > 0 && critical === 0 && (
        <div className="mt-8 flex items-start gap-3 rounded-lg border border-[var(--success)]/30 bg-[var(--success)]/10 px-5 py-4">
          <svg viewBox="0 0 16 16" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="6.25" stroke="currentColor" />
            <path d="M5.75 8.25l1.6 1.6 2.9-3.2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-sm leading-6 text-[var(--success)]">
            All clear — no open critical issues across {audits.length} audit{audits.length === 1 ? '' : 's'}.
          </p>
        </div>
      )}

      <div className="mt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-medium">Site scans</h2>
          <Link href="/dashboard/new" className="btn btn-secondary btn-sm">
            Run a site scan
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          {scans.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--hairline-strong)] bg-[var(--surface-card)] px-8 py-8 text-center">
              <p className="text-sm font-medium text-[color:var(--ink)]">No site scans yet</p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                Crawl the whole site in one pass and fix everything everywhere.
              </p>
              <Link href="/dashboard/new" className="btn btn-primary btn-sm mt-4">
                Scan your whole site
              </Link>
            </div>
          ) : (
            scans.map((scan) => (
              <div key={scan.id} className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-card)] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">Site scan</p>
                      <span className="rounded-full border border-[var(--hairline-strong)] bg-[var(--surface-strong)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                        {scan.pageCount} pages
                      </span>
                    </div>
                    <p className="mt-1 truncate text-base font-medium text-[color:var(--ink)]">{scan.url}</p>
                    <p className="mt-1 text-xs text-[color:var(--muted)]">{new Date(scan.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-3xl font-normal tracking-[-0.02em]" style={{ color: scoreColor(scan.overallScore) }}>
                      {scan.overallScore}
                    </p>
                    <p className="text-xs font-medium" style={{ color: scoreColor(scan.overallScore) }}>
                      {scoreLabel(scan.overallScore)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[var(--error)]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--error)]">
                    {scan.results.totals.critical} critical
                  </span>
                  <span className="rounded-full bg-[var(--warning)]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--warning)]">
                    {scan.results.totals.warning} warnings
                  </span>
                  {scan.results.pagesFailed > 0 && (
                    <span className="rounded-full border border-[var(--hairline-strong)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">
                      {scan.results.pagesFailed} failed
                    </span>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/dashboard/scan/${scan.id}`} className="btn btn-primary btn-sm">
                    <ScanEye className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                    Open report
                  </Link>
                  <button onClick={() => void removeScan(scan.id)} className="btn px-3 py-2 text-sm font-medium text-[color:var(--muted)] transition hover:text-[var(--error)]">
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        {scans.length === scanLimit && (
          <button onClick={() => setScanLimit((n) => n + 10)} className="btn btn-secondary btn-sm mt-4">
            Load more scans
          </button>
        )}
      </div>

      <div className="mt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-medium">Recent audits</h2>
          {audits.length > 0 && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search URLs…"
                className="h-10 rounded-lg border border-[var(--hairline-strong)] bg-[var(--surface-card)] px-3.5 text-sm outline-none placeholder:text-[color:var(--muted-soft)] focus:border-[var(--primary)]"
              />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}
                className="h-10 rounded-lg border border-[var(--hairline-strong)] bg-[var(--surface-card)] px-3 text-sm text-[color:var(--body)] outline-none focus:border-[var(--primary)]"
              >
                <option value="all">All issues</option>
                <option value="critical">Critical only</option>
                <option value="warnings">Warnings only</option>
              </select>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="h-10 rounded-lg border border-[var(--hairline-strong)] bg-[var(--surface-card)] px-3 text-sm text-[color:var(--body)] outline-none focus:border-[var(--primary)]"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="score">Highest score</option>
              </select>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-3">
          {audits.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--hairline-strong)] bg-[var(--surface-card)] px-8 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--surface-strong)] text-[var(--muted)]">
                <Ghost className="h-7 w-7" strokeWidth={1.5} aria-hidden="true" />
              </div>
              <p className="mt-4 text-base font-medium text-[color:var(--ink)]">No audits yet</p>
              <p className="mt-1 max-w-sm text-sm text-[color:var(--muted)]">
                Run your first audit to surface the &quot;invisible UI&quot; failures that stop AI agents.
              </p>
<Link
                href="/dashboard/new"
                className="btn btn-primary btn-sm mt-5"
              >
                Run your first audit
              </Link>
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-card)] px-8 py-10 text-center text-sm text-[color:var(--muted)]">
              No audits match your filters.
            </div>
          ) : (
            visible.map((audit) => {
              const engine = audit.result.engine || 'heuristic';
              const blindSpots = audit.result.xray?.blindSpots?.length ?? 0;
              const criticalCount = audit.result.issues.filter((i) => i.severity === 'critical').length;
              const warningCount = audit.result.issues.filter((i) => i.severity === 'warning').length;
              return (
                <div key={audit.id} className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-card)] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">Audit</p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                            engine === 'vision'
                              ? 'border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]'
                              : 'border-[var(--hairline-strong)] bg-[var(--surface-strong)] text-[var(--muted)]'
                          }`}
                        >
                          {engine === 'vision' ? 'AI Vision' : 'Heuristic'}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-base font-medium text-[color:var(--ink)]">{audit.url}</p>
                      <p className="mt-1 text-xs text-[color:var(--muted)]">
                        {new Date(audit.createdAt).toLocaleString()} · {audit.result.issues.length} issues
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-3xl font-normal tracking-[-0.02em]" style={{ color: scoreColor(audit.result.score) }}>
                        {audit.result.score}
                      </p>
                      <p className="text-xs font-medium" style={{ color: scoreColor(audit.result.score) }}>
                        {scoreLabel(audit.result.score)}
                      </p>
                      <p className="text-xs text-[color:var(--muted)]">/ 100</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-[var(--error)]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--error)]">
                      {criticalCount} critical
                    </span>
                    <span className="rounded-full bg-[var(--warning)]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--warning)]">
                      {warningCount} warnings
                    </span>
                    {blindSpots > 0 && (
                      <span className="rounded-full border border-[var(--hairline-strong)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--body)]">
                        {blindSpots} blind spot{blindSpots === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/dashboard/audit/${audit.id}`} className="btn btn-primary btn-sm">
                      <ScanEye className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                      Open X-Ray
                    </Link>
                    <button
                      onClick={() => void rerun(audit)}
                      disabled={rerunning === audit.id}
                      className="btn btn-secondary btn-sm"
                    >
                      {rerunning === audit.id ? 'Rerunning…' : 'Rerun'}
                    </button>
                    <button onClick={() => remove(audit.id)} className="btn px-3 py-2 text-sm font-medium text-[color:var(--muted)] transition hover:text-[var(--error)]">
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {audits.length > 0 && avg !== null && (
        <p className="mt-8 font-mono text-xs text-[color:var(--muted-soft)]">
          best: {best} · average: {avg} · readiness improving on every fix you ship.
        </p>
      )}
    </div>
  );
}

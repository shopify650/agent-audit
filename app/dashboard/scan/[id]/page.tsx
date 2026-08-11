'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Download, Lock, MapPin, Trash2, RefreshCw } from 'lucide-react';
import { loadScan, deleteScan, runSiteScan, type StoredScan } from '../../../../lib/audit';
import { useUser } from '../../../../lib/auth';
import ScoreGauge from '../../../../components/ScoreGauge';

const severityBadge: Record<string, string> = {
  critical: 'bg-[var(--error)]/10 text-[var(--error)]',
  warning: 'bg-[var(--warning)]/10 text-[var(--warning)]',
  optimization: 'bg-[var(--surface-strong)] text-[color:var(--muted)]',
};

export default function ScanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [scan, setScan] = useState<StoredScan | null | undefined>(undefined);
  const [rerunning, setRerunning] = useState(false);
  const [error, setError] = useState('');
  const user = useUser();
  const canExport = user ? user.plan !== 'free' : false;

  useEffect(() => {
    const load = async () => {
      setScan(await loadScan(params.id));
    };
    load();
  }, [params.id]);

  const rerun = async () => {
    if (!scan || rerunning) return;
    setRerunning(true);
    setError('');
    try {
      const { id } = await runSiteScan(scan.url);
      if (id) router.push(`/dashboard/scan/${id}`);
    } catch (err: any) {
      setError(err.message || 'Re-run failed');
    } finally {
      setRerunning(false);
    }
  };

  const remove = async () => {
    if (!scan) return;
    await deleteScan(scan.id);
    router.push('/dashboard');
  };

  const exportJson = () => {
    if (!scan) return;
    const blob = new Blob([JSON.stringify(scan.results, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `site-scan-${scan.url.replace(/[^a-zA-Z0-9]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (scan === undefined) {
    return <div className="py-16 text-center text-sm text-[color:var(--muted)]">Loading scan…</div>;
  }

  if (scan === null) {
    return (
      <div className="card p-10 text-center">
        <p className="text-sm text-[color:var(--body)]">This site scan was not found in your history.</p>
        <Link href="/dashboard/new" className="btn btn-primary btn-sm mt-4">
          Run a new scan
        </Link>
      </div>
    );
  }

  const { results } = scan;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--primary)]">Site scan report</p>
          <h1 className="mt-2 break-all text-3xl font-normal tracking-[-0.02em]">{scan.url}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-sm text-[color:var(--muted)]">{new Date(scan.createdAt).toLocaleString()}</p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--hairline-strong)] bg-[var(--surface-strong)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
              {results.pagesScanned} pages
            </span>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {canExport ? (
            <button onClick={exportJson} className="btn btn-primary btn-sm">
              <Download className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              Export JSON
            </button>
          ) : (
            <Link href="/pricing" className="btn btn-secondary btn-sm">
              <Lock className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              Export · Pro
            </Link>
          )}
          <button
            onClick={() => void rerun()}
            disabled={rerunning}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${rerunning ? 'animate-spin' : ''}`} strokeWidth={2} aria-hidden="true" />
            {rerunning ? 'Re-running…' : 'Re-run scan'}
          </button>
          <button onClick={() => void remove()} className="btn px-3 py-2 text-sm font-medium text-[color:var(--muted)] transition hover:text-[var(--error)]">
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            Delete
          </button>
        </div>
      </div>

      {error && <p className="mt-6 rounded-md border border-[var(--error)]/20 bg-[var(--error)]/10 p-3 text-sm text-[var(--error)]">{error}</p>}

      <div className="mt-8 grid gap-6 lg:grid-cols-4">
        <div className="card p-6">
          <ScoreGauge score={results.overallScore} />
          <p className="mt-4 text-center text-xs text-[color:var(--muted)]">Site average score</p>
        </div>

        <div className="card flex flex-col justify-center p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">Pages scanned</p>
          <p className="mt-2 text-4xl font-normal tracking-[-0.02em]">{results.pagesScanned}</p>
          <p className="mt-1 text-xs text-[color:var(--muted)]">Best {results.bestScore} · Worst {results.worstScore}</p>
        </div>

        <div className="card flex flex-col justify-center p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">Findings</p>
          <p className="mt-2 text-4xl font-normal tracking-[-0.02em]">
            {results.totals.critical + results.totals.warning + results.totals.optimization}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-[var(--error)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--error)]">{results.totals.critical} critical</span>
            <span className="rounded-full bg-[var(--warning)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--warning)]">{results.totals.warning} warning</span>
          </div>
        </div>

        <div className="card flex flex-col justify-center p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">Failed pages</p>
          <p className="mt-2 text-4xl font-normal tracking-[-0.02em]">{results.pagesFailed}</p>
          <p className="mt-1 text-xs text-[color:var(--muted)]">Unreachable or not HTML</p>
        </div>
      </div>

      <div className="card mt-6 p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">Pages crawled</p>
          <span className="font-mono text-xs text-[color:var(--muted)]">{results.pages.length} URLs</span>
        </div>

        {results.pages.length === 0 ? (
          <p className="mt-4 text-sm text-[color:var(--muted)]">No pages were crawled.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--hairline)]">
            {results.pages.map((page) => (
              <li key={page.url} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 break-all text-sm font-medium text-[color:var(--ink)]">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-[color:var(--muted)]" strokeWidth={2} aria-hidden="true" />
                      {page.url}
                    </p>
                    {!page.error && (
                      <Link
                        href={`/dashboard/new?url=${encodeURIComponent(page.url)}`}
                        className="mt-1.5 inline-block text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-active)]"
                      >
                        Run full audit on this page →
                      </Link>
                    )}
                    {page.error ? (
                      <p className="mt-1 text-xs text-[var(--error)]">{page.error}</p>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {page.topIssues.map((issue) => (
                          <span
                            key={issue.id}
                            title={issue.title}
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${severityBadge[issue.severity]}`}
                          >
                            {issue.title.length > 48 ? `${issue.title.slice(0, 48)}…` : issue.title}
                          </span>
                        ))}
                        {page.topIssues.length === 0 && (
                          <span className="text-xs text-[color:var(--muted)]">No findings</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    {page.error ? (
                      <span className="rounded-full bg-[var(--error)]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--error)]">
                        failed
                      </span>
                    ) : (
                      <>
                        <span className="font-mono text-lg text-[color:var(--ink)]">{page.score}</span>
                        <div className="flex gap-2">
                          <span className="rounded-full bg-[var(--error)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--error)]">{page.critical}</span>
                          <span className="rounded-full bg-[var(--warning)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--warning)]">{page.warnings}</span>
                          <span className="rounded-full bg-[var(--surface-strong)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--muted)]">{page.optimization}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

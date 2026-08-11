'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { runAudit, saveAudit, getQuota, runSiteScan, RateLimitError, type AuditResult, type Quota, type SiteScanReport, type AuditProgressStage } from '../../../lib/audit';
import { planKeyOf, scanPages, scanFee } from '../../../lib/plans';
import { useUser } from '../../../lib/auth';
import TimelinePills from '../../../components/TimelinePills';
import IssueList from '../../../components/IssueList';
import { timelineStages } from '../../../lib/stages';

type Mode = 'page' | 'site';

export default function NewAuditPage() {
  const [url, setUrl] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('url') || '';
  });
  const [mode, setMode] = useState<Mode>('page');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AuditResult | null>(null);
  const [scan, setScan] = useState<SiteScanReport | null>(null);
  const [charged, setCharged] = useState(true);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const user = useUser();

  const plan = planKeyOf(quota?.plan ?? user?.plan);
  const scanCapped = scanPages(plan);
  const scanCost = scanFee(plan);
  const canScanSite = scanCapped > 0;

  useEffect(() => {
    const loadQuota = async () => {
      setQuota(await getQuota());
    };
    loadQuota();
  }, []);

  const onProgress = (stage: AuditProgressStage) => {
    const idx = timelineStages.findIndex((s) => s.key === stage);
    if (idx >= 0) setStage(idx);
  };

  const reset = () => {
    setError('');
    setRateLimited(false);
    setResult(null);
    setScan(null);
    setCharged(true);
    setSavedId(null);
    setScanId(null);
    setStage(0);
  };

  const startAudit = async () => {
    if (!url.trim()) {
      setError('Enter a URL to audit.');
      return;
    }
    setLoading(true);
    reset();

    try {
      if (mode === 'site') {
        const { report, id, charged } = await runSiteScan(url.trim());
        setScan(report);
        setScanId(id);
        setCharged(charged);
        setQuota(await getQuota());
      } else {
        const data = await runAudit(url.trim(), onProgress);
        setResult(data);
        if (user) {
          const saved = await saveAudit(url.trim(), data);
          setSavedId(saved.id);
          setQuota(await getQuota());
        }
      }
    } catch (err: any) {
      if (err instanceof RateLimitError) setRateLimited(true);
      setError(err.message || 'Scan failed');
    } finally {
      setLoading(false);
    }
  };

  const criticalCount = result?.issues.filter((i) => i.severity === 'critical').length ?? 0;
  const warningCount = result?.issues.filter((i) => i.severity === 'warning').length ?? 0;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--primary)]">New audit</p>
      <h1 className="mt-2 text-3xl font-normal tracking-[-0.02em]">Start an Agent Scan</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">We&apos;ll read your page the way an agent does — and show you every place it breaks.</p>

      <div className="mt-8 flex w-fit items-center gap-1 rounded-lg border border-[var(--hairline-strong)] bg-[var(--surface-card)] p-1">
        <button
          onClick={() => setMode('page')}
          className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
            mode === 'page' ? 'bg-[var(--primary)] text-white' : 'text-[color:var(--muted)] hover:text-[color:var(--body)]'
          }`}
        >
          Single page
        </button>
        <button
          onClick={() => setMode('site')}
          disabled={!canScanSite}
          title={canScanSite ? undefined : 'Available on Pro, Agency, and Enterprise plans'}
          className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
            mode === 'site' ? 'bg-[var(--primary)] text-white' : 'text-[color:var(--muted)] hover:text-[color:var(--body)]'
          } ${!canScanSite ? 'cursor-not-allowed opacity-50 hover:text-[color:var(--muted)]' : ''}`}
        >
          Whole site
        </button>
      </div>

      {mode === 'site' && (
        <p className="mt-3 text-xs text-[color:var(--muted)]">
          {canScanSite
            ? `Crawls up to ${scanCapped} pages across your domain · costs ${scanCost} ${scanCost === 1 ? 'audit' : 'audits'} from your monthly quota`
            : 'Full-site scans are a Pro, Agency, or Enterprise feature. Crawl every page of your site and fix everything in one pass.'}
        </p>
      )}

      {!canScanSite && (
        <Link
          href="/pricing"
          className="mt-2 inline-block text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-active)]"
        >
          See plans to unlock full-site scans →
        </Link>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void startAudit();
          }}
          placeholder="https://example.com"
          className="h-11 flex-1 rounded-lg border border-[var(--hairline-strong)] bg-[var(--surface-card)] px-4 text-sm outline-none placeholder:text-[color:var(--muted-soft)] focus:border-[var(--primary)]"
        />
        <button onClick={() => void startAudit()} disabled={loading} className="btn btn-primary h-11 px-6">
          {loading ? (mode === 'site' ? 'Scanning site…' : 'Scanning…') : mode === 'site' ? 'Run site scan' : 'Run scan'}
        </button>
      </div>

      {user && quota && (
        <p className="mt-3 text-xs text-[color:var(--muted)]">
          {Number.isFinite(quota.limit)
            ? `${quota.used} of ${quota.limit} audits used this month · ${quota.remaining} remaining`
            : `${quota.plan} plan · unlimited audits`}
          {plan === 'free' ? ' · Upgrade for full-site scans' : ''}{' '}
          <Link href="/pricing" className="font-medium text-[var(--primary)] hover:text-[var(--primary-active)]">
            Upgrade
          </Link>
        </p>
      )}

      {error && <p className="mt-6 rounded-md border border-[var(--error)]/20 bg-[var(--error)]/10 p-3 text-sm text-[var(--error)]">{error}</p>}

      {error && rateLimited && (
        <p className="mt-3 text-sm">
          <Link href="/pricing" className="font-medium text-[var(--primary)] hover:text-[var(--primary-active)]">
            Compare plans & upgrade →
          </Link>
        </p>
      )}

      {(loading || result || scan) && (
        <div className="card mt-8 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <TimelinePills stage={loading ? stage : timelineStages.length} />
            <span className="font-mono text-xs text-[color:var(--muted)]">{loading ? 'running checks…' : 'complete'}</span>
          </div>

          {loading && <div className="mt-6 h-48 animate-pulse rounded-lg bg-[var(--canvas-soft)]" />}

          {result && (
            <div className="mt-6 space-y-8">
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">Readiness score</p>
                  <p className="mt-2 text-6xl font-normal tracking-[-0.03em]">{result.score}</p>
                  <p className="font-mono text-xs text-[color:var(--muted)]">/ 100</p>
                  <div className="mt-4 flex gap-2">
                    <span className="rounded-full bg-[var(--error)]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--error)]">{criticalCount} critical</span>
                    <span className="rounded-full bg-[var(--warning)]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--warning)]">{warningCount} warning</span>
                  </div>
                  {savedId && (
                    <Link href={`/dashboard/audit/${savedId}`} className="btn btn-primary btn-sm mt-5">
                      View full report →
                    </Link>
                  )}
                </div>
                <div className="lg:col-span-2">
                  <p className="text-base leading-6 text-[color:var(--body)]">{result.summary}</p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">What the agent read</p>
                  <pre className="mt-2 max-h-40 overflow-y-auto rounded-md border border-[var(--hairline)] bg-[var(--canvas-soft)] p-4 font-mono text-xs leading-5 text-[color:var(--body)]">
                    {result.snapshot}
                  </pre>
                </div>
              </div>

              <div>
                <p className="text-lg font-medium">Findings & fixes</p>
                <div className="mt-4">
                  <IssueList issues={result.issues} />
                </div>
              </div>
            </div>
          )}

          {scan && (
            <div className="mt-6 space-y-8">
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">Site average</p>
                  <p className="mt-2 text-6xl font-normal tracking-[-0.03em]">{scan.overallScore}</p>
                  <p className="font-mono text-xs text-[color:var(--muted)]">/ 100 across {scan.pagesScanned} pages</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-[var(--error)]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--error)]">{scan.totals.critical} critical</span>
                    <span className="rounded-full bg-[var(--warning)]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--warning)]">{scan.totals.warning} warnings</span>
                    <span className="rounded-full bg-[var(--muted)]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">{scan.pagesFailed} failed</span>
                  </div>
                  {scanId && (
                    <Link href={`/dashboard/scan/${scanId}`} className="btn btn-primary btn-sm mt-5">
                      View full report →
                    </Link>
                  )}
                </div>
                <div className="lg:col-span-2">
                  <p className="text-base leading-6 text-[color:var(--body)]">
                    We crawled {scan.pagesScanned} pages of {scan.targetUrl} — {scan.totals.critical} critical, {scan.totals.warning} warning, and {scan.totals.optimization} optimization findings across the site. Best page scored {scan.bestScore}, worst {scan.worstScore}.
                  </p>
                  {!charged && (
                    <p className="mt-3 rounded-md border border-[var(--warning)]/20 bg-[var(--warning)]/10 p-3 text-xs text-[color:var(--body)]">
                      No pages could be crawled — your audit quota was not charged.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CheckCircle2, Download, Lock, RefreshCw, XCircle } from 'lucide-react';
import { loadAudit, updateAudit, runAudit, type StoredAudit } from '../../../../lib/audit';
import { useUser } from '../../../../lib/auth';
import IssueList from '../../../../components/IssueList';
import TimelinePills from '../../../../components/TimelinePills';
import ScoreGauge from '../../../../components/ScoreGauge';
import XRayViewport from '../../../../components/XRayViewport';
import FixBlock from '../../../../components/FixBlock';
import { timelineStages } from '../../../../lib/stages';

const severityBadge: Record<string, string> = {
  critical: 'bg-[var(--error)]/10 text-[var(--error)]',
  warning: 'bg-[var(--warning)]/10 text-[var(--warning)]',
  optimization: 'bg-[var(--surface-strong)] text-[color:var(--muted)]',
};

export default function AuditDetailPage() {
  const params = useParams<{ id: string }>();
  const [audit, setAudit] = useState<StoredAudit | null | undefined>(undefined);
  const [rerunning, setRerunning] = useState(false);
  const [error, setError] = useState('');
  const [xrayMode, setXrayMode] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const user = useUser();
  const canExport = user ? user.plan !== 'free' : false;

  useEffect(() => {
    const load = async () => {
      setAudit(await loadAudit(params.id));
    };
    load();
  }, [params.id]);

  const rerun = async () => {
    if (!audit) return;
    setRerunning(true);
    setError('');
    try {
      const result = await runAudit(audit.url);
      const updated = await updateAudit(audit.id, { result, createdAt: Date.now() });
      setAudit(updated ?? undefined);
      setSelected(null);
    } catch (err: any) {
      setError(err.message || 'Rerun failed');
    } finally {
      setRerunning(false);
    }
  };

  const exportJson = () => {
    if (!audit) return;
    const blob = new Blob([JSON.stringify(audit.result, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `agen-${audit.url.replace(/[^a-zA-Z0-9]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (audit === undefined) {
    return <div className="py-16 text-center text-sm text-[color:var(--muted)]">Loading report…</div>;
  }

  if (audit === null) {
    return (
      <div className="card p-10 text-center">
        <p className="text-sm text-[color:var(--body)]">This report was not found in your history.</p>
        <Link href="/dashboard/new" className="btn btn-primary btn-sm mt-4">
          Run a new audit
        </Link>
      </div>
    );
  }

  const { result, url, createdAt } = audit;
  const xray = result.xray;
  const blindSpots = xray?.blindSpots ?? [];
  const capabilities = xray?.capabilities ?? [];
  const passCount = capabilities.filter((c) => c.pass).length;
  const activeSpot = selected !== null ? blindSpots[selected] ?? null : null;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--primary)]">Audit report · Agent X-Ray</p>
          <h1 className="mt-2 break-all text-3xl font-normal tracking-[-0.02em]">{url}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-sm text-[color:var(--muted)]">{new Date(createdAt).toLocaleString()}</p>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                result.engine === 'vision'
                  ? 'border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]'
                  : 'border-[var(--hairline-strong)] bg-[var(--surface-strong)] text-[var(--muted)]'
              }`}
            >
              {result.engine === 'vision' ? 'AI Auditor' : 'Heuristic'}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => void rerun()}
            disabled={rerunning}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${rerunning ? 'animate-spin' : ''}`} strokeWidth={2} aria-hidden="true" />
            {rerunning ? 'Rerunning…' : 'Rerun'}
          </button>
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
        </div>
      </div>

      {error && <p className="mt-6 rounded-md border border-[var(--error)]/20 bg-[var(--error)]/10 p-3 text-sm text-[var(--error)]">{error}</p>}

      <div className="card mt-8 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <TimelinePills stage={timelineStages.length} />
          <span className="font-mono text-xs text-[color:var(--muted)]">checked {new Date(result.checkedAt).toLocaleString()}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <XRayViewport
            screenshot={xray?.screenshot}
            width={xray?.width ?? 1280}
            height={xray?.height ?? 800}
            blindSpots={blindSpots}
            xrayMode={xrayMode}
            selected={selected}
            onToggle={setXrayMode}
            onSelect={setSelected}
          />

          <div className="card p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">Capability Checklist</p>
              <span className="font-mono text-xs text-[color:var(--muted)]">
                {passCount}/{capabilities.length} pass
              </span>
            </div>
            {capabilities.length === 0 ? (
              <p className="mt-4 text-sm text-[color:var(--muted)]">No capability tests recorded.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {capabilities.map((cap) => (
                  <li key={cap.name} className="flex items-start gap-3">
                    {cap.pass ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" strokeWidth={1.75} aria-hidden="true" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--error)]" strokeWidth={1.75} aria-hidden="true" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[color:var(--ink)]">{cap.name}</p>
                      {cap.detail && <p className="mt-0.5 text-xs leading-5 text-[color:var(--muted)]">{cap.detail}</p>}
                      {!cap.pass && cap.snippet && (
                        <pre className="mt-2 overflow-x-auto rounded-md border border-[var(--hairline)] bg-[var(--canvas-soft)] p-2.5 font-mono text-xs leading-5 text-[color:var(--body)]">
                          {cap.snippet}
                        </pre>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <ScoreGauge score={result.score} />
            <p className="mt-5 border-t border-[var(--hairline)] pt-5 text-sm leading-6 text-[color:var(--body)]">{result.summary}</p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">Blind Spots</p>
              <span className="font-mono text-xs text-[color:var(--muted)]">{blindSpots.length} detected</span>
            </div>
            {blindSpots.length === 0 ? (
              <p className="mt-4 text-sm text-[color:var(--muted)]">No blind spots flagged.</p>
            ) : (
              <>
                <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                  {blindSpots.map((spot, index) => {
                    const active = selected === index;
                    return (
                      <li key={spot.id}>
                        <button
                          onClick={() => setSelected(active ? null : index)}
                          className={`w-full rounded-lg border p-3 text-left transition ${
                            active
                              ? 'border-[var(--ink)] bg-[var(--surface-strong)]'
                              : 'border-[var(--hairline)] bg-[var(--canvas-soft)] hover:border-[var(--hairline-strong)]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-[color:var(--muted)]">#{index + 1}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${severityBadge[spot.severity]}`}>
                              {spot.severity}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-medium text-[color:var(--ink)]">{spot.label}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-[var(--hairline-strong)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--body)]">
                              {spot.category}
                            </span>
                            <span className="font-mono text-[11px] text-[color:var(--muted)]">
                              ({spot.x}, {spot.y})
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {activeSpot && (
                  <div className="mt-4">
                    <FixBlock
                      title={`Suggested Fix · Blind spot ${selected! + 1}`}
                      fix={activeSpot.fix}
                      code={activeSpot.code || '<button type="button">…</button>'}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">Findings & fixes</p>
            <span className="font-mono text-xs text-[color:var(--muted)]">{result.issues.length} total</span>
          </div>
          <div className="mt-4">
            <IssueList issues={result.issues} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">Agent flow</p>
            <ol className="mt-4 list-decimal space-y-2 pl-4 text-sm leading-6 text-[color:var(--body)]">
              {result.flowSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="card p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">What the agent read</p>
            <pre className="mt-3 max-h-64 overflow-y-auto rounded-md border border-[var(--hairline)] bg-[var(--canvas-soft)] p-4 font-mono text-xs leading-5 text-[color:var(--body)]">
              {result.snapshot}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

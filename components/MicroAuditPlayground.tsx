'use client';

import { useState } from 'react';

type CheckResult = {
  name: string;
  detail: string;
  weight: number;
  severity: 'critical' | 'warning' | 'optimization';
  pass: boolean;
};

function audit(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const bodyText = (doc.body?.textContent || '').trim().replace(/\s+/g, ' ');
  const scriptCount = (html.match(/<script[\s>]/gi) || []).length;
  const hasText = bodyText.length > 60;
  const title = (doc.title || '').trim();

  const inputs = Array.from(doc.querySelectorAll('input')).filter(
    (el) => !['hidden', 'submit', 'button', 'image', 'reset'].includes((el.getAttribute('type') || 'text').toLowerCase()),
  );
  const labels = Array.from(doc.querySelectorAll('label'));
  const unlabeled = inputs.filter((el) => {
    const id = el.id;
    return !(
      (id && labels.some((l) => l.htmlFor === id)) ||
      el.getAttribute('aria-label') ||
      el.getAttribute('aria-labelledby') ||
      el.getAttribute('placeholder') ||
      el.closest('label')
    );
  });
  const noAlt = Array.from(doc.querySelectorAll('img')).filter((el) => !el.hasAttribute('alt'));
  const emptyButtons = Array.from(doc.querySelectorAll('button')).filter(
    (el) => !(el.textContent || '').trim() && !el.getAttribute('aria-label') && !el.getAttribute('title'),
  );
  const links = Array.from(doc.querySelectorAll('a[href]'));
  const emptyLinks = links.filter((el) => {
    const href = (el.getAttribute('href') || '').trim();
    return !(el.textContent || '').trim() && !el.getAttribute('aria-label') && !el.getAttribute('title') && !href.startsWith('#');
  });
  const fillerLinks = links.filter((el) => {
    const href = (el.getAttribute('href') || '').trim().toLowerCase();
    return href === '#' || href.startsWith('javascript:');
  });
  const hasMain = Boolean(doc.querySelector('main'));
  const h1Count = doc.querySelectorAll('h1').length;
  const hasNav = Boolean(doc.querySelector('nav'));
  const hoverInline = html.includes('onmouseover') || html.includes('onmouseenter');

  const checks: CheckResult[] = [
    {
      name: 'Read content without JavaScript',
      pass: hasText || scriptCount === 0,
      weight: 80,
      severity: 'critical',
      detail: hasText ? `${bodyText.length} chars of static text` : 'page is empty when scripts are disabled',
    },
    {
      name: 'Find the page topic',
      pass: title.length > 0,
      weight: 14,
      severity: 'critical',
      detail: title ? `title: ${title.slice(0, 60)}` : 'no <title> present',
    },
    {
      name: 'Identify form fields',
      pass: unlabeled.length === 0,
      weight: 16,
      severity: 'critical',
      detail: unlabeled.length ? `${unlabeled.length} field(s) without a label or placeholder` : 'all fields labeled',
    },
    {
      name: 'Understand every button',
      pass: emptyButtons.length === 0,
      weight: 10,
      severity: 'warning',
      detail: emptyButtons.length ? `${emptyButtons.length} button(s) with no accessible name` : 'all buttons named',
    },
    {
      name: 'Describe every image',
      pass: noAlt.length === 0,
      weight: 8,
      severity: 'warning',
      detail: noAlt.length ? `${noAlt.length} image(s) missing alt text` : 'all images have alt text',
    },
    {
      name: 'Follow link destinations',
      pass: emptyLinks.length === 0 && fillerLinks.length === 0,
      weight: 8,
      severity: 'warning',
      detail:
        emptyLinks.length || fillerLinks.length
          ? `${emptyLinks.length + fillerLinks.length} link(s) with no readable destination`
          : 'links are readable and real',
    },
    {
      name: 'Parse page structure',
      pass: hasMain && h1Count === 1,
      weight: 8,
      severity: 'warning',
      detail: hasMain ? `${h1Count} h1, main landmark present` : 'no <main> landmark',
    },
    {
      name: 'Act without hover',
      pass: !hoverInline,
      weight: 8,
      severity: 'warning',
      detail: hoverInline ? 'hover/pointer event handlers detected' : 'no pointer-only interactions',
    },
    {
      name: 'Use semantic navigation',
      pass: hasNav || links.length < 3,
      weight: 5,
      severity: 'optimization',
      detail: hasNav ? 'nav landmark present' : 'menu has no <nav> landmark',
    },
  ];

  const failed = checks.filter((c) => !c.pass);
  const score = Math.max(10, 100 - failed.reduce((sum, c) => sum + c.weight, 0));
  return { score, failed };
}

const severityBadge: Record<string, string> = {
  critical: 'bg-[var(--error)]/10 text-[var(--error)]',
  warning: 'bg-[var(--warning)]/10 text-[var(--warning)]',
  optimization: 'bg-[var(--surface-strong)] text-[color:var(--muted)]',
};

const scoreTone = (score: number) =>
  score >= 85 ? 'text-[var(--success)]' : score >= 60 ? 'text-[var(--warning)]' : 'text-[var(--error)]';

export default function MicroAuditPlayground({
  before,
  after,
  caption,
}: {
  before: string;
  after: string;
  caption?: string;
}) {
  const [version, setVersion] = useState<'before' | 'after'>('before');
  const [result, setResult] = useState<ReturnType<typeof audit> | null>(null);

  const html = version === 'before' ? before : after;

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--card-border)] px-5 py-3">
        <div className="flex rounded-lg border border-[var(--card-border)] bg-[var(--canvas-soft)] p-1">
          {(['before', 'after'] as const).map((v) => (
            <button
              key={v}
              onClick={() => {
                setVersion(v);
                setResult(null);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                version === v ? 'bg-[var(--surface-white)] text-[color:var(--ink)] shadow-sm' : 'text-[color:var(--muted)]'
              }`}
            >
              {v === 'before' ? 'Before' : 'After'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setResult(audit(html))}
          className="btn btn-primary btn-sm"
        >
          Run micro-audit
        </button>
      </div>

      {caption && <p className="border-b border-[var(--card-border)] px-5 py-2.5 text-xs text-[color:var(--muted)]">{caption}</p>}

      <pre className="max-h-80 overflow-auto bg-[var(--canvas-soft)] p-5 font-mono text-xs leading-5 text-[color:var(--body)]">
        {html}
      </pre>

      {result && (
        <div className="border-t border-[var(--card-border)] p-5">
          <div className="flex items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">Score</p>
            <p className={`text-4xl font-normal tracking-[-0.02em] ${scoreTone(result.score)}`}>{result.score}</p>
            <p className="font-mono text-xs text-[color:var(--muted)]">/ 100</p>
          </div>
          {result.failed.length === 0 ? (
            <p className="mt-4 rounded-lg border border-[var(--success)]/20 bg-[var(--success)]/10 p-3 text-sm text-[var(--success)]">
              Every capability check passed. This markup is readable by agents.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {result.failed.map((check) => (
                <div
                  key={check.name}
                  className="flex items-start justify-between gap-3 rounded-lg border border-[var(--card-border)] bg-[var(--surface-white)] p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[color:var(--ink)]">{check.name}</p>
                    <p className="mt-0.5 text-xs text-[color:var(--muted)]">{check.detail}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${severityBadge[check.severity]}`}>
                      {check.severity}
                    </span>
                    <span className="font-mono text-xs text-[color:var(--muted)]">−{check.weight}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

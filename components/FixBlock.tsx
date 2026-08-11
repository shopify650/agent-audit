'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export default function FixBlock({
  title,
  fix,
  code,
}: {
  title?: string;
  fix?: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--hairline)] bg-[var(--canvas-soft)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--hairline)] bg-[var(--surface-card)] px-3 py-2">
        <p className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">
          {title || 'Suggested Fix'}
        </p>
        <button
          onClick={() => void copy()}
          className={`btn btn-primary btn-sm ${
            copied ? 'bg-[var(--success)] text-[color:var(--canvas)]' : ''
          }`}
        >
          {copied ? <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy Code'}
        </button>
      </div>
      {fix && <p className="border-b border-[var(--hairline)] px-3 py-2.5 text-sm leading-6 text-[color:var(--body)]">{fix}</p>}
      <pre className="max-h-64 overflow-auto px-3 py-3 font-mono text-xs leading-5 text-[color:var(--ink)]">{code}</pre>
    </div>
  );
}

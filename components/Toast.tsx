'use client';

import { useEffect, useState } from 'react';
import { AUDIT_CONGESTION_EVENT } from '../lib/audit';

const CONGESTION_MESSAGE =
  'Free servers are currently busy. Try again in 5 minutes or upgrade for instant, high-priority audits.';

export default function ToastHost() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    const onEvent = () => setMessage(CONGESTION_MESSAGE);
    window.addEventListener(AUDIT_CONGESTION_EVENT, onEvent);
    return () => window.removeEventListener(AUDIT_CONGESTION_EVENT, onEvent);
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 7000);
    return () => clearTimeout(timer);
  }, [message]);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 w-full max-w-md -translate-x-1/2 px-4">
      <div className="flex items-start justify-between gap-3 rounded-xl border border-[var(--hairline-strong)] bg-[var(--surface-card)] p-4 shadow-lg">
        <p className="text-sm leading-5 text-[color:var(--body)]">{message}</p>
        <button
          onClick={() => setMessage('')}
          className="shrink-0 text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-active)]"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

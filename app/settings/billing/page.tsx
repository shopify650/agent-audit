'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import type { Plan } from '../../../lib/auth';
import { checkoutUrlForPlan, customerPortalUrl } from '../../../lib/creem';

type BillingStatus = {
  userId: string;
  plan: Plan;
  planType: string;
  subscriptionStatus: string;
  monthlyAuditQuota: number;
  auditsUsed: number;
  subscriptionPeriodEnd: string | null;
  creemSubscriptionId: string | null;
  hasPaidPlan: boolean;
};

const plans: { key: Plan; label: string; price: string; blurb: string }[] = [
  { key: 'free', label: 'Free', price: '$0', blurb: '3 audits / month' },
  { key: 'pro', label: 'Pro', price: '$14/mo', blurb: '30 audits / month' },
  { key: 'agency', label: 'Agency', price: '$44/mo', blurb: '100 audits / month · API access' },
  { key: 'enterprise', label: 'Enterprise', price: 'Custom', blurb: 'Unlimited audits, API, SLA' },
];

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function SettingsBillingPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await fetch('/api/billing/status');
    if (!response.ok) {
      setLoading(false);
      return;
    }
    const data = (await response.json()) as BillingStatus;
    setStatus(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const plan = status?.plan ?? 'free';
  const planDisplay = plan.charAt(0).toUpperCase() + plan.slice(1);
  const usagePct =
    status && Number.isFinite(status.monthlyAuditQuota) && status.monthlyAuditQuota > 0
      ? Math.min(100, Math.round((status.auditsUsed / status.monthlyAuditQuota) * 100))
      : 0;
  const portalUrl = customerPortalUrl();

  const hrefFor = (key: Plan): string | null => {
    if (key === 'pro' || key === 'agency') {
      if (!status?.userId) return null;
      return checkoutUrlForPlan(key, status.userId);
    }
    return null;
  };

  if (loading) {
    return <p className="text-sm text-[color:var(--muted)]">Loading billing…</p>;
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--primary)]">Billing</p>
      <h1 className="mt-2 text-3xl font-normal tracking-[-0.02em]">Subscription</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">Subscriptions are processed securely by Creem. Your plan activates automatically after payment.</p>

      <div className="card mt-8 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">Current plan</p>
            <p className="mt-1 text-2xl font-normal tracking-[-0.02em]">{planDisplay}</p>
            <p className="mt-1 text-sm text-[color:var(--body)]">
              {status?.hasPaidPlan
                ? `${status.subscriptionStatus === 'active' ? 'Active' : 'Status: ' + status.subscriptionStatus} · Next billing date ${formatDate(status.subscriptionPeriodEnd)}`
                : 'Free plan · 3 audits / month'}
            </p>
          </div>
          {status?.hasPaidPlan && portalUrl && (
            <Link href={portalUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
              Manage Subscription
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => {
          const active = plan === p.key;
          const href = hrefFor(p.key);
          return (
            <div
              key={p.key}
              className={`rounded-xl border p-5 ${active ? 'border-[var(--ink)] bg-[var(--ink)] text-[color:var(--canvas)]' : 'border-[var(--card-border)] bg-[var(--surface-card)]'}`}
            >
              <p className={`text-sm font-medium ${active ? 'text-[color:var(--canvas)]' : 'text-[color:var(--ink)]'}`}>{p.label}</p>
              <p className="mt-2 text-3xl font-normal tracking-[-0.02em]">{p.price}</p>
              <p className={`mt-1 text-sm ${active ? 'text-[color:var(--canvas)]/80' : 'text-[color:var(--muted)]'}`}>{p.blurb}</p>
              {active ? (
                <button
                  disabled
                  className="mt-5 w-full cursor-default rounded-lg border border-[var(--hairline-strong)] px-4 py-2 text-sm font-medium text-[color:var(--muted)]"
                >
                  Current plan
                </button>
              ) : p.key === 'enterprise' ? (
                <Link href="/auth/signup?next=/pricing" className="btn btn-secondary btn-sm mt-5 w-full">
                  Let’s talk
                </Link>
              ) : href ? (
                <Link href={href} className="btn btn-primary btn-sm mt-5 w-full">
                  Upgrade
                </Link>
              ) : (
                <Link href="/auth/login?next=/settings/billing" className="btn btn-secondary btn-sm mt-5 w-full">
                  Sign in to upgrade
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {status && (
        <div className="card mt-8 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">Current usage</p>
              <p className="mt-1 text-sm text-[color:var(--body)]">
                {Number.isFinite(status.monthlyAuditQuota)
                  ? `Usage: ${status.auditsUsed}/${status.monthlyAuditQuota} ${planDisplay} Audits Used this month · ${Math.max(0, status.monthlyAuditQuota - status.auditsUsed)} remaining.`
                  : `Usage: ${status.auditsUsed} audits this month · ${planDisplay} plan.`}
              </p>
            </div>
            <p className="text-3xl font-normal tracking-[-0.02em]">
              {Number.isFinite(status.monthlyAuditQuota) ? `${status.auditsUsed}/${status.monthlyAuditQuota}` : status.auditsUsed}
            </p>
          </div>
          {Number.isFinite(status.monthlyAuditQuota) && (
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-strong)]">
              <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${usagePct}%` }} />
            </div>
          )}
        </div>
      )}

      <div className="card mt-8 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">Invoices</p>
        <p className="mt-3 text-sm text-[color:var(--body)]">
          {status?.hasPaidPlan
            ? 'Invoices are managed by Creem. Open the customer portal to view receipts and billing history.'
            : 'No invoices yet. They’ll appear here once you upgrade to a paid plan.'}
        </p>
        <Link href="/pricing" className="mt-4 inline-block text-sm font-medium text-[color:var(--primary)] hover:text-[color:var(--primary-active)]">
          Compare plans →
        </Link>
      </div>
    </div>
  );
}

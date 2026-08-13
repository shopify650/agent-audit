'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { WhopCheckoutEmbed } from '@whop/checkout/react';
import { useUser } from '../../lib/auth';
import type { WhopPlan, BillingInterval } from '../../lib/whop';
import { PLANS, priceLabel } from '../../lib/pricing';

const whopTheme = {
  theme: 'light',
  themeOptions: {
    accentColor: '#a15800',
    backgroundColor: '#f7f7f4',
    borderRadius: 12,
  },
} as const;

function CheckoutLoading() {
  return (
    <div className="flex min-h-[480px] items-center justify-center rounded-xl border border-[var(--card-border)] bg-[var(--surface-card)]">
      <p className="text-sm text-[color:var(--muted)]">Loading checkout…</p>
    </div>
  );
}

export default function CheckoutEmbed({
  plan,
  interval,
  planId,
  sessionId,
  environment,
}: {
  plan: WhopPlan;
  interval: BillingInterval;
  planId: string | null;
  sessionId?: string | null;
  environment: 'production' | 'sandbox';
}) {
  const user = useUser();
  const router = useRouter();
  const pricing = PLANS.find((p) => p.id === plan);

  let checkoutPanel: ReactNode;
  if (sessionId) {
    checkoutPanel = (
      <WhopCheckoutEmbed
        key={`session-${sessionId}`}
        sessionId={sessionId}
        fallback={<CheckoutLoading />}
        {...whopTheme}
        onComplete={() => {
          router.push('/settings/billing?activated=true');
        }}
      />
    );
  } else if (!planId) {
    checkoutPanel = (
      <div className="card p-6 text-sm text-[color:var(--body)]">
        <p className="font-medium text-[color:var(--ink)]">Plan unavailable</p>
        <p className="mt-2">This plan isn’t configured for checkout yet. Please contact support or try again later.</p>
        <Link href="/pricing" className="mt-4 inline-block text-sm font-medium text-[color:var(--primary)]">
          Back to pricing →
        </Link>
      </div>
    );
  } else if (!user) {
    const next = `/checkout?plan=${plan}&interval=${interval}`;
    checkoutPanel = (
      <div className="card p-6 text-sm text-[color:var(--body)]">
        <p className="font-medium text-[color:var(--ink)]">Sign in to subscribe</p>
        <p className="mt-2">
          Create an account or sign in to finish subscribing to the {pricing?.name ?? plan} plan.
        </p>
        <Link href={`/auth/login?next=${encodeURIComponent(next)}`} className="btn btn-primary btn-sm mt-4">
          Sign in
        </Link>
      </div>
    );
  } else {
    checkoutPanel = (
      <WhopCheckoutEmbed
        key={`plan-${planId}`}
        planId={planId}
        prefill={{ email: user.email }}
        environment={environment}
        fallback={<CheckoutLoading />}
        {...whopTheme}
        onComplete={() => {
          router.push('/settings/billing?activated=true');
        }}
      />
    );
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="order-1 min-w-0 lg:col-start-2 lg:row-start-1">{checkoutPanel}</div>

      <aside className="card order-2 p-6 lg:col-start-1 lg:row-start-1">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">Order summary</p>

        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[color:var(--ink)]">{pricing?.name ?? plan}</p>
            <p className="mt-1 text-sm text-[color:var(--body)]">{pricing?.blurb}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-normal tracking-[-0.02em]">{pricing ? priceLabel(pricing, interval) : '—'}</p>
            <p className="mt-0.5 text-xs text-[color:var(--muted)]">
              /mo{interval === 'annual' ? ' · billed annually' : ''}
            </p>
          </div>
        </div>

        <ul className="mt-6 space-y-3 border-t border-[var(--card-border)] pt-5 text-sm text-[color:var(--body)]">
          {pricing?.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" strokeWidth={2} aria-hidden="true" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <Link
          href="/pricing"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--primary)] hover:text-[color:var(--primary-active)]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          Compare plans
        </Link>
      </aside>
    </div>
  );
}

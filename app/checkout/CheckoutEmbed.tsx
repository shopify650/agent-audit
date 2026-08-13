'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { WhopCheckoutEmbed } from '@whop/checkout/react';
import { useUser } from '../../lib/auth';
import type { WhopPlan, BillingInterval } from '../../lib/whop';

export default function CheckoutEmbed({
  plan,
  interval,
  planId,
  environment,
}: {
  plan: WhopPlan;
  interval: BillingInterval;
  planId: string | null;
  environment: 'production' | 'sandbox';
}) {
  const user = useUser();
  const router = useRouter();

  if (!planId) {
    return (
      <div className="card p-6 text-sm text-[color:var(--body)]">
        <p className="font-medium text-[color:var(--ink)]">Plan unavailable</p>
        <p className="mt-2">This plan isn’t configured for checkout yet. Please contact support or try again later.</p>
        <Link href="/pricing" className="mt-4 inline-block text-sm font-medium text-[color:var(--primary)]">
          Back to pricing →
        </Link>
      </div>
    );
  }

  if (!user) {
    const next = `/checkout?plan=${plan}&interval=${interval}`;
    return (
      <div className="card p-6 text-sm text-[color:var(--body)]">
        <p className="font-medium text-[color:var(--ink)]">Sign in to subscribe</p>
        <p className="mt-2">
          Create an account or sign in to finish subscribing to the {plan === 'agency' ? 'Agency' : 'Pro'} plan.
        </p>
        <Link href={`/auth/login?next=${encodeURIComponent(next)}`} className="btn btn-primary btn-sm mt-4">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[560px]">
      <WhopCheckoutEmbed
        planId={planId}
        prefill={{ email: user.email }}
        environment={environment}
        onComplete={() => {
          router.push('/settings/billing?activated=true');
        }}
      />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { checkoutUrlForPlan } from '../lib/creem';
import { supabase } from '../lib/supabase';

export type Plan = {
  name: string;
  monthly: number | null;
  blurb: string;
  cta: string;
  href: string;
  checkout?: 'pro' | 'agency';
  featured?: boolean;
  badge?: string;
  soon?: boolean;
  soonFeatures?: string[];
  features: string[];
};

export const plans: Plan[] = [
  {
    name: 'Free',
    monthly: 0,
    blurb: 'For one-off scans and curious developers.',
    cta: 'Start scanning',
    href: '/dashboard/new',
    features: ['3 audits / month', 'Full report & fixes'],
  },
  {
    name: 'Pro',
    monthly: 19,
    blurb: 'For developers and small teams auditing regularly.',
    cta: 'Subscribe',
    href: '/auth/signup',
    checkout: 'pro',
    featured: true,
    badge: 'Most popular',
    features: ['30 audits / month', 'Full site scan (10 pages)', 'Report history & exports', 'Copy-paste fixes', 'Priority support'],
  },
  {
    name: 'Agency',
    monthly: 49,
    blurb: 'For agencies auditing client sites at volume.',
    cta: 'Subscribe',
    href: '/auth/signup',
    checkout: 'agency',
    soonFeatures: ['Team seats'],
    features: ['100 audits / month', 'Full site scan (25 pages)', 'Report history & exports', 'API access & CI integration', 'Team seats', 'Priority support'],
  },
  {
    name: 'Enterprise',
    monthly: null,
    blurb: 'For platforms embedding agent-readiness into CI.',
    cta: 'Coming soon',
    href: '#',
    soon: true,
    features: ['Unlimited audits', 'Full site scan (100 pages)', 'API access & CI integration', 'SLA & compliance', 'Dedicated success'],
  },
];

export default function PricingCards() {
  const [annual, setAnnual] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then((res) => setUserId(res.data.user?.id ?? null));
  }, []);

  const price = (plan: Plan) => {
    if (plan.monthly === null) return 'Custom';
    if (plan.monthly === 0) return '$0';
    return annual ? `$${plan.monthly - 5}` : `$${plan.monthly}`;
  };

  const hrefFor = (plan: Plan): string => {
    if (!plan.checkout) return plan.href;
    if (!userId) return '/auth/signup?next=/pricing';
    return checkoutUrlForPlan(plan.checkout, userId) ?? plan.href;
  };

  return (
    <>
      <div className="mt-12 flex justify-center">
        <div className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--card-border)] bg-[var(--surface-card)] p-1.5">
          {(['monthly', 'annual'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setAnnual(mode === 'annual')}
              className={`rounded-lg px-5 py-2.5 text-sm font-medium transition ${
                (mode === 'annual') === annual ? 'bg-[var(--ink)] text-[color:var(--canvas)]' : 'text-[color:var(--body)] hover:text-[color:var(--ink)]'
              }`}
            >
              {mode === 'annual' ? 'Annual · save $5/mo' : 'Monthly'}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative flex h-full flex-col rounded-2xl border p-8 ${
              plan.featured ? 'border-[var(--ink)] bg-[var(--ink)] text-[color:var(--canvas)]' : 'border-[var(--card-border)] bg-[var(--surface-card)]'
            }`}
          >
            {plan.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--accent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
                {plan.badge}
              </span>
            )}
            <p className={`text-sm font-medium ${plan.featured ? 'text-[color:var(--canvas)]' : 'text-[color:var(--ink)]'}`}>{plan.name}</p>
            <div className="mt-5 flex items-baseline gap-1.5">
              <span className="text-5xl font-normal tracking-[-0.03em]">{price(plan)}</span>
              {plan.monthly !== null && plan.monthly !== 0 && (
                <span className={`text-sm ${plan.featured ? 'text-[color:var(--canvas)]/70' : 'text-[color:var(--muted)]'}`}>
                  /mo{annual ? ', billed annually' : ''}
                </span>
              )}
            </div>
            <p className={`mt-3 text-sm ${plan.featured ? 'text-[color:var(--canvas)]/80' : 'text-[color:var(--muted)]'}`}>{plan.blurb}</p>
            <ul className={`mt-8 flex-1 space-y-3.5 border-t pt-6 text-sm ${plan.featured ? 'border-[var(--canvas)]/15 text-[color:var(--canvas)]/90' : 'border-[var(--card-border)] text-[color:var(--body)]'}`}>
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check className={`mt-0.5 h-4 w-4 shrink-0 ${plan.featured ? 'text-[var(--accent)]' : 'text-[var(--accent)]'}`} strokeWidth={2} aria-hidden="true" />
                  <span>{f}</span>
                  {plan.soonFeatures?.includes(f) && (
                    <span className="ml-auto shrink-0 rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
                      Soon
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {plan.soon ? (
              <button disabled className="btn btn-secondary btn-sm mt-8 w-full cursor-not-allowed opacity-60">
                {plan.cta}
              </button>
            ) : plan.featured ? (
              <Link href={hrefFor(plan)} className="btn btn-accent btn-sm mt-8 w-full">
                <span className="btn-chip">
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                </span>
                {plan.cta}
              </Link>
            ) : (
              <Link href={hrefFor(plan)} className="btn btn-secondary btn-sm mt-8 w-full">
                {plan.cta}
              </Link>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

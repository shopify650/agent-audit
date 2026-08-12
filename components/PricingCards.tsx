'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { useUser } from '../lib/auth';
import { checkoutHref } from '../lib/whop';
import { PLANS, priceLabel, annualSavings, planPrice, type PlanPricing, type PricingInterval } from '../lib/pricing';

export type Plan = PlanPricing;

export { PLANS as plans };

export default function PricingCards() {
  const [annual, setAnnual] = useState(true);
  const user = useUser();
  const interval: PricingInterval = annual ? 'annual' : 'monthly';
  const savings = annualSavings(PLANS.find((p) => p.id === 'pro') ?? PLANS[1]);

  const hrefFor = (plan: PlanPricing): string => {
    if (!plan.checkout) return plan.href;
    const target = checkoutHref(plan.checkout, interval);
    if (!user) return `/auth/signup?next=${encodeURIComponent(target)}`;
    return target;
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
                (mode === 'annual') === annual
                  ? 'bg-[var(--ink)] text-[color:var(--canvas)]'
                  : 'text-[color:var(--body)] hover:text-[color:var(--ink)]'
              }`}
            >
              {mode === 'annual' ? (savings && savings > 0 ? `Annual · save $${savings}/mo` : 'Annual') : 'Monthly'}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const price = planPrice(plan, interval);
          return (
            <div
              key={plan.name}
              className={`relative flex h-full flex-col rounded-2xl border p-8 ${
                plan.featured
                  ? 'border-[var(--ink)] bg-[var(--ink)] text-[color:var(--canvas)]'
                  : 'border-[var(--card-border)] bg-[var(--surface-card)]'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--accent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
                  {plan.badge}
                </span>
              )}
              <p
                className={`text-sm font-medium ${plan.featured ? 'text-[color:var(--canvas)]' : 'text-[color:var(--ink)]'}`}
              >
                {plan.name}
              </p>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-5xl font-normal tracking-[-0.03em]">{priceLabel(plan, interval)}</span>
                {price !== null && price > 0 && (
                  <span className={`text-sm ${plan.featured ? 'text-[color:var(--canvas)]/70' : 'text-[color:var(--muted)]'}`}>
                    /mo{annual ? ', billed annually' : ''}
                  </span>
                )}
              </div>
              <p
                className={`mt-3 text-sm ${plan.featured ? 'text-[color:var(--canvas)]/80' : 'text-[color:var(--muted)]'}`}
              >
                {plan.blurb}
              </p>
              <ul
                className={`mt-8 flex-1 space-y-3.5 border-t pt-6 text-sm ${plan.featured ? 'border-[var(--canvas)]/15 text-[color:var(--canvas)]/90' : 'border-[var(--card-border)] text-[color:var(--body)]'}`}
              >
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check
                      className={`mt-0.5 h-4 w-4 shrink-0 ${plan.featured ? 'text-[var(--accent)]' : 'text-[var(--accent)]'}`}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
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
          );
        })}
      </div>
    </>
  );
}

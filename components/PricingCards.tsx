'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { checkoutHref } from '../lib/whop';
import { PLANS, priceLabel, annualSavings, planPrice, type PlanPricing, type PricingInterval } from '../lib/pricing';

export type Plan = PlanPricing;

export { PLANS as plans };

export default function PricingCards() {
  const [annual, setAnnual] = useState(true);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const router = useRouter();
  const interval: PricingInterval = annual ? 'annual' : 'monthly';
  const savings = annualSavings(PLANS.find((p) => p.id === 'pro') ?? PLANS[1]);

  const targetFor = (plan: PlanPricing): string => {
    if (!plan.checkout) return plan.href;
    return checkoutHref(plan.checkout, interval);
  };

  const handleCheckout = async (plan: PlanPricing) => {
    if (!plan.checkout) {
      router.push(plan.href);
      return;
    }
    const target = targetFor(plan);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      router.push(`/auth/signup?next=${encodeURIComponent(target)}`);
      return;
    }
    setBusyPlan(plan.id);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan: plan.checkout, interval }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data?.sessionId === 'string' && data.sessionId) {
        router.push(
          `/checkout?session=${encodeURIComponent(data.sessionId)}&plan=${plan.checkout}&interval=${interval}`,
        );
      } else {
        router.push(target);
      }
    } catch {
      router.push(target);
    } finally {
      setBusyPlan(null);
    }
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
              ) : plan.checkout ? (
                <button
                  onClick={() => handleCheckout(plan)}
                  disabled={busyPlan === plan.id}
                  className={`btn ${plan.featured ? 'btn-accent' : 'btn-secondary'} btn-sm mt-8 w-full ${
                    busyPlan === plan.id ? 'cursor-not-allowed opacity-60' : ''
                  }`}
                >
                  {plan.featured && (
                    <span className="btn-chip">
                      <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                    </span>
                  )}
                  {busyPlan === plan.id ? 'Starting checkout…' : plan.cta}
                </button>
              ) : (
                <Link href={targetFor(plan)} className="btn btn-secondary btn-sm mt-8 w-full">
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

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ChevronDown, Minus } from 'lucide-react';
import { checkoutUrlForPlan } from '../../lib/creem';
import { supabase } from '../../lib/supabase';

type Plan = {
  name: string;
  monthly: number | null;
  blurb: string;
  cta: string;
  href: string;
  checkout?: 'pro' | 'agency';
  featured?: boolean;
  badge?: string;
  features: string[];
};

const plans: Plan[] = [
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
    features: ['100 audits / month', 'Full site scan (25 pages)', 'Report history & exports', 'API access & CI integration', 'Team seats', 'Priority support'],
  },
  {
    name: 'Enterprise',
    monthly: null,
    blurb: 'For platforms embedding agent-readiness into CI.',
    cta: 'Let’s talk about it',
    href: '/auth/signup',
    features: ['Unlimited audits', 'Full site scan (100 pages)', 'API access & CI integration', 'SLA & compliance', 'Dedicated success'],
  },
];

const includes = [
  'Full DOM and ARIA audit report',
  'Copy-paste fixes for each finding',
  'Dashboard history and export tools',
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
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
    <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">Pricing</p>
        <h1 className="mt-4 text-5xl font-normal tracking-[-0.03em]">Simple plans for every team.</h1>
        <p className="mt-5 text-lg leading-8 text-[color:var(--body)]">
          Start free. Upgrade when you&apos;re auditing enough sites to want history, exports, and teammates.
        </p>
      </div>

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
                </li>
              ))}
            </ul>
            {plan.featured ? (
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

      <div className="mt-8 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-card)] p-6">
        <p className="text-center text-sm font-medium text-[color:var(--ink)]">Every plan includes</p>
        <ul className="mt-4 flex flex-col items-center justify-center gap-x-8 gap-y-3 text-sm text-[color:var(--body)] md:flex-row">
          {includes.map((item) => (
            <li key={item} className="flex items-center gap-2.5">
              <Check className="h-4 w-4 shrink-0 text-[var(--accent)]" strokeWidth={2} aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-auto mt-24 max-w-4xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">Compare</p>
          <h2 className="mt-4 text-4xl font-normal tracking-[-0.02em]">Every plan, side by side.</h2>
          <p className="mt-4 text-lg leading-8 text-[color:var(--body)]">Pick what fits your workflow today — upgrade whenever you need history, volume, or teammates.</p>
        </div>
        <div className="mt-12 overflow-hidden rounded-2xl border border-[var(--card-border)]">
          <table className="w-full border-collapse bg-[var(--surface-card)] text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)]">
                <th className="w-[28%] px-6 py-5 text-left font-medium text-[color:var(--muted)]">Feature</th>
                <th className="w-[18%] px-6 py-5 text-center font-medium text-[color:var(--ink)]">Free</th>
                <th className="w-[18%] bg-[var(--ink)] px-6 py-5 text-center font-medium text-[color:var(--canvas)]">Pro</th>
                <th className="w-[18%] px-6 py-5 text-center font-medium text-[color:var(--ink)]">Agency</th>
                <th className="w-[18%] px-6 py-5 text-center font-medium text-[color:var(--ink)]">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {[
                { feature: 'Audits per month', free: '3', pro: '30', agency: '100', enterprise: 'Unlimited' },
                { feature: 'Full DOM & ARIA report', free: true, pro: true, agency: true, enterprise: true },
                { feature: 'Copy-paste fixes', free: true, pro: true, agency: true, enterprise: true },
                { feature: 'Report history & exports', free: false, pro: true, agency: true, enterprise: true },
                { feature: 'Team seats', free: '1', pro: 'Up to 3', agency: 'Up to 10', enterprise: 'Unlimited' },
                { feature: 'API access & CI integration', free: false, pro: false, agency: true, enterprise: true },
                { feature: 'SLA & compliance', free: false, pro: false, agency: false, enterprise: true },
                { feature: 'Dedicated success', free: false, pro: false, agency: false, enterprise: true },
              ].map((row: any, i) => (
                <tr key={row.feature} className={i % 2 ? 'bg-[var(--surface-white)]' : ''}>
                  <td className="px-6 py-4 font-medium text-[color:var(--ink)]">{row.feature}</td>
                  <td className="px-6 py-4 text-center text-[color:var(--body)]">
                    {typeof row.free === 'boolean' ? <ValueIcon present={row.free} /> : row.free}
                  </td>
                  <td className="bg-[var(--ink)] px-6 py-4 text-center text-[color:var(--canvas)]">
                    {typeof row.pro === 'boolean' ? <ValueIcon present={row.pro} /> : row.pro}
                  </td>
                  <td className="px-6 py-4 text-center text-[color:var(--body)]">
                    {typeof row.agency === 'boolean' ? <ValueIcon present={row.agency} /> : row.agency}
                  </td>
                  <td className="px-6 py-4 text-center text-[color:var(--body)]">
                    {typeof row.enterprise === 'boolean' ? <ValueIcon present={row.enterprise} /> : row.enterprise}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-center text-sm text-[color:var(--muted)]">Every plan includes the full audit engine. Paid plans add history, exports, and more monthly audits.</p>
      </div>

      <div className="mx-auto mt-24 max-w-3xl">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">FAQ</p>
          <h2 className="mt-4 text-4xl font-normal tracking-[-0.02em]">Questions, answered.</h2>
        </div>
        <div className="mt-12 divide-y divide-[var(--card-border)] overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--surface-card)]">
          {[
            {
              q: 'What counts as a scan?',
              a: 'One URL audited end-to-end: fetch, DOM parse, and a full report. Reruns count as new scans.',
            },
            {
              q: 'Do you store the pages I scan?',
              a: 'Reports live in your account history. We never republish or share scanned content.',
            },
            {
              q: 'Can I switch plans anytime?',
              a: 'Yes. Downgrading is instant and you keep access to everything you have already scanned.',
            },
            {
              q: 'Is there a free trial for Pro or Agency?',
              a: 'Pro and Agency are billed through Creem. Your plan activates instantly once the subscription is confirmed, and you can cancel anytime from the customer portal.',
            },
            {
              q: 'Can I integrate audits into CI?',
              a: 'Enterprise plans expose the full API, so you can run audits in GitHub Actions or your own pipelines.',
            },
            {
              q: 'What if I need more audits?',
              a: 'Enterprise is fully custom — tell us about your volume and we’ll tailor a plan around it.',
            },
          ].map((item, i) => {
            const open = openFaq === i;
            return (
              <div key={item.q}>
                <button
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-7 py-5 text-left transition hover:bg-[var(--canvas-soft)]/60"
                  aria-expanded={open}
                >
                  <span className="font-medium text-[color:var(--ink)]">{item.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-[color:var(--muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </button>
                <div className={`grid transition-all duration-200 ease-in-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <p className="px-7 pb-6 text-sm leading-6 text-[color:var(--body)]">{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ValueIcon({ present }: { present: boolean }) {
  return present ? (
    <Check className="mx-auto h-4 w-4 text-[var(--success)]" strokeWidth={2} aria-hidden="true" />
  ) : (
    <Minus className="mx-auto h-4 w-4 text-[color:var(--muted-soft)]" strokeWidth={2} aria-hidden="true" />
  );
}

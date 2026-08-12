import { PLAN_LABELS, PLAN_LIMITS, SCAN_PAGES, SCAN_FEE, type PlanKey } from './plans';

export type PricingInterval = 'monthly' | 'annual';

export type PlanPricing = {
  id: PlanKey;
  name: string;
  blurb: string;
  cta: string;
  href: string;
  checkout?: 'pro' | 'agency';
  priceMonthly: number | null;
  priceAnnual: number | null;
  featured?: boolean;
  badge?: string;
  soon?: boolean;
  soonFeatures?: string[];
  features: string[];
};

export const PLANS: PlanPricing[] = [
  {
    id: 'free',
    name: PLAN_LABELS.free,
    blurb: 'For one-off scans and curious developers.',
    cta: 'Start scanning',
    href: '/dashboard/new',
    priceMonthly: 0,
    priceAnnual: 0,
    features: ['3 audits / month', 'Full report & fixes'],
  },
  {
    id: 'pro',
    name: PLAN_LABELS.pro,
    blurb: 'For developers and small teams auditing regularly.',
    cta: 'Subscribe',
    href: '/auth/signup',
    checkout: 'pro',
    priceMonthly: 19,
    priceAnnual: 14,
    featured: true,
    badge: 'Most popular',
    features: ['30 audits / month', 'Full site scan (10 pages)', 'Report history & exports', 'Copy-paste fixes', 'Priority support'],
  },
  {
    id: 'agency',
    name: PLAN_LABELS.agency,
    blurb: 'For agencies auditing client sites at volume.',
    cta: 'Subscribe',
    href: '/auth/signup',
    checkout: 'agency',
    priceMonthly: 49,
    priceAnnual: 44,
    soonFeatures: ['Team seats'],
    features: ['100 audits / month', 'Full site scan (25 pages)', 'Report history & exports', 'API access & CI integration', 'Team seats', 'Priority support'],
  },
  {
    id: 'enterprise',
    name: PLAN_LABELS.enterprise,
    blurb: 'For platforms embedding agent-readiness into CI.',
    cta: 'Coming soon',
    href: '#',
    priceMonthly: null,
    priceAnnual: null,
    soon: true,
    features: ['Unlimited audits', 'Full site scan (100 pages)', 'API access & CI integration', 'SLA & compliance', 'Dedicated success'],
  },
];

export function planPricing(id: PlanKey): PlanPricing | undefined {
  return PLANS.find((plan) => plan.id === id);
}

export function planPrice(plan: PlanPricing, interval: PricingInterval): number | null {
  if (plan.priceMonthly === null || plan.priceAnnual === null) return null;
  return interval === 'annual' ? plan.priceAnnual : plan.priceMonthly;
}

export function priceLabel(plan: PlanPricing, interval: PricingInterval): string {
  const price = planPrice(plan, interval);
  if (price === null) return 'Custom';
  if (price === 0) return '$0';
  return `$${price}`;
}

export function annualSavings(plan: PlanPricing): number | null {
  if (plan.priceMonthly === null || plan.priceAnnual === null || plan.priceMonthly <= 0) return null;
  return plan.priceMonthly - plan.priceAnnual;
}

export function planQuota(id: PlanKey): number {
  return PLAN_LIMITS[id];
}

export function planScanPages(id: PlanKey): number {
  return SCAN_PAGES[id];
}

export function planScanFee(id: PlanKey): number {
  return SCAN_FEE[id];
}

export function quotaLabel(id: PlanKey): string {
  const limit = PLAN_LIMITS[id];
  return Number.isFinite(limit) ? String(limit) : 'Unlimited';
}

export function scanPagesLabel(id: PlanKey): string {
  const pages = SCAN_PAGES[id];
  return pages > 0 ? `${pages} pages` : '—';
}

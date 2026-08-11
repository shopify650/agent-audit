export type PlanKey = 'free' | 'pro' | 'agency' | 'enterprise';

export const PLAN_LIMITS: Record<PlanKey, number> = {
  free: 3,
  pro: 30,
  agency: 100,
  enterprise: Number.POSITIVE_INFINITY,
};

export const SCAN_PAGES: Record<PlanKey, number> = {
  free: 0,
  pro: 10,
  agency: 25,
  enterprise: 100,
};

export const SCAN_FEE: Record<PlanKey, number> = {
  free: 0,
  pro: 2,
  agency: 5,
  enterprise: 10,
};

export const PLAN_LABELS: Record<PlanKey, string> = {
  free: 'Free',
  pro: 'Pro',
  agency: 'Agency',
  enterprise: 'Enterprise',
};

export function planKeyOf(value?: string | null): PlanKey {
  const key = (value || '').toLowerCase();
  if (key === 'solo') return 'free';
  return key in PLAN_LIMITS ? (key as PlanKey) : 'free';
}

export function planLimit(value?: string | null): number {
  return PLAN_LIMITS[planKeyOf(value)];
}

export function scanPages(value?: string | null): number {
  return SCAN_PAGES[planKeyOf(value)];
}

export function scanFee(value?: string | null): number {
  return SCAN_FEE[planKeyOf(value)];
}

export function canSiteScan(value?: string | null): boolean {
  return scanPages(value) > 0;
}

export function isUnlimited(value?: string | null): boolean {
  return !Number.isFinite(planLimit(value));
}

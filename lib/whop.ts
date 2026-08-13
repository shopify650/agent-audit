import type { PlanKey } from './plans';
import { PLAN_LIMITS } from './plans';
export type { PlanKey };

export type WhopPlan = 'pro' | 'agency';
export type BillingInterval = 'monthly' | 'annual';

export function whopPlanId(plan: WhopPlan, interval: BillingInterval): string | null {
  const envKey =
    interval === 'annual'
      ? `NEXT_PUBLIC_WHOP_${plan.toUpperCase()}_ANNUAL_PLAN_ID`
      : `NEXT_PUBLIC_WHOP_${plan.toUpperCase()}_MONTHLY_PLAN_ID`;
  const value = process.env[envKey];
  return value ? value.trim() : null;
}

export function whopPlanKeyFromId(planId: string | null | undefined): PlanKey | null {
  if (!planId) return null;
  const normalized = planId.trim();
  const lookup: Record<string, PlanKey> = {
    [process.env.NEXT_PUBLIC_WHOP_PRO_MONTHLY_PLAN_ID?.trim() ?? '']: 'pro',
    [process.env.NEXT_PUBLIC_WHOP_PRO_ANNUAL_PLAN_ID?.trim() ?? '']: 'pro',
    [process.env.NEXT_PUBLIC_WHOP_AGENCY_MONTHLY_PLAN_ID?.trim() ?? '']: 'agency',
    [process.env.NEXT_PUBLIC_WHOP_AGENCY_ANNUAL_PLAN_ID?.trim() ?? '']: 'agency',
  };
  return lookup[normalized] ?? null;
}

export function planQuotaFor(plan: PlanKey): number {
  return PLAN_LIMITS[plan];
}

export function checkoutHref(plan: WhopPlan, interval: BillingInterval = 'annual'): string {
  return `/checkout?plan=${plan}&interval=${interval}`;
}

export function whopManageUrl(memberId?: string | null, managementUrl?: string | null): string | null {
  if (managementUrl) return managementUrl;
  if (memberId) return `https://whop.com/membership/${memberId}`;
  return 'https://whop.com/account';
}

export function whopEnvironment(): 'production' | 'sandbox' {
  return process.env.NEXT_PUBLIC_WHOP_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'production';
}

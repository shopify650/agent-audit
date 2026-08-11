import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlanKey } from './plans';
import { monthKey } from './usage';
import { creemPlanToKey, type CreemSubscriptionStatus } from './creem';

export type BillingProfile = {
  id: string;
  creem_subscription_id: string | null;
  creem_customer_id: string | null;
  plan_type: string;
  subscription_status: string;
  monthly_audit_quota: number;
  audits_used_this_month: number;
  usage_month: string | null;
  subscription_period_end: string | null;
  updated_at: string | null;
};

export function planKeyFromProfile(profile: BillingProfile | null | undefined): PlanKey {
  return creemPlanToKey(profile?.plan_type);
}

export function effectiveAuditsUsed(profile: BillingProfile | null | undefined): number {
  if (!profile) return 0;
  return profile.usage_month === monthKey() ? profile.audits_used_this_month : 0;
}

export async function getBillingProfile(client: SupabaseClient, userId: string): Promise<BillingProfile | null> {
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as BillingProfile;
}

export async function incrementAuditsUsed(client: SupabaseClient, userId: string): Promise<void> {
  await client.rpc('increment_audits_used', { p_user_id: userId });
}

export function subscriptionStatusLabel(status: string | null): string {
  const map: Record<string, string> = {
    active: 'Active',
    past_due: 'Past due',
    cancelled: 'Cancelled',
    trialing: 'Trial',
    expired: 'Expired',
    paused: 'Paused',
  };
  return map[status ?? ''] ?? 'Active';
}

export type { CreemSubscriptionStatus };

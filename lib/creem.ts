import type { PlanKey } from './plans';
import { PLAN_LIMITS } from './plans';

export type CreemSubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'trialing'
  | 'expired'
  | 'paused';

export function planQuotaFor(plan: PlanKey): number {
  return PLAN_LIMITS[plan];
}

export function creemPlanToKey(plan: string | null | undefined): PlanKey {
  const key = (plan || '').toLowerCase();
  if (key === 'pro' || key === 'agency' || key === 'enterprise') return key;
  return 'free';
}

export function planForCreemProduct(productId: string | null | undefined, amountCents?: number | null): PlanKey | null {
  const proId = process.env.CREEM_PRO_PRODUCT_ID;
  const agencyId = process.env.CREEM_AGENCY_PRODUCT_ID;

  if (productId) {
    if (proId && productId === proId) return 'pro';
    if (agencyId && productId === agencyId) return 'agency';
  }

  if (typeof amountCents === 'number' && Number.isFinite(amountCents)) {
    if (amountCents === 1400 || amountCents === 1900) return 'pro';
    if (amountCents === 4400 || amountCents === 4900) return 'agency';
  }

  return null;
}

function appendQuery(baseUrl: string, key: string, value: string): string {
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

export type BillingInterval = 'monthly' | 'annual';

export function checkoutUrlForPlan(
  plan: PlanKey,
  userId?: string | null,
  interval: BillingInterval = 'monthly',
): string | null {
  const monthly =
    plan === 'pro'
      ? process.env.NEXT_PUBLIC_CREEM_PRO_URL
      : plan === 'agency'
        ? process.env.NEXT_PUBLIC_CREEM_AGENCY_URL
        : undefined;
  const annual =
    plan === 'pro'
      ? process.env.NEXT_PUBLIC_CREEM_PRO_ANNUAL_URL
      : plan === 'agency'
        ? process.env.NEXT_PUBLIC_CREEM_AGENCY_ANNUAL_URL
        : undefined;
  const baseUrl = interval === 'annual' ? annual ?? monthly : monthly;
  if (!baseUrl) return null;
  if (!userId) return baseUrl;
  return appendQuery(baseUrl, 'custom_field_user_id', userId);
}

export function customerPortalUrl(): string | null {
  const storeId = process.env.NEXT_PUBLIC_CREEM_STORE_ID;
  if (!storeId) return null;
  return `https://creem.io/portal/${storeId}`;
}

type AnyRecord = Record<string, unknown>;

function findString(container: unknown, keys: string[]): string | null {
  if (!container || typeof container !== 'object') return null;
  for (const key of keys) {
    const value = (container as AnyRecord)[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

export function extractUserIdFromEvent(object: unknown): string | null {
  if (!object || typeof object !== 'object') return null;
  const root = object as AnyRecord;

  const direct = findString(root, ['userId', 'user_id', 'referenceId', 'reference_id', 'internal_customer_id']);
  if (direct) return direct;

  const metadata = root.metadata;
  if (metadata && typeof metadata === 'object') {
    const fromMetadata = findString(metadata, ['userId', 'user_id', 'referenceId', 'reference_id', 'internal_customer_id', 'custom_data']);
    if (fromMetadata) return fromMetadata;
  }

  const subscription = root.subscription;
  if (subscription && typeof subscription === 'object') {
    const subMeta = (subscription as AnyRecord).metadata;
    if (subMeta && typeof subMeta === 'object') {
      const fromSubMeta = findString(subMeta, ['userId', 'user_id', 'referenceId', 'reference_id', 'internal_customer_id', 'custom_data']);
      if (fromSubMeta) return fromSubMeta;
    }
  }

  if (Array.isArray(root.custom_fields)) {
    for (const field of root.custom_fields) {
      if (!field || typeof field !== 'object') continue;
      const name = findString(field, ['name', 'key', 'id']);
      const value = findString(field, ['value']);
      if (name && value) {
        const normalized = name.toLowerCase();
        if (normalized.includes('user_id') || normalized.includes('userid') || normalized.includes('reference')) {
          return value;
        }
      }
    }
  }

  const requestId = findString(root, ['request_id', 'requestId']);
  return requestId;
}

export function periodEndFromEvent(object: unknown, fallbackAnchor?: string | null): string | null {
  if (!object || typeof object !== 'object') return null;
  const root = object as AnyRecord;
  const subscription = root.subscription as AnyRecord | undefined;

  for (const candidate of [
    subscription?.current_period_end,
    root.current_period_end,
    subscription?.billing_cycle_anchor,
    root.billing_cycle_anchor,
  ]) {
    if (typeof candidate === 'number' && candidate > 0) {
      return new Date(candidate * 1000).toISOString();
    }
    if (typeof candidate === 'string' && candidate) {
      const parsed = new Date(candidate);
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    }
  }

  const anchor = findString(subscription ?? {}, ['created_at']) ?? fallbackAnchor;
  if (anchor) {
    const parsed = new Date(anchor);
    if (!Number.isNaN(parsed.getTime())) {
      const next = new Date(parsed);
      next.setMonth(next.getMonth() + 1);
      return next.toISOString();
    }
  }
  return null;
}

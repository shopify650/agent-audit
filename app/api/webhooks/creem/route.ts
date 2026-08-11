import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  extractUserIdFromEvent,
  planForCreemProduct,
  periodEndFromEvent,
  planQuotaFor,
  type CreemSubscriptionStatus,
} from '../../../../lib/creem';
import type { PlanKey } from '../../../../lib/plans';

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const expected = Buffer.from(computed, 'hex');
  const provided = Buffer.from(signature, 'hex');
  if (expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(expected, provided);
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function syncUserMetadata(client: ReturnType<typeof serviceClient>, userId: string, plan: PlanKey) {
  if (!client) return;
  const { data, error } = await client.auth.admin.getUserById(userId);
  if (error || !data.user) return;
  const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
  await client.auth.admin.updateUserById(userId, { user_metadata: { ...meta, plan } });
}

async function grantAccess(client: ReturnType<typeof serviceClient>, object: any) {
  const userId = extractUserIdFromEvent(object);
  if (!userId || !client) {
    console.warn('[creem] grant access skipped: missing userId or service client', { userId });
    return;
  }

  const subscriptionId =
    (typeof object?.subscription === 'object' ? object.subscription.id : null) ?? object?.id ?? null;
  const customerId = (typeof object?.customer === 'object' ? object.customer.id : null) ?? null;
  const productId =
    (typeof object?.subscription === 'object' && typeof object.subscription.product === 'string'
      ? object.subscription.product
      : null) ?? (typeof object?.product === 'object' ? object.product.id : null) ?? object?.product ?? null;
  const amountCents =
    (typeof object?.product === 'object' && typeof object.product.price === 'number' ? object.product.price : null) ??
    (typeof object?.order === 'object' && typeof object.order.amount === 'number' ? object.order.amount : null) ??
    null;

  const plan = planForCreemProduct(typeof productId === 'string' ? productId : null, amountCents);
  if (!plan) {
    console.warn('[creem] grant access skipped: unknown product', { productId, amountCents });
    return;
  }

  const periodEnd = periodEndFromEvent(object);
  const { error } = await client.from('profiles').upsert(
    {
      id: userId,
      creem_subscription_id: subscriptionId,
      creem_customer_id: customerId,
      plan_type: plan,
      subscription_status: 'active',
      monthly_audit_quota: planQuotaFor(plan),
      audits_used_this_month: 0,
      usage_month: currentMonth(),
      subscription_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

  if (error) {
    console.error('[creem] grant access failed:', error.message);
    return;
  }
  await syncUserMetadata(client, userId, plan);
  console.log(`[creem] granted ${plan} to ${userId} (${subscriptionId})`);
}

async function revokeAccess(client: ReturnType<typeof serviceClient>, object: any, status: CreemSubscriptionStatus) {
  const userId = extractUserIdFromEvent(object);
  if (!userId || !client) {
    console.warn('[creem] revoke access skipped: missing userId or service client', { userId });
    return;
  }

  const { error } = await client
    .from('profiles')
    .upsert(
      {
        id: userId,
        plan_type: 'free',
        subscription_status: status,
        monthly_audit_quota: planQuotaFor('free'),
        audits_used_this_month: 0,
        usage_month: currentMonth(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

  if (error) {
    console.error('[creem] revoke access failed:', error.message);
    return;
  }
  await syncUserMetadata(client, userId, 'free');
  console.log(`[creem] revoked ${userId} -> free (${status})`);
}

async function markPastDue(client: ReturnType<typeof serviceClient>, object: any) {
  const userId = extractUserIdFromEvent(object);
  if (!userId || !client) return;
  await client
    .from('profiles')
    .update({ subscription_status: 'past_due', updated_at: new Date().toISOString() })
    .eq('id', userId);
}

async function reconcile(client: ReturnType<typeof serviceClient>, object: any) {
  const userId = extractUserIdFromEvent(object);
  if (!userId || !client) return;
  const subscription = typeof object?.subscription === 'object' ? object.subscription : object;
  const productId = typeof subscription?.product === 'string' ? subscription.product : null;
  const amountCents =
    (typeof object?.product === 'object' && typeof object.product.price === 'number' ? object.product.price : null) ??
    (typeof object?.order === 'object' && typeof object.order.amount === 'number' ? object.order.amount : null) ??
    null;
  const plan = planForCreemProduct(productId, amountCents);
  if (!plan) return;

  const status: CreemSubscriptionStatus =
    typeof subscription?.status === 'string' ? (subscription.status as CreemSubscriptionStatus) : 'active';

  await client
    .from('profiles')
    .upsert(
      {
        id: userId,
        creem_subscription_id: typeof subscription?.id === 'string' ? subscription.id : null,
        plan_type: plan,
        subscription_status: status === 'active' ? 'active' : status,
        monthly_audit_quota: planQuotaFor(plan),
        audits_used_this_month: 0,
        usage_month: currentMonth(),
        subscription_period_end: periodEndFromEvent(object),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
  await syncUserMetadata(client, userId, plan);
  console.log(`[creem] reconciled ${userId} -> ${plan} (${status})`);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature =
    request.headers.get('creem-signature') ?? request.headers.get('x-creem-signature') ?? '';
  const secret = process.env.CREEM_WEBHOOK_SECRET ?? '';

  if (!secret) {
    return NextResponse.json({ error: 'CREEM_WEBHOOK_SECRET is not configured' }, { status: 500 });
  }
  if (!signature || !verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const eventType: string = payload.eventType ?? payload.type ?? '';
  const object = payload.object ?? payload.data ?? payload;
  const client = serviceClient();

  try {
    switch (eventType) {
      case 'subscription.active':
      case 'subscription.paid':
      case 'subscription.trialing':
      case 'checkout.completed':
        await grantAccess(client, object);
        break;

      case 'subscription.update':
        await reconcile(client, object);
        break;

      case 'subscription.past_due':
        await markPastDue(client, object);
        break;

      case 'subscription.canceled':
        await revokeAccess(client, object, 'cancelled');
        break;

      case 'subscription.expired':
        await revokeAccess(client, object, 'expired');
        break;

      case 'subscription.paused':
        await revokeAccess(client, object, 'paused');
        break;

      default:
        console.log(`[creem] unhandled event: ${eventType}`);
    }
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[creem] webhook handler error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

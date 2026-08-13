import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { whopPlanKeyFromId, planQuotaFor, whopManageUrl, type PlanKey } from '../../../../lib/whop';

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

function candidateSecretKeys(secret: string): Buffer[] {
  const keys: Buffer[] = [];
  const stripped = secret.replace(/^wh?_?/i, '');

  const add = (buf: Buffer | undefined) => {
    if (buf && buf.length > 0) keys.push(buf);
  };

  add(Buffer.from(secret, 'utf8'));
  if (stripped !== secret) add(Buffer.from(stripped, 'utf8'));
  for (const encoded of [secret, stripped]) {
    add(Buffer.from(encoded, 'base64'));
    try {
      add(Buffer.from(encoded, 'base64url'));
    } catch {
      // base64url variant may throw on some Node versions; ignore
    }
  }
  return keys;
}

function base64ToBuffer(value: string): Buffer {
  let clean = value.replace(/-/g, '+').replace(/_/g, '/');
  while (clean.length % 4 !== 0) clean += '=';
  return Buffer.from(clean, 'base64');
}

function verifySignature(rawBody: string, id: string, ts: string, sigHeader: string, secret: string): boolean {
  if (!id || !ts || !sigHeader || !secret) return false;

  const message = `${id}.${ts}.${rawBody}`;
  const provided = sigHeader
    .split(',')
    .map((part) => part.trim().replace(/^v\d+\s*/, ''))
    .filter((candidate) => candidate.length > 0);

  if (provided.length === 0) return false;

  for (const secretBytes of candidateSecretKeys(secret)) {
    const digest = crypto.createHmac('sha256', secretBytes).update(message).digest();
    for (const candidate of provided) {
      try {
        const decoded = base64ToBuffer(candidate);
        if (decoded.length === digest.length && crypto.timingSafeEqual(decoded, digest)) {
          return true;
        }
      } catch {
        // malformed base64; try the next candidate
      }
    }
  }
  return false;
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

function findNestedId(container: unknown, key: string): string | null {
  if (!container || typeof container !== 'object') return null;
  const value = (container as AnyRecord)[key];
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value && typeof value === 'object') {
    const id = (value as AnyRecord).id;
    if (typeof id === 'string' && id.trim()) return id.trim();
  }
  return null;
}

function extractEmail(object: unknown): string | null {
  if (!object || typeof object !== 'object') return null;
  const root = object as AnyRecord;
  const direct = findString(root, ['email', 'buyer_email', 'customer_email']);
  if (direct) return direct.toLowerCase();

  const customer = root.customer;
  if (customer && typeof customer === 'object') {
    const fromCustomer = findString(customer, ['email', 'buyer_email']);
    if (fromCustomer) return fromCustomer.toLowerCase();
  }

  const buyer = root.buyer;
  if (buyer && typeof buyer === 'object') {
    const fromBuyer = findString(buyer, ['email']);
    if (fromBuyer) return fromBuyer.toLowerCase();
  }

  const user = root.user;
  if (user && typeof user === 'object') {
    const fromUser = findString(user, ['email']);
    if (fromUser) return fromUser.toLowerCase();
  }
  return null;
}

function findMetadataUserId(object: AnyRecord): string | null {
  const metadata = object.metadata;
  if (metadata && typeof metadata === 'object') {
    const fromMeta = findString(metadata, ['userId', 'user_id', 'referenceId']);
    if (fromMeta) return fromMeta;
  }
  return findString(object, ['userId', 'user_id', 'referenceId']);
}

function parseWhopDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n <= 0) return null;
    return new Date(n > 1e12 ? n : n * 1000).toISOString();
  }
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function resolveUserId(
  client: ReturnType<typeof serviceClient>,
  object: AnyRecord,
): Promise<string | null> {
  // 1. Authoritative link set on the checkout session metadata at purchase time.
  const metadataUserId = findMetadataUserId(object);
  if (metadataUserId) return metadataUserId;

  // 2. Email match
  const email = extractEmail(object);
  if (email && client) {
    const { data } = await (client.schema('auth').from('users') as any)
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }

  // 3. whop_user_id match (from data.user.id)
  const whopUserId = findNestedId(object, 'user');
  if (whopUserId && client) {
    const { data } = await client
      .from('profiles')
      .select('id')
      .eq('whop_user_id', whopUserId)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  // 4. whop_member_id match
  const memberId = findString(object, ['id', 'membership_id', 'membershipId']);
  if (memberId && client) {
    const { data } = await client
      .from('profiles')
      .select('id')
      .eq('whop_member_id', memberId)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  return null;
}

async function syncUserMetadata(client: ReturnType<typeof serviceClient>, userId: string, plan: PlanKey) {
  if (!client) return;
  const { data, error } = await client.auth.admin.getUserById(userId);
  if (error || !data.user) return;
  const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
  await client.auth.admin.updateUserById(userId, { user_metadata: { ...meta, plan } });
}

async function grantAccess(client: ReturnType<typeof serviceClient>, object: AnyRecord) {
  const userId = await resolveUserId(client, object);
  if (!userId || !client) {
    console.warn('[whop] grant access skipped: no userId resolved', { email: extractEmail(object) });
    return;
  }

  const planId =
    findString(object, ['plan_id', 'planId']) ??
    findNestedId(object, 'plan') ??
    findNestedId(object, 'product');
  const plan = whopPlanKeyFromId(planId);
  if (!plan) {
    console.warn('[whop] grant access skipped: unknown plan', { planId });
    return;
  }

  const memberId =
    findNestedId(object, 'membership') ??
    findString(object, ['membership_id', 'membershipId', 'access_id']) ??
    (() => {
      const id = findString(object, ['id']);
      return id && !/^pay_/i.test(id) ? id : null;
    })();
  const memberObjectId = findNestedId(object, 'member');
  const managementUrl = findString(object, ['manage_url', 'management_url', 'portal_url']);
  const rawPeriodEnd = findString(object, [
    'renewal_period_end',
    'current_period_end',
    'currentPeriodEnd',
    'period_end',
    'expires_at',
  ]);
  const periodEnd = parseWhopDate(rawPeriodEnd);

  const { error } = await client.from('profiles').upsert(
    {
      id: userId,
      whop_user_id: findNestedId(object, 'user'),
      whop_member_id: memberId,
      whop_access_id: memberId,
      whop_plan_id: planId,
      whop_manage_url: whopManageUrl(memberObjectId ?? memberId, managementUrl),
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
    console.error('[whop] grant access failed:', error.message);
    return;
  }
  await syncUserMetadata(client, userId, plan);
  console.log(`[whop] granted ${plan} to ${userId} (${memberId})`);
}

async function revokeAccess(
  client: ReturnType<typeof serviceClient>,
  object: AnyRecord,
  status: string,
) {
  const userId = await resolveUserId(client, object);
  if (!userId || !client) {
    console.warn('[whop] revoke access skipped: no userId resolved');
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
    console.error('[whop] revoke access failed:', error.message);
    return;
  }
  await syncUserMetadata(client, userId, 'free');
  console.log(`[whop] revoked ${userId} -> free (${status})`);
}

async function updateStatusOnly(client: ReturnType<typeof serviceClient>, object: AnyRecord, status: string) {
  const userId = await resolveUserId(client, object);
  if (!userId || !client) return;
  await client
    .from('profiles')
    .update({ subscription_status: status, updated_at: new Date().toISOString() })
    .eq('id', userId);
  console.log(`[whop] updated status ${userId} -> ${status}`);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = process.env.WHOP_WEBHOOK_SECRET ?? '';

  if (!secret) {
    return NextResponse.json({ error: 'WHOP_WEBHOOK_SECRET is not configured' }, { status: 500 });
  }

  const id = request.headers.get('webhook-id') ?? '';
  const ts = request.headers.get('webhook-timestamp') ?? '';
  const sigHeader = request.headers.get('webhook-signature') ?? '';
  const signatureOk = verifySignature(rawBody, id, ts, sigHeader, secret);

  let payload: AnyRecord;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const eventType: string = (payload.type ?? payload.event ?? 'unknown') as string;
  const object = (payload.data ?? payload.object ?? payload) as AnyRecord;
  const client = serviceClient();

  // Record every delivery (verified or not) so failures are visible in
  // webhook_events instead of being silently dropped.
  if (id && client) {
    const { data: existing } = await client
      .from('webhook_events')
      .select('verified')
      .eq('id', id)
      .maybeSingle();

    if (existing?.verified === true) {
      console.log(`[whop] duplicate event skipped: ${id} (${eventType})`);
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const { error: insertError } = await client.from('webhook_events').upsert(
      {
        id,
        event_type: eventType,
        verified: signatureOk,
        payload: { ...payload, _signature_verified: signatureOk, _received_at: new Date().toISOString() },
      },
      { onConflict: 'id' },
    );
    if (insertError) {
      console.warn('[whop] could not record event; processing anyway:', insertError.message);
    }
  }

  if (!signatureOk) {
    console.warn('[whop] signature verification FAILED', { id, ts, signature: sigHeader.slice(0, 24) });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  try {
    switch (eventType) {
      case 'membership.activated':
      case 'membership.payment_success':
      case 'payment.succeeded':
      case 'checkout.completed':
      case 'invoice.paid':
        await grantAccess(client, object);
        break;

      case 'membership.updated':
      case 'membership.cancel_at_period_end_changed':
        if (object.cancel_at_period_end === true) {
          await updateStatusOnly(client, object, 'cancelled');
        } else {
          await grantAccess(client, object);
        }
        break;

      case 'membership.deactivated':
      case 'membership.canceled':
      case 'membership.expired':
      case 'subscription.canceled':
      case 'refund.created':
      case 'refund.updated':
        await revokeAccess(client, object, 'cancelled');
        break;

      case 'payment.failed':
      case 'invoice.past_due':
        await updateStatusOnly(client, object, 'past_due');
        break;

      case 'payment.created':
      case 'payment.pending':
      case 'invoice.created':
      case 'invoice.voided':
      case 'invoice.marked_uncollectible':
      case 'membership.trial_ending_soon':
        console.log(`[whop] acknowledged event: ${eventType}`);
        break;

      default:
        console.log(`[whop] unhandled event: ${eventType}`);
    }
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[whop] webhook handler error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

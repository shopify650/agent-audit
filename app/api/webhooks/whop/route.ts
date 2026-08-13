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

function verifySignature(rawBody: string, id: string, ts: string, sigHeader: string, secret: string): boolean {
  if (!id || !ts || !sigHeader) return false;

  const message = `${id}.${ts}.${rawBody}`;
  const provided = sigHeader
    .split(',')
    .map((part) => part.trim().replace(/^v\d+=?/, ''))
    .filter((candidate) => candidate.length > 0)
    .map((candidate) => Buffer.from(candidate));

  for (const secretBytes of candidateSecretKeys(secret)) {
    const expected = crypto.createHmac('sha256', secretBytes).update(message).digest('base64');
    const expectedBuf = Buffer.from(expected);
    for (const p of provided) {
      if (p.length === expectedBuf.length && crypto.timingSafeEqual(p, expectedBuf)) {
        return true;
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

  // 3. whop_member_id match
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

  const planId = findString(object, ['plan_id', 'planId']);
  const plan = whopPlanKeyFromId(planId);
  if (!plan) {
    console.warn('[whop] grant access skipped: unknown plan', { planId });
    return;
  }

  const memberId = findString(object, ['id', 'membership_id', 'membershipId']);
  const managementUrl = findString(object, ['management_url', 'manage_url', 'portal_url']);
  const rawPeriodEnd = findString(object, ['current_period_end', 'currentPeriodEnd', 'period_end', 'expires_at']);
  const periodEnd = rawPeriodEnd ? new Date(rawPeriodEnd).toISOString() : null;

  const { error } = await client.from('profiles').upsert(
    {
      id: userId,
      whop_member_id: memberId,
      whop_access_id: memberId,
      whop_plan_id: planId,
      whop_manage_url: whopManageUrl(memberId, managementUrl),
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

export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = process.env.WHOP_WEBHOOK_SECRET ?? '';

  if (!secret) {
    return NextResponse.json({ error: 'WHOP_WEBHOOK_SECRET is not configured' }, { status: 500 });
  }

  const id = request.headers.get('webhook-id') ?? '';
  const ts = request.headers.get('webhook-timestamp') ?? '';
  const sigHeader = request.headers.get('webhook-signature') ?? '';

  if (!verifySignature(rawBody, id, ts, sigHeader, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: AnyRecord;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const eventType: string = (payload.event ?? payload.type ?? '') as string;
  const object = (payload.data ?? payload.object ?? payload) as AnyRecord;
  const client = serviceClient();

  try {
    if (id && client) {
      const { data: existing } = await client
        .from('webhook_events')
        .select('id')
        .eq('id', id)
        .maybeSingle();
      if (existing) {
        console.log(`[whop] duplicate event skipped: ${id} (${eventType})`);
        return NextResponse.json({ ok: true, duplicate: true });
      }

      const { error: insertError } = await client
        .from('webhook_events')
        .insert({ id, event_type: eventType, payload });
      if (insertError) {
        if ((insertError as any).code === '23505') {
          console.log(`[whop] duplicate event skipped (race): ${id} (${eventType})`);
          return NextResponse.json({ ok: true, duplicate: true });
        }
        console.warn('[whop] could not record event; processing anyway:', insertError.message);
      }
    }

    switch (eventType) {
      case 'membership.activated':
      case 'membership.payment_success':
      case 'payment.succeeded':
      case 'checkout.completed':
        await grantAccess(client, object);
        break;

      case 'membership.updated':
        await grantAccess(client, object);
        break;

      case 'membership.deactivated':
      case 'membership.canceled':
      case 'membership.expired':
      case 'subscription.canceled':
      case 'refund.created':
        await revokeAccess(client, object, 'canceled');
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

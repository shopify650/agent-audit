import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { whopPlanId, type WhopPlan, type BillingInterval } from '../../../lib/whop';
import { createWhopSession } from '../../../lib/whop-server';
import { SITE_URL } from '../../../lib/site';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const sessionClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user },
    error: userError,
  } = await sessionClient.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { plan?: string; interval?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const plan: WhopPlan = body.plan === 'agency' ? 'agency' : 'pro';
  const interval: BillingInterval = body.interval === 'monthly' ? 'monthly' : 'annual';
  const planId = whopPlanId(plan, interval);
  if (!planId) {
    return NextResponse.json({ error: 'Plan is not configured for checkout' }, { status: 400 });
  }

  const sessionId = await createWhopSession({
    planId,
    userId: user.id,
    redirectUrl: `${SITE_URL}/settings/billing?activated=true`,
  });
  if (!sessionId) {
    return NextResponse.json(
      { error: 'Checkout is not configured yet. Please try again shortly.' },
      { status: 503 },
    );
  }

  return NextResponse.json({ sessionId });
}

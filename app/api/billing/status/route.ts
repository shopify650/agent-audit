import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { planKeyOf } from '../../../../lib/plans';
import { monthKey } from '../../../../lib/usage';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }

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

  const serviceClient = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const planType = profile?.plan_type ?? 'free';
  const plan = planKeyOf(planType);
  const usageMonth = profile?.usage_month ?? null;
  const auditsUsed = usageMonth === monthKey() ? (profile?.audits_used_this_month ?? 0) : 0;

  return NextResponse.json({
    userId: user.id,
    plan,
    planType,
    subscriptionStatus: profile?.subscription_status ?? 'active',
    monthlyAuditQuota: profile?.monthly_audit_quota ?? 3,
    auditsUsed,
    subscriptionPeriodEnd: profile?.subscription_period_end ?? null,
    creemSubscriptionId: profile?.creem_subscription_id ?? null,
    hasPaidPlan: plan === 'pro' || plan === 'agency',
  });
}

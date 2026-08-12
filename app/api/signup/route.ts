import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_SIGNUPS_PER_IP = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const CLEANUP_WINDOW_MS = 24 * 60 * 60 * 1000;

function clientIp(request: Request): string {
  const vercelForwarded = request.headers.get('x-vercel-forwarded-for');
  if (vercelForwarded) {
    const first = vercelForwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const parts = xForwardedFor
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last;
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const company = typeof body.company === 'string' ? body.company.trim() : '';
  const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';

  if (!name || !EMAIL_RE.test(email) || password.length < 8) {
    return NextResponse.json(
      { error: 'Please enter a valid name, email, and password (at least 8 characters).' },
      { status: 400 },
    );
  }
  if (deviceId.length < 8 || deviceId.length > 128) {
    return NextResponse.json({ error: 'Device identification failed. Please try again.' }, { status: 400 });
  }

  const client = serviceClient();
  if (!client) {
    return NextResponse.json({ error: 'Signup is unavailable right now. Please try again later.' }, { status: 500 });
  }

  const ip = clientIp(request);
  if (ip !== 'unknown') {
    await client
      .from('signup_attempts')
      .delete()
      .lt('created_at', new Date(Date.now() - CLEANUP_WINDOW_MS).toISOString());

    const { count } = await client
      .from('signup_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('created_at', new Date(Date.now() - RATE_WINDOW_MS).toISOString());

    if ((count ?? 0) >= MAX_SIGNUPS_PER_IP) {
      return NextResponse.json(
        { error: 'Too many signups from this network. Please try again later.' },
        { status: 429 },
      );
    }

    await client.from('signup_attempts').insert({ ip });
  }

  const { data: existing } = await client
    .from('device_bindings')
    .select('user_id')
    .eq('device_id', deviceId)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'This device already has an account. Sign in instead.' }, { status: 409 });
  }

  const { data: created, error: createError } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, company: company || undefined, plan: 'free' },
  });

  if (createError) {
    const message = /already been registered/i.test(createError.message)
      ? 'An account with this email already exists. Sign in instead.'
      : createError.message;
    return NextResponse.json({ error: message }, { status: 409 });
  }

  if (created?.user?.id) {
    await client
      .from('device_bindings')
      .upsert({ device_id: deviceId, user_id: created.user.id }, { onConflict: 'device_id', ignoreDuplicates: true });
  }

  return NextResponse.json({ ok: true });
}

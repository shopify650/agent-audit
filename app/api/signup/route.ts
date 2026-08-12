import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

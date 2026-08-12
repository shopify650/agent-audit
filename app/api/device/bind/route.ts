import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
  if (deviceId.length < 8 || deviceId.length > 128) {
    return NextResponse.json({ ok: true });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';
  if (!url || !anonKey || !token) return NextResponse.json({ ok: true });

  const sessionClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user?.id) return NextResponse.json({ ok: true });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ ok: true });
  const serviceClient = createClient(url, serviceKey, { auth: { persistSession: false } });

  await serviceClient
    .from('device_bindings')
    .upsert({ device_id: deviceId, user_id: user.id }, { onConflict: 'device_id', ignoreDuplicates: true });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hashApiKey, apiKeyHint } from '../../../lib/apiKey';
import { planKeyOf } from '../../../lib/plans';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const { name } = await request.json().catch(() => ({}));
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'A name is required.' }, { status: 400 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
  }

  const sessionClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user },
    error: userError,
  } = await sessionClient.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const plan = planKeyOf(user.user_metadata?.plan);
  if (plan !== 'agency' && plan !== 'enterprise') {
    return NextResponse.json(
      { error: 'API access requires the Agency or Enterprise plan.' },
      { status: 403 },
    );
  }

  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const rawKey = `aa_${Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')}`;

  const serviceClient = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: row, error: insertError } = await serviceClient
    .from('api_keys')
    .insert({
      user_id: user.id,
      name: name.trim(),
      key: await hashApiKey(rawKey),
      key_hint: apiKeyHint(rawKey),
    })
    .select()
    .single();

  if (insertError || !row) {
    return NextResponse.json({ error: insertError?.message || 'Failed to create key.' }, { status: 500 });
  }

  return NextResponse.json({
    id: row.id,
    name: row.name,
    key: rawKey,
    keyHint: row.key_hint ?? apiKeyHint(rawKey),
    createdAt: new Date(row.created_at).getTime(),
  });
}

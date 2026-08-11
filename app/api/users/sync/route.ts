import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
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

  const now = new Date().toISOString();
  const { data: existing } = await serviceClient
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (existing) {
    const { error: updateError } = await serviceClient
      .from('users')
      .update({
        email: user.email ?? '',
        name: (user.user_metadata?.name as string) ?? '',
        updated_at: now,
      })
      .eq('id', user.id);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  } else {
    const { error: insertError } = await serviceClient.from('users').insert({
      id: user.id,
      email: user.email ?? '',
      name: (user.user_metadata?.name as string) ?? '',
      created_at: now,
      updated_at: now,
    });
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  const { error: profileError } = await serviceClient.from('profiles').upsert(
    {
      id: user.id,
      name: (user.user_metadata?.name as string) ?? null,
      company: (user.user_metadata?.company as string) ?? null,
      plan: (user.user_metadata?.plan as string) ?? 'free',
      updated_at: now,
    },
    { onConflict: 'id' },
  );
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { resolveCaller } from '../../../lib/quota';

export async function GET(request: Request) {
  const resolved = await resolveCaller(request);
  if (!resolved) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const url = new URL(request.url);
  const rawLimit = Number(url.searchParams.get('limit') ?? '50');
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.floor(rawLimit), 1), 100) : 50;

  const { data, error } = await resolved.client
    .from('site_scans')
    .select('*')
    .eq('user_id', resolved.caller.userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ scans: [] });
  }

  return NextResponse.json({ scans: data ?? [] });
}

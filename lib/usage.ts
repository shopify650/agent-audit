import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type UsageRecord = { month: string; count: number };

export function monthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function readUsage(meta: Record<string, unknown> | undefined): UsageRecord | null {
  const usage = meta?.usage as Partial<UsageRecord> | undefined;
  if (usage && typeof usage.count === 'number' && typeof usage.month === 'string') {
    return { month: usage.month, count: usage.count };
  }
  return null;
}

export async function countMonthlyAudits(client: SupabaseClient, userId: string): Promise<number> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { count, error } = await client
    .from('audits')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', monthStart.toISOString());

  return error ? 0 : (count ?? 0);
}

export async function bumpUserUsage(userId: string, planId: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return;
  const client = createClient(url, serviceKey, { auth: { persistSession: false } });
  await client.rpc('bump_user_usage', { p_user_id: userId, p_plan_id: planId });
}

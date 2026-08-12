import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { hashApiKey } from './apiKey';
import { planKeyOf, planLimit } from './plans';
import { monthKey, readUsage, countMonthlyAudits } from './usage';

export type { UsageRecord } from './usage';

export type Caller = { userId: string; plan: string; limit: number; used: number };

export type UsageTracker = {
  getMeta(): Promise<Record<string, unknown>>;
  setMeta(meta: Record<string, unknown>): Promise<boolean>;
};

export type ResolvedCaller = { caller: Caller; tracker: UsageTracker; client: SupabaseClient };

function authApiTracker(baseUrl: string, anonKey: string, token: string): UsageTracker {
  return {
    async getMeta() {
      const response = await fetch(`${baseUrl}/auth/v1/user`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return {};
      const user = await response.json();
      return (user?.user_metadata as Record<string, unknown>) ?? {};
    },
    async setMeta(meta) {
      const response = await fetch(`${baseUrl}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: meta }),
      });
      return response.ok;
    },
  };
}

function adminTracker(client: SupabaseClient, userId: string): UsageTracker {
  return {
    async getMeta() {
      const { data } = await client.auth.admin.getUserById(userId);
      return (data.user?.user_metadata as Record<string, unknown>) ?? {};
    },
    async setMeta(meta) {
      const { error } = await client.auth.admin.updateUserById(userId, { user_metadata: meta });
      return !error;
    },
  };
}

async function buildCaller(
  client: SupabaseClient,
  userId: string,
  planMeta: unknown,
  tracker: UsageTracker,
): Promise<Caller> {
  const plan = planKeyOf(planMeta as string | null | undefined);
  const limit = planLimit(plan);
  const key = monthKey();
  const meta = await tracker.getMeta();
  const usage = readUsage(meta);

  let used: number;
  if (usage && usage.month === key) {
    used = usage.count;
  } else {
    used = await countMonthlyAudits(client, userId);
    await tracker.setMeta({ ...meta, usage: { month: key, count: used } }).catch(() => undefined);
  }

  return { userId, plan, limit, used };
}

export async function bumpUsage(tracker: UsageTracker): Promise<void> {
  await bumpUsageN(tracker, 1);
}

export async function bumpUsageN(tracker: UsageTracker, n: number): Promise<void> {
  const key = monthKey();
  const meta = await tracker.getMeta();
  const usage = readUsage(meta);
  const count = usage && usage.month === key ? usage.count : 0;
  await tracker.setMeta({ ...meta, usage: { month: key, count: count + n } });
}

export async function resolveCaller(request: Request): Promise<ResolvedCaller | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const sessionClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: userError,
  } = await sessionClient.auth.getUser();
  if (!userError && user) {
    const tracker = authApiTracker(url, anonKey, token);
    return {
      caller: await buildCaller(sessionClient, user.id, user.user_metadata?.plan, tracker),
      tracker,
      client: sessionClient,
    };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;

  const serviceClient = createClient(url, serviceKey, { auth: { persistSession: false } });
  const keyHash = await hashApiKey(token);
  const { data: keyRow, error: keyError } = await serviceClient
    .from('api_keys')
    .select('user_id')
    .eq('key', keyHash)
    .maybeSingle();
  if (keyError || !keyRow) return null;

  const { data: owner } = await serviceClient.auth.admin.getUserById(keyRow.user_id);
  if (!owner?.user) return null;

  const tracker = adminTracker(serviceClient, owner.user.id);
  return {
    caller: await buildCaller(serviceClient, owner.user.id, owner.user.user_metadata?.plan, tracker),
    tracker,
    client: serviceClient,
  };
}

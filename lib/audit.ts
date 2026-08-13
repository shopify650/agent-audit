import { supabase } from './supabase';
import { planKeyOf, planLimit } from './plans';
import { monthKey, readUsage, countMonthlyAudits } from './usage';
import { getBillingProfile, effectiveAuditsUsed } from './billing';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import type { SiteScanReport, SiteScanPage } from './siteScan';

export type { SiteScanReport, SiteScanPage };

export type IssueSeverity = 'critical' | 'warning' | 'optimization';

export type Issue = {
  id: string;
  severity: IssueSeverity;
  title: string;
  description: string;
  evidence: string;
  fix: string;
  snippet: string;
  count?: number;
};

export type BlindSpot = {
  id: string;
  label: string;
  category: string;
  severity: IssueSeverity;
  x: number;
  y: number;
  width: number;
  height: number;
  fix?: string;
  code?: string;
};

export type Capability = {
  name: string;
  pass: boolean;
  detail?: string;
  snippet?: string;
};

export type XRayData = {
  screenshot?: string;
  width: number;
  height: number;
  blindSpots: BlindSpot[];
  capabilities: Capability[];
};

export type AuditResult = {
  targetUrl: string;
  score: number;
  summary: string;
  issues: Issue[];
  flowSteps: string[];
  snapshot: string;
  checkedAt: number;
  xray?: XRayData;
  engine?: 'vision' | 'heuristic';
  aiUnavailable?: 'rate_limited' | 'timeout' | 'failed';
};

export type StoredAudit = {
  id: string;
  url: string;
  createdAt: number;
  result: AuditResult;
  user_id?: string;
};

export type Quota = {
  plan: string;
  limit: number;
  used: number;
  remaining: number;
};

export class RateLimitError extends Error {
  quota?: Quota;

  constructor(message: string, quota?: Quota) {
    super(message);
    this.name = 'RateLimitError';
    this.quota = quota;
  }
}

export const AUDIT_CONGESTION_EVENT = 'audit:ai-congestion';

export type AuditProgressStage = 'thinking' | 'reading' | 'grepping' | 'editing' | 'done';

export function showCongestionToast(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(AUDIT_CONGESTION_EVENT));
}

async function readSse(
  response: Response,
  onProgress?: (stage: AuditProgressStage) => void,
): Promise<AuditResult> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Audit failed');
  const decoder = new TextDecoder();
  let buf = '';
  let result: AuditResult | null = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split('\n\n');
    buf = parts.pop() ?? '';
    for (const part of parts) {
      const line = part.split('\n').find((l) => l.startsWith('data: '));
      if (!line) continue;
      let payload: { stage?: string; error?: string; result?: AuditResult };
      try {
        payload = JSON.parse(line.slice('data: '.length));
      } catch {
        continue;
      }
      if (payload.stage === 'done' && payload.result) {
        result = payload.result;
      } else if (payload.stage === 'error') {
        throw new Error(payload.error || 'Audit failed');
      } else if (payload.stage && onProgress) {
        onProgress(payload.stage as AuditProgressStage);
      }
    }
  }
  if (!result) throw new Error('Audit failed');
  return result;
}

export async function runAudit(url: string, onProgress?: (stage: AuditProgressStage) => void): Promise<AuditResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

  const response = await fetch('/api/audit', {
    method: 'POST',
    headers,
    body: JSON.stringify({ url }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (response.status === 429) {
      throw new RateLimitError(data.error || 'Monthly audit limit reached.', data.quota as Quota | undefined);
    }
    throw new Error(data.error || 'Audit failed');
  }
  const result = (response.headers.get('content-type') || '').includes('text/event-stream')
    ? await readSse(response, onProgress)
    : ((await response.json()) as AuditResult);
  if (result.aiUnavailable === 'rate_limited') {
    showCongestionToast();
  }
  return result;
}

async function getFreshUser(): Promise<SupabaseUser | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: anonKey,
      },
    });
    if (!response.ok) return null;
    return (await response.json()) as SupabaseUser;
  } catch {
    return null;
  }
}

export async function getQuota(): Promise<Quota | null> {
  const {
    data: { user: cachedUser },
  } = await supabase.auth.getUser();
  if (!cachedUser) return null;

  const profile = await getBillingProfile(supabase, cachedUser.id);
  if (profile) {
    const p = planKeyOf(profile.plan_type);
    const limit = profile.monthly_audit_quota;
    const used = effectiveAuditsUsed(profile);
    const remaining = Number.isFinite(limit) ? Math.max(0, limit - used) : Number.POSITIVE_INFINITY;
    return { plan: p, limit, used, remaining };
  }

  // No billing profile yet — fall back to user metadata. Only now do we pay
  // for a fresh user fetch; the common case above returns immediately.
  const user = (await getFreshUser()) ?? cachedUser;

  const plan = planKeyOf(user.user_metadata?.plan);
  const limit = planLimit(plan);

  const key = monthKey();
  const usage = readUsage(user.user_metadata);

  let used: number;
  if (usage && usage.month === key) {
    used = usage.count;
  } else {
    used = await countMonthlyAudits(supabase, user.id);
    await supabase.auth
      .updateUser({ data: { ...user.user_metadata, usage: { month: key, count: used } } })
      .catch(() => undefined);
  }

  const remaining = Number.isFinite(limit) ? Math.max(0, limit - used) : Number.POSITIVE_INFINITY;

  return { plan, limit, used, remaining };
}

async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id || null;
}

async function getSession(): Promise<{ user: SupabaseUser | null; session: Session | null }> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { user: null, session: null };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  return { user, session };
}

export async function loadAudits(): Promise<StoredAudit[]> {
  const { user } = await getSession();
  if (!user) return [];

  const { data, error } = await supabase
    .from('audits')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load audits:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    url: row.url,
    createdAt: new Date(row.created_at).getTime(),
    result: row.result,
    user_id: row.user_id,
  }));
}

export async function loadAudit(id: string): Promise<StoredAudit | undefined> {
  const { user } = await getSession();
  if (!user) return undefined;

  const { data, error } = await supabase
    .from('audits')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) return undefined;

  return {
    id: data.id,
    url: data.url,
    createdAt: new Date(data.created_at).getTime(),
    result: data.result,
    user_id: data.user_id,
  };
}

export async function saveAudit(url: string, result: AuditResult): Promise<StoredAudit> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  try {
    return await insertAudit(userId, url, result);
  } catch (err: any) {
    if (err?.code === '23503') {
      await syncUserProfile();
      return await insertAudit(userId, url, result);
    }
    throw err;
  }
}

async function insertAudit(userId: string, url: string, result: AuditResult): Promise<StoredAudit> {
  const { data, error } = await supabase
    .from('audits')
    .insert([
      {
        user_id: userId,
        url,
        result,
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    url: data.url,
    createdAt: new Date(data.created_at).getTime(),
    result: data.result,
    user_id: data.user_id,
  };
}

async function syncUserProfile(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const response = await fetch('/api/users/sync', {
    method: 'POST',
    headers: session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : undefined,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to sync account');
  }
}

export async function updateAudit(
  id: string,
  patch: Partial<Omit<StoredAudit, 'id' | 'user_id'>>,
): Promise<StoredAudit | undefined> {
  const { user } = await getSession();
  if (!user) return undefined;

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (patch.url) updates.url = patch.url;
  if (patch.createdAt) updates.created_at = new Date(patch.createdAt).toISOString();
  if (patch.result) updates.result = patch.result;

  const { data, error } = await supabase
    .from('audits')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !data) return undefined;

  return {
    id: data.id,
    url: data.url,
    createdAt: new Date(data.created_at).getTime(),
    result: data.result,
    user_id: data.user_id,
  };
}

export async function deleteAudit(id: string): Promise<void> {
  const { user } = await getSession();
  if (!user) return;

  const { error } = await supabase
    .from('audits')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) console.error('Failed to delete audit:', error);
}

export type StoredScan = {
  id: string;
  url: string;
  pageCount: number;
  overallScore: number;
  results: SiteScanReport;
  createdAt: number;
  user_id?: string;
};

export async function runSiteScan(url: string): Promise<{ report: SiteScanReport; id: string | null; charged: boolean }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

  const response = await fetch('/api/site-scan', {
    method: 'POST',
    headers,
    body: JSON.stringify({ url }),
  });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 429) {
      throw new RateLimitError(data.error || 'Monthly audit limit reached.', data.quota as Quota | undefined);
    }
    const err = new Error(data.error || 'Site scan failed') as Error & { code?: string };
    err.code = data.code;
    throw err;
  }
  const { id, charged = true, ...report } = data as SiteScanReport & { id: string | null; charged: boolean };
  return { report, id, charged };
}

export async function loadScans(limit = 50): Promise<StoredScan[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return [];

  const headers: Record<string, string> = {};
  if (session.access_token) headers.Authorization = `Bearer ${session.access_token}`;

  try {
    const response = await fetch(`/api/scans?limit=${limit}`, { headers });
    if (!response.ok) return [];
    const { scans } = await response.json();
    return (scans ?? []).map((row: any) => ({
      id: row.id,
      url: row.url,
      pageCount: row.page_count,
      overallScore: row.overall_score,
      results: row.results as SiteScanReport,
      createdAt: new Date(row.created_at).getTime(),
      user_id: row.user_id,
    }));
  } catch {
    return [];
  }
}

export async function loadScan(id: string): Promise<StoredScan | undefined> {
  const { user } = await getSession();
  if (!user) return undefined;

  const { data, error } = await supabase
    .from('site_scans')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) return undefined;

  return {
    id: data.id,
    url: data.url,
    pageCount: data.page_count,
    overallScore: data.overall_score,
    results: data.results as SiteScanReport,
    createdAt: new Date(data.created_at).getTime(),
    user_id: data.user_id,
  };
}

export async function deleteScan(id: string): Promise<void> {
  const { user } = await getSession();
  if (!user) return;

  const { error } = await supabase
    .from('site_scans')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) console.error('Failed to delete scan:', error);
}

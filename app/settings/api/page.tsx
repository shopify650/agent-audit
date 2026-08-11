'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useUser } from '../../../lib/auth';
import type { User } from '@supabase/supabase-js';

type ApiKey = { id: string; name: string; key: string; createdAt: number };

function newKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function SettingsApiPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const user = useUser();
  const hasApiAccess = user?.plan === 'agency' || user?.plan === 'enterprise';

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && data) {
        setKeys(data.map((row: any) => ({
          id: row.id,
          name: row.name,
          key: row.key,
          createdAt: new Date(row.created_at).getTime(),
        })));
      }
    };
    fetchUser();
  }, []);

  const create = async () => {
    if (!name.trim() || !userId) return;
    setLoading(true);
    const key: string = `aa_${newKey()}`;
    const { data, error } = await supabase
      .from('api_keys')
      .insert({ user_id: userId, name: name.trim(), key })
      .select()
      .single();
    setLoading(false);
    if (error) {
      alert(error.message);
      return;
    }
    if (data) {
      const newKey: ApiKey = {
        id: data.id,
        name: data.name,
        key: data.key,
        createdAt: new Date(data.created_at).getTime(),
      };
      setKeys([newKey, ...keys]);
    }
    setName('');
    setCopied(key);
    setTimeout(() => setCopied(null), 3000);
  };

  const revoke = async (id: string) => {
    const { error } = await supabase.from('api_keys').delete().eq('id', id);
    if (error) {
      alert(error.message);
      return;
    }
    setKeys(keys.filter((k) => k.id !== id));
  };

  const copy = (key: string) => {
    navigator.clipboard?.writeText(key).catch(() => undefined);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--primary)]">API access</p>
      <h1 className="mt-2 text-3xl font-normal tracking-[-0.02em]">Agency API keys</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">Wire audit results into CI, docs, or your own tools.</p>

      <div className="card mt-8 p-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void create();
            }}
            placeholder="Key name (e.g. github-actions)"
            className="h-11 flex-1 rounded-lg border border-[var(--hairline-strong)] bg-[var(--surface-card)] px-4 text-sm outline-none placeholder:text-[color:var(--muted-soft)] focus:border-[var(--primary)]"
          />
          <button
            onClick={() => void create()}
            disabled={loading}
            className="btn btn-primary h-11 px-5"
          >
            {loading ? 'Creating…' : 'Create key'}
          </button>
        </div>
        <p className="mt-3 break-all font-mono text-xs text-[color:var(--muted)]">
          {`curl -X POST ${typeof window !== 'undefined' ? window.location.origin : 'https://app.agen.com'}/api/audit -H "Authorization: Bearer YOUR_KEY" -H "Content-Type: application/json" -d '{"url":"https://example.com"}'`}
        </p>
        <p className="mt-2 break-all font-mono text-xs text-[color:var(--muted)]">
          {`curl -X POST ${typeof window !== 'undefined' ? window.location.origin : 'https://app.agen.com'}/api/site-scan -H "Authorization: Bearer YOUR_KEY" -H "Content-Type: application/json" -d '{"url":"https://example.com"}'`}
        </p>
        <p className="mt-3 text-xs text-[color:var(--muted-soft)]">
          Single-page audits cost 1 audit; full-site scans cost the plan&apos;s scan fee and crawl the page cap. List scans with{' '}
          <code className="font-mono text-[color:var(--muted)]">GET /api/scans</code>.
        </p>
        <p className="mt-3 text-xs text-[color:var(--muted-soft)]">
          AI: paid plans audit with <code className="font-mono text-[color:var(--muted)]">OPENAI_API_KEY</code>/<code className="font-mono text-[color:var(--muted)]">OPENAI_MODEL</code>; free-plan audits route to the free provider via{' '}
          <code className="font-mono text-[color:var(--muted)]">FREE_AI_KEY</code> (default Google Gemini, model via{' '}
          <code className="font-mono text-[color:var(--muted)]">FREE_AI_MODEL</code>). Providers: <code className="font-mono text-[color:var(--muted)]">gemini</code> |{' '}
          <code className="font-mono text-[color:var(--muted)]">groq</code> | <code className="font-mono text-[color:var(--muted)]">openrouter</code> via{' '}
          <code className="font-mono text-[color:var(--muted)]">FREE_AI_PROVIDER</code>. If no key is set, audits fall back to the heuristic engine.
        </p>
      </div>

      {!hasApiAccess ? (
        <div className="card mt-6 flex flex-col items-center p-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-strong)] text-[var(--muted)]">
            <Lock className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <p className="mt-4 text-base font-medium text-[color:var(--ink)]">API access is an Agency feature</p>
          <p className="mt-1 max-w-sm text-sm text-[color:var(--muted)]">
            Wire audit results into CI, docs, and your own tools with programmatic API keys. Upgrade to Agency or Enterprise to unlock it.
          </p>
          <Link href="/pricing" className="btn btn-primary btn-sm mt-5">
            Compare plans & upgrade →
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
        {keys.length === 0 ? (
          <div className="card p-8 text-center text-sm text-[color:var(--muted)]">
            No API keys yet. Create one above to start integrating.
          </div>
        ) : (
          keys.map((k) => (
            <div key={k.id} className="card p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[color:var(--ink)]">{k.name}</p>
                  <p className="mt-1 font-mono text-xs text-[color:var(--muted)]">
                    {k.key.slice(0, 14)}…{k.key.slice(-6)}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--muted-soft)]">Created {new Date(k.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => copy(k.key)} className="btn btn-secondary btn-sm">
                    {copied === k.key ? 'Copied ✓' : 'Copy'}
                  </button>
                  <button onClick={() => revoke(k.id)} className="btn px-3 py-2 text-sm font-medium text-[color:var(--muted)] transition hover:text-[var(--error)]">
                    Revoke
                  </button>
                </div>
              </div>
              {copied === k.key && <p className="mt-3 rounded-md border border-[var(--hairline)] bg-[var(--canvas-soft)] p-2 font-mono text-xs break-all text-[color:var(--ink)]">{k.key}</p>}
            </div>
          ))
        )}
      </div>
      )}
    </div>
  );
}

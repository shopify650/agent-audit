'use client';

import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { getDeviceId } from './device';
import { planKeyOf, type PlanKey } from './plans';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

export type Plan = PlanKey;

export type User = {
  name: string;
  email: string;
  company?: string;
  plan: Plan;
  createdAt: number;
};

function mapFromSupabase(user: SupabaseUser | null, session: Session | null): User | null {
  if (!user || !session) return null;
  return {
    name: user.user_metadata?.name || user.email?.split('@')[0] || 'Agent',
    email: user.email || '',
    company: user.user_metadata?.company || undefined,
    plan: planKeyOf(user.user_metadata?.plan),
    createdAt: new Date(user.created_at || '').getTime(),
  };
}

export async function signup(input: {
  name: string;
  email: string;
  password: string;
  company?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const deviceId = getDeviceId();

  const res = await fetch('/api/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      password: input.password,
      company: input.company,
      deviceId,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data.error || 'Sign up failed' };

  const { error } = await supabase.auth.signInWithPassword({
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });

  if (error) return { ok: false, error: error.message };

  const deviceId = getDeviceId();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (deviceId && session?.access_token) {
    fetch('/api/device/bind', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ deviceId }),
    }).catch(() => {});
  }

  return { ok: true };
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

async function getCurrentSessionAndUser(): Promise<{ user: SupabaseUser | null; session: Session | null }> {
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

export async function updateUser(patch: Partial<Pick<User, 'name' | 'company' | 'plan'>>): Promise<{ ok: boolean; error?: string }> {
  const { user } = await getCurrentSessionAndUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

   const { error } = await supabase.auth.updateUser({
    data: {
      name: patch.name ?? (user.user_metadata?.name || user.email?.split('@')[0] || 'Agent'),
      company: patch.company ?? user.user_metadata?.company ?? undefined,
      plan: patch.plan ?? planKeyOf(user.user_metadata?.plan),
    },
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function currentUser(): Promise<User | null> {
  const { user, session } = await getCurrentSessionAndUser();
  return user ? mapFromSupabase(user, session) : null;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user: supabaseUser },
        error,
      } = await supabase.auth.getUser();
      if (error || !supabaseUser) {
        setUser(null);
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(mapFromSupabase(supabaseUser, session));
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(mapFromSupabase(session.user, session));
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return user;
}

export function useRequireAuth(redirectTo = '/auth/login') {
  const [state, setState] = useState<'loading' | 'authed' | 'unauthenticated'>('loading');

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setState(user ? 'authed' : 'unauthenticated');
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setState('authed');
      } else {
        setState('unauthenticated');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { state, redirectTo };
}

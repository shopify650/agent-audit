'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
    setEmail('');
  };

  if (sent) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
        <div className="card p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--primary)]">Recover</p>
          <h1 className="mt-3 text-3xl font-normal tracking-[-0.02em]">Check your inbox</h1>
          <p className="mt-3 text-sm leading-6 text-[color:var(--body)]">
            If an account exists for that email, a recovery link has been sent.
          </p>
          <Link href="/auth/login" className="btn btn-primary mt-8 w-full">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <div className="card p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--primary)]">Recover</p>
        <h1 className="mt-3 text-3xl font-normal tracking-[-0.02em]">Forgot your password?</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">Enter your email and we&apos;ll send a recovery link.</p>

        <form className="mt-8 space-y-4" onSubmit={submit}>
          <div>
            <label htmlFor="email" className="text-sm font-medium text-[color:var(--ink)]">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-2 h-11 w-full rounded-lg border border-[var(--hairline-strong)] bg-[var(--surface-card)] px-4 text-sm outline-none placeholder:text-[color:var(--muted-soft)] focus:border-[var(--primary)]"
            />
          </div>

          {error && <p className="rounded-md border border-[var(--error)]/20 bg-[var(--error)]/10 p-3 text-sm text-[var(--error)]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary h-11 w-full"
          >
            {loading ? 'Sending…' : 'Send recovery email'}
          </button>
        </form>
      </div>
    </div>
  );
}

'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signup } from '../../../lib/auth';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    setLoading(true);
    const res = await signup({ name, email, password });
    setLoading(false);
    if (!res.ok) {
      setError(res.error || 'Sign up failed');
      return;
    }
    router.replace(next);
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <div className="card p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--primary)]">Start free</p>
        <h1 className="mt-3 text-3xl font-normal tracking-[-0.02em]">Create your account</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">Save reports, track readiness over time, and export fixes.</p>

        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div>
            <label htmlFor="name" className="text-sm font-medium text-[color:var(--ink)]">Name</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ada Lovelace"
              className="mt-2 h-11 w-full rounded-lg border border-[var(--hairline-strong)] bg-[var(--surface-card)] px-4 text-sm outline-none placeholder:text-[color:var(--muted-soft)] focus:border-[var(--primary)]"
            />
          </div>
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
          <div>
            <label htmlFor="password" className="text-sm font-medium text-[color:var(--ink)]">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="mt-2 h-11 w-full rounded-lg border border-[var(--hairline-strong)] bg-[var(--surface-card)] px-4 text-sm outline-none placeholder:text-[color:var(--muted-soft)] focus:border-[var(--primary)]"
            />
          </div>

          {error && <p className="rounded-md border border-[var(--error)]/20 bg-[var(--error)]/10 p-3 text-sm text-[var(--error)]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary h-11 w-full"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[color:var(--muted)]">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-medium text-[color:var(--primary)] hover:text-[color:var(--primary-active)]">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center px-6">
          <p className="text-sm text-[color:var(--muted)]">Loading…</p>
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}

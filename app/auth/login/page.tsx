'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { login } from '../../../lib/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    setLoading(true);
    const res = await login({ email, password });
    setLoading(false);
    if (!res.ok) {
      setError(res.error || 'Sign in failed');
      return;
    }
    router.replace(next);
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-16">
      <div className="card p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--primary)]">Sign in</p>
        <h1 className="mt-3 text-3xl font-normal tracking-[-0.02em]">Welcome back</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">Pick up where your last audit left off.</p>

        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
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
            <div className="relative mt-2">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 w-full rounded-lg border border-[var(--hairline-strong)] bg-[var(--surface-card)] px-4 pr-11 text-sm outline-none placeholder:text-[color:var(--muted-soft)] focus:border-[var(--primary)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)] transition hover:text-[color:var(--ink)]"
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>

          {error && <p className="rounded-md border border-[var(--error)]/20 bg-[var(--error)]/10 p-3 text-sm text-[var(--error)]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary h-11 w-full"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <Link href="/auth/forgot-password" className="text-[color:var(--body)] transition hover:text-[color:var(--ink)]">
            Forgot password?
          </Link>
          <Link href="/auth/signup" className="font-medium text-[color:var(--primary)] transition hover:text-[color:var(--primary-active)]">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center px-6">
          <p className="text-sm text-[color:var(--muted)]">Loading…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

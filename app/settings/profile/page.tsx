'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { currentUser, updateUser, logout } from '../../../lib/auth';

export default function SettingsProfilePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const user = await currentUser();
      if (user) {
        setName(user.name);
        setCompany(user.company || '');
        setEmail(user.email);
      }
    };
    load();
  }, []);

  const save = async () => {
    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }
    const res = await updateUser({ name: name.trim(), company: company.trim() || undefined });
    setError(res.error || '');
    setSaved(res.ok);
    if (res.ok) setTimeout(() => setSaved(false), 2500);
  };

  const signOut = async () => {
    await logout();
    router.replace('/');
  };

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--primary)]">Profile</p>
      <h1 className="mt-2 text-3xl font-normal tracking-[-0.02em]">Your profile</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">Name, email, and company details used across reports.</p>

      <div className="mt-8 w-full max-w-3xl space-y-5">
        <div className="rounded-lg border border-[var(--hairline)] bg-[var(--surface-card)] p-6">
          <p className="text-sm font-semibold text-[color:var(--ink)]">{name || 'Agent'}</p>
          <p className="mt-0.5 text-sm text-[color:var(--muted)]">{email}</p>
          <button onClick={signOut} className="btn btn-secondary btn-sm mt-4">
            Sign out
          </button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
            <div className="min-w-0">
              <label htmlFor="name" className="text-sm font-medium text-[color:var(--ink)]">Name</label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-[var(--hairline-strong)] bg-[var(--surface-card)] px-4 text-sm outline-none focus:border-[var(--primary)]"
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="company" className="text-sm font-medium text-[color:var(--ink)]">Company</label>
              <input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Optional"
                className="mt-2 h-11 w-full rounded-lg border border-[var(--hairline-strong)] bg-[var(--surface-card)] px-4 text-sm outline-none placeholder:text-[color:var(--muted-soft)] focus:border-[var(--primary)]"
              />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium text-[color:var(--ink)]">Email</label>
            <input
              id="email"
              value={email}
              disabled
              className="mt-2 h-11 w-full cursor-not-allowed rounded-lg border border-[var(--hairline)] bg-[var(--canvas-soft)] px-4 text-sm text-[color:var(--muted)]"
            />
          </div>

          {error && <p className="rounded-md border border-[var(--error)]/20 bg-[var(--error)]/10 p-3 text-sm text-[var(--error)]">{error}</p>}
          {saved && <p className="rounded-md border border-[var(--hairline)] bg-[var(--surface-strong)] p-3 text-sm text-[color:var(--ink)]">Profile saved.</p>}

          <button onClick={save} className="btn btn-primary btn-sm">
            Save profile
          </button>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser, logout } from '../lib/auth';

const links = [
  { href: '/pricing', label: 'Pricing' },
  { href: '/showcase', label: 'Showcase' },
  { href: '/blog', label: 'Blog' },
  { href: '/docs', label: 'Docs' },
];

export default function Navbar() {
  const user = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const signOut = () => {
    logout();
    setOpen(false);
    router.replace('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--hairline)] bg-[var(--canvas)]/90 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-6 sm:px-8">
        <Link href="/" className="flex items-center gap-3 text-[17px] font-medium tracking-[-0.02em] text-[color:var(--ink)]">
          <img src="/logo.png" alt="Agent-Audit logo" className="h-9 w-9 rounded-lg object-contain" />
          <span>
            Agent-Audit<span className="text-[var(--accent)]">.</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-[color:var(--body)] md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-[color:var(--ink)]">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className={`rounded-lg px-3 py-2 text-sm font-medium transition hover:text-[color:var(--ink)] ${
                  pathname.startsWith('/dashboard') ? 'text-[color:var(--ink)]' : 'text-[color:var(--body)]'
                }`}
              >
                Dashboard
              </Link>
              <Link href="/dashboard/new" className="btn btn-primary btn-sm">
                <span className="btn-chip">
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                </span>
                New audit
              </Link>
              <button onClick={signOut} className="btn btn-secondary btn-sm">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="btn btn-secondary btn-sm">
                Sign in
              </Link>
              <Link href="/auth/signup" className="btn btn-primary btn-sm">
                <span className="btn-chip">
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                </span>
                Start free
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-[var(--hairline)] p-2 text-[color:var(--ink)] md:hidden"
          aria-label="Toggle menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-[var(--hairline)] bg-[var(--canvas)]/95 px-6 py-4 md:hidden">
          <div className="flex flex-col gap-2">
            {links.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-[color:var(--body)] hover:text-[color:var(--ink)]">
                {link.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link href="/dashboard" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-[color:var(--ink)]">
                  Dashboard
                </Link>
                <button onClick={signOut} className="rounded-lg px-3 py-2 text-left text-sm font-medium text-[color:var(--body)] hover:text-[color:var(--ink)]">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-[color:var(--body)] hover:text-[color:var(--ink)]">
                  Sign in
                </Link>
                <Link href="/auth/signup" onClick={() => setOpen(false)} className="btn btn-primary btn-sm w-full">
                  <span className="btn-chip">
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                  </span>
                  Start free
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

'use client';

import { usePathname } from 'next/navigation';
import React from 'react';
import Link from 'next/link';

const dashboardLinks = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/new', label: 'New audit' },
];

const settingsLinks = [
  { href: '/settings/profile', label: 'Profile' },
  { href: '/settings/permissions', label: 'Permissions' },
  { href: '/settings/billing', label: 'Billing' },
  { href: '/settings/api', label: 'API Keys' },
];

const protectionItems = [
  { label: 'Anti-Scrape Shield' },
  { label: 'Agentic Approvals' },
  { label: 'Human Verification' },
];

export default function SidebarLayout({ children, sidebar }: { children: React.ReactNode; sidebar?: React.ReactNode }) {
  const pathname = usePathname();

  const linkClass = (href: string) =>
    `block rounded-lg px-3 py-3 text-sm font-medium transition ${
      pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
        ? 'bg-[var(--ink)] text-[color:var(--canvas)]'
        : 'text-[color:var(--body)] hover:bg-[var(--surface-strong)] hover:text-[color:var(--ink)]'
    }`;

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[color:var(--ink)]">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
          <aside className="card w-full shrink-0 p-4 lg:sticky lg:top-6 lg:w-fit lg:min-w-52 lg:max-w-60">
            {sidebar ?? (
              <div className="space-y-6">
                <div className="rounded-xl border border-[var(--hairline-soft)] bg-[var(--canvas-soft)] p-4">
                  <Link href="/" className="flex items-center gap-3 text-[17px] font-medium tracking-[-0.02em] text-[color:var(--ink)]">
                    <img src="/logo.png" alt="Agent-Audit logo" className="h-9 w-9 rounded-lg object-contain" />
                    <span>
                      Agent-Audit<span className="text-[var(--accent)]">.</span>
                    </span>
                  </Link>
                  <p className="mt-3 text-sm leading-6 text-[color:var(--body)]">
                    Monitor visibility, ship fixes faster, and keep every audit actionable.
                  </p>
                  <div className="mt-4 space-y-1">
                    {dashboardLinks.map((link) => (
                      <Link key={link.href} href={link.href} className={linkClass(link.href)}>
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="px-3 text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">Settings</p>
                  <div className="mt-3 space-y-1">
                    {settingsLinks.map((link) => (
                      <Link key={link.href} href={link.href} className={linkClass(link.href)}>
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="px-3 text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">Protection</p>
                  <div className="mt-3 space-y-1">
                    {protectionItems.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between gap-2 rounded-lg px-3 py-3 text-sm font-medium text-[color:var(--muted)]"
                      >
                        <span className="truncate">{item.label}</span>
                        <span className="shrink-0 rounded-full border border-[var(--hairline-strong)] bg-[var(--surface-strong)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                          Soon
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </aside>
          <main className="card min-w-0 flex-1 p-5 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

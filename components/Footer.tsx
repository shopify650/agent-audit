import Link from 'next/link';

const columns = [
  {
    title: 'Product',
    links: [
      { href: '/', label: 'X-Ray Audit' },
      { href: '/pricing', label: 'Pricing' },
      { href: '/showcase', label: 'Showcase' },
      { href: '/dashboard/new', label: 'New audit' },
    ],
  },
  {
    title: 'Account',
    links: [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/settings/profile', label: 'Profile' },
      { href: '/settings/api', label: 'API keys' },
      { href: '/settings/billing', label: 'Billing' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { href: '/blog', label: 'Blog' },
      { href: '/guides', label: 'Guides' },
      { href: '/docs', label: 'Docs & rules' },
      { href: '/showcase', label: 'Agent-Vision examples' },
      { href: '/pricing', label: 'Compare plans' },
      { href: '/auth/signup', label: 'Create account' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-[var(--hairline)] bg-[var(--surface-footer)] py-16 text-sm text-[color:var(--body)]">
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-10 px-6 sm:px-8 md:grid-cols-6">
        <div className="col-span-2">
          <Link href="/" className="flex items-center gap-3 text-[17px] font-medium tracking-[-0.02em] text-[color:var(--ink)]">
            <img src="/logo.png" alt="Agent-Audit logo" className="h-9 w-9 rounded-lg object-contain" />
            <span>
              Agent-Audit<span className="text-[var(--accent)]">.</span>
            </span>
          </Link>
          <p className="mt-4 max-w-xs leading-6 text-[color:var(--muted)]">
            The X-Ray for the agent economy. Find out what autonomous agents actually see when they visit your site.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">{col.title}</p>
            <div className="mt-4 flex flex-col gap-3">
              {col.links.map((link) => (
                <Link key={link.href} href={link.href} className="transition hover:text-[color:var(--ink)]">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-14 flex max-w-[1200px] flex-col gap-2 px-6 text-xs text-[color:var(--muted-soft)] sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>© {new Date().getFullYear()} Agent-Audit. Built for the agent economy.</p>
        <p className="font-mono">100 – the number of ways a robot can misread your homepage.</p>
      </div>

      <div className="relative mx-auto mt-20 max-w-[1200px] overflow-hidden px-4 sm:px-8">
        <p className="select-none whitespace-nowrap text-center text-[clamp(2.25rem,11vw,12.5rem)] font-semibold leading-none tracking-[-0.04em] text-[color:var(--ink)]">
          AGENT<span className="text-[var(--accent)]">-</span>AUDIT
        </p>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-b from-transparent to-[var(--surface-footer)]" />
      </div>
    </footer>
  );
}

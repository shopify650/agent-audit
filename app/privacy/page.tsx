import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--primary)]">Legal</p>
      <h1 className="mt-2 text-4xl font-normal tracking-[-0.02em]">Privacy Policy</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">Last updated: February 2026</p>

      <div className="mt-10 space-y-8 text-sm leading-6 text-[color:var(--body)]">
        <section>
          <h2 className="text-lg font-medium text-[color:var(--ink)]">What we collect</h2>
          <p className="mt-2">When you audit a page, we fetch that URL and analyze its rendered HTML. We store the results — your audit history, issues found, and the page snapshot — in your browser under your account. We do not sell your data.</p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-[color:var(--ink)]">How it&apos;s stored</h2>
          <p className="mt-2">In this demo, everything lives in your browser&apos;s local storage. Nothing is transmitted to our servers beyond the audit request itself. Deleting your browser data removes your account and audits.</p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-[color:var(--ink)]">Third parties</h2>
          <p className="mt-2">Audits are performed against pages you provide. We do not share audit contents with any third party.</p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-[color:var(--ink)]">Contact</h2>
          <p className="mt-2">Questions? Email <span className="font-medium text-[color:var(--ink)]">privacy@agent-audit.example</span>. Also see our <Link className="font-medium text-[color:var(--primary)] hover:text-[color:var(--primary-active)]" href="/terms">Terms of Service</Link>.</p>
        </section>
      </div>
    </div>
  );
}

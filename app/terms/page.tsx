import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--primary)]">Legal</p>
      <h1 className="mt-2 text-4xl font-normal tracking-[-0.02em]">Terms of Service</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">Last updated: February 2026</p>

      <div className="mt-10 space-y-8 text-sm leading-6 text-[color:var(--body)]">
        <section>
          <h2 className="text-lg font-medium text-[color:var(--ink)]">Use of the service</h2>
          <p className="mt-2">AGEN scans public websites to surface agent-readability issues. You agree to only audit pages you own or are authorized to scan. We block access to private and internal network addresses.</p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-[color:var(--ink)]">Fair use</h2>
          <p className="mt-2">You agree not to abuse the audit endpoint, submit harmful payloads, or attempt to bypass security controls. We may throttle or suspend accounts that do.</p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-[color:var(--ink)]">No warranty</h2>
          <p className="mt-2">Reports reflect heuristic checks, not guaranteed rankings. Audit output is provided “as is” without warranty of any kind.</p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-[color:var(--ink)]">Payments &amp; subscriptions</h2>
          <p className="mt-2">Paid plans are recurring subscriptions billed monthly or annually by Whop. Subscriptions renew automatically until cancelled. You can cancel from the Whop customer portal or your account settings; you keep access until the end of the current billing period. Refunds are handled under Whop&apos;s refund policy.</p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-[color:var(--ink)]">Contact</h2>
          <p className="mt-2">Questions? Email <span className="font-medium text-[color:var(--ink)]">muhammadhamzainfo904@gmail.com</span>. See our <Link className="font-medium text-[color:var(--primary)] hover:text-[color:var(--primary-active)]" href="/privacy">Privacy Policy</Link>.</p>
        </section>
      </div>
    </div>
  );
}

import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--primary)]">Legal</p>
      <h1 className="mt-2 text-4xl font-normal tracking-[-0.02em]">Privacy Policy</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">Last updated: August 2026</p>

      <div className="mt-10 space-y-8 text-sm leading-6 text-[color:var(--body)]">
        <section>
          <h2 className="text-lg font-medium text-[color:var(--ink)]">What we collect</h2>
          <p className="mt-2">When you create an account, we collect your email address and any name you provide. When you run an audit or site scan, we collect the URL you submit and the resulting report — the readiness score, findings, suggested fixes, and a snapshot of the scanned page content. We also record basic usage information, such as your plan and monthly audit count, and standard request data (IP address and user agent) for security and abuse prevention.</p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-[color:var(--ink)]">How it&apos;s stored</h2>
          <p className="mt-2">Your account and reports are stored securely in our cloud database, not in your browser. We keep only a sign-in token in your browser so you stay logged in. You can delete individual audits and scans from your dashboard at any time. We do not sell your personal data.</p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-[color:var(--ink)]">What happens when you audit a page</h2>
          <p className="mt-2">When you submit a URL, our servers fetch the page and analyze its rendered HTML. To generate findings, we may send the page&apos;s content to third-party AI providers. We block access to private and internal network addresses.</p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-[color:var(--ink)]">Third parties</h2>
          <p className="mt-2">We use these providers to run the service: Supabase for authentication and data storage; OpenRouter, Google Gemini, Groq, and OpenAI to analyze pages and generate reports; and Whop to process payments when you subscribe to a paid plan. We only share the data needed to deliver the feature you&apos;re using.</p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-[color:var(--ink)]">Contact</h2>
          <p className="mt-2">Questions? Email <span className="font-medium text-[color:var(--ink)]">muhammadhamzainfo904@gmail.com</span>. Also see our <Link className="font-medium text-[color:var(--primary)] hover:text-[color:var(--primary-active)]" href="/terms">Terms of Service</Link>.</p>
        </section>
      </div>
    </div>
  );
}

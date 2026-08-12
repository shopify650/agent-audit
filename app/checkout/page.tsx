import CheckoutEmbed from './CheckoutEmbed';
import type { WhopPlan, BillingInterval } from '../../lib/whop';

export const metadata = { title: 'Subscribe · Agent Audits' };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const plan: WhopPlan = sp.plan === 'agency' ? 'agency' : 'pro';
  const interval: BillingInterval = sp.interval === 'monthly' ? 'monthly' : 'annual';

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--accent)]">Subscribe</p>
        <h1 className="mt-4 text-4xl font-normal tracking-[-0.02em]">You’re almost there.</h1>
        <p className="mt-4 text-lg leading-8 text-[color:var(--body)]">
          Complete your {plan === 'agency' ? 'Agency' : 'Pro'} subscription
          {interval === 'annual' ? ' (billed annually)' : ''} below.
        </p>
      </div>
      <div className="mt-12">
        <CheckoutEmbed plan={plan} interval={interval} />
      </div>
    </div>
  );
}

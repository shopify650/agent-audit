import { Whop } from '@whop/sdk';

export function whopApiKey(): string | null {
  return process.env.WHOP_API_KEY ?? null;
}

export function getWhopClient(): Whop | null {
  const apiKey = whopApiKey();
  if (!apiKey) return null;
  return new Whop({ apiKey });
}

export async function createWhopSession(input: {
  planId: string;
  userId: string;
  redirectUrl: string;
}): Promise<string | null> {
  const client = getWhopClient();
  if (!client) return null;

  const session = await client.checkoutConfigurations.create({
    plan_id: input.planId,
    mode: 'payment',
    redirect_url: input.redirectUrl,
    metadata: { userId: input.userId },
  });

  return session?.id ?? null;
}

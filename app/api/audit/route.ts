import { NextResponse } from 'next/server';
import { captureSnapshot, analyzeWithVision, simplifyDom, fallbackCapabilities } from '../../../lib/xray';
import { getPaidAiProvider, getFreeAiProviders } from '../../../lib/aiConfig';
import type { AiProvider } from '../../../lib/aiConfig';
import { resolveCaller, bumpUsage } from '../../../lib/quota';
import { bumpUserUsage } from '../../../lib/usage';
import { createAuditResult, fetchProtected, normalizeUrl } from '../../../lib/auditEngine';
import { getBillingProfile, effectiveAuditsUsed, incrementAuditsUsed } from '../../../lib/billing';
import { planQuotaFor } from '../../../lib/whop';
import { planKeyOf } from '../../../lib/plans';
import type { AuditResult, XRayData } from '../../../lib/audit';

const encoder = new TextEncoder();

export const maxDuration = 60;

export async function POST(request: Request) {
  const { url } = await request.json();
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'A URL is required.' }, { status: 400 });
  }

  const resolved = await resolveCaller(request);
  const caller = resolved?.caller ?? null;

  let plan = caller?.plan ?? 'free';
  let limit = caller ? caller.limit : planQuotaFor('free');
  let used = caller?.used ?? 0;

  if (resolved) {
    const profile = await getBillingProfile(resolved.client, resolved.caller.userId);
    if (profile) {
      plan = planKeyOf(profile.plan_type);
      limit = profile.monthly_audit_quota;
      used = effectiveAuditsUsed(profile);
    }
  }

  if (Number.isFinite(limit) && used >= limit) {
    return NextResponse.json(
      {
        error: `Quota reached. Upgrade your plan. You've used ${used} of ${limit} audits on the ${plan} plan this month.`,
        code: 'RATE_LIMITED',
        quota: { plan, limit, used },
      },
      { status: 429 },
    );
  }

  const targetUrl = normalizeUrl(url);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (stage: string, extra: Record<string, unknown> = {}) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ stage, ...extra })}\n\n`));
      };
      try {
        send('thinking');
        const response = await fetchProtected(targetUrl);
        if (!response.ok) {
          throw new Error(`Unable to fetch ${targetUrl} (HTTP ${response.status})`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (contentType && !contentType.includes('html') && !contentType.startsWith('text/')) {
          throw new Error('The target did not return an HTML page.');
        }

        const html = (await response.text()).slice(0, 1_500_000);

        send('reading');
        const [heuristic, capture] = await Promise.all([
          Promise.resolve(createAuditResult(targetUrl, html)),
          captureSnapshot(targetUrl),
        ]);

        send('grepping');
        const domTree = simplifyDom(html);

        send('editing');
        const freeProviders = plan === 'free' ? getFreeAiProviders() : [getPaidAiProvider(), ...getFreeAiProviders()].filter(
          (p): p is AiProvider => Boolean(p),
        );
        const providers: AiProvider[] = freeProviders ?? [];
        const aiState: { code?: string } = {};
        const ai =
          providers.length && capture?.screenshot
            ? await analyzeWithVision({ targetUrl, screenshot: capture.screenshot, domTree }, providers).catch((err) => {
                const code = (err as { code?: string })?.code;
                if (code) aiState.code = code;
                return null;
              })
            : null;

        let result = heuristic as AuditResult;
        if (ai) {
          result = {
            ...heuristic,
            score: ai.score,
            summary: ai.summary,
            issues: ai.issues.map((issue, idx) => ({
              id: `ai-${idx}`,
              severity: issue.severity,
              title: issue.title,
              description: issue.description,
              evidence: issue.evidence,
              fix: issue.fix,
              snippet: issue.code,
            })),
          };
        }
        result.engine = ai ? 'vision' : 'heuristic';
        if (!ai && plan === 'free' && aiState.code) {
          result.aiUnavailable = aiState.code as AuditResult['aiUnavailable'];
        }

        const xray: XRayData = {
          screenshot: capture?.screenshot,
          width: capture?.width ?? 1280,
          height: capture?.height ?? 800,
          blindSpots: ai ? ai.blindSpots : (capture?.blindSpots ?? []),
          capabilities: ai ? ai.capabilities : fallbackCapabilities(html),
        };
        if (xray.screenshot || xray.blindSpots.length > 0 || xray.capabilities.length > 0) {
          result.xray = xray;
        }

        if (resolved) {
          await bumpUsage(resolved.tracker).catch(() => undefined);
          await bumpUserUsage(resolved.caller.userId, plan).catch(() => undefined);
          await incrementAuditsUsed(resolved.caller.userId).catch(() => undefined);
        }

        send('done', { result });
        controller.close();
      } catch (error: any) {
        send('error', { error: error.message || 'Audit failed' });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

import { NextResponse } from 'next/server';
import { resolveCaller, bumpUsageN, type ResolvedCaller } from '../../../lib/quota';
import { runSiteScan, type SiteScanReport } from '../../../lib/siteScan';
import { canSiteScan, scanPages, scanFee } from '../../../lib/plans';
import { assertPublicHost, normalizeUrl } from '../../../lib/auditEngine';

type ValidTarget = { ok: true; url: string } | { ok: false; error: string };

function validTarget(rawUrl: string): ValidTarget {
  const normalized = normalizeUrl(rawUrl);
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return { ok: false, error: 'Enter a valid URL like https://example.com' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Only http and https URLs are supported.' };
  }
  if (!parsed.hostname) {
    return { ok: false, error: 'A valid hostname is required.' };
  }
  return { ok: true, url: normalized };
}

async function saveScan(resolved: ResolvedCaller, report: SiteScanReport): Promise<string | null> {
  try {
    const { data, error } = await resolved.client
      .from('site_scans')
      .insert({
        user_id: resolved.caller.userId,
        url: report.targetUrl,
        page_count: report.pagesScanned,
        overall_score: report.overallScore,
        results: report,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (error) {
      console.warn('site scan save skipped:', error.message);
      return null;
    }
    return data?.id ?? null;
  } catch (error: any) {
    console.warn('site scan save skipped:', error?.message ?? 'unknown');
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'A URL is required.' }, { status: 400 });
    }

    const target = validTarget(url);
    if (!target.ok) {
      return NextResponse.json({ error: target.error }, { status: 400 });
    }

    try {
      await assertPublicHost(target.url);
    } catch (error: any) {
      return NextResponse.json({ error: error?.message || 'This URL cannot be scanned.' }, { status: 400 });
    }

    const resolved = await resolveCaller(request);
    if (!resolved) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { caller, tracker } = resolved;
    const pages = scanPages(caller.plan);
    const fee = scanFee(caller.plan);

    if (!canSiteScan(caller.plan)) {
      return NextResponse.json(
        {
          error: 'Full-site scans are a Pro, Agency, or Enterprise feature. Upgrade to crawl the whole site.',
          code: 'PLAN_REQUIRED',
        },
        { status: 403 },
      );
    }

    if (Number.isFinite(caller.limit) && caller.used + fee > caller.limit) {
      return NextResponse.json(
        {
          error: `A full-site scan costs ${fee} audits. You've used ${caller.used} of ${caller.limit} on your ${caller.plan} plan this month. Upgrade to keep running scans.`,
          code: 'RATE_LIMITED',
          quota: { plan: caller.plan, limit: caller.limit, used: caller.used },
        },
        { status: 429 },
      );
    }

    const report = await runSiteScan(target.url, pages);

    const charged = report.pagesScanned > 0;
    if (charged) {
      await bumpUsageN(tracker, fee).catch(() => undefined);
    }
    const id = await saveScan(resolved, report);

    return NextResponse.json({ ...report, charged, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Site scan failed' }, { status: 500 });
  }
}

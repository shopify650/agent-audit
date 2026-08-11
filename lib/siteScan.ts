import { JSDOM } from 'jsdom';
import { createAuditResult, fetchProtected, normalizeUrl } from './auditEngine';
import type { IssueSeverity } from './audit';

export type ScanTopIssue = { id: string; severity: IssueSeverity; title: string };

export type SiteScanPage = {
  url: string;
  score: number;
  critical: number;
  warnings: number;
  optimization: number;
  topIssues: ScanTopIssue[];
  error?: string;
};

export type SiteScanReport = {
  targetUrl: string;
  scannedAt: number;
  pageCap: number;
  pagesScanned: number;
  pagesFailed: number;
  overallScore: number;
  bestScore: number;
  worstScore: number;
  totals: { critical: number; warning: number; optimization: number };
  pages: SiteScanPage[];
};

const CONCURRENCY = 3;
const PAGE_TIMEOUT_MS = 12_000;
const ASSET_EXT =
  /\.(png|jpe?g|gif|svg|webp|avif|ico|css|js|json|xml|zip|gz|pdf|docx?|xlsx?|pptx?|mp4|mp3|woff2?|ttf|eot)(\?|#|$)/i;

function canonicalize(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    u.hash = '';
    u.hostname = u.hostname.toLowerCase();
    if (u.protocol === 'http:' && u.port === '80') u.port = '';
    if (u.protocol === 'https:' && u.port === '443') u.port = '';
    return u.href;
  } catch {
    return rawUrl;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out while fetching')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export function extractInternalLinks(html: string, origin: string): string[] {  const dom = new JSDOM(html);
  const { document } = dom.window;
  const links = new Set<string>();

  for (const a of document.querySelectorAll('a[href]')) {
    const href = (a.getAttribute('href') || '').trim();
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue;
    let abs: URL;
    try {
      abs = new URL(href, origin);
    } catch {
      continue;
    }
    if (abs.protocol !== 'http:' && abs.protocol !== 'https:') continue;
    if (abs.origin !== origin) continue;
    if (ASSET_EXT.test(abs.pathname)) continue;
    links.add(canonicalize(abs.href));
  }

  return Array.from(links);
}

type Robots = { disallow: string[]; sitemaps: string[] };

async function fetchRobots(origin: string): Promise<Robots> {
  let text = '';
  try {
    const response = await withTimeout(fetchProtected(`${origin}/robots.txt`), PAGE_TIMEOUT_MS);
    if (response.ok) text = (await response.text()).slice(0, 200_000);
  } catch {
    text = '';
  }

  const disallow: string[] = [];
  const sitemaps: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const sep = trimmed.indexOf(':');
    if (sep < 0) continue;
    const key = trimmed.slice(0, sep).trim().toLowerCase();
    const value = trimmed.slice(sep + 1).trim();
    if (!value) continue;
    if (key === 'sitemap') sitemaps.push(value);
    else if (key === 'disallow') disallow.push(value);
  }
  return { disallow, sitemaps };
}

function isDisallowed(url: string, robots: Robots): boolean {
  let path = '';
  try {
    path = new URL(url).pathname;
  } catch {
    return true;
  }
  return robots.disallow.some((d) => d !== '' && d !== '/' && path.startsWith(d));
}

async function fetchSitemapUrls(sitemapUrl: string, origin: string, depth = 0): Promise<string[]> {
  if (depth > 1) return [];
  let xml = '';
  try {
    const response = await withTimeout(fetchProtected(sitemapUrl), PAGE_TIMEOUT_MS);
    if (!response.ok) return [];
    xml = (await response.text()).slice(0, 2_000_000);
  } catch {
    return [];
  }

  const dom = new JSDOM(xml);
  const urls: string[] = [];
  for (const node of dom.window.document.querySelectorAll('loc')) {
    const loc = (node.textContent || '').trim();
    if (!loc) continue;
    let parsed: URL;
    try {
      parsed = new URL(loc);
    } catch {
      continue;
    }
    if (parsed.origin !== origin) continue;
    if (ASSET_EXT.test(parsed.pathname)) continue;
    const canonical = canonicalize(parsed.href);
    if (parsed.pathname.endsWith('.xml')) {
      urls.push(...(await fetchSitemapUrls(canonical, origin, depth + 1)));
    } else {
      urls.push(canonical);
    }
  }
  return urls;
}

async function discoverSeeds(origin: string, robots: Robots): Promise<string[]> {
  const seeds = new Set<string>();
  for (const sitemapUrl of robots.sitemaps) {
    let parsed: URL;
    try {
      parsed = new URL(sitemapUrl);
    } catch {
      continue;
    }
    if (parsed.origin !== origin) continue;
    for (const loc of await fetchSitemapUrls(parsed.href, origin)) {
      if (!isDisallowed(loc, robots)) seeds.add(loc);
    }
  }
  return Array.from(seeds);
}

async function scanPage(
  rawUrl: string,
  origin: string,
  enqueueCap: number,
): Promise<{ url: string; audit?: ReturnType<typeof createAuditResult>; links: string[]; error?: string }> {
  const url = canonicalize(rawUrl);
  try {
    const response = await withTimeout(fetchProtected(url, 5), PAGE_TIMEOUT_MS);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    if (contentType && !contentType.includes('html') && !contentType.startsWith('text/')) {
      throw new Error('Not an HTML page');
    }
    const html = (await response.text()).slice(0, 1_500_000);
    const audit = createAuditResult(url, html);
    const links = extractInternalLinks(html, origin).slice(0, enqueueCap);
    return { url, audit, links };
  } catch (error: any) {
    return { url, links: [], error: error?.message || 'Failed to fetch' };
  }
}

export async function runSiteScan(rootUrl: string, maxPages: number): Promise<SiteScanReport> {
  const targetUrl = canonicalize(normalizeUrl(rootUrl));
  let origin = '';
  try {
    origin = new URL(targetUrl).origin;
  } catch {
    origin = '';
  }
  const robots = origin ? await fetchRobots(origin) : { disallow: [], sitemaps: [] };
  const seeds = origin ? await discoverSeeds(origin, robots) : [];
  const queued = new Set<string>([targetUrl, ...seeds]);
  const visited = new Set<string>();
  const pages: SiteScanPage[] = [];
  const totals = { critical: 0, warning: 0, optimization: 0 };
  const queue: string[] = [targetUrl, ...seeds];

  while (queue.length > 0 && pages.length < maxPages) {
    const batch: string[] = [];
    while (batch.length < CONCURRENCY && queue.length > 0 && pages.length + batch.length < maxPages) {
      const url = queue.shift()!;
      if (visited.has(url)) continue;
      visited.add(url);
      batch.push(url);
    }
    if (batch.length === 0) break;

    const results = await Promise.all(batch.map((url) => scanPage(url, origin, maxPages - pages.length)));

    for (const result of results) {
      if (!result.audit) {
        pages.push({ url: result.url, score: 0, critical: 0, warnings: 0, optimization: 0, topIssues: [], error: result.error });
        continue;
      }
      const counts = { critical: 0, warning: 0, optimization: 0 };
      for (const issue of result.audit.issues) counts[issue.severity] += 1;
      totals.critical += counts.critical;
      totals.warning += counts.warning;
      totals.optimization += counts.optimization;
      pages.push({
        url: result.url,
        score: result.audit.score,
        critical: counts.critical,
        warnings: counts.warning,
        optimization: counts.optimization,
        topIssues: result.audit.issues.slice(0, 8).map((issue) => ({ id: issue.id, severity: issue.severity, title: issue.title })),
      });
      for (const link of result.links) {
        if (!queued.has(link) && !visited.has(link) && !isDisallowed(link, robots)) {
          queued.add(link);
          queue.push(link);
        }
      }
    }
  }

  const scored = pages.filter((page) => page.score > 0);
  const overallScore = scored.length
    ? Math.round(scored.reduce((sum, page) => sum + page.score, 0) / scored.length)
    : 0;
  const pagesFailed = pages.filter((page) => page.error).length;

  return {
    targetUrl,
    scannedAt: Date.now(),
    pageCap: maxPages,
    pagesScanned: pages.length,
    pagesFailed,
    overallScore,
    bestScore: scored.length ? Math.max(...scored.map((page) => page.score)) : 0,
    worstScore: scored.length ? Math.min(...scored.map((page) => page.score)) : 0,
    totals,
    pages,
  };
}

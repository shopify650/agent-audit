import { existsSync } from 'node:fs';
import path from 'node:path';
import { getPaidAiProvider, getFreeAiProviders, type AiProvider } from './aiConfig';
import puppeteer from 'puppeteer-core';
import type { Browser } from 'puppeteer-core';
import { JSDOM } from 'jsdom';
import type { BlindSpot, Capability, IssueSeverity } from './audit';

const VIEWPORT = { width: 1280, height: 800 };

let sharedBrowser: Browser | null = null;
let browserPromise: Promise<Browser | null> | null = null;

function getBrowser(): Promise<Browser | null> {
  if (sharedBrowser && sharedBrowser.connected) return Promise.resolve(sharedBrowser);
  if (browserPromise) return browserPromise;
  browserPromise = resolveBrowser();
  return browserPromise;
}

async function resolveBrowser(): Promise<Browser | null> {
  let executablePath = findBrowserPath();
  let launchArgs = ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-extensions', '--mute-audio'];
  if (!executablePath) {
    try {
      const mod = await import('@sparticuz/chromium');
      executablePath = await mod.default.executablePath();
      launchArgs = mod.default.args;
    } catch {
      executablePath = '';
    }
  }
  if (!executablePath) return null;
  try {
    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: launchArgs,
      protocolTimeout: 30000,
    });
    sharedBrowser = browser;
    browser.on('disconnected', () => {
      sharedBrowser = null;
      browserPromise = null;
    });
    return browser;
  } catch {
    browserPromise = null;
    return null;
  }
}

export type CaptureResult = {
  screenshot: string;
  width: number;
  height: number;
  blindSpots: BlindSpot[];
};

export type AiIssue = {
  severity: IssueSeverity;
  title: string;
  description: string;
  evidence: string;
  fix: string;
  code: string;
};

export type AiAnalysis = {
  score: number;
  summary: string;
  issues: AiIssue[];
  blindSpots: BlindSpot[];
  capabilities: Capability[];
};

export type AiErrorCode = 'rate_limited' | 'timeout' | 'failed';

function annotateError(err: unknown, code: AiErrorCode): Error {
  const e = err instanceof Error ? err : new Error(String(err));
  (e as Error & { code?: AiErrorCode }).code = code;
  return e;
}

const SEVERITIES: IssueSeverity[] = ['critical', 'warning', 'optimization'];

export function findBrowserPath(): string {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe') : '',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter((p): p is string => Boolean(p));
  for (const p of candidates) {
    try {
      if (existsSync(p)) return p;
    } catch {
      // ignore unreadable paths
    }
  }
  return '';
}

/**
 * Runs inside the headless browser. Returns blind spots (with viewport
 * coordinates in the 1280x800 screenshot space) for "invisible UI" failures.
 */
function collectProbes(): any[] {
  const vw = 1280;
  const vh = 800;
  const spots: any[] = [];

  const clampRect = (r: any) => {
    const x = Math.max(0, Math.min(vw - 4, Math.round(r.x)));
    const y = Math.max(0, Math.min(vh - 4, Math.round(r.y)));
    const width = Math.max(2, Math.round(Math.min(r.width, vw - x)));
    const height = Math.max(2, Math.round(Math.min(r.height, vh - y)));
    return { x, y, width, height };
  };

  const push = (label: string, category: string, severity: string, el: any, fix: string, code: string) => {
    if (!el || typeof el.getBoundingClientRect !== 'function') return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) return;
    spots.push(Object.assign({ label, category, severity, fix, code }, clampRect(r)));
  };

  const text = (el: any) => (el.textContent || '').trim();
  const labels = Array.from(document.querySelectorAll('label'));
  const hasLabel = (el: any) => {
    const id = el.id;
    if (id && labels.some((l: any) => l.htmlFor === id)) return true;
    if (el.getAttribute('aria-label')) return true;
    if (el.getAttribute('aria-labelledby')) return true;
    if (el.getAttribute('placeholder')) return true;
    if (el.closest('label')) return true;
    return false;
  };

  let els: any[] = Array.from(document.querySelectorAll('input'));
  for (const el of els) {
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    if (['hidden', 'submit', 'button', 'image', 'reset'].includes(type)) continue;
    if (!hasLabel(el)) {
      const fname = el.id || el.getAttribute('name') || 'field';
      push(
        'Unlabeled input: agent cannot tell what to enter',
        'Visual Ambiguity',
        'critical',
        el,
        'Wrap the field in a <label> or pair it with for/id.',
        `<label for="${fname}">Email</label>\n<input id="${fname}" type="email" />`,
      );
    }
  }

  els = Array.from(document.querySelectorAll('button'));
  for (const b of els) {
    if (text(b).length === 0 && !b.getAttribute('aria-label') && !b.getAttribute('title')) {
      push(
        'Unlabeled button',
        'Visual Ambiguity',
        'warning',
        b,
        'Add visible text or an aria-label.',
        '<button aria-label="Close">X</button>',
      );
    }
  }

  els = Array.from(document.querySelectorAll('a[href]'));
  for (const a of els) {
    const href = (a.getAttribute('href') || '').trim();
    if (text(a).length === 0 && !a.getAttribute('aria-label') && !a.getAttribute('title') && href.charAt(0) !== '#') {
      push(
        'Icon-only link: destination unknown',
        'Visual Ambiguity',
        'warning',
        a,
        'Add visible text or an aria-label.',
        '<a href="/pricing" aria-label="Pricing">Pricing</a>',
      );
    }
    if (href === '#' || href.toLowerCase().indexOf('javascript:') === 0) {
      push(
        'Placeholder link: no real destination',
        'Semantic Noise',
        'warning',
        a,
        'Point links at real URLs or convert them into buttons.',
        '<a href="/docs">Read the docs</a>',
      );
    }
  }

  els = Array.from(document.querySelectorAll('img'));
  for (const img of els) {
    if (!img.hasAttribute('alt')) {
      push(
        'Image without alt text',
        'Visual Ambiguity',
        'warning',
        img,
        'Add descriptive alt text, or alt="" for decorative images.',
        '<img src="hero.png" alt="Product hero" />',
      );
    }
  }

  els = Array.from(document.querySelectorAll('div,span,li,td,img'));
  for (const c of els) {
    if (c.onmouseover || c.onmouseenter || c.onmouseout || c.onmouseleave) {
      push(
        'Hover-only behavior: invisible to non-pointer agents',
        'Hover Trap',
        'warning',
        c,
        'Expose the same content as visible text or focusable controls.',
        '/* also reveal on focus */\nbutton:focus-visible + .menu { display: block; }',
      );
      continue;
    }
    if (c.onclick && !c.matches('a,button,input,select,textarea,label,[role]')) {
      push(
        'Click handler on non-semantic element',
        'Semantic Noise',
        'warning',
        c,
        'Replace with a real <button> or <a href>.',
        '<button type="button">Sign up</button>',
      );
    }
  }

  const divs = Array.from(document.querySelectorAll('div,section'));
  const candidates: any[] = [];
  for (const d of divs) {
    if (d.closest('nav') || d.querySelector('nav')) continue;
    const links = d.querySelectorAll('a[href]').length;
    if (links < 3) continue;
    const nested = d.querySelectorAll('div').length;
    if (nested < 4) continue;
    candidates.push({ el: d, links, nested });
  }
  candidates.sort((a, b) => b.nested + b.links - (a.nested + a.links));
  const picked: any[] = [];
  for (const cand of candidates) {
    if (picked.length >= 3) break;
    const overlaps = picked.some((prev) => prev.contains(cand.el) || cand.el.contains(prev));
    if (overlaps) continue;
    push(
      'Navigation built from generic divs',
      'Semantic Noise',
      'warning',
      cand.el,
      'Wrap the menu in <nav aria-label="Main"> and use <ul><li><a>.',
      '<nav aria-label="Main">\n  <ul>\n    <li><a href="/">Home</a></li>\n  </ul>\n</nav>',
    );
    picked.push(cand.el);
  }

  return spots.slice(0, 12);
}

export async function captureSnapshot(url: string): Promise<CaptureResult | null> {
  const browser = await getBrowser();
  if (!browser) return null;
  let page: import('puppeteer-core').Page | null = null;
  try {
    page = await browser.newPage();
    await page.setViewport(VIEWPORT);
    await page.setDefaultTimeout(15000);
    page.on('dialog', (dialog) => void dialog.dismiss());
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (type === 'media' || type === 'font') void req.abort();
      else void req.continue();
    });

    try {
      await page.goto(url, { waitUntil: 'load', timeout: 15000 });
    } catch {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    }
    await new Promise((resolve) => setTimeout(resolve, 350));

    const shot = await page.screenshot({ type: 'jpeg', quality: 60, encoding: 'base64' });
    const probeResult = await page.evaluate(collectProbes);
    const blindSpots: BlindSpot[] = Array.isArray(probeResult)
      ? probeResult.slice(0, 12).map((spot, idx) => ({
          id: `bs-${idx}`,
          label: String(spot.label || 'Blind spot').slice(0, 160),
          category: String(spot.category || 'Visual Ambiguity').slice(0, 40),
          severity: SEVERITIES.includes(spot.severity) ? spot.severity : 'warning',
          x: spot.x,
          y: spot.y,
          width: spot.width,
          height: spot.height,
          fix: spot.fix ? String(spot.fix).slice(0, 500) : undefined,
          code: spot.code ? String(spot.code).slice(0, 1200) : undefined,
        }))
      : [];

    return {
      screenshot: `data:image/jpeg;base64,${shot}`,
      width: VIEWPORT.width,
      height: VIEWPORT.height,
      blindSpots,
    };
  } catch {
    return null;
  } finally {
    if (page) await page.close().catch(() => undefined);
  }
}

export function simplifyDom(html: string, maxLines = 350): string {
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const lines: string[] = [];
  const SKIP = new Set(['script', 'style', 'noscript', 'template', 'svg', 'head']);
  const ATTRS: Record<string, string[]> = {
    a: ['href', 'aria-label', 'title'],
    img: ['src', 'alt', 'width', 'height'],
    input: ['type', 'name', 'placeholder', 'value', 'aria-label'],
    button: ['aria-label', 'type', 'title'],
    form: ['action', 'method'],
    iframe: ['src', 'title'],
    select: ['name', 'aria-label'],
    textarea: ['name', 'placeholder', 'aria-label'],
    label: ['for'],
  };

  const walk = (el: Element, depth: number) => {
    if (lines.length >= maxLines) return;
    const tag = (el.tagName || '').toLowerCase();
    if (!tag || SKIP.has(tag)) return;
    const attrs = (ATTRS[tag] || [])
      .filter((key) => el.hasAttribute(key))
      .map((key) => `${key}="${(el.getAttribute(key) || '').slice(0, 60)}"`)
      .join(' ');
    const id = el.id ? `#${el.id}` : '';
    const cls =
      el.className && typeof el.className === 'string' ? `.${el.className.split(/\s+/).slice(0, 2).join('.')}` : '';
    const head = `${'  '.repeat(Math.min(depth, 14))}${tag}${id}${cls}${attrs ? `[${attrs}]` : ''}`;
    lines.push(head);
    if (el.children.length === 0) {
      const t = (el.textContent || '').trim().replace(/\s+/g, ' ');
      if (t) lines[lines.length - 1] += ` "${t.slice(0, 80)}"`;
      return;
    }
    Array.from(el.children).forEach((child) => walk(child, depth + 1));
  };

  const root = document.body || document.documentElement;
  if (root) walk(root, 0);
  return lines.join('\n');
}

export function fallbackCapabilities(html: string): Capability[] {
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const bodyText = (document.body?.textContent || '').trim().replace(/\s+/g, ' ');
  const scriptCount = html.match(/<script[\s>]/gi)?.length ?? 0;
  const title = (document.title || '').trim();

  const inputs = Array.from(document.querySelectorAll('input')).filter(
    (el) => !['hidden', 'submit', 'button', 'image', 'reset'].includes((el.getAttribute('type') || 'text').toLowerCase()),
  );
  const labels = Array.from(document.querySelectorAll('label'));
  const unlabeled = inputs.filter((el) => {
    const id = el.id;
    return !(
      (id && labels.some((l) => l.htmlFor === id)) ||
      el.getAttribute('aria-label') ||
      el.getAttribute('aria-labelledby') ||
      el.getAttribute('placeholder') ||
      el.closest('label')
    );
  });
  const noAlt = Array.from(document.querySelectorAll('img')).filter((el) => !el.hasAttribute('alt'));
  const emptyButtons = Array.from(document.querySelectorAll('button')).filter(
    (el) => !(el.textContent || '').trim() && !el.getAttribute('aria-label') && !el.getAttribute('title'),
  );
  const links = Array.from(document.querySelectorAll('a[href]'));
  const emptyLinks = links.filter((el) => {
    const href = (el.getAttribute('href') || '').trim();
    return !(el.textContent || '').trim() && !el.getAttribute('aria-label') && !el.getAttribute('title') && !href.startsWith('#');
  });
  const fillerLinks = links.filter((el) => {
    const href = (el.getAttribute('href') || '').trim().toLowerCase();
    return href === '#' || href.startsWith('javascript:');
  });
  const hasMain = Boolean(document.querySelector('main'));
  const h1Count = document.querySelectorAll('h1').length;
  const hasNav = Boolean(document.querySelector('nav'));
  const hoverInline = html.includes('onmouseover') || html.includes('onmouseenter');
  const hasText = bodyText.length > 60;

  return [
    {
      name: 'Read content without JavaScript',
      pass: hasText || scriptCount === 0,
      detail: hasText ? `${Math.min(bodyText.length, 200)} chars of static text` : 'page is empty when scripts are disabled',
      snippet:
        !hasText && scriptCount > 0 ? '<noscript>Fallback content for agents and no-JS users</noscript>' : undefined,
    },
    {
      name: 'Find the page topic',
      pass: title.length > 0,
      detail: title ? `title: ${title.slice(0, 60)}` : 'no <title> present',
      snippet: title ? undefined : '<title>Page name — tagline</title>',
    },
    {
      name: 'Identify form fields',
      pass: unlabeled.length === 0,
      detail: unlabeled.length ? `${unlabeled.length} field(s) without a label or placeholder` : 'all fields labeled',
      snippet: unlabeled.length ? `<label for="${unlabeled[0]?.id || 'field'}">Label</label>\n<input id="${unlabeled[0]?.id || 'field'}" />` : undefined,
    },
    {
      name: 'Understand every button',
      pass: emptyButtons.length === 0,
      detail: emptyButtons.length ? `${emptyButtons.length} button(s) with no accessible name` : 'all buttons named',
      snippet: emptyButtons.length ? '<button aria-label="Close">X</button>' : undefined,
    },
    {
      name: 'Describe every image',
      pass: noAlt.length === 0,
      detail: noAlt.length ? `${noAlt.length} image(s) missing alt text` : 'all images have alt text',
      snippet: noAlt.length ? '<img src="hero.png" alt="Product hero" />' : undefined,
    },
    {
      name: 'Follow link destinations',
      pass: emptyLinks.length === 0 && fillerLinks.length === 0,
      detail:
        emptyLinks.length || fillerLinks.length
          ? `${emptyLinks.length + fillerLinks.length} link(s) with no readable destination`
          : 'links are readable and real',
      snippet: emptyLinks.length || fillerLinks.length ? '<a href="/pricing" aria-label="Pricing">Pricing</a>' : undefined,
    },
    {
      name: 'Parse page structure',
      pass: hasMain && h1Count === 1,
      detail: hasMain ? `${h1Count} h1, main landmark present` : 'no <main> landmark',
      snippet: hasMain ? undefined : '<main><h1>Page topic</h1>…</main>',
    },
    {
      name: 'Act without hover',
      pass: !hoverInline,
      detail: hoverInline ? 'hover/pointer event handlers detected' : 'no pointer-only interactions',
      snippet: hoverInline ? 'button:focus-visible + .menu { display: block; }' : undefined,
    },
    { name: 'Use semantic navigation', pass: hasNav || links.length < 3, detail: hasNav ? 'nav landmark present' : 'menu has no <nav> landmark', snippet: hasNav ? undefined : '<nav aria-label="Main navigation">…</nav>' },
  ];
}

const AI_SYSTEM_PROMPT = `You are an Agentic UX Auditor. Find "Invisible UI" failures that stop AI agents (missing labels, hover-only states, non-standard HTML). Provide (x,y) coordinates for each failure and the code to fix it. Group results into: Critical, Warning, and Optimization.`;

function clamp(value: unknown, lo: number, hi: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function asSeverity(value: unknown): IssueSeverity {
  return SEVERITIES.includes(value as IssueSeverity) ? (value as IssueSeverity) : 'optimization';
}

function asString(value: unknown, fallback = '', max = 400): string {
  if (typeof value !== 'string' && typeof value !== 'number') return fallback;
  return String(value).slice(0, max);
}

function sanitizeAi(raw: any): AiAnalysis {
  const issues: AiIssue[] = Array.isArray(raw.issues)
    ? raw.issues.slice(0, 12).map((i: any) => ({
        severity: asSeverity(i.severity),
        title: asString(i.title, 'Untitled finding', 200),
        description: asString(i.description, '', 900),
        evidence: asString(i.evidence, '', 300),
        fix: asString(i.fix, '', 500),
        code: asString(i.code, '', 1200),
      }))
    : [];

  const blindSpots: BlindSpot[] = Array.isArray(raw.blindSpots)
    ? raw.blindSpots.slice(0, 12).map((b: any, idx: number) => {
        const x = clamp(b.x, 0, VIEWPORT.width - 4);
        const y = clamp(b.y, 0, VIEWPORT.height - 4);
        return {
          id: `bs-${idx}`,
          label: asString(b.label, 'Blind spot', 160),
          category: asString(b.category, 'Visual Ambiguity', 40),
          severity: asSeverity(b.severity),
          x,
          y,
          width: clamp(b.width, 4, VIEWPORT.width - x),
          height: clamp(b.height, 4, VIEWPORT.height - y),
          fix: b.fix ? asString(b.fix, '', 500) : undefined,
          code: b.code ? asString(b.code, '', 1200) : undefined,
        };
      })
    : [];

  const capabilities: Capability[] = Array.isArray(raw.capabilities)
    ? raw.capabilities.slice(0, 12).map((c: any) => ({
        name: asString(c.name, 'Capability', 120),
        pass: Boolean(c.pass),
        detail: c.detail ? asString(c.detail, '', 300) : undefined,
        snippet: c.snippet ? asString(c.snippet, '', 1200) : undefined,
      }))
    : [];

  return {
    score: clamp(raw.score, 10, 100),
    summary: asString(raw.summary, '', 600),
    issues,
    blindSpots,
    capabilities,
  };
}

export async function analyzeWithVision(
  opts: {
    targetUrl: string;
    screenshot: string;
    domTree: string;
  },
  providers: AiProvider[] = [],
): Promise<AiAnalysis> {
  const list = providers.length
    ? providers
    : ([getPaidAiProvider(), ...getFreeAiProviders()].filter(Boolean) as AiProvider[]);
  if (!list.length) throw new Error('AI API key is not set');
  let lastErr: unknown = new Error('All AI providers failed');
  for (const provider of list) {
    try {
      return await analyzeWithProvider(opts, provider);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

async function analyzeWithProvider(opts: { targetUrl: string; screenshot: string; domTree: string }, cfg: AiProvider): Promise<AiAnalysis> {
  const { apiKey, model, baseUrl } = cfg;

  const schema = `Return ONLY valid JSON matching this shape:
{
  "score": <number 0-100>,
  "summary": "<one or two sentences>",
  "issues": [{ "severity": "critical|warning|optimization", "title": "...", "description": "...", "evidence": "...", "fix": "...", "code": "..." }],
  "blindSpots": [{ "category": "Visual Ambiguity|Hover Trap|Semantic Noise", "label": "<short name>", "severity": "...", "x": <px>, "y": <px>, "width": <px>, "height": <px>, "fix": "...", "code": "..." }],
  "capabilities": [{ "name": "<required capability test>", "pass": true, "detail": "...", "snippet": "<minimal reproduction code if the test fails>" }]
}`;

  const prompt = `Audit this page for agent-readability failures (target URL: "${opts.targetUrl}").

This is a BOM-less, localStorage-less simplified DOM snapshot of the page — there are no scripts, no browser globals, and no persisted storage:

${opts.domTree}

Detect areas where an agent can act (click, input, hover) from this snapshot, and return a checklist of required capability tests (e.g. clicking targets, text input, hovering, form submission, navigation). If any test fails, say which one and include the minimal reproduction code.

Coordinates in "blindSpots" must be in the screenshot's pixel space (the image is 1280x800) and stay within bounds.

${schema}`;

  const requestAnalysis = async (attempt = 0, jsonMode = true) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          max_tokens: 2000,
          ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
          messages: [
            { role: 'system', content: AI_SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: opts.screenshot, detail: 'auto' } },
              ],
            },
          ],
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 429 && attempt < 1) {
      const retryAfter = Number(response.headers.get('retry-after')) || 0;
      const waitMs = Math.min(retryAfter * 1000, 8000) || 1500 * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return requestAnalysis(attempt + 1, jsonMode);
    }

    if (!response.ok) {
      const text = await response.text();
      if (response.status === 429) {
        throw annotateError(new Error(`AI provider rate-limited: ${text.slice(0, 300)}`), 'rate_limited');
      }
      if (jsonMode && response.status === 400 && /structured output|json_object|response_format|json mode/i.test(text)) {
        return requestAnalysis(attempt, false);
      }
      throw annotateError(new Error(`AI provider ${response.status}: ${text.slice(0, 300)}`), 'failed');
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('AI provider returned an empty response');
    try {
      return parseAiContent(content);
    } catch (err) {
      console.error(
        'AI_RAW_FAIL len:',
        content.length,
        'finish:',
        data?.choices?.[0]?.finish_reason,
        'err:',
        (err as Error).message,
      );
      throw err;
    }
  };

  try {
    return await requestAnalysis();
  } catch (err) {
    if (err instanceof SyntaxError) {
      try {
        return await requestAnalysis();
      } catch (err2) {
        console.error('AI_ANALYSIS_FAILED:', (err2 as Error).message);
        throw annotateError(
          err2,
          (err2 as Error & { code?: AiErrorCode }).code ?? ((err2 as Error)?.name === 'AbortError' ? 'timeout' : 'failed'),
        );
      }
    }
    console.error('AI_ANALYSIS_FAILED:', (err as Error).message);
    throw annotateError(
      err,
      (err as Error & { code?: AiErrorCode }).code ?? ((err as Error)?.name === 'AbortError' ? 'timeout' : 'failed'),
    );
  }
}

function parseAiContent(content: string): AiAnalysis {
  let text = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new SyntaxError('AI response did not contain a JSON object');
  }
  text = text.slice(start, end + 1);
  text = escapeControlChars(text);
  text = text.replace(/,\s*([}\]])/g, '$1');
  return sanitizeAi(JSON.parse(text));
}

function escapeControlChars(text: string): string {
  let out = '';
  let inString = false;
  let escaped = false;
  for (const ch of text) {
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      out += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      out += ch;
      inString = !inString;
      continue;
    }
    if (inString && ch.charCodeAt(0) < 0x20) {
      out += '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0');
      continue;
    }
    out += ch;
  }
  return out;
}

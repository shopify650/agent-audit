import dns from 'node:dns';
import { isIP } from 'node:net';
import { JSDOM, VirtualConsole } from 'jsdom';

export function normalizeUrl(url: string) {
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }
  return url;
}

export function isPrivateIp(address: string) {
  const version = isIP(address);
  if (version === 4) {
    const [a, b] = address.split('.').map((part) => Number(part));
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  if (version === 6) {
    const lower = address.toLowerCase();
    return (
      lower === '::' ||
      lower === '::1' ||
      lower.startsWith('fe80') ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('::ffff:')
    );
  }
  return false;
}

export async function assertPublicHost(rawUrl: string) {
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs are allowed');
  }
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
  if (!hostname) {
    throw new Error('A valid hostname is required');
  }
  if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new Error('Local hosts are not allowed');
  }
  const { address } = await new Promise<{ address: string; family: number }>((resolve, reject) => {
    dns.lookup(hostname, (err, address, family) => {
      if (err) reject(err);
      else resolve({ address, family });
    });
  });
  if (isPrivateIp(address)) {
    throw new Error('Private or reserved addresses are not allowed');
  }
}

export async function fetchProtected(rawUrl: string, redirects = 0): Promise<Response> {
  await assertPublicHost(rawUrl);
  const response = await fetch(rawUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' },
    redirect: 'manual',
  });
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    if (redirects >= 5) {
      throw new Error('Too many redirects');
    }
    const location = response.headers.get('location');
    if (!location) {
      throw new Error('Redirect response is missing a location header');
    }
    return fetchProtected(new URL(location, rawUrl).href, redirects + 1);
  }
  return response;
}

export type Issue = {
  id: string;
  severity: 'critical' | 'warning' | 'optimization';
  title: string;
  description: string;
  evidence: string;
  fix: string;
  snippet: string;
  count?: number;
};

type Rule = {
  weight: number;
  severity: Issue['severity'];
};

function snip(node: Element | null, max = 160): string {
  if (!node) return '';
  let html = node.outerHTML.replace(/\s+/g, ' ');
  if (html.length > max) html = html.slice(0, max) + '…';
  return html;
}

function textOf(node: Element | null): string {
  if (!node) return '';
  return (node.textContent || '').trim();
}

export function createAuditResult(targetUrl: string, html: string) {
  const issues: Issue[] = [];
  const virtualConsole = new VirtualConsole();
  const dom = new JSDOM(html, { virtualConsole });
  const { document } = dom.window;
  const bodyText = (document.body?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 1000);

  const scriptCount = html.match(/<script[\s>]/gi)?.length ?? 0;
  const inlineJs = html.includes('onclick') || html.includes('onmouseover') || html.includes('onmouseenter');

  const add = (id: string, rule: Rule, title: string, description: string, fix: string, opts?: { evidence?: string; snippet?: string; count?: number }) => {
    issues.push({
      id,
      severity: rule.severity,
      title,
      description,
      fix,
      evidence: opts?.evidence ?? '',
      snippet: opts?.snippet ?? '',
      count: opts?.count,
    });
  };

  const hasText = bodyText.length > 60;
  if (scriptCount > 0 && !hasText) {
    add(
      'js-rendered',
      { weight: 20, severity: 'critical' },
      'Content is rendered entirely by JavaScript',
      'An agent that does not execute scripts reads an empty page. If the page depends on client-side rendering to show meaningful content, machines cannot see it.',
      'Provide static HTML content (SSR/SSG) or an agent-accessible fallback for the primary content.',
      { evidence: 'visible text is almost empty while script tags are present', snippet: snip(document.body?.firstElementChild ?? document.body) },
    );
  }

  const title = (document.title || '').trim();
  if (!title) {
    add(
      'title',
      { weight: 18, severity: 'critical' },
      'Page has no title',
      'The document <title> is empty or missing, so an agent cannot quickly identify what this page is about.',
      'Add a descriptive <title> tag (50–60 characters).',
      { evidence: '<title> is empty or absent' },
    );
  }

  if (!document.querySelector('meta[name="viewport"]')) {
    add(
      'viewport',
      { weight: 18, severity: 'critical' },
      'Missing mobile viewport meta tag',
      'Without a viewport meta tag, mobile agents may receive a desktop layout they cannot parse reliably.',
      'Add <meta name="viewport" content="width=device-width, initial-scale=1">.',
      { evidence: 'no viewport meta tag found' },
    );
  }

  const htmlEl = document.documentElement;
  if (!htmlEl || !htmlEl.getAttribute('lang')) {
    add(
      'lang',
      { weight: 10, severity: 'warning' },
      'Missing language declaration',
      'The <html> element has no lang attribute, so agents cannot infer the page language for parsing or translation.',
      'Set lang on the <html> element, e.g. <html lang="en">.',
      { evidence: '<html> has no lang attribute' },
    );
  }

  const inputs = Array.from(document.querySelectorAll('input')).filter(
    (el) => !['hidden', 'submit', 'button', 'image'].includes((el.getAttribute('type') || 'text').toLowerCase()),
  );
  const labels = Array.from(document.querySelectorAll('label'));
  const unlabeledInputs = inputs.filter((el) => {
    const id = el.id;
    const hasLabel =
      (id && labels.some((label) => label.htmlFor === id)) ||
      el.getAttribute('aria-label') ||
      el.getAttribute('aria-labelledby') ||
      el.getAttribute('placeholder') ||
      el.closest('label');
    return !hasLabel;
  });
  if (unlabeledInputs.length > 0) {
    add(
      'unlabeled-input',
      { weight: 18, severity: 'critical' },
      'Form inputs lack accessible labels',
      'Inputs without a label, aria-label, or placeholder give an agent no way to know what value belongs in the field.',
      'Wrap the field in a <label>, add a for/id pairing, or an aria-label.',
      { count: unlabeledInputs.length, evidence: `${unlabeledInputs.length} unlabeled input${unlabeledInputs.length === 1 ? '' : 's'}`, snippet: snip(unlabeledInputs[0]) },
    );
  }

  const imgs = Array.from(document.querySelectorAll('img'));
  const noAlt = imgs.filter((el) => !el.hasAttribute('alt'));
  if (noAlt.length > 0) {
    add(
      'missing-alt',
      { weight: 10, severity: 'warning' },
      'Images missing alt text',
      'Images without alt text carry no semantic meaning for an agent; important information encoded in images is lost.',
      'Add descriptive alt text, or alt="" for purely decorative images.',
      { count: noAlt.length, evidence: `${noAlt.length} image${noAlt.length === 1 ? '' : 's'} without alt`, snippet: snip(noAlt[0]) },
    );
  }

  const emptyLinks = Array.from(document.querySelectorAll('a[href]')).filter((el) => {
    const href = (el.getAttribute('href') || '').trim();
    return !textOf(el) && !el.getAttribute('aria-label') && !el.getAttribute('title') && !href.startsWith('#');
  });
  if (emptyLinks.length > 0) {
    add(
      'empty-links',
      { weight: 10, severity: 'warning' },
      'Links have no accessible text',
      'Icon-only or blank links are unreadable to agents, which cannot guess the destination.',
      'Add visible text, an aria-label, or a title attribute to every link.',
      { count: emptyLinks.length, evidence: `${emptyLinks.length} empty link${emptyLinks.length === 1 ? '' : 's'}`, snippet: snip(emptyLinks[0]) },
    );
  }

  const fillerLinks = Array.from(document.querySelectorAll('a[href]')).filter((el) => {
    const href = (el.getAttribute('href') || '').trim().toLowerCase();
    return href === '#' || href === 'javascript:void(0)' || href.startsWith('javascript:');
  });
  if (fillerLinks.length > 0) {
    add(
      'filler-links',
      { weight: 8, severity: 'warning' },
      'Links use placeholder destinations',
      'href="#" or javascript: links carry no real destination, so agents cannot follow or understand the action.',
      'Point links at real URLs or convert them into buttons with a labeled action.',
      { count: fillerLinks.length, evidence: `${fillerLinks.length} placeholder link${fillerLinks.length === 1 ? '' : 's'}`, snippet: snip(fillerLinks[0]) },
    );
  }

  const emptyButtons = Array.from(document.querySelectorAll('button')).filter(
    (el) => !textOf(el) && !el.getAttribute('aria-label') && !el.getAttribute('title'),
  );
  if (emptyButtons.length > 0) {
    add(
      'empty-buttons',
      { weight: 10, severity: 'warning' },
      'Buttons have no accessible text',
      'Buttons that render as icons without a label cannot be understood or described by an agent.',
      'Add visible text or an aria-label to the button.',
      { count: emptyButtons.length, evidence: `${emptyButtons.length} unlabeled button${emptyButtons.length === 1 ? '' : 's'}`, snippet: snip(emptyButtons[0]) },
    );
  }

  const clickable = Array.from(document.querySelectorAll('div,span,li,img,td')).filter((el) => el.hasAttribute('onclick'));
  if (clickable.length > 0) {
    add(
      'clickable-divs',
      { weight: 10, severity: 'warning' },
      'Click handlers live on non-interactive elements',
      'Actions wired via onclick on divs/spans are invisible to agents, which look for semantic controls like buttons and links.',
      'Replace with <button> or <a href> and add a keyboard-accessible label.',
      { count: clickable.length, evidence: `${clickable.length} clickable non-interactive element${clickable.length === 1 ? '' : 's'}`, snippet: snip(clickable[0]) },
    );
  }

  if (inlineJs && (html.includes('onmouseover') || html.includes('onmouseenter'))) {
    add(
      'hover',
      { weight: 10, severity: 'warning' },
      'Important information may appear on hover',
      'Hover-only reveal patterns are invisible to non-pointer agents that never move a cursor over the page.',
      'Expose the same information as visible text or focusable content.',
      { evidence: 'hover/pointer event handlers detected' },
    );
  }

  const h1s = Array.from(document.querySelectorAll('h1'));
  if (h1s.length === 0) {
    add(
      'headings',
      { weight: 10, severity: 'warning' },
      'No primary heading',
      'Without a single <h1>, agents cannot identify the page topic or the top of the content hierarchy.',
      'Add exactly one <h1> describing the page.',
    );
  } else if (h1s.length > 1) {
    add(
      'headings',
      { weight: 8, severity: 'warning' },
      'Multiple primary headings',
      'More than one <h1> blurs the topic signal an agent uses to understand the page.',
      'Keep a single <h1> and demote the others to <h2>.',
      { count: h1s.length, evidence: `${h1s.length} h1 elements` },
    );
  } else {
    const levels = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map((el) => Number(el.tagName[1]));
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] > levels[i - 1] + 1) {
        add(
          'heading-skips',
          { weight: 5, severity: 'optimization' },
          'Heading hierarchy skips levels',
          'Heading levels that jump (e.g. <h2> directly to <h6>) break the sequential outline agents build to map the page. Non-visual agents rely on an h1→h2→h3 structure, and skipped levels make logical navigation traversal unreliable.',
          'Restructure the sidebar and content headings so levels advance one at a time (h2 followed by h3), matching the visual hierarchy.',
          { evidence: `h${levels[i - 1]} followed by h${levels[i]}`, snippet: snip(document.querySelectorAll('h1,h2,h3,h4,h5,h6')[i]) },
        );
        break;
      }
    }
  }

  if (!document.querySelector('main')) {
    add(
      'landmarks',
      { weight: 8, severity: 'warning' },
      'No <main> landmark',
      'Without a <main> landmark, agents cannot reliably distinguish the side navigation, header elements, and the primary content entry point. <main> is the signal for where to start reading.',
      'Wrap the primary content area in <main>, and put the side navigation in a <nav> or <aside> landmark so its links are clearly separate from the content.',
    );
  }

  const links = Array.from(document.querySelectorAll('a[href]'));
  if (!document.querySelector('nav') && links.length >= 3) {
    add(
      'nav-landmark',
      { weight: 5, severity: 'optimization' },
      'Navigation has no landmark',
      'Multiple links exist without a <nav> landmark, making the global navigation harder for agents to find.',
      'Wrap the main menu in <nav aria-label="Main navigation">.',
    );
  }

  if (!document.querySelector('meta[name="description"]') || !(document.querySelector('meta[name="description"]')?.getAttribute('content') || '').trim()) {
    add(
      'meta-description',
      { weight: 5, severity: 'optimization' },
      'Missing meta description',
      'Without a meta description, agents and search engines have to guess what the page is about.',
      'Add <meta name="description" content="…"> summarizing the page.',
    );
  }

  const ids = Array.from(document.querySelectorAll('[id]')).map((el) => el.id);
  const seen = new Map<string, number>();
  for (const id of ids) seen.set(id, (seen.get(id) || 0) + 1);
  const dupIds = Array.from(seen.entries()).filter(([, n]) => n > 1);
  if (dupIds.length > 0) {
    add(
      'duplicate-ids',
      { weight: 5, severity: 'optimization' },
      'Duplicate element IDs',
      'Duplicate ids break label-for associations and fragment navigation for agents.',
      'Ensure every id on the page is unique.',
      { count: dupIds.length, evidence: `${dupIds.length} duplicated id${dupIds.length === 1 ? '' : 's'}: ${dupIds.slice(0, 4).map(([id]) => `#${id}`).join(', ')}` },
    );
  }

  const divCount = document.querySelectorAll('div').length;
  const semanticCount = document.querySelectorAll('header,footer,main,nav,section,article,aside,ul,ol,table').length;
  if (divCount > 60 && semanticCount > 0 && divCount / semanticCount > 8) {
    add(
      'div-soup',
      { weight: 5, severity: 'optimization' },
      'Layout relies on generic divs',
      'A high ratio of divs to semantic elements adds parsing noise. Agents and screen readers struggle to distinguish meaningful structure — like navigation — when it is buried in deep, generic div nests.',
      'Replace generic wrapper divs in the navigation and layout with semantic markup: <nav>, <ul>, <li>, <aside>, <section>, <article>.',
      { evidence: `${divCount} divs vs ${semanticCount} semantic elements`, snippet: snip(document.querySelectorAll('div')[Math.min(10, divCount - 1)]) },
    );
  }

  const candidate = { el: null as Element | null, divs: 0, links: 0 };
  Array.from(document.querySelectorAll('div, aside')).forEach((el) => {
    if (el === document.body || el === document.documentElement || el.closest('main,article')) return;
    const links = el.querySelectorAll('a[href]').length;
    if (links < 3) return;
    const divs = el.querySelectorAll('div').length;
    if (divs >= 6 && divs / links >= 2 && divs > candidate.divs) {
      candidate.el = el;
      candidate.divs = divs;
      candidate.links = links;
    }
  });
  if (candidate.el) {
    const cls = (String(candidate.el.className || '').trim() || candidate.el.id).split(/\s+/)[0];
    const hint = cls ? ` (e.g. class "${cls}")` : '';
    add(
      'sidebar-nav',
      { weight: 8, severity: 'warning' },
      'Navigation is built from generic divs',
      'A cluster of links is nested in plain divs instead of semantic menu markup. Agents and screen readers cannot tell where one menu item ends and the next begins, so the navigation reads as parsing noise.',
      'Wrap the menu in <nav aria-label="…"> and structure items as <ul><li><a>. Use <aside> for complementary links like a sidebar.',
      { evidence: `${candidate.divs} nested divs wrapping ${candidate.links} links${hint}`, snippet: snip(candidate.el) },
    );
  }

  const severityPoints = { critical: 18, warning: 10, optimization: 5 };
  const deduction = issues.reduce((total, issue) => total + severityPoints[issue.severity], 0);
  const score = Math.max(10, Math.min(100, 100 - deduction));

  const summary = `This page is ${
    score >= 85 ? 'mostly agent-ready' : score >= 60 ? 'partially agent-ready' : 'high friction for agent navigation'
  } because ${issues[0]?.title.toLowerCase() || 'the core task path lacks clarity'}. ${issues.length} potential issue${issues.length === 1 ? '' : 's'} found.`;

  const flowSteps = [
    'Fetch the page and read the static HTML as an agent would, without executing scripts.',
    'Parse the document title, meta tags, and primary heading to establish what the page is about.',
    'Inventory interactive controls and confirm each has an accessible name.',
    'Verify the primary task path is reachable via semantics, not hover or pointer-only gestures.',
    'Check that content does not vanish when scripts are disabled.',
  ];

  return {
    targetUrl,
    score,
    summary,
    issues,
    flowSteps,
    snapshot: bodyText || '(no readable text found)',
    checkedAt: Date.now(),
  };
}

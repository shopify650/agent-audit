import { existsSync, mkdirSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const SITE_URL = 'https://agenaudits.vercel.app';
const CONTACT_EMAIL = 'muhammadhamzainfo904@gmail.com';
const UPDATED = 'August 13, 2026';

const browserCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe')
    : '',
].filter(Boolean);

const executablePath = browserCandidates.find((p) => existsSync(p));
if (!executablePath) {
  console.error('No Chromium/Edge executable found. Set CHROME_PATH to generate PDFs.');
  process.exit(1);
}

const DOC_CSS = `
  @page { size: A4; margin: 18mm 16mm; }
  html { -webkit-print-color-adjust: exact; }
  body {
    font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;
    font-size: 11px;
    line-height: 1.55;
    color: #251f19;
    margin: 0;
  }
  .brand { font-size: 13px; font-weight: 600; letter-spacing: -0.01em; }
  .brand em { font-style: normal; color: #a15800; }
  h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; margin: 14px 0 2px; }
  .meta { font-size: 10px; color: #655e57; margin: 0 0 16px; }
  .rule { border: none; border-top: 1px solid #ddd8d3; margin: 12px 0 18px; }
  h2 {
    font-size: 13px;
    font-weight: 600;
    color: #251f19;
    margin: 16px 0 4px;
    break-after: avoid;
  }
  p { margin: 5px 0; }
  ul { margin: 5px 0 5px 0; padding-left: 18px; }
  li { margin: 3px 0; }
  a { color: #a15800; text-decoration: none; }
  .note {
    background: #f1efec;
    border-left: 3px solid #a15800;
    padding: 8px 12px;
    margin: 10px 0;
    font-size: 10.5px;
  }
`;

function document(title, intro, sections, footerNote) {
  const sectionsHtml = sections
    .map((s, i) => `
      <section>
        <h2>${i + 1}. ${s.heading}</h2>
        ${s.body}
      </section>`)
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${title} — AGEN</title>
<style>${DOC_CSS}</style>
</head>
<body>
  <p class="brand">AGEN<em>.</em></p>
  <h1>${title}</h1>
  <p class="meta">Agent Audits · Last updated: ${UPDATED}</p>
  <hr class="rule" />
  ${intro}
  ${sectionsHtml}
  ${footerNote ? `<div class="note">${footerNote}</div>` : ''}
</body>
</html>`;
}

const terms = document(
  'Terms of Service',
  `<p>These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of AGEN (the &ldquo;Service&rdquo;),
  operated by Agent Audits at ${SITE_URL}. By creating an account or using the Service, you agree to be bound by
  these Terms. If you do not agree, do not use the Service.</p>`,
  [
    {
      heading: 'The Service',
      body: `<p>AGEN scans public websites and produces reports that surface agent-readiness issues &mdash; how well a
      page can be read, parsed, and used by AI agents and AI-driven browsers. We deliver reports, scores, and suggested
      fixes through our website and dashboard.</p>`,
    },
    {
      heading: 'Accounts',
      body: `<p>To use paid features you must create an account with a valid email address and password. You are
      responsible for maintaining the confidentiality of your credentials and for all activity that occurs under your
      account. You agree to provide accurate information and to update it when it changes.</p>`,
    },
    {
      heading: 'Acceptable use',
      body: `<p>You agree to use the Service only for lawful purposes and to:</p>
      <ul>
        <li>audit only pages you own or are authorized to scan;</li>
        <li>refrain from submitting harmful payloads, attempting to bypass security controls, rate limits, or access
        restrictions, or interfering with the operation of the Service;</li>
        <li>not resell, redistribute, or build competing products from the Service without our written permission; and</li>
        <li>comply with all applicable laws and regulations.</li>
      </ul>
      <p>We may throttle, suspend, or terminate accounts that violate these rules.</p>`,
    },
    {
      heading: 'Payments, billing, and subscriptions',
      body: `<p>Paid plans are billed as recurring subscriptions on a monthly or annual basis. All payments are
      processed by <strong>Whop</strong>. When you subscribe, you provide payment details directly to Whop, and your
      subscription renews automatically until you cancel.</p>
      <p>Prices are displayed at checkout and may change over time; changes will not affect a current billing cycle.
      Applicable taxes are collected as required. By subscribing, you also agree to
      <a href="https://whop.com/legal/">Whop&rsquo;s Terms of Service and Privacy Policy</a> for the handling of your
      payment account.</p>`,
    },
    {
      heading: 'Cancellation and refunds',
      body: `<p>You may cancel your subscription at any time from your dashboard or the Whop customer portal.
      Cancellation stops future charges at the end of the current billing period; you retain access until then. Refunds
      are handled in accordance with Whop&rsquo;s refund policy and applicable law. If you believe a charge is incorrect,
      contact us at ${CONTACT_EMAIL}.</p>`,
    },
    {
      heading: 'Intellectual property',
      body: `<p>The Service, including its software, design, and report format, is owned by Agent Audits. Reports reflect
      our analysis of publicly accessible pages and do not transfer any rights in the scanned websites, which remain
      with their owners. You retain all rights to the URLs and content you submit; you grant us a limited license to
      store, process, and analyze that content solely to provide the Service to you.</p>`,
    },
    {
      heading: 'Disclaimers',
      body: `<p>Reports are based on heuristic and automated checks and are provided for informational purposes. They are
      not guarantees of ranking, indexing, or performance. The Service is provided &ldquo;as is&rdquo; and &ldquo;as
      available&rdquo; without warranties of any kind, express or implied, including merchantability and fitness for a
      particular purpose. We do not warrant uninterrupted or error-free operation.</p>`,
    },
    {
      heading: 'Limitation of liability',
      body: `<p>To the maximum extent permitted by law, Agent Audits shall not be liable for any indirect, incidental,
      special, consequential, or punitive damages, or for lost profits or data, arising out of your use of the Service.
      Our total aggregate liability shall not exceed the amounts you paid for the Service in the twelve months preceding
      the claim.</p>`,
    },
    {
      heading: 'Termination',
      body: `<p>You may stop using the Service at any time and may request deletion of your account data as described in
      the Privacy Policy. We may suspend or terminate your access if you breach these Terms. Sections that by their
      nature should survive termination will survive.</p>`,
    },
    {
      heading: 'Changes to these Terms',
      body: `<p>We may update these Terms from time to time. When we make material changes, we will update the
      &ldquo;Last updated&rdquo; date above and, where practical, notify you. Continued use of the Service after changes
      take effect constitutes acceptance of the revised Terms.</p>`,
    },
    {
      heading: 'Governing law',
      body: `<p>These Terms are governed by the laws of the jurisdiction in which the operator of the Service is
      established, without regard to conflict-of-law principles. If you are a consumer in a jurisdiction whose mandatory
      consumer-protection laws apply, those laws continue to apply to you.</p>`,
    },
    {
      heading: 'Contact',
      body: `<p>Questions about these Terms? Email ${CONTACT_EMAIL}. Also see our
      <a href="${SITE_URL}/privacy">Privacy Policy</a>.</p>`,
    },
  ],
  `Subscriptions to the Service are billed and collected by Whop (whop.com). This document is provided to Whop as the
  operator&rsquo;s Terms of Service.`,
);

const privacy = document(
  'Privacy Policy',
  `<p>This Privacy Policy explains what information Agent Audits collects when you use AGEN, how it is used and stored,
  and the choices you have. It also explains how payments are handled by Whop when you subscribe to a paid plan.</p>`,
  [
    {
      heading: 'Information we collect',
      body: `<ul>
        <li><strong>Account information.</strong> When you create an account, we collect your email address and any name
        you provide.</li>
        <li><strong>Audit and scan data.</strong> When you run an audit or site scan, we collect the URL you submit and
        the resulting report &mdash; readiness score, findings, suggested fixes, and a snapshot of the scanned page
        content.</li>
        <li><strong>Usage information.</strong> Your plan, monthly audit counts, and quota usage.</li>
        <li><strong>Technical data.</strong> Standard request data such as IP address and user agent, and a device
        identifier used for sign-in and abuse prevention.</li>
        <li><strong>Payment information.</strong> We do not see or store your card details. Payments are processed by
        Whop, which collects payment data directly from you.</li>
      </ul>`,
    },
    {
      heading: 'How we use information',
      body: `<p>We use the information above to provide and operate the Service: generating audit reports, enforcing
      quotas, preventing abuse, securing accounts, communicating about your account, and complying with legal
      obligations. We do not sell your personal data.</p>`,
    },
    {
      heading: 'What happens when you audit a page',
      body: `<p>When you submit a URL, our servers fetch the page and analyze its rendered HTML. To generate findings, we
      may send page content to third-party AI providers. We block access to private and internal network addresses and
      only share the minimum content needed to deliver the report.</p>`,
    },
    {
      heading: 'How information is stored',
      body: `<p>Your account and reports are stored securely in our cloud database (Supabase). We keep only a sign-in
      token in your browser so you stay logged in. You can delete individual audits and scans from your dashboard at any
      time.</p>`,
    },
    {
      heading: 'Cookies and local storage',
      body: `<p>We use browser local storage to persist your sign-in session. Hosting and analytics (Vercel) process
      standard request logs. We do not use advertising cookies or third-party ad trackers.</p>`,
    },
    {
      heading: 'Payments via Whop',
      body: `<p>Paid subscriptions are processed by <strong>Whop</strong> (whop.com). When you check out, your payment
      information is shared with Whop under <a href="https://whop.com/legal/">Whop&rsquo;s Privacy Policy</a>, not with
      us. We receive only the subscription and plan status we need to grant access.</p>`,
    },
    {
      heading: 'Third-party services',
      body: `<p>We use the following providers to run the Service: Supabase for authentication and data storage; Vercel
      for hosting and analytics; OpenRouter, Google Gemini, Groq, and OpenAI to analyze pages and generate reports; and
      Whop to process payments. We only share the data needed to deliver the feature you are using.</p>`,
    },
    {
      heading: 'Data retention',
      body: `<p>We retain audit and scan data as long as your account is active. Deleting an audit or scan from your
      dashboard removes it from the Service. We may retain backups and records required by law or for security for a
      reasonable period after deletion.</p>`,
    },
    {
      heading: 'Your rights and choices',
      body: `<p>You can access and delete audits and scans from your dashboard, update your profile in account settings,
      and close your account by contacting us. Depending on your jurisdiction, you may have additional rights to
      request access, correction, deletion, or portability of your data.</p>`,
    },
    {
      heading: 'Children',
      body: `<p>The Service is not directed to children under 13 (or the minimum age in your jurisdiction). We do not
      knowingly collect personal information from children.</p>`,
    },
    {
      heading: 'International data transfers',
      body: `<p>We operate through service providers located in the United States and elsewhere. By using the Service,
      your information may be processed in those locations. We rely on appropriate safeguards for any transfers.</p>`,
    },
    {
      heading: 'Changes to this Policy',
      body: `<p>We may update this Privacy Policy from time to time. We will update the &ldquo;Last updated&rdquo; date
      above and notify you where practical. Continued use of the Service after changes take effect constitutes
      acceptance of the revised Policy.</p>`,
    },
    {
      heading: 'Contact',
      body: `<p>Questions about this Privacy Policy? Email ${CONTACT_EMAIL}. Also see our
      <a href="${SITE_URL}/terms">Terms of Service</a>.</p>`,
    },
  ],
  `Payments for the Service are processed by Whop (whop.com). This document is provided to Whop as the
  operator&rsquo;s Privacy Policy.`,
);

async function renderPdf(html, outPath) {
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: outPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '14mm', bottom: '16mm', left: '0mm', right: '0mm' },
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `
        <div style="width:100%;padding:0 16mm;font-size:8px;color:#655e57;font-family:Helvetica,Arial,sans-serif;">
          <span style="float:right;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          <span>AGEN.</span>
        </div>`,
    });
  } finally {
    await browser.close();
  }
}

const outDir = path.join(process.cwd(), 'public', 'legal');
mkdirSync(outDir, { recursive: true });

const files = [
  { html: terms, name: 'terms-of-service.pdf', label: 'Terms of Service' },
  { html: privacy, name: 'privacy-policy.pdf', label: 'Privacy Policy' },
];

for (const f of files) {
  const outPath = path.join(outDir, f.name);
  await renderPdf(f.html, outPath);
  console.log(`Generated ${outPath} (${(existsSync(outPath) ? 1 : 0) ? 'ok' : 'fail'})`);
}

writeFileSync(path.join(outDir, 'README.txt'), `Generated ${UPDATED}.\n`);
console.log('Done.');

import Link from 'next/link';
import {
  ArrowRight,
  Braces,
  ImageIcon,
  Link2,
  MousePointerClick,
  TextCursorInput,
  TriangleAlert,
} from 'lucide-react';

type Finding = {
  title: string;
  evidence: string;
  fix: string;
};

type Example = {
  brand: string;
  issue: string;
  url?: string;
  score?: number;
  before: string;
  after: string;
  impact: string;
  findings?: Finding[];
};

const examples: Example[] = [
  {
    brand: 'Shopify storefront',
    issue: 'Icon-only cart button',
    before: '<button class="cart-icon"></button>',
    after: '<button aria-label="Open shopping cart" class="cart-icon">🛒</button>',
    impact: 'Cart entry point was invisible to agents; now labeled and reachable.',
  },
  {
    brand: 'SaaS marketing site',
    issue: 'Content rendered by JavaScript',
    before: '<div id="app"></div>',
    after: '<main><section aria-labelledby="hero-title"><h1 id="hero-title">…</h1></section></main>',
    impact: 'Agents reading raw HTML saw an empty shell; now the page is statically rendered.',
  },
  {
    brand: 'Banking portal',
    issue: 'Unlabeled form fields',
    before: '<input type="text" name="user">',
    after: '<label for="user">Username</label>\n<input type="text" id="user" name="user">',
    impact: 'Autofill and agent-driven completion now know what each field expects.',
  },
  {
    brand: 'E-commerce checkout',
    issue: 'Pricing hidden on hover',
    before: '.tooltip { display: none; }\n.item:hover .tooltip { display: block; }',
    after: '<p class="tooltip" aria-expanded="true">Free shipping on orders over $50</p>',
    impact: 'Agents no longer miss fees and shipping details that change purchase decisions.',
  },
  {
    brand: 'News publisher',
    issue: 'No heading hierarchy',
    before: '<h3>Top story</h3>\n<h3>More stories</h3>',
    after: '<h1>Top story</h1>\n<h2>More stories</h2>',
    impact: 'Agents can now traverse the article outline and quote the correct headline.',
  },
  {
    brand: 'Dev tool docs',
    issue: 'Click handlers on divs',
    before: '<div onclick="expand()">Copy</div>',
    after: '<button type="button" aria-expanded="false">Copy</button>',
    impact: 'Actions became discoverable, focusable, and keyboard operable.',
  },
];

export default function ShowcasePage() {
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-8 sm:py-24">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">Showcase</p>
        <h1 className="mt-4 text-5xl font-normal tracking-[-0.03em]">Agent-Vision in action.</h1>
        <p className="mt-5 text-lg leading-8 text-[color:var(--body)]">
          Real failure patterns Agent-Audit detects, and the one-line fix that unlocks the page for machines.
        </p>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {examples.map((example) => (
          <div key={example.brand} className="card flex flex-col p-6">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-[color:var(--ink)]">{example.brand}</p>
              <span className="rounded-full bg-[var(--warning)]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--warning)]">
                {example.issue}
              </span>
            </div>
            <div className="mt-5 space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">Before</p>
                <pre className="mt-2 overflow-x-auto rounded-xl border border-[var(--error)]/20 bg-[var(--error)]/10 p-3 font-mono text-xs text-[var(--error)]">{example.before}</pre>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">After</p>
                <pre className="mt-2 overflow-x-auto rounded-xl border border-[var(--card-border)] bg-[var(--surface-white)] p-3 font-mono text-xs text-[color:var(--ink)]">{example.after}</pre>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-[color:var(--body)]">{example.impact}</p>
          </div>
        ))}
      </div>

      <section className="mx-auto mt-20 max-w-[1200px]">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">Failure patterns</p>
          <h2 className="mt-4 text-4xl font-normal tracking-[-0.02em]">The six problems we see most.</h2>
          <p className="mt-4 text-lg leading-8 text-[color:var(--body)]">
            These patterns show up on sites of every size. Each one is detectable in seconds and fixable in one commit.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: MousePointerClick, title: 'Unlabeled actions', body: 'Icon-only buttons and bare links with no accessible name.' },
            { icon: TextCursorInput, title: 'Broken form flows', body: 'Missing labels, ids, or autocomplete hints that block completion.' },
            { icon: Braces, title: 'JS-only rendering', body: 'Content that never reaches the DOM until scripts run.' },
            { icon: ImageIcon, title: 'Meaningless alt text', body: 'Empty or keyword-stuffed alt attributes on informative images.' },
            { icon: TriangleAlert, title: 'Ambiguous links', body: '“Click here” and “Learn more” anchors with zero context.' },
            { icon: Link2, title: 'Hidden pricing', body: 'Fees and terms tucked behind hover or accordion interactions.' },
          ].map((item) => (
            <div key={item.title} className="card p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--warning)]/10 text-[var(--warning)]">
                <item.icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              </div>
              <p className="mt-4 text-lg font-medium text-[color:var(--ink)]">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--body)]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto mt-20 max-w-3xl rounded-[24px] border border-[var(--ink)] bg-[var(--ink)] p-10 text-center text-[color:var(--canvas)]">
        <h2 className="text-4xl font-normal tracking-[-0.03em]">See it on your own site.</h2>
        <p className="mx-auto mt-4 max-w-md text-[color:var(--canvas)]/80">Paste your URL into the X-Ray and get the full list of failures — with fixes.</p>
        <div className="mt-8 flex justify-center">
          <Link href="/dashboard/new" className="btn btn-lg bg-white text-[color:var(--ink)] hover:bg-[var(--canvas-soft)]">
            <span className="btn-chip">
              <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </span>
            Run an X-Ray
          </Link>
        </div>
      </div>
    </div>
  );
}

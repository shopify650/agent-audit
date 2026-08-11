export type Severity = 'critical' | 'warning' | 'optimization';

export type Block =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'callout'; tone: 'info' | 'success' | 'warning' | 'error'; text: string }
  | { type: 'code'; title?: string; code: string }
  | { type: 'playground'; before: string; after: string; caption?: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'quote'; text: string; cite?: string };

export interface Article {
  slug: string;
  kind: 'article' | 'guide';
  title: string;
  description: string;
  date: string;
  updated?: string;
  category: string;
  readingTime: string;
  author: { name: string; role: string };
  featured?: boolean;
  sections: { heading: string; body: string }[];
  blocks: Block[];
}

export interface DocRule {
  slug: string;
  title: string;
  summary: string;
  severity: Severity;
  weight: number;
  category: string;
  capability: string;
  updated: string;
  blocks: Block[];
}

const jay = { name: 'Jay Patel', role: 'Founder, AGEN' };
const lena = { name: 'Lena Ortiz', role: 'Agent UX engineer' };

export const articles: Article[] = [
  {
    slug: 'how-ai-web-browsers-read-the-dom',
    kind: 'article',
    title: 'How AI Web Browsers Actually Read the DOM',
    description:
      'LLM-powered browsers don\u2019t see pixels first. They read structure, labels, and affordances. Here\u2019s the exact pipeline and what it means for your markup.',
    date: '2026-07-28',
    category: 'Engineering',
    readingTime: '6 min read',
    author: jay,
    featured: true,
    sections: [
      { heading: 'The parser is the browser', body: 'Agents start from a serialized snapshot, not a screenshot.' },
      { heading: 'What the snapshot keeps', body: 'Attributes and text survive; pixels are secondary.' },
      { heading: 'Why structure beats styling', body: 'Semantic tags give agents a decision tree to traverse.' },
    ],
    blocks: [
      {
        type: 'p',
        text: 'Most people picture an AI agent \u201cseeing\u201d a website the way a user does: an eye over a rendered page. In practice, the agents that actually take actions on the web parse a serialized DOM snapshot first. The screenshot comes later, and usually only for spot-checking. That single fact rearranges how you should think about optimization.',
      },
      { type: 'h2', text: 'The parser is the browser' },
      {
        type: 'p',
        text: 'When an agent visits your URL, it fetches the HTML, then hands a tree of elements to a model that can select, click, and type. The tree is built from the rendered DOM \u2014 the state after your scripts run \u2014 not the raw HTML file. If your page renders nothing until a client-side bundle finishes, the agent reads an empty shell.',
      },
      {
        type: 'code',
        title: 'What a serialized snapshot looks like to the model',
        code: `<main>
  h1 "Agent-ready checkout"
  form[action="/api/checkout"]
    label[for="email"] "Email"
    input[id="email"][type="email"]
    button[type="submit"] "Pay $49"
  nav[aria-label="Main"]
    ul
      li a[href="/pricing"] "Pricing"
      li a[href="/docs"] "Docs"`,
      },
      { type: 'h2', text: 'What the snapshot keeps' },
      {
        type: 'p',
        text: 'The snapshot preserves structure (tags, nesting, ids), text, and the attributes that carry meaning: hrefs, alts, labels, roles, states. It drops most styling, inline handlers, and anything a human would only perceive visually. If a thing exists only in pixels \u2014 a hover tooltip, an icon-only button, a title baked into a background image \u2014 the agent cannot see it.',
      },
      {
        type: 'ul',
        items: [
          'Text content that exists without JavaScript renders first and is always visible to the parser.',
          'Labels, placeholders, and aria-label all count as an accessible name for a field.',
          'A link with no text and no aria-label has an empty accessible name, even if it looks like a nice arrow.',
        ],
      },
      { type: 'h2', text: 'Why structure beats styling' },
      {
        type: 'p',
        text: 'Semantic tags and landmarks give agents a reliable decision tree: find the <main>, read the h1, locate the form, fill the labeled fields. Without that scaffolding the model has to guess \u2014 and guessing is where automation breaks.',
      },
      {
        type: 'callout',
        tone: 'info',
        text: 'Shortcut: run an audit on your homepage. The capability list is literally \u201cthe things an agent must be able to do\u201d \u2014 treat each failing check as a decision tree node that is currently missing.',
      },
      {
        type: 'table',
        headers: ['What agents read', 'Why it matters', 'When it breaks'],
        rows: [
          ['Semantic landmarks', 'Routes traversal to content and controls', 'Whole page made of <div>'],
          ['Accessible names', 'Enables selection and fill actions', 'Icon-only buttons, unlabeled inputs'],
          ['Rendered text', 'Grounds the model in real content', 'Empty <div id="app"> until hydration'],
          ['Real hrefs', 'Enables safe navigation', 'href="#" and javascript: links'],
        ],
      },
      { type: 'h2', text: 'The takeaway' },
      {
        type: 'p',
        text: 'Optimize for the snapshot, not the screenshot. Ship real text, name every control, use landmarks, and keep the first paint meaningful. If it is not in the tree, it does not exist for the agent.',
      },
    ],
  },
  {
    slug: 'aria-roles-for-llm-navigation',
    kind: 'article',
    title: 'ARIA Roles for LLM Navigation: What Agents Read and Ignore',
    description:
      'ARIA is not decorative. Roles, states, and landmarks are the scaffolding agents use to decide where to click next.',
    date: '2026-06-30',
    category: 'Accessibility',
    readingTime: '5 min read',
    author: lena,
    sections: [
      { heading: 'Roles are the contract', body: 'An agent treats role="button" as a promise it can click.' },
      { heading: 'States that change behavior', body: 'aria-expanded and disabled tell the agent whether an action is available.' },
      { heading: 'Landmarks as a map', body: 'nav, main, aside, footer form the agent\u2019s spatial model of the page.' },
    ],
    blocks: [
      {
        type: 'p',
        text: 'Screen readers and LLM agents consume the same underlying accessibility tree. That means the ARIA you write for assistive tech is exactly the vocabulary an autonomous agent uses to decide whether something is clickable, fillable, or already done.',
      },
      { type: 'h2', text: 'Roles are the contract' },
      {
        type: 'p',
        text: 'A <div onClick={...}> carries no role. An agent sees an inert container and skips it, even though a human can click it. Wrapping the handler in a real <button> \u2014 or adding role="button" with keyboard support \u2014 makes the action discoverable.',
      },
      {
        type: 'code',
        title: 'Non-semantic to semantic',
        code: `<!-- before: invisible to the action model -->
<div onClick="openCart()">
  <span>Cart</span>
</div>

<!-- after: clickable, named, focusable -->
<button type="button" aria-label="Open cart">
  Cart
</button>`,
      },
      { type: 'h2', text: 'States that change behavior' },
      {
        type: 'p',
        text: 'Agents check state before acting. A collapsed accordion with aria-expanded="true" confuses the model; a disabled button with aria-disabled absent reads as available and fails on click. Mirror the real state in ARIA and the model\u2019s plan matches reality.',
      },
      { type: 'h2', text: 'Landmarks as a map' },
      {
        type: 'p',
        text: 'Landmarks compress the page into regions an agent can navigate in a bounded number of steps. A page whose navigation is \u201cbuilt from generic divs\u201d looks like one undifferentiated block of content and forces the model to waste context finding anything.',
      },
      {
        type: 'callout',
        tone: 'warning',
        text: 'A common anti-pattern: three nested <div> wrappers with a hover-only dropdown. The menu exists for a human eye and vanishes for both keyboards and agents.',
      },
      {
        type: 'p',
        text: 'The rule of thumb: if it behaves like a button, link, list, or dialog, say so in the markup. The agent will thank you by completing the task.',
      },
    ],
  },
  {
    slug: 'agent-ready-checkout-checklist',
    kind: 'guide',
    title: 'The Agent-Ready Checkout Checklist',
    description:
      'Shopping agents will buy from you if they can fill the form, read the total, and trust the button. Here is the exact checklist.',
    date: '2026-06-12',
    updated: '2026-07-20',
    category: 'Guides',
    readingTime: '8 min read',
    author: jay,
    sections: [
      { heading: 'Form fields with real names', body: 'Every input needs an accessible name an agent can map to a value.' },
      { heading: 'A visible, honest total', body: 'The order summary must be text in the tree, not an image.' },
      { heading: 'Buttons that say what they do', body: 'Submit text is part of the trust calculation.' },
    ],
    blocks: [
      {
        type: 'p',
        text: 'Agent-driven commerce is already real: assistants compare prices, fill carts, and check out on behalf of users. Whether the purchase happens depends almost entirely on how legible your checkout is. This checklist is the same set of checks our audit runs \u2014 expressed as a build-time review.',
      },
      { type: 'h2', text: 'Form fields with real names' },
      {
        type: 'p',
        text: 'Each field must be identifiable by name, type, and purpose. An unlabeled <input> is a guess; a labeled one is a contract. Add autocomplete attributes so agents (and browsers) can fill from a profile.',
      },
      {
        type: 'code',
        title: 'A field an agent can fill',
        code: `<label for="card-name">Name on card</label>
<input
  id="card-name"
  name="cardName"
  type="text"
  autocomplete="cc-name"
  placeholder="Jordan Vale"
/>`,
      },
      { type: 'h2', text: 'A visible, honest total' },
      {
        type: 'p',
        text: 'The order total must exist as real text in the rendered DOM. If the total is painted into a canvas or an image, agents see an empty rectangle where the price should be \u2014 and a cautious assistant will stop the purchase there.',
      },
      {
        type: 'callout',
        tone: 'error',
        text: 'Real failure we audited: a theme rendering the subtotal as a <canvas> sparkline. The checkout agent read \u201cOrder summary: 4 items, total: (unavailable)\u201d and refused to continue.',
      },
      { type: 'h2', text: 'Buttons that say what they do' },
      {
        type: 'p',
        text: 'The submit control needs an accessible name that matches its action. \u201cPlace order\u201d beats \u201cSubmit\u201d; \u201cPay $49.00\u201d beats both. Text like this also reduces hallucinated confirmation steps.',
      },
      {
        type: 'table',
        headers: ['Check', 'Pass if', 'Common failure'],
        rows: [
          ['Fields named', 'Every input has a label or aria-label', 'placeholder-only fields'],
          ['Types correct', 'email, tel, cc-number used properly', 'everything type="text"'],
          ['Total in tree', 'Price is text, not canvas or image', 'canvas subtotal'],
          ['Button named', 'Submit reads as an action', 'icon-only arrow button'],
          ['Errors in text', 'Validation appears as text near the field', 'toast that disappears'],
        ],
      },
      { type: 'h2', text: 'Run the checklist' },
      {
        type: 'p',
        text: 'Audit the checkout URL directly \u2014 the capability list will tell you exactly which of these checks fail, with a copy-pasteable fix for each.',
      },
    ],
  },
  {
    slug: 'the-empty-div-problem',
    kind: 'guide',
    title: 'The Empty <div id="app"> Problem',
    description:
      'Client-rendered sites often ship a shell that agents read as an empty page. Here is how to detect it and how to fix it for real.',
    date: '2026-05-21',
    category: 'Guides',
    readingTime: '7 min read',
    author: lena,
    featured: true,
    sections: [
      { heading: 'What the agent sees', body: 'An empty div, a body full of scripts, no content.' },
      { heading: 'How to detect it', body: 'Disable scripts or check the snapshot. Our audit does this automatically.' },
      { heading: 'The fix, in order', body: 'SSR, prerendering, or a <noscript> fallback that means something.' },
    ],
    blocks: [
      {
        type: 'p',
        text: 'The single most common critical finding in our audits is not a missing alt tag. It is a page that returns the DOM equivalent of a blank screen: <div id="app"></div> surrounded by script tags. A human waits half a second for hydration and sees a beautiful site. An agent waits the same half second and reads \u2014 nothing.',
      },
      { type: 'h2', text: 'What the agent sees' },
      {
        type: 'p',
        text: 'The serialized snapshot an LLM browser builds is roughly what you get with JavaScript disabled and a short wait. Here is the difference in practice:',
      },
      {
        type: 'playground',
        caption: 'Click \u201cRun micro-audit\u201d on each tab. The left shell scores near zero; the right one passes the same checks.',
        before: `<!doctype html>
<html>
  <head>
    <title>Loading…</title>
    <script src="/bundle.js"></script>
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>`,
        after: `<!doctype html>
<html>
  <head>
    <title>Northstar — Agent-first analytics</title>
  </head>
  <body>
    <header>
      <nav aria-label="Main">
        <ul>
          <li><a href="/pricing">Pricing</a></li>
          <li><a href="/docs">Docs</a></li>
        </ul>
      </nav>
    </header>
    <main>
      <h1>Agent-first analytics</h1>
      <p>Understand how AI agents experience your product.</p>
      <form action="/signup" method="post">
        <label for="email">Work email</label>
        <input id="email" name="email" type="email" autocomplete="email" />
        <button type="submit">Start free</button>
      </form>
    </main>
    <footer>
      <a href="/privacy">Privacy</a>
    </footer>
    <script src="/bundle.js"></script>
  </body>
</html>`,
      },
      { type: 'h2', text: 'How to detect it' },
      {
        type: 'ul',
        items: [
          'View the page with scripts disabled \u2014 if the body is empty, that is your shell.',
          'Open the rendered snapshot in a headless browser and check the text content.',
          'Run an AGEN scan: the \u201cRead content without JavaScript\u201d capability fails with \u201cpage is empty when scripts are disabled\u201d.',
        ],
      },
      { type: 'h2', text: 'The fix, in order' },
      {
        type: 'ol',
        items: [
          'Server-render the meaningful shell: real headings, links, and the primary form in the initial HTML.',
          'If SSR is not possible, prerender the marketing-critical pages at build time.',
          'Ship a <noscript> fallback that at least names the product and its main links, so even a script-disabled parse finds content.',
        ],
      },
      {
        type: 'code',
        title: 'Minimal <noscript> fallback that still passes the check',
        code: `<noscript>
  <main>
    <h1>Northstar</h1>
    <p>Agent-first analytics. <a href="/signup">Start free</a>.</p>
  </main>
</noscript>`,
      },
      {
        type: 'callout',
        tone: 'success',
        text: 'You do not need to kill your SPA. You need the first paint to contain the truth about the page \u2014 then hydration can add the magic on top.',
      },
    ],
  },
  {
    slug: 'readability-score-metrics',
    kind: 'guide',
    title: 'Understanding the 0\u2013100 Readiness Score',
    description:
      'The score is not a vibe. It is a weighted sum of capability checks, and each point maps to a fix you can ship.',
    date: '2026-05-06',
    category: 'Guides',
    readingTime: '4 min read',
    author: jay,
    sections: [
      { heading: 'What the score is', body: 'A weighted sum over capability checks.' },
      { heading: 'Severity weights', body: 'Critical failures dominate; optimizations nudge.' },
      { heading: 'Reading your own score', body: 'A low score is a ranked fix list, not a grade.' },
    ],
    blocks: [
      {
        type: 'p',
        text: 'Every audit ends with a number between 0 and 100. It is not a branding exercise \u2014 it is a weighted aggregate of the capability checks run against the rendered page, designed so a single number can track progress across deploys.',
      },
      { type: 'h2', text: 'What the score is' },
      {
        type: 'p',
        text: 'The scanner starts at 100 and deducts for failing checks. Critical failures remove the most, because they stop an agent from completing a task outright. Warnings remove less, and optimizations nudge the final few points.',
      },
      {
        type: 'table',
        headers: ['Severity', 'Weight', 'Example'],
        rows: [
          ['Critical', 'Heavy', 'Empty page without JS, unlabeled inputs, missing title'],
          ['Warning', 'Medium', 'Missing alt text, dead links, no main landmark'],
          ['Optimization', 'Light', 'Semantic nav, heading polish'],
        ],
      },
      { type: 'h2', text: 'Severity bands' },
      {
        type: 'ul',
        items: [
          '85+ \u2014 Agent-ready: core actions, labels, and structure are legible.',
          '60\u201384 \u2014 Needs work: several barriers block common flows.',
          'Under 60 \u2014 High friction: critical gaps make automation unreliable.',
        ],
      },
      { type: 'h2', text: 'Reading your own score' },
      {
        type: 'p',
        text: 'Treat the score as a ranked backlog. Fix the criticals first \u2014 each one is typically a one-line markup change \u2014 and the number moves fast. Re-run the audit to confirm, and keep a saved copy to watch the trend over time.',
      },
    ],
  },
  {
    slug: 'ssr-vs-csr-agent-readiness',
    kind: 'guide',
    title: 'SSR vs CSR: What It Means for Agent Readiness',
    description:
      'Single-page apps are not inherently agent-hostile. The problem is how much truth exists before hydration. Here is the spectrum.',
    date: '2026-04-18',
    category: 'Engineering',
    readingTime: '6 min read',
    author: lena,
    sections: [
      { heading: 'The render spectrum', body: 'Static, SSR, SSG, hybrid, and pure CSR and what each exposes.' },
      { heading: 'Where agents get stuck', body: 'Timeouts, blank shells, and duplicate parse failures.' },
      { heading: 'A pragmatic target', body: 'Render the truth server-side, hydrate everything else.' },
    ],
    blocks: [
      {
        type: 'p',
        text: 'There is a persistent myth that frameworks like React or Vue are \u201cbad for SEO,\u201d and now \u201cbad for agents.\u201d The truth is subtler: rendering strategy matters less than what the first byte of HTML contains.',
      },
      { type: 'h2', text: 'The render spectrum' },
      {
        type: 'ul',
        items: [
          'Static / pre-rendered: full content in the HTML file. Best case for agents.',
          'SSR: content computed per request and sent in the initial HTML. Excellent.',
          'Hybrid (SSG + client islands): content static, interactivity hydrates. Excellent.',
          'Pure CSR: empty shell plus a bundle. The shell is what agents parse first.',
        ],
      },
      {
        type: 'code',
        title: 'A pure-CSR shell that fails agent checks',
        code: `<body>
  <div id="root"></div>
  <script src="/main.js"></script>
  <script src="/vendor.js"></script>
</body>

<!-- vs. an SSR shell that passes -->
<main>
  <h1>Agent-ready docs</h1>
  <p>Searchable, semantic, and script-safe.</p>
</main>`,
      },
      { type: 'h2', text: 'Where agents get stuck' },
      {
        type: 'p',
        text: 'Two failure modes dominate. First, the agent\u2019s snapshot is taken before hydration completes, so it parses a shell. Second, the page blocks on a slow API response and the agent times out waiting for content that should have been in the HTML.',
      },
      {
        type: 'callout',
        tone: 'warning',
        text: 'Client-side only rendering is not a death sentence. But it makes the timeout race the deciding factor in whether an agent reads your page at all.',
      },
      { type: 'h2', text: 'A pragmatic target' },
      {
        type: 'p',
        text: 'Render the core truth server-side \u2014 the headline, the main links, the primary form \u2014 and let JavaScript add everything else. Your audit\u2019s \u201cRead content without JavaScript\u201d check is a good proxy: if it passes, agents will parse your page reliably.',
      },
    ],
  },
];

export const docRules: DocRule[] = [
  {
    slug: 'read-without-js',
    title: 'Content must render without JavaScript',
    summary: 'The page must expose meaningful text even when scripts do not run or hydration is slow.',
    severity: 'critical',
    weight: 18,
    category: 'Rendering',
    capability: 'Read content without JavaScript',
    updated: '2026-07-15',
    blocks: [
      {
        type: 'p',
        text: 'Agents parse the rendered DOM, and the snapshot is often taken before (or without) JavaScript. If the body is a lone <div id="app">, the agent reads a blank page and the audit fails \u201cRead content without JavaScript\u201d with \u201cpage is empty when scripts are disabled.\u201d',
      },
      { type: 'h2', text: 'Why it matters' },
      {
        type: 'p',
        text: 'A blank shell means the agent cannot identify the topic, find the primary action, or extract any content. Every downstream capability check fails too, dragging the score to near zero.',
      },
      { type: 'h2', text: 'How to fix it' },
      {
        type: 'ol',
        items: [
          'Server-render the meaningful shell (real h1, links, primary form) in the initial HTML.',
          'Or pre-render marketing-critical pages at build time.',
          'At minimum, add a <noscript> block with the essential content and links.',
        ],
      },
      {
        type: 'code',
        title: 'A fallback that passes the check',
        code: `<noscript>
  <main>
    <h1>Northstar</h1>
    <p>Agent-first analytics. <a href="/signup">Start free</a>.</p>
  </main>
</noscript>`,
      },
    ],
  },
  {
    slug: 'page-title',
    title: 'Every page needs a <title>',
    summary: 'A descriptive document title is how agents confirm they landed on the right page.',
    severity: 'critical',
    weight: 14,
    category: 'Metadata',
    capability: 'Find the page topic',
    updated: '2026-07-15',
    blocks: [
      {
        type: 'p',
        text: 'The <title> element is one of the first signals an agent reads to confirm the page topic. Missing titles fail the \u201cFind the page topic\u201d check and make navigation-from-search unreliable.',
      },
      { type: 'h2', text: 'How to fix it' },
      {
        type: 'p',
        text: 'Give every route a unique, descriptive title that names the page and, ideally, the product.',
      },
      {
        type: 'code',
        title: 'Before and after',
        code: `<!-- before -->
<head><script src="/bundle.js"></script></head>

<!-- after -->
<head><title>Pricing — Northstar</title></head>`,
      },
    ],
  },
  {
    slug: 'unlabeled-inputs',
    title: 'Label every form field',
    summary: 'Fields need an accessible name so agents know what to enter \u2014 and so autofill works.',
    severity: 'critical',
    weight: 16,
    category: 'Forms',
    capability: 'Identify form fields',
    updated: '2026-07-15',
    blocks: [
      {
        type: 'p',
        text: 'An input with no label, aria-label, or placeholder is unidentifiable. The \u201cIdentify form fields\u201d check counts each one, and unlabeled fields are a top reason checkout agents abandon a flow.',
      },
      { type: 'h2', text: 'How to fix it' },
      {
        type: 'p',
        text: 'Prefer an explicit <label> with the for/id pairing. Add autocomplete attributes so agents and browsers can fill from a stored profile.',
      },
      {
        type: 'code',
        title: 'Unlabeled to labeled',
        code: `<!-- before -->
<input type="email" name="email" />

<!-- after -->
<label for="email">Work email</label>
<input id="email" name="email" type="email" autocomplete="email" />`,
      },
      {
        type: 'callout',
        tone: 'info',
        text: 'placeholder does not count as a durable label in accessibility terms \u2014 it disappears on input. Use it as a hint, never as the only name.',
      },
    ],
  },
  {
    slug: 'accessible-button-names',
    title: 'Name every button',
    summary: 'Buttons need visible text or an aria-label so agents know what action they trigger.',
    severity: 'warning',
    weight: 10,
    category: 'Controls',
    capability: 'Understand every button',
    updated: '2026-07-15',
    blocks: [
      {
        type: 'p',
        text: 'Icon-only buttons with no text, aria-label, or title fail \u201cUnderstand every button.\u201d The agent sees a control it cannot name and skips the action entirely.',
      },
      { type: 'h2', text: 'How to fix it' },
      {
        type: 'code',
        title: 'Naming a close button',
        code: `<!-- before -->
<button><svg>…</svg></button>

<!-- after -->
<button aria-label="Close">X</button>`,
      },
      {
        type: 'p',
        text: 'Prefer visible text when it fits the design; use aria-label only when space is genuinely constrained.',
      },
    ],
  },
  {
    slug: 'image-alt-text',
    title: 'Describe every image',
    summary: 'Alt text carries the meaning of an image into the agent\u2019s text-only view of the page.',
    severity: 'warning',
    weight: 8,
    category: 'Content',
    capability: 'Describe every image',
    updated: '2026-07-15',
    blocks: [
      {
        type: 'p',
        text: 'Images without alt fail \u201cDescribe every image.\u201d For informative images, alt text should say what matters about them; for decorative images, alt="" explicitly marks them as noise.',
      },
      {
        type: 'code',
        title: 'Informative vs decorative',
        code: `<img src="hero.png" alt="Agent-first analytics dashboard" />
<img src="divider.svg" alt="" />`,
      },
    ],
  },
  {
    slug: 'descriptive-links',
    title: 'Real, readable link destinations',
    summary: 'Links need text that says where they go \u2014 and hrefs that are real, not placeholders.',
    severity: 'warning',
    weight: 8,
    category: 'Content',
    capability: 'Follow link destinations',
    updated: '2026-07-15',
    blocks: [
      {
        type: 'p',
        text: 'Two failures trip the \u201cFollow link destinations\u201d check: links with no readable text, and links pointing at href="#" or javascript:. Agents treat both as untrustworthy and refuse to navigate.',
      },
      {
        type: 'code',
        title: 'Fixes for both cases',
        code: `<!-- empty icon link → give it a name -->
<a href="/pricing" aria-label="Pricing">Pricing</a>

<!-- placeholder href → make it real or make it a button -->
<a href="/docs">Read the docs</a>`,
      },
    ],
  },
  {
    slug: 'page-structure',
    title: 'One main landmark, one h1',
    summary: 'A single <main> and a single h1 give agents a clean entry point for reading the page.',
    severity: 'warning',
    weight: 8,
    category: 'Structure',
    capability: 'Parse page structure',
    updated: '2026-07-15',
    blocks: [
      {
        type: 'p',
        text: 'The \u201cParse page structure\u201d check requires a <main> landmark and exactly one h1. Multiple h1s or a missing main make the page\u2019s hierarchy ambiguous for traversal and quoting.',
      },
      {
        type: 'code',
        title: 'A parseable structure',
        code: `<main>
  <h1>Agent-ready checkout</h1>
  <p>Intro copy…</p>
</main>`,
      },
    ],
  },
  {
    slug: 'hover-free-interactions',
    title: 'No pointer-only interactions',
    summary: 'Anything revealed on hover must also be reachable by keyboard and visible to agents.',
    severity: 'warning',
    weight: 8,
    category: 'Interaction',
    capability: 'Act without hover',
    updated: '2026-07-15',
    blocks: [
      {
        type: 'p',
        text: 'Hover-only menus, tooltips, and disclosures fail \u201cAct without hover.\u201d Agents do not move a pointer \u2014 they keyboard-focus and click \u2014 so content that only exists on :hover is invisible to them.',
      },
      { type: 'h2', text: 'How to fix it' },
      {
        type: 'p',
        text: 'Reveal the same content on focus as well as hover, or expose it as visible text and focusable controls.',
      },
      {
        type: 'code',
        title: 'Reveal on focus too',
        code: `/* before: hover only */
.menu { display: none; }
div:hover .menu { display: block; }

/* after: keyboard reachable too */
.menu { display: none; }
div:hover .menu,
button:focus-visible + .menu { display: block; }`,
      },
    ],
  },
  {
    slug: 'semantic-navigation',
    title: 'Wrap menus in <nav>',
    summary: 'A <nav> landmark tells agents where the primary navigation is without scanning every link.',
    severity: 'optimization',
    weight: 5,
    category: 'Structure',
    capability: 'Use semantic navigation',
    updated: '2026-07-15',
    blocks: [
      {
        type: 'p',
        text: 'The \u201cUse semantic navigation\u201d check passes when the page has a <nav> landmark (or fewer than three links). Menus built from generic divs waste an agent\u2019s context budget hunting for destinations.',
      },
      {
        type: 'code',
        title: 'Div soup to landmarks',
        code: `<!-- before -->
<div class="menu">
  <div><a href="/">Home</a></div>
  <div><a href="/pricing">Pricing</a></div>
</div>

<!-- after -->
<nav aria-label="Main">
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/pricing">Pricing</a></li>
  </ul>
</nav>`,
      },
    ],
  },
];

export const allArticles = articles;
export const allGuides = articles.filter((a) => a.kind === 'guide');
export const allPosts = articles;
export const allDocs = docRules;

export function getArticle(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}

export function getDoc(slug: string): DocRule | undefined {
  return docRules.find((d) => d.slug === slug);
}

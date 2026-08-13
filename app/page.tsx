'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Braces,
  Eye,
  FormInput,
  Gauge,
  Heading1,
  ImageIcon,
  Link2,
  ScanSearch,
  Users,
  Boxes,
  LayoutGrid,
} from 'lucide-react';
import { runAudit, saveAudit, type AuditResult } from '../lib/audit';
import { useUser } from '../lib/auth';
import TimelinePills from '../components/TimelinePills';
import PricingCards from '../components/PricingCards';
import { timelineStages } from '../lib/stages';

const severityBadge: Record<string, string> = {
  critical: 'bg-[var(--error)]/10 text-[var(--error)]',
  warning: 'bg-[var(--warning)]/10 text-[var(--warning)]',
  optimization: 'bg-[var(--surface-strong)] text-[color:var(--muted)]',
};

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState('https://example.com');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');
  const [error, setError] = useState('');
  const [stage, setStage] = useState(0);
  const user = useUser();

  useEffect(() => {
    if (!loading) return;
    const timer = setInterval(() => {
      setStage((s) => {
        if (s >= timelineStages.length - 1) {
          clearInterval(timer);
          return s;
        }
        return s + 1;
      });
    }, 420);
    return () => clearInterval(timer);
  }, [loading]);

  const runAuditAction = async (targetUrl: string) => {
    if (!user) {
      router.push(
        `/auth/signup?next=${encodeURIComponent(`/dashboard/new?url=${encodeURIComponent(targetUrl)}`)}`,
      );
      return;
    }
    setLoading(true);
    setError('');
    setSaveError('');
    setResult(null);
    setSavedId(null);
    setStage(0);
    try {
      const data = await runAudit(targetUrl);
      setResult(data);
      if (user) {
        try {
          const saved = await saveAudit(targetUrl, data);
          setSavedId(saved.id);
        } catch (err: any) {
          setSaveError(err?.message || 'Could not save this audit to your dashboard.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-[color:var(--ink)]">
      <section className="mx-auto max-w-[1200px] px-6 pt-16 sm:px-8 sm:pt-24">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--surface-card)] px-3 py-1.5 text-xs font-medium text-[color:var(--body)]">
              <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
              New · Agent-Vision reads the real DOM, not just keywords
            </div>
            <h1 className="mt-8 text-5xl font-normal leading-[1.05] tracking-[-0.03em] sm:text-6xl lg:text-7xl">
              The AI agent that works with you, not just for you.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[color:var(--body)]">
              AGEN makes your site legible for machines, so the right actions, labels, and paths show up without guesswork.
            </p>

            <div className="mx-auto mt-10 flex max-w-xl flex-col gap-3 sm:flex-row">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void runAuditAction(url);
                }}
                placeholder="Enter your website URL"
                className="h-12 w-full rounded-lg border border-[var(--card-border)] bg-[var(--surface-card)] px-4 text-sm text-[color:var(--ink)] outline-none placeholder:text-[color:var(--muted-soft)] focus:border-[var(--accent)] sm:w-auto sm:flex-1"
              />
              <button
                onClick={() => void runAuditAction(url)}
                disabled={loading}
                className="btn btn-primary btn-lg w-full sm:w-auto"
              >
                <span className="btn-chip">
                  <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                </span>
                {loading ? 'Scanning…' : 'Run audit'}
              </button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[color:var(--muted)]">
              <span className="rounded-full border border-[var(--card-border)] bg-[var(--surface-card)] px-3 py-1">DOM checks</span>
              <span className="rounded-full border border-[var(--card-border)] bg-[var(--surface-card)] px-3 py-1">ARIA review</span>
              <span className="rounded-full border border-[var(--card-border)] bg-[var(--surface-card)] px-3 py-1">Fix suggestions</span>
            </div>
            {!user && (
              <p className="mt-3 text-xs text-[color:var(--muted)]">
                You&apos;ll be asked to create a free account first — your report then lands in the dashboard.
              </p>
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between rounded-lg border border-[var(--card-border)] bg-[var(--surface-white)] px-3 py-2 text-sm text-[color:var(--muted)]">
              <span className="font-medium text-[color:var(--ink)]">Readiness snapshot</span>
              <span className="rounded-lg bg-[var(--accent)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--accent)]">Live preview</span>
            </div>
            <div className="mt-4 rounded-[16px] border border-[var(--card-border)] bg-[var(--surface-white)] p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[color:var(--ink)]">Agent-readiness score</p>
                  <p className="mt-2 text-4xl font-normal tracking-[-0.02em]">81/100</p>
                </div>
                <div className="rounded-full border border-[var(--card-border)] bg-[var(--canvas-soft)] px-3 py-1 text-xs font-medium text-[color:var(--muted)]">
                  3 fixes ready
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {[
                  { label: 'Critical', value: '2', tone: 'text-[var(--error)]' },
                  { label: 'Warning', value: '4', tone: 'text-[var(--warning)]' },
                  { label: 'Optimization', value: '7', tone: 'text-[var(--accent)]' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-lg border border-[var(--card-border)] bg-[var(--canvas-soft)] px-3 py-2.5 text-sm">
                    <span className="text-[color:var(--body)]">{item.label}</span>
                    <span className={`font-medium ${item.tone}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 rounded-[16px] border border-[var(--card-border)] bg-[var(--surface-white)] p-4 text-sm text-[color:var(--body)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-[color:var(--ink)]">Machine-readable flow</p>
                  <p className="mt-1">Hero, pricing, and checkout are now clearly discoverable.</p>
                </div>
                <div className="rounded-lg bg-[var(--success)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--success)]">Ready</div>
              </div>
            </div>
          </div>
        </div>

        {(loading || result || error) && (
          <div className="mx-auto mt-14 max-w-4xl">
            <div className="card p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <TimelinePills stage={loading ? stage : timelineStages.length} />
                <span className="font-mono text-xs text-[color:var(--muted)]">{loading ? 'scanning…' : result ? 'complete' : 'failed'}</span>
              </div>

              {loading && <div className="mt-6 h-40 animate-pulse rounded-lg bg-[var(--canvas-soft)]" />}
              {error && <div className="mt-6 rounded-lg border border-[var(--error)]/20 bg-[var(--error)]/10 p-4 text-sm text-[var(--error)]">{error}</div>}

              {result && (
                <div className="mt-6 grid gap-6 lg:grid-cols-[auto_1fr]">
                  <div className="lg:w-56">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">Readiness score</p>
                    <p className="mt-2 text-6xl font-normal tracking-[-0.03em]">{result.score}</p>
                    <p className="mt-1 font-mono text-xs text-[color:var(--muted)]">/ 100</p>
                    <div className="mt-4 space-y-2">
                      {['critical', 'warning', 'optimization'].map((sev) => {
                        const count = result.issues.filter((i) => i.severity === sev).length;
                        if (!count) return null;
                        return (
                          <div key={sev} className="flex items-center justify-between text-sm">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${severityBadge[sev]}`}>
                              {sev}
                            </span>
                            <span className="font-mono text-xs text-[color:var(--muted)]">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="text-base leading-6 text-[color:var(--body)]">{result.summary}</p>
                    <div className="mt-5 space-y-3">
                      {result.issues.slice(0, 4).map((issue) => (
                        <div key={issue.id} className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-white)] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold text-[color:var(--ink)]">{issue.title}</p>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${severityBadge[issue.severity]}`}>
                              {issue.severity}
                              {issue.count ? ` ×${issue.count}` : ''}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-[color:var(--body)]">{issue.fix}</p>
                          {issue.snippet && (
                            <pre className="mt-3 overflow-x-auto rounded-lg border border-[var(--card-border)] bg-[var(--canvas-soft)] p-3 font-mono text-xs text-[color:var(--ink)]">
                              {issue.snippet}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      {savedId ? (
                        <Link href={`/dashboard/audit/${savedId}`} className="btn btn-primary btn-sm">
                          <span className="btn-chip">
                            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                          </span>
                          View full report
                        </Link>
                      ) : (
                        <Link href={user ? '/dashboard/new' : '/auth/signup?next=/dashboard/new'} className="btn btn-primary btn-sm">
                          <span className="btn-chip">
                            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                          </span>
                          Save to dashboard & fix it
                        </Link>
                      )}
                      <button onClick={() => void runAuditAction(url)} className="btn btn-secondary btn-sm">
                        Rerun scan
                      </button>
                    </div>
                    {savedId && (
                      <p className="mt-4 rounded-lg border border-[var(--success)]/20 bg-[var(--success)]/10 p-3 text-xs text-[var(--success)]">
                        Saved to your dashboard · it counts toward your monthly audit quota.
                      </p>
                    )}
                    {saveError && (
                      <p className="mt-4 rounded-lg border border-[var(--warning)]/20 bg-[var(--warning)]/10 p-3 text-xs text-[var(--warning)]">
                        {saveError}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="mx-auto mt-20 max-w-[1200px] px-6 sm:px-8">
        <div className="card flex flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-8">
          <p className="text-sm font-medium text-[color:var(--muted)]">Trusted by teams shipping agent-first experiences.</p>
          <div className="flex flex-wrap gap-3 text-sm font-medium text-[color:var(--body)]">
            {['Northstar', 'Layer', 'Fathom', 'Parity', 'Juniper'].map((brand) => (
              <span key={brand} className="rounded-lg border border-[var(--card-border)] bg-[var(--canvas-soft)] px-3 py-1.5">
                {brand}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-[1200px] px-6 sm:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">Why AGEN</p>
          <h2 className="mt-4 text-4xl font-normal tracking-[-0.02em]">A real partner, not a chatbot in disguise.</h2>
          <p className="mt-4 text-lg leading-8 text-[color:var(--body)]">
            Most AI tools answer questions. AGEN takes initiative by surfacing the exact barriers that stop machines from taking useful actions.
          </p>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {[
            { num: '01.', title: 'Always context-aware', body: 'Every audit is grounded in the page’s actual structure, labels, and affordances.' },
            { num: '02.', title: 'Takes real action', body: 'You get copy-pasteable fixes, not vague suggestions that vanish into a support doc.' },
            { num: '03.', title: 'Connects everything', body: 'Reports can be saved, shared, and reviewed from the dashboard for your whole team.' },
          ].map((item) => (
            <div key={item.num} className="card p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-semibold text-white">
                {item.num}
              </div>
              <p className="mt-4 text-lg font-medium text-[color:var(--ink)]">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--body)]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-[1200px] px-6 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="card p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">How it works</p>
            <h2 className="mt-4 text-4xl font-normal tracking-[-0.02em]">One URL. A clear machine’s-eye report.</h2>
            <p className="mt-4 text-lg leading-8 text-[color:var(--body)]">
              The scan reads the page the way an agent would and turns blind spots into a concise fix plan.
            </p>
            <div className="mt-6 space-y-3 text-sm text-[color:var(--body)]">
              {['Natural language cues', 'Interactive controls', 'Semantic landmarks'].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-lg border border-[var(--card-border)] bg-[var(--canvas-soft)] px-3 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="card p-6">
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { title: 'Fetch', body: 'Scan the target URL and capture the page structure.' },
                { title: 'Inspect', body: 'Check headings, labels, landmarks, links, and controls.' },
                { title: 'Prescribe', body: 'Recommend the exact HTML or ARIA change to ship.' },
                { title: 'Track', body: 'Save each audit and compare progress over time.' },
              ].map((step) => (
                <div key={step.title} className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-white)] p-5">
                  <p className="text-sm font-semibold text-[color:var(--ink)]">{step.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--body)]">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-[1200px] px-6 sm:px-8">
        <div className="card flex flex-wrap items-center justify-between gap-6 p-8">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">Full-site scans</p>
            <h2 className="mt-3 text-3xl font-normal tracking-[-0.02em]">Fix the whole site, not just one page.</h2>
            <p className="mt-3 text-base leading-7 text-[color:var(--body)]">
              Crawl every page across your domain in a single pass — up to 100 per scan. Each page gets the same
              machine-legibility audit, rolled into one report with per-page scores and findings. On Pro, Agency, and
              Enterprise plans.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3">
            <Link href="/dashboard/new" className="btn btn-primary">
              <span className="btn-chip">
                <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </span>
              Scan your whole site
            </Link>
            <Link href="/pricing" className="btn btn-secondary btn-sm">
              See pricing →
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-[1200px] px-6 sm:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">Loved by</p>
          <h2 className="mt-4 text-4xl font-normal tracking-[-0.02em]">Teams that stopped guessing.</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { quote: 'We fixed 9 issues in an afternoon. The checkout conversion went up 14% the next week.', name: 'Maya R.', role: 'Growth lead, checkout team' },
            { quote: 'Finally a tool that speaks the agent’s language. Our docs team uses it before every launch.', name: 'Jonas K.', role: 'Developer advocate' },
            { quote: 'The fix snippets are so good our engineers stopped asking “what does this mean?”', name: 'Priya S.', role: 'Staff engineer' },
          ].map((t) => (
            <figure key={t.name} className="card p-6">
              <p className="text-sm leading-6 text-[color:var(--ink)]">“{t.quote}”</p>
              <figcaption className="mt-4 text-sm text-[color:var(--muted)]">
                <span className="font-medium text-[color:var(--ink)]">{t.name}</span> · {t.role}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-[1200px] px-6 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">From the blog</p>
            <h2 className="mt-4 text-4xl font-normal tracking-[-0.02em]">What we keep learning about agents.</h2>
            <p className="mt-4 text-lg leading-8 text-[color:var(--body)]">
              Field notes on how autonomous agents read the web — and the fixes that unblock them.
            </p>
          </div>
          <Link href="/blog" className="btn btn-secondary">
            All posts
          </Link>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              href: '/blog/how-ai-web-browsers-read-the-dom',
              cat: 'Engineering',
              title: 'How AI Web Browsers Actually Read the DOM',
              body: 'They parse a serialized snapshot first, not pixels. What that means for your markup.',
            },
            {
              href: '/guides/the-empty-div-problem',
              cat: 'Guides',
              title: 'The Empty <div id="app"> Problem',
              body: 'Client-rendered shells that agents read as blank pages — and how to fix them.',
            },
            {
              href: '/guides/agent-ready-checkout-checklist',
              cat: 'Guides',
              title: 'The Agent-Ready Checkout Checklist',
              body: 'The exact checks that decide whether a shopping agent finishes your purchase.',
            },
          ].map((post) => (
            <Link key={post.href} href={post.href} className="card group flex flex-col p-6 transition hover:border-[var(--hairline-strong)]">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">{post.cat}</p>
              <p className="mt-4 text-lg font-medium leading-snug text-[color:var(--ink)] group-hover:text-[var(--primary-active)]">
                {post.title}
              </p>
              <p className="mt-2 flex-1 text-sm leading-6 text-[color:var(--body)]">{post.body}</p>
              <p className="mt-5 text-sm font-medium text-[color:var(--muted)] transition group-hover:text-[var(--accent)]">
                Read the post →
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-[1200px] px-6 sm:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">What we inspect</p>
          <h2 className="mt-4 text-4xl font-normal tracking-[-0.02em]">Every layer a machine reads, checked.</h2>
          <p className="mt-4 text-lg leading-8 text-[color:var(--body)]">
            Agent-Vision parses the rendered page the way an LLM browser would — structure, labels, and affordances — and flags anything ambiguous or unreachable.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Heading1, title: 'Heading outline', body: 'A logical h1 → h6 hierarchy so agents can traverse and quote your content correctly.' },
            { icon: FormInput, title: 'Form labels & inputs', body: 'Every field labeled, typed, and id-linked — so autofill and agent completion actually work.' },
            { icon: Link2, title: 'Links & call-to-actions', body: 'Descriptive anchor text on every actionable link, from nav to checkout buttons.' },
            { icon: ImageIcon, title: 'Image alt text', body: 'Alt attributes that describe intent, so vision-capable agents understand every visual.' },
            { icon: Braces, title: 'ARIA & landmarks', body: 'Roles, regions, and states that make interactive zones explicit and reachable.' },
            { icon: Eye, title: 'Rendered DOM', body: 'JavaScript-rendered shells are caught — we verify the page isn’t an empty <div id="app">.' },
          ].map((item) => (
            <div key={item.title} className="card p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)] text-white">
                <item.icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              </div>
              <p className="mt-4 text-lg font-medium text-[color:var(--ink)]">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--body)]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-[1200px] px-6 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="card p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">Readiness score</p>
            <h2 className="mt-4 text-4xl font-normal tracking-[-0.02em]">A single number, explained.</h2>
            <p className="mt-4 text-lg leading-8 text-[color:var(--body)]">
              Every audit compresses hundreds of findings into a 0–100 score so you can track progress at a glance — and always see why.
            </p>
            <div className="mt-6 space-y-3 text-sm text-[color:var(--body)]">
              {[
                { label: '85+ · Agent-ready', tone: 'text-[var(--success)]', desc: 'Core actions, labels, and structure are all legible.' },
                { label: '60–84 · Needs work', tone: 'text-[var(--warning)]', desc: 'Several barriers block common agent flows.' },
                { label: 'Under 60 · High friction', tone: 'text-[var(--error)]', desc: 'Critical gaps make automation unreliable.' },
              ].map((row) => (
                <div key={row.label} className="flex items-start gap-3 rounded-lg border border-[var(--card-border)] bg-[var(--canvas-soft)] px-3 py-2.5">
                  <Gauge className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                  <span>
                    <span className={`font-medium ${row.tone}`}>{row.label}</span>
                    <span className="text-[color:var(--muted)]"> — {row.desc}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-[color:var(--ink)]">How findings are weighted</p>
              <ScanSearch className="h-5 w-5 text-[var(--accent)]" strokeWidth={2} aria-hidden="true" />
            </div>
            <div className="mt-5 space-y-4">
              {[
                { label: 'Critical', pct: 50, color: 'bg-[var(--error)]', desc: 'Blockers that stop agents from completing a key task.' },
                { label: 'Warning', pct: 35, color: 'bg-[var(--warning)]', desc: 'Barriers that slow or confuse automation flows.' },
                { label: 'Optimization', pct: 15, color: 'bg-[var(--accent)]', desc: 'Polish items that raise trust and accuracy.' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium text-[color:var(--ink)]">{item.label}</span>
                    <span className="font-mono text-xs text-[color:var(--muted)]">{item.pct}% of score</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--canvas-soft)]">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-[color:var(--muted)]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-[1200px] px-6 sm:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">Built for teams</p>
          <h2 className="mt-4 text-4xl font-normal tracking-[-0.02em]">Fits where you already ship.</h2>
          <p className="mt-4 text-lg leading-8 text-[color:var(--body)]">
            From marketing sites to checkout flows, the same audit language works across every team that cares about machine legibility.
          </p>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {[
            {
              icon: Users,
              title: 'Growth & product teams',
              body: 'Catch the exact barriers that quietly sink agent-driven conversions and signup funnels.',
            },
            {
              icon: Boxes,
              title: 'Docs & developer relations',
              body: 'Ship API docs and tutorials that assistants can actually follow — no more “copy this block” that breaks.',
            },
            {
              icon: LayoutGrid,
              title: 'E-commerce & publishing',
              body: 'Keep product listings, checkout, and article layouts parseable by shopping agents and readers.',
            },
          ].map((item) => (
            <div key={item.title} className="card p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--ink)] text-[color:var(--canvas)]">
                <item.icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              </div>
              <p className="mt-4 text-lg font-medium text-[color:var(--ink)]">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--body)]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-[1200px] px-6 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">Pricing</p>
          <h2 className="mt-4 text-4xl font-normal tracking-[-0.03em] sm:text-5xl">Simple plans for every team.</h2>
          <p className="mt-5 text-lg leading-8 text-[color:var(--body)]">
            Start free. Upgrade when you&apos;re auditing enough sites to want history, exports, and teammates.
          </p>
        </div>
        <PricingCards />
        <div className="mt-8 text-center">
          <Link href="/pricing" className="btn btn-secondary btn-sm">
            Compare all plans →
          </Link>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-[1200px] px-6 pb-24 text-center sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">Start free</p>
        <h2 className="mx-auto mt-4 max-w-3xl text-4xl font-normal leading-[1.08] tracking-[-0.03em] sm:text-5xl">
          Stop shipping sites robots can&apos;t read.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-[color:var(--body)]">Run your first X-Ray in seconds. Free forever for a quick scan.</p>
        <div className="mt-8 flex justify-center">
          <Link href="/dashboard/new" className="btn btn-primary btn-lg">
            <span className="btn-chip">
              <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </span>
            Start your first audit for free
          </Link>
        </div>
      </section>
    </div>
  );
}

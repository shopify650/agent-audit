import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Scale, Wrench } from 'lucide-react';
import JsonLd from '../../../components/JsonLd';
import PostBlocks from '../../../components/PostLayout';
import { getDoc, allDocs, type Severity } from '../../../lib/content';
import { SITE_URL } from '../../../lib/site';

export const dynamicParams = true;

export function generateStaticParams() {
  return allDocs.map((doc) => ({ slug: doc.slug }));
}

const severityBadge: Record<Severity, string> = {
  critical: 'bg-[var(--error)]/10 text-[var(--error)]',
  warning: 'bg-[var(--warning)]/10 text-[var(--warning)]',
  optimization: 'bg-[var(--surface-strong)] text-[color:var(--muted)]',
};

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) return { title: 'Not found' };
  return {
    title: doc.title,
    description: doc.summary,
    alternates: { canonical: `${SITE_URL}/docs/${doc.slug}` },
  };
}

export default async function DocRulePage({ params }: Props) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) notFound();

  const related = allDocs
    .filter((d) => d.slug !== doc.slug)
    .sort((a, b) => a.weight - b.weight)
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-8 sm:py-20">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'TechArticle',
          headline: doc.title,
          description: doc.summary,
          dateModified: doc.updated,
          author: { '@type': 'Organization', name: 'Agent-Audit' },
          mainEntityOfPage: `${SITE_URL}/docs/${doc.slug}`,
        }}
      />

      <Link
        href="/docs"
        className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--muted)] transition hover:text-[color:var(--ink)]"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        All rules
      </Link>

      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_260px]">
        <div className="min-w-0">
          <header className="card p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${severityBadge[doc.severity]}`}>
                {doc.severity}
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">{doc.category}</span>
            </div>
            <h1 className="mt-5 text-4xl font-normal leading-[1.08] tracking-[-0.03em] sm:text-5xl">{doc.title}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[color:var(--body)]">{doc.summary}</p>
            <div className="mt-6 grid gap-3 border-t border-[var(--hairline)] pt-5 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-lg border border-[var(--card-border)] bg-[var(--canvas-soft)] px-4 py-3 text-sm">
                <Scale className="h-4 w-4 shrink-0 text-[var(--accent)]" strokeWidth={2} aria-hidden="true" />
                <span>
                  <span className="block text-xs text-[color:var(--muted)]">Score weight</span>
                  <span className="font-mono text-[color:var(--ink)]">−{doc.weight}</span>
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-[var(--card-border)] bg-[var(--canvas-soft)] px-4 py-3 text-sm sm:col-span-2">
                <Wrench className="h-4 w-4 shrink-0 text-[var(--accent)]" strokeWidth={2} aria-hidden="true" />
                <span>
                  <span className="block text-xs text-[color:var(--muted)]">Capability check</span>
                  <span className="text-[color:var(--ink)]">{doc.capability}</span>
                </span>
              </div>
            </div>
          </header>

          <div className="mt-10">
            <PostBlocks blocks={doc.blocks} />
          </div>

          <div className="card mt-12 flex flex-wrap items-center justify-between gap-4 p-8">
            <div className="max-w-xl">
              <p className="text-lg font-medium text-[color:var(--ink)]">See if your page fails this rule.</p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--body)]">
                The audit runs every documented check and reports the ones that fail, with fixes.
              </p>
            </div>
            <Link href="/dashboard/new" className="btn btn-primary">
              <span className="btn-chip">
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              </span>
              Run your first audit
            </Link>
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">Related rules</p>
            {related.map((rule) => (
              <Link
                key={rule.slug}
                href={`/docs/${rule.slug}`}
                className="card block p-4 transition hover:border-[var(--hairline-strong)]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">{rule.severity}</p>
                <p className="mt-2 text-sm font-medium leading-snug text-[color:var(--ink)]">{rule.title}</p>
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

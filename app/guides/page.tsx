import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import ArticleCard from '../../components/ArticleCard';
import { allGuides } from '../../lib/content';
import { SITE_URL } from '../../lib/site';

export const metadata: Metadata = {
  title: 'Guides — make your site agent-ready',
  description: 'Step-by-step guides for building websites that autonomous agents can read, navigate, and complete tasks on.',
  alternates: { canonical: `${SITE_URL}/guides` },
};

export default function GuidesIndex() {
  const guides = allGuides;
  const featured = guides.find((g) => g.featured);
  const rest = guides.filter((g) => g.slug !== featured?.slug);

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-8 sm:py-20">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">Guides</p>
        <h1 className="mt-4 text-4xl font-normal tracking-[-0.03em] sm:text-5xl">Make your site agent-ready.</h1>
        <p className="mt-4 text-lg leading-8 text-[color:var(--body)]">
          Step-by-step playbooks for the most common ways AI agents fail on real sites — with fixes you can ship today.
        </p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {featured && (
          <Link
            href={`/guides/${featured.slug}`}
            className="card group flex flex-col justify-between p-8 lg:col-span-2"
          >
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-[var(--accent)]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
                Featured guide
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">
                {featured.category}
              </span>
            </div>
            <div className="mt-6 max-w-3xl">
              <h2 className="text-3xl font-normal tracking-[-0.02em] text-[color:var(--ink)] group-hover:text-[var(--primary-active)]">
                {featured.title}
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[color:var(--body)]">{featured.description}</p>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
                <span>{featured.readingTime}</span>
                <span>·</span>
                <span>{featured.date}</span>
              </div>
              <span className="flex items-center gap-2 text-sm font-medium text-[var(--accent)]">
                Read the guide
                <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </span>
            </div>
          </Link>
        )}

        {rest.map((guide) => (
          <ArticleCard key={guide.slug} article={guide} prefix="guides" />
        ))}
      </div>

      <div className="card mt-14 flex flex-wrap items-center justify-between gap-4 p-8">
        <div className="max-w-xl">
          <p className="text-lg font-medium text-[color:var(--ink)]">Prefer to see it on your own page?</p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--body)]">
            Every guide is backed by the checks our audit runs. Point it at any URL and read the results.
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
  );
}

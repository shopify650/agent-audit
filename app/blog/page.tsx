import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import ArticleCard from '../../components/ArticleCard';
import { allArticles } from '../../lib/content';
import { SITE_URL } from '../../lib/site';

export const metadata: Metadata = {
  title: 'Blog — notes on the machine-readable web',
  description:
    'How AI agents read websites, what breaks them, and the markup patterns that survive contact with automation.',
  alternates: { canonical: `${SITE_URL}/blog` },
};

export default function BlogIndex() {
  const articles = allArticles.filter((a) => a.kind === 'article');
  const featured = allArticles.find((a) => a.featured && a.kind === 'article');
  const rest = articles.filter((a) => a.slug !== featured?.slug);

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-8 sm:py-20">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">Blog</p>
        <h1 className="mt-4 text-4xl font-normal tracking-[-0.03em] sm:text-5xl">Notes on the machine-readable web.</h1>
        <p className="mt-4 text-lg leading-8 text-[color:var(--body)]">
          How AI agents read websites, what breaks them, and the markup patterns that survive contact with automation.
        </p>
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-2 text-sm text-[color:var(--muted)]">
        {['DOM & rendering', 'Accessibility', 'Agent commerce', 'Engineering'].map((tag) => (
          <span key={tag} className="rounded-full border border-[var(--card-border)] bg-[var(--surface-card)] px-3 py-1">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {featured && (
          <Link
            href={`/blog/${featured.slug}`}
            className="card group flex flex-col justify-between p-8 lg:col-span-2"
          >
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-[var(--accent)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
                Featured
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
                <span>{featured.author.name}</span>
                <span>·</span>
                <span>{featured.date}</span>
                <span>·</span>
                <span>{featured.readingTime}</span>
              </div>
              <span className="flex items-center gap-2 text-sm font-medium text-[var(--accent)]">
                Read the post
                <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </span>
            </div>
          </Link>
        )}

        {rest.map((article) => (
          <ArticleCard key={article.slug} article={article} prefix="blog" />
        ))}
      </div>

      <div className="card mt-14 flex flex-wrap items-center justify-between gap-4 p-8">
        <div className="max-w-xl">
          <p className="text-lg font-medium text-[color:var(--ink)]">Want these findings about your own site?</p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--body)]">
            The same checks we write about are the ones our audit runs. See exactly what agents read on your homepage.
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

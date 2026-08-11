import Link from 'next/link';
import { ArrowLeft, ArrowRight, Clock, User } from 'lucide-react';
import JsonLd from './JsonLd';
import PostBlocks from './PostLayout';
import ArticleCard from './ArticleCard';
import { allArticles, type Article } from '../lib/content';
import { SITE_URL } from '../lib/site';

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export default function PostPage({ article, collection }: { article: Article; collection: 'blog' | 'guides' }) {
  const indexHref = collection === 'guides' ? '/guides' : '/blog';
  const indexLabel = collection === 'guides' ? 'All guides' : 'All posts';

  const related = allArticles
    .filter((a) => a.slug !== article.slug && a.kind === article.kind)
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-8 sm:py-20">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: article.title,
          description: article.description,
          datePublished: article.date,
          dateModified: article.updated || article.date,
          author: { '@type': 'Person', name: article.author.name },
          publisher: { '@type': 'Organization', name: 'AGEN' },
          mainEntityOfPage: `${SITE_URL}/${collection}/${article.slug}`,
          keywords: [article.category, 'agent readiness', 'AI agents', 'web accessibility'],
        }}
      />

      <Link
        href={indexHref}
        className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--muted)] transition hover:text-[color:var(--ink)]"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        {indexLabel}
      </Link>

      <article className="mt-8 grid gap-12 lg:grid-cols-[1fr_260px]">
        <div className="min-w-0">
          <header>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">{article.category}</span>
              <span className="rounded-full border border-[var(--card-border)] bg-[var(--surface-card)] px-2.5 py-0.5 text-xs font-medium text-[color:var(--muted)]">
                {article.kind === 'guide' ? 'Guide' : 'Article'}
              </span>
            </div>
            <h1 className="mt-5 text-4xl font-normal leading-[1.08] tracking-[-0.03em] sm:text-5xl">{article.title}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[color:var(--body)]">{article.description}</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-[var(--hairline)] py-4 text-sm text-[color:var(--muted)]">
              <span className="flex items-center gap-2">
                <User className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                {article.author.name}
                <span className="text-[color:var(--muted-soft)]">· {article.author.role}</span>
              </span>
              <span>{article.date}</span>
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                {article.readingTime}
              </span>
            </div>
          </header>

          {article.sections.length > 0 && (
            <nav className="card mt-8 p-6" aria-label="Table of contents">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">In this post</p>
              <ol className="mt-3 space-y-2">
                {article.sections.map((section) => (
                  <li key={section.heading}>
                    <a
                      href={`#${slugify(section.heading)}`}
                      className="text-sm text-[color:var(--body)] transition hover:text-[var(--accent)]"
                    >
                      {section.heading}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          <div className="mt-10">
            <PostBlocks blocks={article.blocks} />
          </div>

          <div className="card mt-12 flex flex-wrap items-center justify-between gap-4 p-8">
            <div className="max-w-xl">
              <p className="text-lg font-medium text-[color:var(--ink)]">See what agents read on your own site.</p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--body)]">
                Run a free scan of any page and get a 0–100 readiness score with copy-pasteable fixes.
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
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--muted)]">More reading</p>
            {related.map((post) => (
              <Link
                key={post.slug}
                href={`/${collection}/${post.slug}`}
                className="card block p-4 transition hover:border-[var(--hairline-strong)]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">{post.category}</p>
                <p className="mt-2 text-sm font-medium leading-snug text-[color:var(--ink)]">{post.title}</p>
                <p className="mt-1.5 text-xs text-[color:var(--muted)]">{post.readingTime}</p>
              </Link>
            ))}
          </div>
        </aside>
      </article>
    </div>
  );
}

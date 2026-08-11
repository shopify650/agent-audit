import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Article } from '../lib/content';

export default function ArticleCard({ article, prefix }: { article: Article; prefix: string }) {
  return (
    <Link
      href={`/${prefix}/${article.slug}`}
      className="card group flex flex-col p-6 transition hover:border-[var(--hairline-strong)]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">{article.category}</span>
        <ArrowUpRight
          className="h-4 w-4 text-[color:var(--muted)] transition group-hover:text-[var(--accent)]"
          strokeWidth={2}
          aria-hidden="true"
        />
      </div>
      <p className="mt-4 text-lg font-medium leading-snug text-[color:var(--ink)] group-hover:text-[var(--primary-active)]">
        {article.title}
      </p>
      <p className="mt-2 flex-1 text-sm leading-6 text-[color:var(--body)]">{article.description}</p>
      <div className="mt-5 flex items-center gap-2 text-xs text-[color:var(--muted)]">
        <span>{article.date}</span>
        <span>·</span>
        <span>{article.readingTime}</span>
      </div>
    </Link>
  );
}

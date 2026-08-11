import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PostPage from '../../../components/PostPage';
import { getArticle, allArticles } from '../../../lib/content';
import { SITE_URL } from '../../../lib/site';

export const dynamicParams = true;

export function generateStaticParams() {
  return allArticles.filter((a) => a.kind === 'article').map((article) => ({ slug: article.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: 'Not found' };
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: `${SITE_URL}/blog/${article.slug}` },
    openGraph: {
      title: article.title,
      description: article.description,
      url: `${SITE_URL}/blog/${article.slug}`,
      type: 'article',
      publishedTime: article.date,
      modifiedTime: article.updated,
      authors: [article.author.name],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();
  return <PostPage article={article} collection="blog" />;
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PostPage from '../../../components/PostPage';
import { getArticle, allGuides } from '../../../lib/content';
import { SITE_URL } from '../../../lib/site';

export const dynamicParams = true;

export function generateStaticParams() {
  return allGuides.map((guide) => ({ slug: guide.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = getArticle(slug);
  if (!guide) return { title: 'Not found' };
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `${SITE_URL}/guides/${guide.slug}` },
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: `${SITE_URL}/guides/${guide.slug}`,
      type: 'article',
      publishedTime: guide.date,
      modifiedTime: guide.updated,
      authors: [guide.author.name],
    },
  };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = getArticle(slug);
  if (!guide) notFound();
  return <PostPage article={guide} collection="guides" />;
}

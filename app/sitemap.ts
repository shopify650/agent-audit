import type { MetadataRoute } from 'next';
import { allArticles, allDocs } from '../lib/content';
import { SITE_URL } from '../lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ['', '/pricing', '/showcase', '/blog', '/guides', '/docs', '/privacy', '/terms'].map(
    (route) => ({
      url: `${SITE_URL}${route}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: route === '' ? 1 : 0.8,
    }),
  );

  const contentRoutes = [
    ...allArticles.map((article) => ({
      url: `${SITE_URL}/${article.kind === 'guide' ? 'guides' : 'blog'}/${article.slug}`,
      lastModified: article.updated ? new Date(article.updated) : new Date(article.date),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...allDocs.map((doc) => ({
      url: `${SITE_URL}/docs/${doc.slug}`,
      lastModified: new Date(doc.updated),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];

  return [...staticRoutes, ...contentRoutes];
}

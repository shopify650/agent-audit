import { allArticles } from '../../../lib/content';
import { SITE_URL, SITE_NAME } from '../../../lib/site';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function GET() {
  const items = allArticles
    .map((article) => {
      const url = `${SITE_URL}/${article.kind === 'guide' ? 'guides' : 'blog'}/${article.slug}`;
      return `
  <item>
    <title>${escapeXml(article.title)}</title>
    <link>${url}</link>
    <guid isPermaLink="true">${url}</guid>
    <pubDate>${new Date(article.date).toUTCString()}</pubDate>
    <description>${escapeXml(article.description)}</description>
    <category>${escapeXml(article.category)}</category>
  </item>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_NAME} — Blog &amp; Guides</title>
    <link>${SITE_URL}/blog</link>
    <description>How AI agents read websites, what breaks them, and the markup patterns that survive contact with automation.</description>
    <language>en-us</language>
    <atom:link href="${SITE_URL}/blog/rss.xml" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

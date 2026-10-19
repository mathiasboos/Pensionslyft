import type { APIContext } from "astro";
import { getNews } from "@/lib/news";
import { SITE_NAME, absolute } from "@/lib/seo";

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// The news as an RSS feed: readers, Google News-style aggregators and social tools pick new items up from here.
export async function GET(_context: APIContext) {
  const news = await getNews();
  const items = news
    .map((item) => {
      const url = absolute(`/nyheter/${item.id}`);
      return `    <item>
      <title>${escape(item.data.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${item.data.published_at.toUTCString()}</pubDate>
      <description>${escape(item.data.excerpt)}</description>
${item.data.tags.map((tag) => `      <category>${escape(tag)}</category>`).join("\n")}
    </item>`;
    })
    .join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_NAME} – Nyheter</title>
    <link>${absolute("/nyheter")}</link>
    <description>Nyheter om pension, skatt och sparande, kortfattat och med länk till källan.</description>
    <language>sv-se</language>
    <atom:link href="${absolute("/nyheter/rss.xml")}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}

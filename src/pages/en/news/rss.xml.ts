import type { APIContext } from "astro";
import { getNews } from "@/lib/news";
import { SITE_NAME, absolute } from "@/lib/seo";

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// The English news as an RSS feed.
export async function GET(_context: APIContext) {
  const news = await getNews("en");
  const items = news
    .map((item) => {
      const url = absolute(`/en/news/${item.id}`);
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
    <title>${SITE_NAME} – News</title>
    <link>${absolute("/en/news")}</link>
    <description>News about pensions, tax and saving in Sweden, in brief and with a link to the source.</description>
    <language>en-gb</language>
    <atom:link href="${absolute("/en/news/rss.xml")}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}

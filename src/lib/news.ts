import { getCollection, type CollectionEntry } from "astro:content";
import type { Lang } from "@/lib/i18n";
import { tagSlug } from "@/lib/tags";

export type NewsItem = CollectionEntry<"news"> | CollectionEntry<"newsEn">;

/** Published news in the language, newest first. */
export async function getNews(lang: Lang = "sv"): Promise<NewsItem[]> {
  const news: NewsItem[] =
    lang === "en"
      ? await getCollection("newsEn", ({ data }) => !data.draft)
      : await getCollection("news", ({ data }) => !data.draft);
  return news.sort((a, b) => b.data.published_at.getTime() - a.data.published_at.getTime());
}

/** Every tag used by published news in the language, with how many items carry it, most used first. */
export async function getTags(lang: Lang = "sv"): Promise<{ tag: string; slug: string; count: number }[]> {
  const counts = new Map<string, { tag: string; count: number }>();
  for (const item of await getNews(lang)) {
    for (const tag of item.data.tags) {
      const slug = tagSlug(tag);
      const seen = counts.get(slug);
      if (seen) seen.count += 1;
      else counts.set(slug, { tag, count: 1 });
    }
  }
  return [...counts.entries()]
    .map(([slug, { tag, count }]) => ({ tag, slug, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, lang === "en" ? "en" : "sv"));
}

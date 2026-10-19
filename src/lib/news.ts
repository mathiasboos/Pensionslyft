import { getCollection, type CollectionEntry } from "astro:content";

export type NewsItem = CollectionEntry<"news">;

/** Published news, newest first. */
export async function getNews(): Promise<NewsItem[]> {
  const news = await getCollection("news", ({ data }) => !data.draft);
  return news.sort((a, b) => b.data.published_at.getTime() - a.data.published_at.getTime());
}

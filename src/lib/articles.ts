import { getCollection, type CollectionEntry } from "astro:content";

export type Article = CollectionEntry<"articles">;

/** Published articles, newest first. */
export async function getArticles(): Promise<Article[]> {
  const articles = await getCollection("articles", ({ data }) => !data.draft);
  return articles.sort((a, b) => b.data.published_at.getTime() - a.data.published_at.getTime());
}

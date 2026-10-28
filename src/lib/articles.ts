import { getCollection, type CollectionEntry } from "astro:content";
import type { Lang } from "@/lib/i18n";

export type Article = CollectionEntry<"articles"> | CollectionEntry<"articlesEn">;

/** Published articles in the language, newest first. */
export async function getArticles(lang: Lang = "sv"): Promise<Article[]> {
  const articles: Article[] =
    lang === "en"
      ? await getCollection("articlesEn", ({ data }) => !data.draft)
      : await getCollection("articles", ({ data }) => !data.draft);
  return articles.sort((a, b) => b.data.published_at.getTime() - a.data.published_at.getTime());
}

/** The Swedish article an English one translates (its slug is `translation_of`), for the cover and the language switch. */
export const swedishSlug = (article: Article): string =>
  "translation_of" in article.data ? article.data.translation_of : article.id;

/** What the cover of an article is drawn from: the Swedish article's id and category, so both languages show the same cover. */
export async function coverOf(article: Article): Promise<{ seed: string; category: string }> {
  const data = article.data;
  if (!("translation_of" in data)) return { seed: article.id, category: data.category };
  const swedish = (await getArticles("sv")).find((a) => a.id === data.translation_of);
  return { seed: data.translation_of, category: swedish?.data.category ?? data.category };
}

import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// Articles live as Markdown files in src/content/articles/.
// The file name (or the "slug" field) becomes the URL: /artiklar/<slug>.
const articleFields = z.object({
  title: z.string(),
  slug: z.string().optional(),
  category: z.string(),
  excerpt: z.string(),
  lead: z.string(),
  reading_minutes: z.number().int().positive(),
  /** Search words, shown as #hashtags and used as keywords: 2-6, lowercase. */
  tags: z.array(z.string()).min(2).max(6),
  published_at: z.coerce.date(),
  author: z.string().default("Pensionslyft"),
  draft: z.boolean().default(false),
});

const articles = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/articles" }),
  schema: articleFields,
});

// News live as Markdown files in src/content/news/: a short item from an authority or from us, with a link to the source.
// The file name (or the "slug" field) becomes the URL: /nyheter/<slug>.
const newsFields = z.object({
  title: z.string(),
  slug: z.string().optional(),
  /** Who published it, as the reader should see it. */
  source: z.string().default("Pensionslyft"),
  source_url: z.url().optional(),
  excerpt: z.string(),
  /** Search words, shown as #hashtags and used as keywords: 2-6, lowercase. */
  tags: z.array(z.string()).min(2).max(6),
  published_at: z.coerce.date(),
  draft: z.boolean().default(false),
});

const news = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/news" }),
  schema: newsFields,
});

// The English versions: the same fields, plus "translation_of", the Swedish slug of the item they translate. They live in
// src/content/en/ and are served at /en/articles/<file name> and /en/news/<file name>.
const articlesEn = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/en/articles" }),
  schema: articleFields.extend({ translation_of: z.string() }),
});

const newsEn = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/en/news" }),
  schema: newsFields.extend({ translation_of: z.string() }),
});

export const collections = { articles, news, articlesEn, newsEn };

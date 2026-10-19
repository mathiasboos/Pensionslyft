import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// Articles live as Markdown files in src/content/articles/.
// The file name (or the "slug" field) becomes the URL: /artiklar/<slug>.
const articles = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/articles" }),
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    category: z.string(),
    excerpt: z.string(),
    lead: z.string(),
    reading_minutes: z.number().int().positive(),
    published_at: z.coerce.date(),
    author: z.string().default("Pensionslyft"),
    draft: z.boolean().default(false),
  }),
});

// News live as Markdown files in src/content/news/: a short item from an authority or from us, with a link to the source.
// The file name (or the "slug" field) becomes the URL: /nyheter/<slug>.
const news = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/news" }),
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    /** Who published it, as the reader should see it. */
    source: z.string().default("Pensionslyft"),
    source_url: z.url().optional(),
    excerpt: z.string(),
    published_at: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { articles, news };

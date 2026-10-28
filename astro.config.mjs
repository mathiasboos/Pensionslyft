// @ts-check
import { readFileSync, readdirSync } from "node:fs";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// "published_at" of the Markdown file behind /nyheter/<slug> or /artiklar/<slug>.
/** @param {string} url */
function lastModified(url) {
  const match = new URL(url).pathname.match(/^\/(nyheter|artiklar)\/([^/]+)$/);
  if (!match || match[2] === "rss.xml") return undefined;
  const folder = new URL(`./src/content/${match[1] === "nyheter" ? "news" : "articles"}/`, import.meta.url);
  for (const name of readdirSync(folder)) {
    const text = readFileSync(new URL(name, folder), "utf8");
    const slug = text.match(/^slug:\s*"?([^"\n]+)"?/m)?.[1] ?? name.replace(/\.md$/, "");
    if (slug === match[2]) return text.match(/^published_at:\s*"?([\d-]+)/m)?.[1];
  }
  return undefined;
}

export default defineConfig({
  site: "https://pensionslyft.se",
  // URLs without a trailing slash, same as the old site: /artiklar, /pensionskalkylator
  trailingSlash: "never",
  build: { format: "file" },
  integrations: [
    react(),
    sitemap({
      // Swedish and English versions of a page point at each other (hreflang in the sitemap).
      i18n: { defaultLocale: "sv", locales: { sv: "sv-SE", en: "en-GB" } },
      // Tell Google when news and articles were published (the sitemap's lastmod), so a new item is crawled sooner.
      serialize(item) {
        const date = lastModified(item.url);
        return date ? { ...item, lastmod: date } : item;
      },
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});

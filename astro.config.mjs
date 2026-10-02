// @ts-check
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://pensionslyft.se",
  // URLs without a trailing slash, same as the old site: /artiklar, /pensionskalkylator
  trailingSlash: "never",
  build: { format: "file" },
  integrations: [react(), sitemap()],
  vite: { plugins: [tailwindcss()] },
});

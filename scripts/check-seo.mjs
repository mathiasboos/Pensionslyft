// Checks the built pages (run after `npm run build`): one title and one description per page, within the lengths search
// engines show, a canonical URL, a share image, parseable JSON-LD, and no two pages with the same title or description.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const dist = new URL("../dist/", import.meta.url).pathname;
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      // dist/app/ holds the calculators shown from GitHub: files for the frames, not pages.
      if (path !== join(dist, "app")) walk(path);
    }
    else if (name.endsWith(".html") && !name.endsWith("-app.html") && name !== "404.html") files.push(path);
  }
})(dist);

const problems = [];
const seen = { title: new Map(), description: new Map() };
for (const file of files) {
  const page = file.slice(dist.length);
  const html = readFileSync(file, "utf8");
  const title = html.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
  const description = html.match(/<meta name="description" content="(.*?)"/)?.[1] ?? "";
  if (!title || title.length > 65) problems.push(`${page}: title is ${title.length} characters (max 65): ${title}`);
  if (description.length < 50 || description.length > 175) problems.push(`${page}: description is ${description.length} characters (50-175)`);
  for (const [kind, value] of [["title", title], ["description", description]]) {
    if (seen[kind].has(value)) problems.push(`${page}: same ${kind} as ${seen[kind].get(value)}`);
    seen[kind].set(value, page);
  }
  if (!/<link rel="canonical" href="https:\/\/pensionslyft\.se/.test(html)) problems.push(`${page}: no canonical URL`);
  if (!/<meta property="og:image" content="https:\/\//.test(html)) problems.push(`${page}: no og:image`);
  if ((html.match(/<h1[ >]/g) ?? []).length !== 1) problems.push(`${page}: needs exactly one h1`);
  for (const [, json] of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)) {
    try {
      JSON.parse(json);
    } catch {
      problems.push(`${page}: invalid JSON-LD`);
    }
  }
}
// Language versions: every hreflang link points at a page that exists, and that page points back.
const urlOf = (file) => {
  const path = "/" + file.slice(dist.length).replace(/\.html$/, "").replace(/\/index$/, "");
  return `https://pensionslyft.se${path === "/index" ? "/" : path}`;
};
const byUrl = new Map(files.map((f) => [urlOf(f), readFileSync(f, "utf8")]));
for (const [url, html] of byUrl) {
  const links = [...html.matchAll(/<link rel="alternate" hreflang="([\w-]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]]);
  for (const [lang, href] of links) {
    const target = byUrl.get(href);
    if (!target) problems.push(`${url}: hreflang ${lang} points at ${href}, which is not a page`);
    else if (lang !== "x-default" && !target.includes(`hreflang="${lang === "sv" ? "sv" : "en"}" href="${href}"`))
      problems.push(`${url}: ${href} does not link back`);
  }
}
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`SEO ok: ${files.length} pages`);

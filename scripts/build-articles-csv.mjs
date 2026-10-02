// Builds content/articles.csv from the Markdown files in content/articles/.
// Import the CSV in Framer: CMS → your collection → "…" → Import CSV.
//
// Run with: npm run build:articles

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Marked } from "marked";

const ARTICLES_DIR = new URL("../content/articles/", import.meta.url);
const OUTPUT = new URL("../content/articles.csv", import.meta.url);

const COLUMNS = ["Title", "Slug", "Category", "Excerpt", "Lead", "Content", "Date", "Reading time"];

// Framer's rich text has no tables, so tables become bullet lists:
// "<strong>first cell</strong> – Header 2: cell 2. Header 3: cell 3."
const marked = new Marked({
  renderer: {
    table(token) {
      const headers = token.header.map((cell) => this.parser.parseInline(cell.tokens));
      const items = token.rows.map((row) => {
        const [first, ...rest] = row.map((cell) => this.parser.parseInline(cell.tokens));
        const details = rest.map((value, i) => `${headers[i + 1]}: ${value}`).join(". ");
        return `<li><strong>${first}</strong> – ${details}.</li>`;
      });
      return `<ul>${items.join("")}</ul>\n`;
    },
  },
});

function parseFrontmatter(source, file) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`${file}: missing frontmatter`);
  const data = {};
  for (const line of match[1].split("\n")) {
    const [, key, raw] = line.match(/^(\w+):\s*(.*)$/) ?? [];
    if (!key) throw new Error(`${file}: cannot read frontmatter line "${line}"`);
    data[key] = raw.startsWith('"') ? JSON.parse(raw) : raw;
  }
  return { data, body: match[2] };
}

function csvField(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

const files = readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".md")).sort();
const rows = files.map((file) => {
  const { data, body } = parseFrontmatter(readFileSync(join(ARTICLES_DIR.pathname, file), "utf8"), file);
  return [
    data.title,
    data.slug,
    data.category,
    data.excerpt,
    data.lead,
    marked.parse(body).trim(),
    data.published_at,
    data.reading_minutes,
  ];
});

// Newest first, like the article list on the site.
rows.sort((a, b) => b[6].localeCompare(a[6]));

const csv = [COLUMNS, ...rows].map((row) => row.map(csvField).join(",")).join("\r\n") + "\r\n";
writeFileSync(OUTPUT, csv);
console.log(`Wrote ${rows.length} articles to content/articles.csv`);

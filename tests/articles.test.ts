/// <reference types="node" />
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Small RFC 4180 parser: every field in our CSV is quoted.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  return rows;
}

const dir = new URL("../content/articles/", import.meta.url);
const csv = readFileSync(new URL("../content/articles.csv", import.meta.url), "utf8");
const [header, ...rows] = parseCsv(csv);
const slugs = readdirSync(dir)
  .filter((f) => f.endsWith(".md"))
  .map((f) => f.replace(/\.md$/, ""));

describe("content/articles.csv", () => {
  it("has the columns Framer CMS expects", () => {
    expect(header).toEqual(["Title", "Slug", "Category", "Excerpt", "Lead", "Content", "Date", "Reading time"]);
  });

  it("has one row per Markdown article (run `npm run build:articles` if this fails)", () => {
    expect(rows.map((r) => r[1]).sort()).toEqual(slugs.sort());
  });

  it("has complete rows with HTML content and no tables", () => {
    for (const row of rows) {
      expect(row).toHaveLength(header!.length);
      for (const value of row) expect(value.trim()).not.toBe("");
      expect(row[5]).toMatch(/^<h2>/);
      expect(row[5]).not.toContain("<table");
      expect(row[6]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number(row[7])).toBeGreaterThan(0);
    }
  });
});

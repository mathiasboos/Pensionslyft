import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Every Swedish news item and article has exactly one English version in src/content/en/, and the two say the same:
// the same date, the same source, and the same numbers, headings, table rows and images. A new Swedish item without its
// English twin fails here.
type Doc = { name: string; front: Record<string, string>; body: string };

function load(dir: string): Doc[] {
  const folder = new URL(`../src/content/${dir}/`, import.meta.url);
  return readdirSync(folder)
    .filter((n) => n.endsWith(".md"))
    .map((name) => {
      const text = readFileSync(new URL(name, folder), "utf8");
      const [, front = "", body = ""] = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) ?? [];
      const fields: Record<string, string> = {};
      for (const line of front.split("\n")) {
        const m = line.match(/^(\w+):\s*(.*)$/);
        if (m) fields[m[1]!] = m[2]!.replace(/^"|"$/g, "");
      }
      return { name: name.replace(/\.md$/, ""), front: fields, body };
    });
}

/** The numbers in a text, in order, written the same way in both languages (1 234,5 and 1,234.5 both become 1234.5). */
function numbers(text: string): string[] {
  const clean = text
    .replace(/\]\([^)]*\)/g, "]") // link targets
    .replace(/<img[^>]*>/g, " ")
    .replace(/!\[[^\]]*\]/g, " ") // image alt texts
    .replace(/^\*\\?\* ?/gm, "");
  const out: string[] = [];
  for (const m of clean.matchAll(/\d[\d  ,.]*\d|\d/g)) {
    let n = m[0].replace(/[  ]/g, "");
    // Swedish "1,6" and English "1.6" are decimals; English "1,129" has a thousands comma (three digits after it).
    if (/^\d{1,3}(,\d{3})+$/.test(n)) n = n.replace(/,/g, "");
    else n = n.replace(",", ".");
    out.push(n.replace(/\.$/, ""));
  }
  return out;
}
const count = (text: string, re: RegExp) => (text.match(re) ?? []).length;

describe.each(["news", "articles"] as const)("%s are translated", (kind) => {
  const swedish = load(kind);
  const english = load(`en/${kind}`);

  it("every English item names an existing Swedish one, once", () => {
    const names = new Map(swedish.map((d) => [d.front.slug ?? d.name, d]));
    const seen = new Set<string>();
    for (const en of english) {
      const sv = en.front.translation_of!;
      expect(names.has(sv), `${en.name} translates ${sv}`).toBe(true);
      expect(seen.has(sv), `${sv} is translated twice`).toBe(false);
      seen.add(sv);
    }
  });

  for (const sv of swedish) {
    const slug = sv.front.slug ?? sv.name;
    const en = english.find((e) => e.front.translation_of === slug);

    it(`${slug} has an English version`, () => expect(en, `add src/content/en/${kind}/<english-slug>.md with translation_of: ${slug}`).toBeDefined());
    if (!en) continue;

    it(`${slug}: the English version says the same`, () => {
      expect(en.front.published_at).toBe(sv.front.published_at);
      expect(en.front.source_url).toBe(sv.front.source_url);
      expect(en.front.reading_minutes).toBe(sv.front.reading_minutes);
      expect(count(en.body, /^#{2,3} /gm), "headings").toBe(count(sv.body, /^#{2,3} /gm));
      expect(count(en.body, /^\|/gm), "table rows").toBe(count(sv.body, /^\|/gm));
      expect(count(en.body, /^[-*] |^\d+\. /gm), "list items").toBe(count(sv.body, /^[-*] |^\d+\. /gm));
      expect(count(en.body, /!\[|<img/g), "images").toBe(count(sv.body, /!\[|<img/g));
      expect(count(en.body, /\]\(http/g), "external links").toBe(count(sv.body, /\]\(http/g));
    });

    it(`${slug}: every number is the same in both versions`, () => {
      expect(numbers(en.body)).toEqual(numbers(sv.body));
    });

    it(`${slug}: the English fields are English`, () => {
      for (const key of ["title", "excerpt", "category", "source"]) {
        if (en.front[key]) expect(en.front[key], key).not.toMatch(/[åäö]/i);
      }
      expect(en.front.tags ?? "").not.toMatch(/[åäö]/i);
    });
  }
});

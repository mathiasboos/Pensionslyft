import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hashtag, tagSlug } from "../src/lib/tags";

// Every news item and article is checked against the length rules that search engines show in their results.
function load(folder: string) {
  const dir = new URL(`../src/content/${folder}/`, import.meta.url);
  return readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => {
      const text = readFileSync(new URL(name, dir), "utf8");
      const field = (key: string) => text.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]?.trim();
      const unquote = (value?: string) => value?.replace(/^"|"$/g, "");
      const tags = [...(field("tags")?.matchAll(/"([^"]+)"/g) ?? [])].map((m) => m[1]!);
      return { name, title: unquote(field("title")) ?? "", excerpt: unquote(field("excerpt")) ?? "", tags, sourceUrl: field("source_url") };
    });
}

describe.each(["news", "articles"])("%s: search fields", (folder) => {
  for (const item of load(folder)) {
    it(`${item.name}: title, description and tags`, () => {
      expect(item.title.length, "title").toBeGreaterThan(0);
      expect(item.title.length, "title is at most 70 characters").toBeLessThanOrEqual(70);
      expect(item.excerpt.length, "excerpt is at least 50 characters").toBeGreaterThanOrEqual(50);
      expect(item.excerpt.length, "excerpt is at most 160 characters").toBeLessThanOrEqual(160);
      expect(item.tags.length, "2-6 tags").toBeGreaterThanOrEqual(2);
      expect(item.tags.length, "2-6 tags").toBeLessThanOrEqual(6);
      for (const tag of item.tags) expect(tag, "tags are lowercase").toBe(tag.toLowerCase());
      expect(new Set(item.tags.map(tagSlug)).size, "no duplicate tags").toBe(item.tags.length);
    });
  }
});

describe("news has a source link", () => {
  for (const item of load("news")) {
    it(item.name, () => expect(item.sourceUrl).toMatch(/^"?https:\/\//));
  }
});

describe("tags", () => {
  it("makes a URL slug", () => {
    expect(tagSlug("allmän pension")).toBe("allman-pension");
    expect(tagSlug("Tjänstepension")).toBe("tjanstepension");
    expect(tagSlug("ränta på ränta")).toBe("ranta-pa-ranta");
    expect(tagSlug("2027")).toBe("2027");
  });
  it("makes a hashtag without spaces", () => {
    expect(hashtag("allmän pension")).toBe("#allmänpension");
    expect(hashtag("ibb")).toBe("#ibb");
  });
});

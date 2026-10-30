import { describe, expect, it } from "vitest";
import { calculatorText } from "../src/data/calculator-text";

// The calculators are shown in a frame that Google does not index, so each calculator page needs its own text.
const plain = (html: string) => html.replace(/<[^>]+>/g, " ");
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

describe.each(Object.entries(calculatorText))("%s", (slug, byLang) => {
  for (const [lang, info] of Object.entries(byLang)) {
    it(`${lang}: has enough text, questions and links`, () => {
      const all = [...info.about, ...info.how, ...info.faq.flatMap((f) => [f.q, f.a])].map(plain).join(" ");
      expect(words(all), `${slug} ${lang}`).toBeGreaterThanOrEqual(250);
      expect(info.faq.length).toBeGreaterThanOrEqual(3);
      expect(info.related.length).toBeGreaterThanOrEqual(2);
      for (const f of info.faq) expect(f.a, "FAQ answers are plain text").not.toMatch(/[<>]/);
      for (const r of info.related) expect(r.href.startsWith(lang === "en" ? "/en/" : "/")).toBe(true);
    });
  }
  it("English and Swedish have the same number of questions", () => {
    expect(byLang.en.faq.length).toBe(byLang.sv.faq.length);
  });
});

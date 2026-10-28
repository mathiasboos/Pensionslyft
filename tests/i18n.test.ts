import { describe, expect, it } from "vitest";
import { alternates, cleanPath, langOf, PAIRS, switchTarget, twinOf } from "../src/lib/i18n";
import { ui } from "../src/i18n/ui";

describe("language helpers", () => {
  it("tells the language from the path", () => {
    expect(langOf("/")).toBe("sv");
    expect(langOf("/pensionskalkylator")).toBe("sv");
    expect(langOf("/en")).toBe("en");
    expect(langOf("/en.html")).toBe("en");
    expect(langOf("/en/calculators")).toBe("en");
    expect(langOf("/english")).toBe("sv");
  });
  it("cleans paths the way the pages are served", () => {
    expect(cleanPath("/kalkylatorer.html")).toBe("/kalkylatorer");
    expect(cleanPath("/en/index.html")).toBe("/en");
    expect(cleanPath("/en/")).toBe("/en");
    expect(cleanPath("/")).toBe("/");
  });
  it("finds the twin of a page, both ways", () => {
    for (const [sv, en] of PAIRS) {
      expect(twinOf(sv)).toBe(en);
      expect(twinOf(en)).toBe(sv);
      expect(langOf(sv)).toBe("sv");
      expect(langOf(en)).toBe("en");
    }
    expect(twinOf("/nyheter")).toBe("/en/news");
    expect(twinOf("/nyheter/tagg/pension")).toBeNull();
    expect(twinOf("/rapporter")).toBeNull();
    expect(alternates("/en/about")).toEqual({ sv: "/om-pensionslyft", en: "/en/about" });
    expect(alternates("/rapporter")).toBeNull();
    expect(alternates("/en/articles")).toEqual({ sv: "/artiklar", en: "/en/articles" });
  });
  it("pairs every English news item and article with its Swedish one", () => {
    expect(twinOf("/nyheter/jamkning-pensionarer-2027")).toBe("/en/news/pensioners-deadline-tax-adjustment-2027");
    expect(twinOf("/en/articles/how-fire-works-the-way-to-financial-freedom")).toBe("/artiklar/sa-funkar-fire-vagen-till-ekonomisk-frihet");
  });
  it("leads the switch somewhere sensible when a page has no twin", () => {
    expect(switchTarget("/nyheter/tagg/pension")).toBe("/en/news");
    expect(switchTarget("/en/news/tag/pension")).toBe("/nyheter");
    expect(switchTarget("/rapporter")).toBe("/en");
    expect(switchTarget("/pensionskalkylator.html")).toBe("/en");
    expect(switchTarget("/en/calculators")).toBe("/kalkylatorer");
  });
  it("has no path twice", () => {
    const all = PAIRS.flat();
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("the interface texts", () => {
  it("are in both languages, none empty", () => {
    expect(Object.keys(ui.en).sort()).toEqual(Object.keys(ui.sv).sort());
    for (const lang of ["sv", "en"] as const) for (const [key, text] of Object.entries(ui[lang])) expect(text.trim(), `${lang} ${key}`).not.toBe("");
  });
});

import { describe, expect, it } from "vitest";
import { alternates, cleanPath, langOf, PAIRS, twinOf } from "../src/lib/i18n";
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
    expect(twinOf("/nyheter")).toBeNull();
    expect(alternates("/en/about")).toEqual({ sv: "/om-pensionslyft", en: "/en/about" });
    expect(alternates("/rapporter")).toBeNull();
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

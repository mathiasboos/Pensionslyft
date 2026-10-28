import { describe, expect, it } from "vitest";
import { calculatorGroups, calculators, groupTitle, LEVELS, levelName, levelText, navItem } from "../src/lib/site-nav";

describe("English names of the calculators", () => {
  it("every calculator has an English name and description", () => {
    for (const item of calculators) {
      const en = navItem(item, "en");
      expect(en.title, item.href).not.toBe(item.title);
      expect(en.description, item.href).not.toBe(item.description);
      expect(en.title).not.toMatch(/[åäö]/i);
      expect(en.description).not.toMatch(/[åäö]/i);
    }
  });
  it("the groups and levels are translated", () => {
    for (const g of calculatorGroups) expect(groupTitle(g, "en")).not.toMatch(/[åäö]/i);
    for (const l of LEVELS) {
      expect(levelName(l.level, "en")).not.toBe(l.level);
      expect(levelText(l.level, "en")).not.toBe(l.text);
    }
  });
  it("Swedish stays as it is", () => {
    for (const item of calculators) expect(navItem(item, "sv")).toBe(item);
  });
});

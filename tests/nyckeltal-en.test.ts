import { describe, expect, it } from "vitest";
import { keyFigures, keyFiguresEn } from "../src/data/nyckeltal";

describe("the key figures in English", () => {
  it("has every figure, with no Swedish words left", () => {
    expect(keyFiguresEn.length).toBe(keyFigures.length);
    keyFiguresEn.forEach((f, i) => {
      expect(f.label, keyFigures[i]!.label).not.toBe(keyFigures[i]!.label.replace(/,/g, ""));
      expect(`${f.label.replace(/\([^)]*\)/g, "")} ${f.value}`).not.toMatch(/[åäö]| år|mån\b/i);
    });
  });
  it("writes ratios with a decimal point", () => {
    expect(keyFiguresEn.find((f) => f.label.startsWith("Balance"))?.value).toBe("1.147 in 2025");
    expect(keyFiguresEn.find((f) => f.label === "Income index")?.value).toBe("+3.6 %");
  });
});

import { describe, expect, it } from "vitest";
import { formatPercent, formatSek, formatSekShort, groupDigits, parseAmount, stepValue } from "../src/lib/format";

// Regression values: the calculators must keep giving the same numbers as the
// original Lovable site for its default inputs.

describe("format", () => {
  it("formats SEK and percent the Swedish way", () => {
    expect(formatSek(2800224.4).replace(/\s/g, " ")).toBe("2 800 224 kr");
    expect(formatPercent(6.5, 1)).toBe("6,5 %");
    expect(formatPercent(0.6, 2)).toBe("0,60 %");
  });

  it("groups typed amounts in thousands", () => {
    const nb = "\u00a0";
    expect(groupDigits("1234567")).toBe(`1${nb}234${nb}567`);
    expect(groupDigits("1 234 567,5")).toBe(`1${nb}234${nb}567,5`);
    expect(groupDigits("1234.5")).toBe("1" + nb + "234,5");
    expect(groupDigits("32,")).toBe("32,");
    expect(groupDigits("007")).toBe("7");
    expect(groupDigits("")).toBe("");
    expect(groupDigits("abc")).toBe("");
    expect(groupDigits("999")).toBe("999");
  });

  it("reads a grouped amount back as a number", () => {
    expect(parseAmount(groupDigits("1234567,5"))).toBe(1234567.5);
    expect(parseAmount("100 000")).toBe(100000);
    expect(parseAmount("")).toBeNaN();
  });

  it("steps an amount to the next step on the grid", () => {
    expect(stepValue(2500, 100, 1)).toBe(2600);
    expect(stepValue(2500, 100, -1)).toBe(2400);
    expect(stepValue(2550, 100, 1)).toBe(2600);
    expect(stepValue(2550, 100, -1)).toBe(2500);
    expect(stepValue(0, 10000, 1)).toBe(10000);
    expect(stepValue(0, 100, -1)).toBe(0);
    expect(stepValue(50, 100, -1)).toBe(0);
    expect(stepValue(990, 100, 1, 0, 1000)).toBe(1000);
    expect(stepValue(1000, 100, 1, 0, 1000)).toBe(1000);
  });

  it("shortens amounts for chart axes", () => {
    expect(formatSekShort(1500000).replace(/\s/g, " ")).toBe("1,5 mkr");
    expect(formatSekShort(6000000).replace(/\s/g, " ")).toBe("6 mkr");
    expect(formatSekShort(250000).replace(/\s/g, " ")).toBe("250 tkr");
    expect(formatSekShort(0)).toBe("0 kr");
  });
});

// Reference values come from the original FIRE calculator (the Framer version of the site).

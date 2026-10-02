import { describe, expect, it } from "vitest";
import { formatPercent, formatSek } from "../src/lib/format";
import { calculateCompound, calculatePension } from "../src/lib/pension";

// Regression values: the calculators must keep giving the same numbers as the
// original Lovable site for its default inputs.

describe("calculatePension", () => {
  const result = calculatePension({
    currentCapital: 350000,
    monthlyDeposit: 2000,
    yearsToRetirement: 25,
    annualReturn: 6.5,
    annualFee: 0.6,
    payoutYears: 20,
  });

  it("matches the default results shown on the site", () => {
    expect(Math.round(result.finalCapital)).toBe(2800224);
    expect(Math.round(result.monthlyPension)).toBe(15405);
    expect(Math.round(result.totalDeposits)).toBe(950000);
    expect(Math.round(result.totalGrowth)).toBe(1850224);
    expect(Math.round(result.feeCost)).toBe(344401);
    expect(result.series).toHaveLength(26);
  });

  it("handles zero return and zero fee", () => {
    const flat = calculatePension({
      currentCapital: 100000,
      monthlyDeposit: 1000,
      yearsToRetirement: 10,
      annualReturn: 0,
      annualFee: 0,
      payoutYears: 10,
    });
    expect(flat.finalCapital).toBeCloseTo(220000, 6);
    expect(flat.monthlyPension).toBeCloseTo(220000 / 120, 6);
    expect(flat.feeCost).toBe(0);
  });
});

describe("calculateCompound", () => {
  it("matches the default results shown on the site", () => {
    const result = calculateCompound({
      startAmount: 50000,
      monthlyDeposit: 2500,
      years: 20,
      annualReturn: 7,
      annualFee: 0.3,
    });
    expect(Math.round(result.finalCapital)).toBe(1409361);
    expect(result.totalDeposits).toBe(650000);
    expect(Math.round(result.totalGrowth)).toBe(759361);
  });
});

describe("format", () => {
  it("formats SEK and percent the Swedish way", () => {
    expect(formatSek(2800224.4).replace(/\s/g, " ")).toBe("2 800 224 kr");
    expect(formatPercent(6.5, 1)).toBe("6,5 %");
    expect(formatPercent(0.6, 2)).toBe("0,60 %");
  });
});

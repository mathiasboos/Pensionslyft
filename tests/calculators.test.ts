import { describe, expect, it } from "vitest";
import * as original from "../lovable-app/src/lib/pension.ts";
import { calculatePension } from "../framer/Pensionskalkylator.tsx";
import { calculateCompound } from "../framer/RantaPaRanta.tsx";

// The Framer components carry their own copy of the math. These tests make
// sure that copy gives exactly the same numbers as the Lovable app did.

const pensionCases: original.PensionInput[] = [
  { currentCapital: 350000, monthlyDeposit: 2000, yearsToRetirement: 25, annualReturn: 6.5, annualFee: 0.6, payoutYears: 20 },
  { currentCapital: 0, monthlyDeposit: 0, yearsToRetirement: 1, annualReturn: 0, annualFee: 0, payoutYears: 5 },
  { currentCapital: 500000, monthlyDeposit: 2000, yearsToRetirement: 35, annualReturn: 7, annualFee: 1.2, payoutYears: 30 },
  { currentCapital: 100000, monthlyDeposit: 5000, yearsToRetirement: 45, annualReturn: 0, annualFee: 2.5, payoutYears: 10 },
  { currentCapital: 2000000, monthlyDeposit: 0, yearsToRetirement: 10, annualReturn: 12, annualFee: 0, payoutYears: 25 },
];

const compoundCases: original.CompoundInput[] = [
  { startAmount: 50000, monthlyDeposit: 2500, years: 20, annualReturn: 7, annualFee: 0.3 },
  { startAmount: 0, monthlyDeposit: 0, years: 1, annualReturn: 0, annualFee: 0 },
  { startAmount: 0, monthlyDeposit: 1000, years: 50, annualReturn: 12, annualFee: 2.5 },
  { startAmount: 250000, monthlyDeposit: 0, years: 30, annualReturn: 0, annualFee: 1 },
];

describe("Pensionskalkylator", () => {
  it.each(pensionCases)("matches the Lovable calculation for %o", (input) => {
    expect(calculatePension(input)).toEqual(original.calculatePension(input));
  });

  it("gives the expected result for the default values", () => {
    const result = calculatePension(pensionCases[0]!);
    expect(result.series).toHaveLength(26);
    expect(result.finalCapital).toBeGreaterThan(result.totalDeposits);
    expect(result.feeCost).toBeGreaterThan(0);
  });
});

describe("RantaPaRanta", () => {
  it.each(compoundCases)("matches the Lovable calculation for %o", (input) => {
    expect(calculateCompound(input)).toEqual(original.calculateCompound(input));
  });

  it("splits the final capital into deposits and returns", () => {
    const result = calculateCompound(compoundCases[0]!);
    expect(result.totalDeposits).toBe(50000 + 2500 * 12 * 20);
    expect(result.totalDeposits + result.totalGrowth).toBeCloseTo(result.finalCapital, 6);
  });
});

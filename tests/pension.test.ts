import { describe, expect, it } from "vitest";
import { formatPercent, formatSek, formatSekShort } from "../src/lib/format";
import { calculateCompound, calculateFire, calculatePension } from "../src/lib/pension";

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

  it("shortens amounts for chart axes", () => {
    expect(formatSekShort(1500000).replace(/\s/g, " ")).toBe("1,5 mkr");
    expect(formatSekShort(6000000).replace(/\s/g, " ")).toBe("6 mkr");
    expect(formatSekShort(250000).replace(/\s/g, " ")).toBe("250 tkr");
    expect(formatSekShort(0)).toBe("0 kr");
  });
});

// Reference values come from the original FIRE calculator (the Framer version of the site).
describe("calculateFire", () => {
  const defaults = {
    currentAge: 20,
    monthlySalary: 40000,
    savingsRate: 50,
    fireMultiple: 25,
    annualReturn: 6.1,
    annualFee: 0.25,
    yieldTax: 1.05,
    taxFreeAmount: 0, // the original had no tax-free amount
    startCapital: 0,
  };

  it("matches the original calculator for its default inputs", () => {
    const result = calculateFire(defaults);
    expect(result.fireAge).toBe(37);
    expect(result.fireYear).toBe(17);
    expect(result.target).toBe(6000000);
    expect(result.monthlySavings).toBe(20000);
    expect(result.monthlySpending).toBe(20000);
    expect(result.netReturn).toBeCloseTo(4.8, 10);
    expect(result.rows).toHaveLength(70);

    const first = result.rows[0]!;
    expect(Math.round(first.growth)).toBe(6638);
    expect(Math.round(first.tax)).toBe(2590);
    expect(Math.round(first.fees)).toBe(617);
    expect(Math.round(first.closing)).toBe(243432);

    const fire = result.rows[16]!;
    expect(fire.age).toBe(37);
    expect(Math.round(fire.opening)).toBe(5630087);
    expect(Math.round(fire.closing)).toBe(6139299);
    expect(Math.round(fire.gap)).toBe(-139299);

    expect(result.milestones).toEqual([
      { percent: 25, age: 26 },
      { percent: 50, age: 30 },
      { percent: 75, age: 34 },
      { percent: 100, age: 37 },
    ]);
  });

  it("matches the original calculator with a start capital", () => {
    const result = calculateFire({
      ...defaults,
      currentAge: 35,
      monthlySalary: 55000,
      savingsRate: 30,
      annualReturn: 7,
      annualFee: 0.3,
      startCapital: 500000,
    });
    expect(result.fireAge).toBe(60);
    expect(result.target).toBeCloseTo(11550000, 6);
    expect(Math.round(result.rows[24]!.closing)).toBe(12320151);
    expect(result.milestones.map((m) => m.age)).toEqual([44, 51, 56, 60]);
  });

  it("reports when the target is not reached within 70 years", () => {
    const result = calculateFire({
      ...defaults,
      currentAge: 40,
      monthlySalary: 30000,
      savingsRate: 5,
      fireMultiple: 30,
      annualReturn: 2,
      annualFee: 0.5,
    });
    expect(result.fireYear).toBeNull();
    expect(result.fireAge).toBeNull();
    expect(Math.round(result.rows[69]!.closing)).toBe(1451216);
    expect(result.milestones.at(-1)).toEqual({ percent: 100, age: null });
  });

  it("only taxes the part above the tax-free amount", () => {
    const result = calculateFire({ ...defaults, taxFreeAmount: 300000 });
    // Year 1 ends at 246 638 kr before costs: all of it is tax free.
    expect(result.rows[0]!.tax).toBe(0);
    expect(Math.round(result.rows[0]!.closing)).toBe(246022);
    // Year 2: tax on the part above 300 000 kr only.
    const year2 = result.rows[1]!;
    const beforeCosts = year2.closing + year2.tax + year2.fees;
    expect(year2.tax).toBeCloseTo((beforeCosts - 300000) * 0.0105, 6);
    expect(Math.round(year2.tax)).toBe(2181);
    // The portfolio is bigger every year than without the tax-free amount.
    const without = calculateFire(defaults);
    result.rows.forEach((r, i) => expect(r.closing).toBeGreaterThan(without.rows[i]!.closing));
  });

  it("handles a zero return", () => {
    const result = calculateFire({ ...defaults, annualReturn: 0, annualFee: 0, yieldTax: 0 });
    expect(result.rows[0]!.closing).toBeCloseTo(240000, 6);
    expect(result.fireYear).toBe(25);
  });
});

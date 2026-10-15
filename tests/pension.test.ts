import { describe, expect, it } from "vitest";
import { toCsv } from "../src/lib/export";
import { formatPercent, formatSek, formatSekShort, groupDigits, parseAmount, stepValue } from "../src/lib/format";
import fireWeb from "./fixtures/fire-web.json";
import {
  calculateCompound,
  calculateFire,
  calculatePayout,
  calculatePension,
  requiredMonthlyDeposit,
} from "../src/lib/pension";

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

describe("calculatePayout", () => {
  const input = {
    currentCapital: 350000,
    monthlyDeposit: 2000,
    yearsToRetirement: 25,
    annualReturn: 6.5,
    annualFee: 0.6,
    payoutYears: 20,
  };
  const base = calculatePension(input);

  it("keeps the saving phase and the monthly payment of calculatePension", () => {
    const monthly = calculatePayout({ ...input, method: "monthly" });
    expect(monthly.series).toEqual(base.series);
    expect(monthly.finalCapital).toBe(base.finalCapital);
    expect(monthly.payment).toBe(base.monthlyPension);
    expect(Math.round(monthly.payment)).toBe(15405);
  });

  it("pays a monthly amount for the payout years and ends at 0", () => {
    const { payouts, totalPaid, payment } = calculatePayout({ ...input, method: "monthly" });
    expect(payouts).toHaveLength(20);
    expect(payouts[0]!.year).toBe(26);
    expect(payouts[19]!.year).toBe(45);
    expect(payouts[0]!.opening).toBeCloseTo(base.finalCapital, 6);
    expect(payouts[19]!.closing).toBe(0);
    for (const row of payouts) expect(row.paid).toBeCloseTo(payment * 12, 6);
    expect(totalPaid).toBeCloseTo(payment * 12 * 20, 6);
    expect(payouts[19]!.cumulativePaid).toBeCloseTo(totalPaid, 6);
    // The rest of the capital keeps growing, so more is paid out than was saved.
    expect(totalPaid).toBeGreaterThan(base.finalCapital);
  });

  it("follows the capital year by year: opening + growth - paid = closing", () => {
    const { payouts } = calculatePayout({ ...input, method: "monthly" });
    payouts.forEach((row, i) => {
      expect(row.opening + row.growth - row.paid).toBeCloseTo(row.closing, 6);
      if (i > 0) expect(row.opening).toBeCloseTo(payouts[i - 1]!.closing, 6);
    });
  });

  it("pays the whole capital at once as a lump sum", () => {
    const lump = calculatePayout({ ...input, method: "lump" });
    expect(lump.payouts).toHaveLength(1);
    expect(lump.payouts[0]).toMatchObject({ year: 26, paid: base.finalCapital, closing: 0, growth: 0 });
    expect(lump.totalPaid).toBe(base.finalCapital);
    expect(lump.payment).toBe(base.finalCapital);
    expect(lump.series).toEqual(base.series);
  });

  it("handles zero return and a payout of one year", () => {
    const flat = calculatePayout({
      currentCapital: 100000,
      monthlyDeposit: 1000,
      yearsToRetirement: 10,
      annualReturn: 0,
      annualFee: 0,
      payoutYears: 1,
      method: "monthly",
    });
    expect(flat.payouts).toHaveLength(1);
    expect(flat.payment).toBeCloseTo(220000 / 12, 6);
    expect(flat.totalPaid).toBeCloseTo(220000, 6);
    expect(flat.payouts[0]!.closing).toBe(0);
  });
});

describe("calculateCompound", () => {
  const base = { startCapital: 50000, monthlyDeposit: 2500, years: 20, annualReturn: 7, annualFee: 0.3, yieldTax: 1.05 };

  it("is plain monthly compounding when there is no fee and no tax", () => {
    const result = calculateCompound({ ...base, annualFee: 0, yieldTax: 0 });
    const rate = Math.pow(1.07, 1 / 12) - 1;
    let capital = 50000;
    for (let m = 0; m < 240; m++) capital = capital * (1 + rate) + 2500;
    expect(result.finalCapital).toBeCloseTo(capital, 4);
    expect(result.totalFees).toBe(0);
    expect(result.totalTax).toBe(0);
  });

  it("adds up: start + deposits + interest - fees - tax = final capital", () => {
    for (const input of [base, { ...base, years: 1 }, { ...base, annualReturn: 0 }, { ...base, startCapital: 0 }]) {
      const r = calculateCompound(input);
      expect(r.startCapital + r.totalDeposits + r.totalGrowth - r.totalFees - r.totalTax).toBeCloseTo(
        r.finalCapital,
        4,
      );
    }
  });

  it("splits the net growth into simple interest and interest on interest", () => {
    const r = calculateCompound(base);
    for (const row of r.rows) {
      const netGrowth = row.closing - base.startCapital - row.cumulativeDeposits;
      expect(row.simpleInterest + row.compoundInterest).toBeCloseTo(Math.max(netGrowth, 0), 6);
      expect(row.simpleInterest).toBeLessThanOrEqual(Math.max(netGrowth, 0) + 1e-9);
      expect(row.compoundInterest).toBeGreaterThanOrEqual(0);
    }
  });

  it("gives the default result of the page", () => {
    const r = calculateCompound(base);
    expect(r.totalDeposits).toBe(600000);
    expect(Math.round(r.finalCapital)).toBe(1218382);
  });
});

describe("requiredMonthlyDeposit", () => {
  const base = { startCapital: 50000, years: 10, annualReturn: 7, annualFee: 0.3, yieldTax: 1.05 };

  it("gives the monthly saving that ends at the goal", () => {
    const m = requiredMonthlyDeposit(base, 1_000_000);
    expect(m).toBeGreaterThan(0);
    expect(calculateCompound({ ...base, monthlyDeposit: m }).finalCapital).toBeCloseTo(1_000_000, 4);
  });

  it("is 0 when the start capital alone reaches the goal", () => {
    expect(requiredMonthlyDeposit(base, 60000)).toBe(0);
  });
});

describe("toCsv", () => {
  it("writes a header and whole numbers with semicolons", () => {
    const rows = [
      { year: 1, capital: 1234.6 },
      { year: 2, capital: 2500.4 },
    ];
    const columns = [
      { label: "År", value: (r: (typeof rows)[number]) => r.year, plain: true },
      { label: "Kapital", value: (r: (typeof rows)[number]) => r.capital },
    ];
    expect(toCsv(rows, columns)).toBe("År;Kapital\r\n1;1235\r\n2;2500");
  });
});

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

  // The FIRE calculator in github.com/mathiasboos/Calculators (FIRE_Calculator .html), run in a browser for 70 parameter
  // sets: the first years, the year the target is reached, and the last. Without a tax-free amount the calculations are the same.
  it("gives the figures of the FIRE calculator on GitHub", () => {
    const diffs: string[] = [];
    for (const s of fireWeb) {
      const p = s.params;
      const result = calculateFire({
        currentAge: p.currentAge,
        monthlySalary: p.monthlySalary,
        savingsRate: p.savingsRatio * 100,
        fireMultiple: p.savingsGoalMultiple,
        annualReturn: p.portfolioReturn * 100,
        annualFee: p.portfolioFees * 100,
        yieldTax: p.yieldTaxK * 100,
        taxFreeAmount: 0,
        startCapital: p.initialPortfolio,
      });
      if (result.fireYear !== s.fireYear) diffs.push(`fireYear ${result.fireYear}/${s.fireYear} ${JSON.stringify(p)}`);
      for (const o of s.rows) {
        const m = result.rows[o.yr - 1]!;
        const pairs: [string, number, number][] = [
          ["salary", m.monthlySalary, o.salary],
          ["savings", m.monthlySavings, o.ms],
          ["yearly", m.yearlySavings, o.ys],
          ["target", m.target, o.nt],
          ["opening", m.opening, o.opening],
          ["growth", m.growth, o.roi],
          ["tax", m.tax, o.taxes],
          ["fees", m.fees, o.fees],
          ["closing", m.closing, o.closing],
          ["gap", m.gap, o.gap],
        ];
        for (const [k, mine, theirs] of pairs) {
          if (Math.abs(Math.round(mine) - theirs) > 1) diffs.push(`${JSON.stringify(p)} year ${o.yr} ${k}: ${Math.round(mine)}/${theirs}`);
        }
      }
    }
    expect(diffs).toEqual([]);
  });

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

    expect(first.monthlySalary).toBe(40000);
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

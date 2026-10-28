export type FireInput = {
  currentAge: number;
  monthlySalary: number; // after tax
  savingsRate: number; // percent of the salary that is saved
  fireMultiple: number; // target = yearly spending × multiple (25 = the 4 % rule)
  annualReturn: number; // percent
  annualFee: number; // percent
  yieldTax: number; // percent, the ISK/KF schablonskatt
  taxFreeAmount: number; // kr of the portfolio that is not taxed (skattefri grundnivå)
  startCapital: number;
};

export type FireYear = {
  year: number;
  age: number;
  monthlySalary: number; // after tax
  monthlySavings: number;
  yearlySavings: number;
  opening: number;
  growth: number;
  tax: number;
  fees: number;
  closing: number;
  target: number;
  gap: number; // target minus closing; zero or less means the target is reached
};

export type FireResult = {
  rows: FireYear[];
  fireYear: number | null; // years until the target is reached
  fireAge: number | null;
  target: number;
  monthlySavings: number;
  monthlySpending: number;
  netReturn: number; // percent: return minus tax and fees
  milestones: { percent: number; age: number | null }[];
};

export const FIRE_YEARS = 70;

// The skattefri grundnivå from 2026: one amount per person, shared by ISK, KF and PEPP.
export const ISK_TAX_FREE_AMOUNT = 300_000;

export function calculateFire(input: FireInput): FireResult {
  const monthlyRate = Math.pow(1 + input.annualReturn / 100, 1 / 12) - 1;
  const yearFactor = Math.pow(1 + monthlyRate, 12);
  // What a year of monthly deposits (made at the end of each month) is worth at year end.
  const depositFactor = monthlyRate === 0 ? 12 : (yearFactor - 1) / monthlyRate;
  const monthlySavings = (input.monthlySalary * input.savingsRate) / 100;
  const monthlySpending = input.monthlySalary - monthlySavings;
  const yearlySavings = monthlySavings * 12;
  const target = monthlySpending * 12 * input.fireMultiple;

  const rows: FireYear[] = [];
  let opening = input.startCapital;
  let fireYear: number | null = null;
  for (let year = 1; year <= FIRE_YEARS; year++) {
    const beforeCosts = opening * yearFactor + monthlySavings * depositFactor;
    // Tax and fees are taken on the value at the end of the year. Tax only on the part
    // above the tax-free amount.
    const tax = (Math.max(beforeCosts - input.taxFreeAmount, 0) * input.yieldTax) / 100;
    const fees = (beforeCosts * input.annualFee) / 100;
    const closing = beforeCosts - tax - fees;
    const gap = target - closing;
    if (fireYear === null && gap <= 0) fireYear = year;
    rows.push({
      year,
      age: input.currentAge + year,
      monthlySalary: input.monthlySalary,
      monthlySavings,
      yearlySavings,
      opening,
      growth: beforeCosts - opening - yearlySavings,
      tax,
      fees,
      closing,
      target,
      gap,
    });
    opening = closing;
  }

  const milestones = [25, 50, 75, 100].map((percent) => ({
    percent,
    age: rows.find((r) => target > 0 && (r.closing / target) * 100 >= percent)?.age ?? null,
  }));

  return {
    rows,
    fireYear,
    fireAge: fireYear === null ? null : input.currentAge + fireYear,
    target,
    monthlySavings,
    monthlySpending,
    netReturn: input.annualReturn - input.yieldTax - input.annualFee,
    milestones,
  };
}

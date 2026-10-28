export type CompoundInput = {
  startCapital: number;
  monthlyDeposit: number;
  years: number;
  annualReturn: number; // percent
  annualFee: number; // percent of the capital a year
  yieldTax: number; // percent of the capital a year (the ISK/KF schablonskatt)
};

export type CompoundYear = {
  year: number;
  opening: number;
  deposits: number; // paid in during the year
  growth: number; // interest at the gross return
  fees: number;
  tax: number;
  closing: number;
  cumulativeDeposits: number;
  /** What the net growth to date would be as simple interest, with no interest on interest. */
  simpleInterest: number;
  /** The rest of the net growth: interest on interest. */
  compoundInterest: number;
};

export type CompoundResult = {
  rows: CompoundYear[];
  startCapital: number;
  totalDeposits: number;
  totalGrowth: number;
  totalFees: number;
  totalTax: number;
  finalCapital: number;
  /** The rate that is left of the return after the fee and the tax, percent. */
  netReturn: number;
};

/**
 * Compound interest with the fee and the tax as amounts: the capital grows at the gross return with the deposits paid at
 * the end of every month, and at the end of every year the tax and the fee are taken as a share of the capital. So
 * startCapital + totalDeposits + totalGrowth - totalFees - totalTax = finalCapital.
 */
export function calculateCompound(input: CompoundInput): CompoundResult {
  const monthlyRate = Math.pow(1 + input.annualReturn / 100, 1 / 12) - 1;
  const yearFactor = Math.pow(1 + monthlyRate, 12);
  const depositFactor = monthlyRate === 0 ? 12 : (yearFactor - 1) / monthlyRate;
  const yearlyDeposit = input.monthlyDeposit * 12;
  const netReturn = input.annualReturn - input.annualFee - input.yieldTax;
  const netRate = netReturn / 100;

  const rows: CompoundYear[] = [];
  let opening = input.startCapital;
  let totalGrowth = 0;
  let totalFees = 0;
  let totalTax = 0;
  for (let year = 1; year <= input.years; year++) {
    const beforeCosts = opening * yearFactor + input.monthlyDeposit * depositFactor;
    const growth = beforeCosts - opening - yearlyDeposit;
    const fees = (beforeCosts * input.annualFee) / 100;
    const tax = (beforeCosts * input.yieldTax) / 100;
    const closing = beforeCosts - fees - tax;
    const cumulativeDeposits = yearlyDeposit * year;
    const netGrowth = Math.max(closing - input.startCapital - cumulativeDeposits, 0);
    // Simple interest on the start capital for t years and on each monthly deposit from the month it is paid in.
    const simple =
      input.startCapital * netRate * year + input.monthlyDeposit * netRate * ((year * (12 * year - 1)) / 2);
    const simpleInterest = Math.min(Math.max(simple, 0), netGrowth);
    totalGrowth += growth;
    totalFees += fees;
    totalTax += tax;
    rows.push({
      year,
      opening,
      deposits: yearlyDeposit,
      growth,
      fees,
      tax,
      closing,
      cumulativeDeposits,
      simpleInterest,
      compoundInterest: netGrowth - simpleInterest,
    });
    opening = closing;
  }

  return {
    rows,
    startCapital: input.startCapital,
    totalDeposits: yearlyDeposit * input.years,
    totalGrowth,
    totalFees,
    totalTax,
    finalCapital: rows.length ? rows[rows.length - 1]!.closing : input.startCapital,
    netReturn,
  };
}

/**
 * The monthly saving that gives the goal at the end. The final capital grows in a straight line with the monthly
 * saving, so two runs (with 0 and with 1 kr a month) are enough. 0 if the start capital alone reaches the goal.
 */
export function requiredMonthlyDeposit(input: Omit<CompoundInput, "monthlyDeposit">, goal: number): number {
  const base = calculateCompound({ ...input, monthlyDeposit: 0 }).finalCapital;
  const perKrona = calculateCompound({ ...input, monthlyDeposit: 1 }).finalCapital - base;
  if (goal <= base || perKrona <= 0) return 0;
  return (goal - base) / perKrona;
}

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

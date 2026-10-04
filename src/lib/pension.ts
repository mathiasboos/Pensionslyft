export type PensionInput = {
  currentCapital: number;
  monthlyDeposit: number;
  yearsToRetirement: number;
  annualReturn: number; // percent
  annualFee: number; // percent
  payoutYears: number;
};

export type YearPoint = {
  year: number;
  age?: number;
  capital: number;
  deposits: number;
  growth: number;
};

export type PensionResult = {
  series: YearPoint[];
  finalCapital: number;
  totalDeposits: number;
  totalGrowth: number;
  monthlyPension: number;
  feeCost: number;
};

function project(input: {
  currentCapital: number;
  monthlyDeposit: number;
  years: number;
  netReturn: number;
}): YearPoint[] {
  const monthlyRate = Math.pow(1 + input.netReturn / 100, 1 / 12) - 1;
  let capital = input.currentCapital;
  let deposits = input.currentCapital;
  const series: YearPoint[] = [
    { year: 0, capital, deposits, growth: 0 },
  ];
  for (let year = 1; year <= input.years; year++) {
    for (let month = 0; month < 12; month++) {
      capital = capital * (1 + monthlyRate) + input.monthlyDeposit;
      deposits += input.monthlyDeposit;
    }
    series.push({
      year,
      capital,
      deposits,
      growth: Math.max(capital - deposits, 0),
    });
  }
  return series;
}

export function calculatePension(input: PensionInput): PensionResult {
  const netReturn = input.annualReturn - input.annualFee;
  const series = project({
    currentCapital: input.currentCapital,
    monthlyDeposit: input.monthlyDeposit,
    years: input.yearsToRetirement,
    netReturn,
  });
  const last = series[series.length - 1]!;
  const grossSeries = project({
    currentCapital: input.currentCapital,
    monthlyDeposit: input.monthlyDeposit,
    years: input.yearsToRetirement,
    netReturn: input.annualReturn,
  });
  const gross = grossSeries[grossSeries.length - 1]!.capital;

  // Payout phase: capital keeps growing at half the return during withdrawal.
  const payoutRate = Math.pow(1 + Math.max(netReturn, 0) / 200, 1 / 12) - 1;
  const months = Math.max(input.payoutYears, 1) * 12;
  const monthlyPension =
    payoutRate === 0
      ? last.capital / months
      : (last.capital * payoutRate) / (1 - Math.pow(1 + payoutRate, -months));

  return {
    series,
    finalCapital: last.capital,
    totalDeposits: last.deposits,
    totalGrowth: Math.max(last.capital - last.deposits, 0),
    monthlyPension,
    feeCost: Math.max(gross - last.capital, 0),
  };
}

export type CompoundInput = {
  startAmount: number;
  monthlyDeposit: number;
  years: number;
  annualReturn: number;
  annualFee: number;
};

export function calculateCompound(input: CompoundInput) {
  const series = project({
    currentCapital: input.startAmount,
    monthlyDeposit: input.monthlyDeposit,
    years: input.years,
    netReturn: input.annualReturn - input.annualFee,
  });
  const last = series[series.length - 1]!;
  return {
    series,
    finalCapital: last.capital,
    totalDeposits: last.deposits,
    totalGrowth: Math.max(last.capital - last.deposits, 0),
  };
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

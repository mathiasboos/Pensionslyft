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

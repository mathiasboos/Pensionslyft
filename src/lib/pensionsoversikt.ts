// Pensionsöversikten: will the pension and the savings cover the life you want as a pensioner?
//
// The public pension (inkomstpension, premiepension, garantipension, tillägg) and the tjänstepension come from the
// site's port of Pensionsmyndighetens Typfallsmodellen (src/lib/typfall), or from amounts the user enters. They are
// taxed with the rules of 2026 (src/lib/nettolon.ts). What the pension after tax does not cover of the budget is taken
// from the user's own savings (an ISK). The savings are followed month by month in kronor of the time, with the chosen
// return, the fee and the ISK tax, and shown in today's money.
//
// "Det du behöver" is the capital at the retirement age that just lasts until the life expectancy; "Det du kommer
// att ha" is what today's savings and the monthly saving give. Their ratio at the retirement age is the forecast.
import { calcNettolon, DEFAULTS as TAX_DEFAULTS } from "./nettolon";
import { ISK_TAX_FREE_AMOUNT } from "./pension";
import { FIRST_COHORT, LAST_COHORT, riktaldrar } from "./typfall/data";
import { type Avtal, runTypfall } from "./typfall/model";
import { xage } from "./typfall/tax";

/** minPension's examples of what a pensioner spends a month after tax ("Hur mycket pengar behöver en pensionär?"). */
export const BUDGETS = [
  { key: "bas", label: "Baspensionär", amount: 17_600 },
  { key: "medel", label: "Medelpensionär", amount: 18_400 },
  { key: "plus", label: "Pluspensionär", amount: 27_300 },
] as const;

/** Expected return a year before fees, by the share of shares and bonds. */
export const RETURNS = [
  { value: 6.5, label: "6,5 % – 100 % aktier" },
  { value: 5.5, label: "5,5 % – 75 % aktier, 25 % räntor" },
  { value: 4.5, label: "4,5 % – 50 % aktier, 50 % räntor" },
  { value: 2.5, label: "2,5 % – 100 % räntor" },
] as const;

/** Avtalsområde for the tjänstepension, numbered as in Typfallsmodellen. */
export const AVTAL: { value: Avtal; label: string }[] = [
  { value: 1, label: "Ingen tjänstepension" },
  { value: 2, label: "ITP 1 – privatanställda tjänstemän, födda 1979 och senare" },
  { value: 3, label: "ITP 2 – privatanställda tjänstemän, födda före 1979" },
  { value: 4, label: "SAF-LO – privatanställda arbetare" },
  { value: 5, label: "KAP-KL – anställda i kommuner och regioner" },
  { value: 6, label: "AKAP-KR – anställda i kommuner och regioner, födda 1986 och senare" },
  { value: 7, label: "PA 16 avdelning 2 – statligt anställda, födda före 1988" },
  { value: 8, label: "PA 16 avdelning 1 – statligt anställda, födda 1988 och senare" },
];

/** The real return Typfallsmodellen's prognosstandard uses for the premiepension and the tjänstepension. */
export const MODEL_REAL_RETURN = 0.017;

export interface KalkylInput {
  thisYear: number;
  age: number;
  salary: number; // a month before tax
  savings: number; // today
  monthlySaving: number; // today; grows with the wage
  retireAge: number;
  budget: number; // a month after tax, in today's money
  lifeAge: number;
  returnPct: number; // a year, before fees
  feePct: number; // a year, of the capital
  iskTaxPct: number; // schablonskatt a year, of the capital above the tax-free amount
  inflationPct: number;
  wageGrowthPct: number;
  kommunPct: number; // total municipal tax rate
  begrPct: number; // begravningsavgift
  avtal: Avtal;
  wStart: number; // the age the user started working
  /** Own amounts a month before tax that replace the model's; null uses the model. */
  ownIp: number | null;
  ownPp: number | null;
  ownTjp: number | null;
  otherIncome: number; // a month before tax, from the retirement age
}

export const DEFAULT_INPUT: Omit<KalkylInput, "thisYear"> = {
  age: 40,
  salary: 40_000,
  savings: 300_000,
  monthlySaving: 2_000,
  retireAge: 67,
  budget: 18_400,
  lifeAge: 95,
  returnPct: 5.5,
  feePct: 0.5,
  iskTaxPct: 1.065,
  inflationPct: 2,
  wageGrowthPct: 2,
  kommunPct: 30.55, // Stockholm 2026
  begrPct: 0.07, // Stockholms stad
  avtal: 2,
  wStart: 23,
  ownIp: null,
  ownPp: null,
  ownTjp: null,
  otherIncome: 0,
};

/** The public and occupational pension a month before tax, in today's money, by age. */
export interface PensionAt {
  allman: number; // inkomstpension, premiepension, garantipension and tillägg
  ip: number;
  pp: number;
  gpTillagg: number;
  tjp: number;
}

export interface ModelPension {
  /** null when the birth year is outside the model (born 1959–2005). */
  available: boolean;
  lowestAge: number; // the lowest age for the public pension
  riktalder: number;
  startAge: number; // when the pensions start: the retirement age, or the lowest age if that is later
  /** The model's amounts a month at the start age, before tax (what the "own amount" fields show as hint). */
  first: PensionAt;
  /** By age from the start age. */
  byAge: Map<number, PensionAt>;
}

const ZERO: PensionAt = { allman: 0, ip: 0, pp: 0, gpTillagg: 0, tjp: 0 };

/** The real wage growth a year as a fraction. */
export function realRate(nominalPct: number, inflationPct: number): number {
  return (1 + nominalPct / 100) / (1 + inflationPct / 100) - 1;
}

/** The pensions per Typfallsmodellen, in fixed prices (today's money), with the user's real wage growth. */
export function modelPension(input: Pick<KalkylInput, "thisYear" | "age" | "salary" | "retireAge" | "avtal" | "wStart" | "wageGrowthPct" | "inflationPct">): ModelPension {
  const born = input.thisYear - input.age;
  if (born < FIRST_COHORT || born > LAST_COHORT) {
    const startAge = input.retireAge;
    return { available: false, lowestAge: 0, riktalder: 0, startAge, first: ZERO, byAge: new Map() };
  }
  const { lowest, rikt } = riktaldrar(born);
  const startAge = Math.min(Math.max(input.retireAge, lowest), 75);
  const result = runTypfall({
    born,
    par: startAge,
    wStart: Math.min(input.wStart, startAge - 1),
    monthlyWage: input.salary,
    avtal: input.avtal,
    gift: false,
    realGrowth: realRate(input.wageGrowthPct, input.inflationPct),
    realReturn: MODEL_REAL_RETURN,
  });
  const byAge = new Map<number, PensionAt>();
  for (const y of result.years) {
    if (y.age < startAge) continue;
    const gpTillagg = (y.gp + y.tillagg) / 12;
    byAge.set(y.age, {
      allman: y.ip / 12 + y.pp / 12 + gpTillagg,
      ip: y.ip / 12,
      pp: y.pp / 12,
      gpTillagg,
      tjp: y.tjp / 12,
    });
  }
  // The table amounts at the start age (Tabell 1), the same as the first year of the series but as the model rounds them.
  const first: PensionAt = {
    ip: result.ip / 12,
    pp: result.pp / 12,
    gpTillagg: (result.gp + result.tillagg) / 12,
    tjp: result.tjp / 12,
    allman: (result.ip + result.pp + result.gp + result.tillagg) / 12,
  };
  byAge.set(startAge, first);
  return { available: true, lowestAge: lowest, riktalder: rikt, startAge, first, byAge };
}

/** Tax on a pension a month (2026 rules), and the net. Over the age of the raised grundavdrag from xage(). */
export function pensionNet(grossMonthly: number, over66: boolean, kommunPct: number, begrPct: number): number {
  if (grossMonthly <= 0) return 0;
  const r = calcNettolon({
    ...TAX_DEFAULTS,
    lon: 0,
    pension: grossMonthly,
    over66,
    kommun: kommunPct,
    kyrkaOn: false,
    begrOn: true,
    begrPct,
  });
  return r.netto / 12;
}

/** The net salary a month today, for the budget's share of it. */
export function salaryNet(salary: number, kommunPct: number, begrPct: number): number {
  return calcNettolon({ ...TAX_DEFAULTS, lon: salary, kommun: kommunPct, kyrkaOn: false, begrOn: true, begrPct }).netto / 12;
}

export interface KalkylYear {
  age: number;
  year: number;
  /** In today's money, a year. */
  opening: number;
  saving: number;
  growth: number; // the return after fee and ISK tax
  pensionGross: number;
  pensionNet: number;
  allmanNet: number;
  tjpNet: number;
  otherNet: number;
  need: number; // the budget for the year (0 before the retirement age)
  withdrawal: number; // from the savings
  shortfall: number; // what the savings could not cover
  closing: number;
  /** The capital that is needed, along the same ages ("Det du behöver"). */
  needCapital: number;
}

export type Status = "rattTill" | "nastanDar" | "paVag" | "forbattras";

export const STATUS: Record<Status, { title: string; min: number }> = {
  rattTill: { title: "Du ligger rätt till!", min: 1 },
  nastanDar: { title: "Nästan där", min: 0.85 },
  paVag: { title: "På väg", min: 0.6 },
  forbattras: { title: "Behöver förbättras", min: 0 },
};

export function statusOf(coverage: number): Status {
  if (coverage >= STATUS.rattTill.min) return "rattTill";
  if (coverage >= STATUS.nastanDar.min) return "nastanDar";
  if (coverage >= STATUS.paVag.min) return "paVag";
  return "forbattras";
}

export interface KalkylResult {
  input: KalkylInput;
  pension: ModelPension;
  /** The pensions used, a month before tax at the start age: the model's or the user's own. */
  used: { ip: number; pp: number; gpTillagg: number; allman: number; tjp: number; other: number };
  /** A month after tax in the first full pension year. */
  netPension: number;
  gap: number; // the budget not covered by the net pension a month, the first full pension year
  netSalary: number;
  rows: KalkylYear[];
  haveAtRetirement: number;
  needAtRetirement: number;
  coverage: number; // have / need at the retirement age
  status: Status;
  shortfall: number; // need − have at the retirement age, at least 0
  extraMonthlySaving: number; // more a month (today's money) that closes the shortfall
  depletedAge: number | null; // the age the savings run out, if before the life expectancy
}

interface Flow {
  /** Pension and other income by age, a month in today's money. */
  gross: (age: number) => { allman: number; tjp: number; other: number };
  net: (age: number) => { total: number; allman: number; tjp: number; other: number };
}

function flows(input: KalkylInput, pension: ModelPension): Flow {
  const born = input.thisYear - input.age;
  const rikt = pension.available ? pension.riktalder : 67;
  const scale = (own: number | null, model: number, first: number) => (own === null ? model : first > 0 ? (own * model) / first : own);
  const gross = (age: number) => {
    if (age < input.retireAge) return { allman: 0, tjp: 0, other: 0 };
    const other = input.otherIncome;
    if (age < pension.startAge) return { allman: 0, tjp: 0, other };
    const p = pension.byAge.get(age) ?? pension.byAge.get(Math.max(...pension.byAge.keys(), pension.startAge)) ?? ZERO;
    const f = pension.first;
    // An own amount follows the model's path over the years (the inkomstpension falls a little in real terms);
    // without the model it stays the same.
    const ip = scale(input.ownIp, p.ip, f.ip);
    const pp = scale(input.ownPp, p.pp, f.pp);
    const tjp = scale(input.ownTjp, p.tjp, f.tjp);
    return { allman: ip + pp + p.gpTillagg, tjp, other };
  };
  // The tax is the same in every run of the savings, so it is computed once per age.
  const cache = new Map<number, ReturnType<Flow["net"]>>();
  const net = (age: number) => {
    const hit = cache.get(age);
    if (hit) return hit;
    const g = gross(age);
    const total = g.allman + g.tjp + g.other;
    let value = { total: 0, allman: 0, tjp: 0, other: 0 };
    if (total > 0) {
      const over = age >= xage(born + age, rikt);
      const n = pensionNet(total, over, input.kommunPct, input.begrPct);
      const k = n / total;
      value = { total: n, allman: g.allman * k, tjp: g.tjp * k, other: g.other * k };
    }
    cache.set(age, value);
    return value;
  };
  return { gross, net };
}

interface Run {
  rows: Omit<KalkylYear, "needCapital">[];
  atRetirement: number; // real
  final: number; // real, at the life expectancy
  depletedAge: number | null;
}

/**
 * Month by month in kronor of the time: the saving (growing with the wage) before the retirement age, the budget's
 * gap after it. The fee and the ISK tax are taken at the end of every year, as in calculateFire. Amounts are returned
 * in today's money. `startCapital` and `fromAge` let the retirement phase run on its own (for the capital needed).
 */
function simulate(input: KalkylInput, flow: Flow, monthlySaving: number, startCapital: number, fromAge: number): Run {
  const monthlyRate = Math.pow(1 + input.returnPct / 100, 1 / 12) - 1;
  const infl = 1 + input.inflationPct / 100;
  const wage = 1 + input.wageGrowthPct / 100;
  const rows: Run["rows"] = [];
  let capital = startCapital * Math.pow(infl, fromAge - input.age); // nominal
  let atRetirement = fromAge === input.retireAge ? startCapital : 0;
  let depletedAge: number | null = null;
  for (let age = fromAge; age < input.lifeAge; age++) {
    const t = age - input.age; // years from today
    const price = Math.pow(infl, t); // today's money → kronor of the time, at the start of the year
    const opening = capital;
    if (age === input.retireAge) atRetirement = capital / price;
    const working = age < input.retireAge;
    const savingMonth = working ? monthlySaving * Math.pow(wage, t) : 0;
    const net = flow.net(age);
    const needMonth = working ? 0 : input.budget;
    const gapMonth = Math.max(needMonth - net.total, 0) * price;
    let withdrawn = 0;
    let shortfall = 0;
    let growth = 0;
    for (let m = 0; m < 12; m++) {
      const interest = capital * monthlyRate;
      growth += interest;
      capital += interest + savingMonth;
      const take = Math.min(gapMonth, Math.max(capital, 0));
      capital -= take;
      withdrawn += take;
      shortfall += gapMonth - take;
    }
    const fee = (capital * input.feePct) / 100;
    const tax = (Math.max(capital - ISK_TAX_FREE_AMOUNT, 0) * input.iskTaxPct) / 100;
    capital = Math.max(capital - fee - tax, 0);
    growth -= fee + tax;
    if (!working && depletedAge === null && capital <= 0.5 && shortfall > 0) depletedAge = age;
    const end = price * infl; // at the end of the year
    rows.push({
      age,
      year: input.thisYear + t,
      opening: opening / price,
      saving: (savingMonth * 12) / price,
      growth: growth / price,
      pensionGross: 0,
      pensionNet: net.total * 12,
      allmanNet: net.allman * 12,
      tjpNet: net.tjp * 12,
      otherNet: net.other * 12,
      need: needMonth * 12,
      withdrawal: withdrawn / price,
      shortfall: shortfall / price,
      closing: capital / end,
    });
  }
  const last = Math.pow(infl, input.lifeAge - input.age);
  if (input.retireAge >= input.lifeAge) atRetirement = capital / last;
  return { rows, atRetirement, final: capital / last, depletedAge };
}

/** The smallest x in [lo, hi] for which ok(x) holds, by bisection (ok is monotone). */
function solve(ok: (x: number) => boolean, lo: number, hi: number): number {
  if (ok(lo)) return lo;
  while (!ok(hi) && hi < 1e12) hi *= 2;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

export function kalkylera(input: KalkylInput): KalkylResult {
  const pension = modelPension(input);
  const flow = flows(input, pension);
  const fullAge = Math.max(input.retireAge, pension.startAge);
  const g = flow.gross(fullAge);
  const n = flow.net(fullAge);
  const f = pension.first;
  const used = {
    ip: input.ownIp ?? f.ip,
    pp: input.ownPp ?? f.pp,
    gpTillagg: f.gpTillagg,
    allman: g.allman,
    tjp: g.tjp,
    other: input.otherIncome,
  };

  const have = simulate(input, flow, input.monthlySaving, input.savings, input.age);
  // The capital at the retirement age that just lasts to the life expectancy.
  const retirementRun = (capital: number) => simulate(input, flow, 0, capital, input.retireAge);
  const needAtRetirement = input.retireAge < input.lifeAge ? solve((c) => retirementRun(c).rows.every((r) => r.shortfall < 1), 0, 1e6) : 0;
  const coverage = needAtRetirement <= 0 ? Infinity : have.atRetirement / needAtRetirement;
  // The monthly saving that reaches the need; the extra is what is missing today.
  const required =
    input.retireAge > input.age
      ? solve((s) => simulate(input, flow, s, input.savings, input.age).rows.every((r) => r.shortfall < 1), 0, 10_000)
      : input.monthlySaving;
  const extraMonthlySaving = Math.max(required - input.monthlySaving, 0);

  // "Det du behöver" along the ages. Before the retirement age it is the path of today's savings with the required
  // saving; when today's savings grow past the need without any saving, it is that path scaled down to the need, so
  // the line still ends at the need. After the retirement age it is the need drawn down to the life expectancy.
  const needByAge = new Map<number, number>();
  const noSaving = simulate(input, flow, 0, input.savings, input.age);
  const scaled = noSaving.atRetirement >= needAtRetirement;
  const needPath = scaled ? noSaving : simulate(input, flow, required, input.savings, input.age);
  const k = scaled ? (noSaving.atRetirement > 0 ? needAtRetirement / noSaving.atRetirement : 0) : 1;
  for (const r of needPath.rows) if (r.age < input.retireAge) needByAge.set(r.age, r.opening * k);
  for (const r of retirementRun(needAtRetirement).rows) needByAge.set(r.age, r.opening);

  const rows: KalkylYear[] = have.rows.map((r) => ({
    ...r,
    pensionGross: (() => {
      const x = flow.gross(r.age);
      return (x.allman + x.tjp + x.other) * 12;
    })(),
    needCapital: needByAge.get(r.age) ?? 0,
  }));

  return {
    input,
    pension,
    used,
    netPension: n.total,
    gap: Math.max(input.budget - n.total, 0),
    netSalary: salaryNet(input.salary, input.kommunPct, input.begrPct),
    rows,
    haveAtRetirement: have.atRetirement,
    needAtRetirement,
    coverage,
    status: statusOf(coverage),
    shortfall: Math.max(needAtRetirement - have.atRetirement, 0),
    extraMonthlySaving,
    depletedAge: have.depletedAge,
  };
}

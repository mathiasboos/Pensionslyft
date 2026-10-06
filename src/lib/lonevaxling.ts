// Löneväxlingskalkylatorn: the calculation and the rules for 2026, ported from Salary_Exchange_Consumer.html
// (last updated 2026-06-29) in github.com/mathiasboos/Calculators, which is the up-to-date source. The figures and
// the order of the arithmetic are the original's, so that the results are the same to the krona.
// The rules (basbelopp, the limits, the tax rates) are to be checked every December, see CLAUDE.md in that repository.
import { num } from "./format";

// ── Rules for 2026 ──
export const YEAR = 2026;
export const LIMIT_AVGIFTSTAK = 56087; // kr a month, the ceiling for pension rights in the public pension
export const LIMIT_BRYTPUNKT = 55033; // kr a month, where the state income tax starts
export const AG_PCT = 31.42 / 100; // employer's social charges on salary
export const SLP_PCT = 24.26 / 100; // special payroll tax on pension premiums
export const PBB = 59200; // prisbasbelopp
export const IBB = 83400; // inkomstbasbelopp
export const MAX_SPARANDE_ANDEL = 0.35; // pension saving up to 35 % of the annual salary …
export const MAX_SPARANDE_PROCENT = MAX_SPARANDE_ANDEL * 100;
export const MAX_SPARANDE_PBB = 10 * PBB; // … but at most 10 prisbasbelopp a year

// The employer's ITP1 contribution on the salary
export const ITP1_GRENS1 = (7.5 * IBB) / 12; // 7.5 IBB a month
export const ITP1_GRENS2 = (30 * IBB) / 12; // 30 IBB a month
const ITP1_PCT1 = 0.045; // 4.5 % up to 7.5 IBB
const ITP1_PCT2 = 0.3; // 30 % between 7.5 and 30 IBB

// ── Ranges of the controls ──
export const LON = { min: 30000, max: 150000, step: 500, typedMax: 500000, start: 60000 };
export const BELOPP = { min: 500, step: 100, typedMax: 200000, start: 3000 };
export const ALDER = { min: 18, max: 70, start: 40 };
export const PENSIONSALDER = { min: 55, max: 75, start: 67 };
export const AVKASTNING = { min: 0, max: 12, step: 0.5, start: 6 };

// ── Helpers, as in the original ──
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** A number typed by the user: spaces are ignored and a comma is a decimal point. NaN when it is not a number. */
export const parseNum = (s: string) => parseFloat(String(s).replace(/\s/g, "").replace(",", "."));

/** Kronor as the original writes them: rounded, with a no-break space before "kr". */
export const fmtKr = (n: number) => `${num.format(Math.round(n))} kr`;

/** A whole number with thousands separators, as in the number fields. */
export const fmtInt = (n: number) => num.format(Math.round(n));

/** The same with ordinary spaces, as in the running text of the original. */
export const fmtText = (n: number) => fmtInt(n).replace(/\u00a0/g, " ");

const twoDecimals = new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** A rate as a percentage, 0.3142 -> "31,42" */
export const fmtRate = (rate: number) => twoDecimals.format(rate * 100);

const oneDecimal = new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** 6 -> "6,0" */
export const fmtOneDecimal = (n: number) => oneDecimal.format(n);

/** The uplift as it is written: 5.76 -> "5,8 %" */
export const fmtUplift = (n: number) => `${n.toLocaleString("sv-SE", { maximumFractionDigits: 1 })} %`;

/** The note under the result. */
export const disclaimer = (avkastning: number) =>
  `Baserat på ${avkastning.toLocaleString("sv-SE", { minimumFractionDigits: 1 })} % avkastning per år. Historisk avkastning är ingen garanti för framtida avkastning.`;

/** Share of a range filled, for the green part of a slider. */
export const fillPercent = (value: number, min: number, max: number) =>
  clamp(((value - min) / (max - min)) * 100, 0, 100);

// ── The employer's ITP1 contribution on a monthly salary ──
export function itp1Avsattning(manadslon: number): number {
  const d1 = Math.min(manadslon, ITP1_GRENS1);
  const d2 = Math.max(0, Math.min(manadslon, ITP1_GRENS2) - ITP1_GRENS1);
  return d1 * ITP1_PCT1 + d2 * ITP1_PCT2;
}

/**
 * The most that can be exchanged for pension, kronor a month: the lower of 35 % of the annual salary and
 * 10 prisbasbelopp, less the ITP1 contribution the employer already pays, rounded down to 100 kr.
 */
export function maxVaxling(lon: number): number {
  const arslon = lon * 12;
  const maxAr = Math.min(MAX_SPARANDE_ANDEL * arslon, MAX_SPARANDE_PBB);
  const itp1PerAr = itp1Avsattning(lon) * 12;
  const kvarAr = Math.max(0, maxAr - itp1PerAr);
  return Math.floor(kvarAr / 12 / 100) * 100;
}

/** The exchanged amount cannot be above the cap. */
export const limitBelopp = (lon: number, belopp: number) => Math.min(belopp, maxVaxling(lon));

// ── The pension premium and the growth of the savings ──

/** The pension premium for an exchanged amount: the employer pays social charges on it and the lower payroll tax on the premium. */
export function pensionPremie(belopp: number): number {
  const agAvg = belopp * AG_PCT;
  const summa = belopp + agAvg;
  return summa / (1 + SLP_PCT);
}

/** How much more the premium is than the exchanged amount, in percent. */
export function upliftPercent(belopp: number): number {
  // Always the same share. The original divides by the amount and shows -100 % when it is 0.
  const faktor = belopp > 0 ? pensionPremie(belopp) / belopp : (1 + AG_PCT) / (1 + SLP_PCT);
  return (faktor - 1) * 100;
}

/** The capital at the end of every year (index 0 is today), with the premium paid at the start of every month. */
export function simSeries(premie: number, grossPct: number, totalYears: number): number[] {
  const netAnnual = Math.pow(1 + grossPct / 100, 1) - 1;
  const r = Math.pow(1 + Math.max(netAnnual, -0.99), 1 / 12) - 1;
  const pts = [0];
  let cap = 0;
  for (let y = 1; y <= totalYears; y++) {
    cap *= Math.pow(1 + r, 12);
    cap += r > 0 ? premie * ((Math.pow(1 + r, 12) - 1) / r) * (1 + r) : premie * 12;
    pts.push(cap);
  }
  return pts;
}

export const fvAt = (premie: number, pct: number, yrs: number) => simSeries(premie, pct, yrs)[yrs]!;

// ── The result ──
export type Suitability = "good" | "amber" | "warn";

export interface LonevaxlingInput {
  lon: number; // monthly salary before tax
  belopp: number; // exchanged amount a month
  alder: number;
  pensionsalder: number;
  avkastning: number; // percent a year
}

export interface LonevaxlingResult {
  tak: number;
  premie: number;
  uplift: number;
  years: number;
  kapital: number;
  inbetalt: number;
  lonEfter: number;
  suitability: Suitability;
  title: string;
  text: string;
}

/** Whether exchanging is suitable, from the salary that is left. */
export function suitability(lonEfter: number): { kind: Suitability; title: string; text: string } {
  if (lonEfter > LIMIT_AVGIFTSTAK) {
    return {
      kind: "good",
      title: "Löneväxling är lämpligt för din lönenivå ",
      text: `Lön efter växling: ${fmtKr(lonEfter)}/mån – över avgiftstaket och brytpunkten.`,
    };
  }
  if (lonEfter > LIMIT_BRYTPUNKT) {
    return {
      kind: "amber",
      title: "Gränsfall – din allmänna pension kan påverkas ",
      text: `Lön efter växling: ${fmtKr(lonEfter)}/mån. Över brytpunkten men under avgiftstaket.`,
    };
  }
  return {
    kind: "warn",
    title: "Löneväxling avråds vid din lönenivå ",
    text: `Lön efter växling: ${fmtKr(lonEfter)}/mån – under avgiftstaket och brytpunkten.`,
  };
}

export function calcLonevaxling({ lon, belopp, alder, pensionsalder, avkastning }: LonevaxlingInput): LonevaxlingResult {
  const premie = pensionPremie(belopp);
  const years = Math.max(1, pensionsalder - alder);
  const lonEfter = lon - belopp;
  const { kind, title, text } = suitability(lonEfter);
  return {
    tak: maxVaxling(lon),
    premie,
    uplift: upliftPercent(belopp),
    years,
    kapital: fvAt(premie, avkastning, years),
    inbetalt: premie * years * 12,
    lonEfter,
    suitability: kind,
    title,
    text,
  };
}

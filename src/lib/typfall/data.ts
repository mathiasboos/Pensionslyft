// Tables from Pensionsmyndighetens typfallsmodell (ver. 4.8), extracted from the workbook:
// - years: index series from the sheet "Några tal" (1957-2026, the rest is projected in series.ts)
// - komSkatt/begravning/kyrkoavgift: average municipal tax, burial fee and church fee from "K_skatt" (percent)
// - cohorts: per birth year, delningstal and life expectancy (Nyckeltal, mortality) and
//   arvsvinstfaktorer (arv IP, arv PP)
// - riktalder: lowest pension age and riktålder per birth year (Nyckeltal DO:DR)
import raw from "../../data/typfall.json";

type Nullable = (number | null)[];

export interface CohortData {
  dIP: Nullable; // aDeltal_IP: delningstal IP used by fnDeltal_IP, ages 61..82
  dIPn: Nullable; // Nyckeltal delningstal IP, ages 61..82 (VBA deltal(..., 4))
  dPPn: Nullable; // Nyckeltal delningstal PP, ages 61..103 (VBA deltal(..., 19))
  mIP: Nullable; // mortality N/Q NDC IP (unisex), ages 61..105
  eLife: Nullable; // återstående medellivslängd (mortality, rng_Exp_life), ages 61..90
  arvIP1: Nullable; // arv IP, ages 17..66
  arvIP2: Nullable; // arv IP "dubbla arvsvinsten", ages 60..105
  arvPP: Nullable; // arv PP, ages 15..105
}

interface Raw {
  source: string;
  firstYear: number;
  lastHardYear: number;
  years: Record<string, Nullable>;
  taxFirstYear: number;
  komSkatt: Nullable;
  begravning: Nullable;
  kyrkoavgift: Nullable; // church fee including the burial fee, percent (from 2000)
  cohortAges: Record<keyof CohortData, number>;
  cohorts: Record<string, CohortData>;
  riktalder: { firstCohort: number; lowest: number[]; rikt: number[] };
}

export const data = raw as unknown as Raw;

export const FIRST_COHORT = 1959;
export const LAST_COHORT = 2005;

export function cohort(born: number): CohortData {
  const c = data.cohorts[String(born)];
  if (!c) throw new Error(`Födelseår ${born} saknas i typfallsmodellens tabeller`);
  return c;
}

/** Value from a per-age cohort table, or 0 for an empty cell (as VBA reads an empty cell). */
export function cohortValue(born: number, table: keyof CohortData, age: number): number {
  const v = cohort(born)[table][age - data.cohortAges[table]];
  return v ?? 0;
}

/** Rng_riktL (lowest age for allmän pension) and Rng_riktage (riktålder) for a birth year. */
export function riktaldrar(born: number): { lowest: number; rikt: number } {
  const i = born - data.riktalder.firstCohort;
  return { lowest: data.riktalder.lowest[i]!, rikt: data.riktalder.rikt[i]! };
}

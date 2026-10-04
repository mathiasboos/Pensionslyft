// A scenario is the calculator's form as the user sees it (percent as numbers, the mode and the
// advanced choices). It is turned into a model input the same way for the forecast and for
// "Jämför scenarier", and saved scenarios are kept in the browser.
import { riktaldrar } from "./data";
import { type Avtal, DEFAULT_ADVANCED, runTypfall, type TypfallAdvanced, type TypfallResult } from "./model";

export const MAX_PAR = 72;
export const AVERAGE_YEARS = 20; // "Genomsnittlig pension under pensionstiden": the pension age and 20 years on

export interface ScenarioForm {
  born: number;
  par: number;
  useRikt: boolean;
  wStart: number;
  monthlyWage: number;
  avtal: Avtal;
  gift: boolean;
  inflation: number; // percent
  realGrowth: number; // percent
  realReturn: number; // percent
  mode: "normal" | "avancerat";
  adv: TypfallAdvanced;
}

export const DEFAULT_FORM: ScenarioForm = {
  born: 1975,
  par: 68,
  useRikt: false,
  wStart: 23,
  monthlyWage: 33200,
  avtal: 1,
  gift: false,
  inflation: 0,
  realGrowth: 0,
  realReturn: 1.7,
  mode: "normal",
  adv: DEFAULT_ADVANCED,
};

/** The pension age and start age actually used, after the limits for the birth year. */
export function usedAges(f: ScenarioForm) {
  const { lowest, rikt } = riktaldrar(f.born);
  const par = f.useRikt ? rikt : Math.min(Math.max(f.par, lowest), MAX_PAR);
  return { par, wStart: Math.min(f.wStart, par - 1), lowest, rikt };
}

/** "Normalt" uses the model's normal settings; inflation is in the main form in both modes. */
export function advancedUsed(f: ScenarioForm): TypfallAdvanced {
  return { ...(f.mode === "avancerat" ? f.adv : DEFAULT_ADVANCED), inflation: f.inflation / 100 };
}

export function runScenario(f: ScenarioForm): TypfallResult {
  const { par, wStart } = usedAges(f);
  return runTypfall({
    born: f.born,
    par,
    wStart,
    monthlyWage: f.monthlyWage,
    avtal: f.avtal,
    gift: f.gift,
    realGrowth: f.realGrowth / 100,
    realReturn: f.realReturn / 100,
    advanced: advancedUsed(f),
  });
}

/** The key figures: kompensationsgrad and the average pension the first 20 years, per month. */
export function keyFigures(r: TypfallResult) {
  const par = r.input.par;
  const kgrad = r.slutlon > 0 ? (r.brutto / r.slutlon) * 100 : 0;
  const lastAge = par + AVERAGE_YEARS;
  const years = r.years.filter((y) => y.age >= par && y.age <= lastAge);
  const average = years.reduce((sum, y) => sum + y.brutto, 0) / years.length / 12;
  return { kgrad, average, lastAge };
}

export interface SavedScenario {
  id: string;
  name: string;
  form: ScenarioForm;
  slot: number; // colour slot, kept when other scenarios are removed
}

export const MAX_SAVED = 4;
const KEY = "pensionslyft:typfall-scenarier:v1";

/** Saved scenarios from the browser, with any missing settings filled in from the defaults. */
export function loadSaved(): SavedScenario[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as SavedScenario[];
    if (!Array.isArray(list)) return [];
    const used = new Set<number>();
    return list.slice(0, MAX_SAVED).map((s) => {
      let slot = Number.isInteger(s.slot) && s.slot >= 0 && s.slot < MAX_SAVED && !used.has(s.slot) ? s.slot : -1;
      if (slot < 0) slot = [0, 1, 2, 3].find((k) => !used.has(k))!;
      used.add(slot);
      const adv = { ...DEFAULT_ADVANCED, ...s.form?.adv };
      // Before the choice of church the burial fee was 0 when it was not used (no own kommunalskatt).
      if (s.form?.adv?.kyrka === undefined && s.form?.adv?.begravning === 0 && !(adv.kommunalskatt >= 0.1)) adv.begravning = null;
      return { id: String(s.id), name: String(s.name), slot, form: { ...DEFAULT_FORM, ...s.form, adv } };
    });
  } catch {
    return [];
  }
}

/** The first colour slot not taken by a saved scenario. */
export function freeSlot(list: SavedScenario[]): number {
  return [0, 1, 2, 3].find((k) => !list.some((s) => s.slot === k)) ?? 0;
}

export function storeSaved(list: SavedScenario[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Private mode or blocked storage: the scenarios live until the page is closed.
  }
}

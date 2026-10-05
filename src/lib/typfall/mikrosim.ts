// "Mikrosim": rows of standalone typfall, each with its own inputs, run with the advanced settings of
// the form. The rows can be added by hand, taken from the forecast or the saved scenarios, or read
// from a CSV file.
import { FIRST_COHORT, LAST_COHORT, riktaldrar } from "./data";
import { type Avtal, DEFAULT_ADVANCED, runTypfall, type TypfallAdvanced, type TypfallResult } from "./model";
import { DEFAULT_FORM, MAX_PAR, type ScenarioForm, usedAges } from "./scenario";

export const MAX_ROWS = 500;

export interface MikrosimRow {
  id: string;
  born: number;
  startWorkAge: number;
  retirementAge: number;
  annualSalary: number; // kronor per year in the wage level of the reference year
  yearlyInflation: number; // fractions, 0.02 is 2 %
  realGrowth: number;
  realReturn: number;
  ipsMonthly: number; // kronor a month
  scheme: Avtal;
  /** Why a row of an imported file could not be read, until the row is edited. */
  error?: string;
}

export const BOUNDS = {
  born: { min: FIRST_COHORT, max: LAST_COHORT },
  startWorkAge: { min: 15, max: 40 },
  retirementAge: { min: 61, max: MAX_PAR },
  annualSalary: { min: 0, max: 12_000_000 },
  ipsMonthly: { min: 0, max: 100_000 },
};

export const SCHEMES: { value: Avtal; label: string }[] = [
  { value: 1, label: "Saknar tjänstepension" },
  { value: 2, label: "ITP-1, Privatanställda tjänstemän, födda 1979-" },
  { value: 3, label: "ITP-2, Privatanställda tjänstemän, födda före 1979" },
  { value: 4, label: "SAF-LO + STP, Privatanställda arbetare" },
  { value: 5, label: "KAP-KL, Kommunal- & Regionalanställda" },
  { value: 6, label: "AKAP-KR, Kommunal- & Regionalanställda, födda 1986 -" },
  { value: 7, label: "PA16 (Avd 2), Statligt anställda, födda före 1988" },
  { value: 8, label: "PA16 (Avd 1), Statligt anställda, födda 1988 och senare" },
];

/** The input columns, as in the file that is imported and downloaded. */
export const INPUT_COLUMNS = [
  { key: "born", sv: "Födelseår", en: "Birth year" },
  { key: "startWorkAge", sv: "Börjar arbeta vid ålder", en: "Starts working at age" },
  { key: "retirementAge", sv: "Går i pension vid ålder", en: "Retires at age" },
  { key: "annualSalary", sv: "Årslön", en: "Annual salary" },
  { key: "yearlyInflation", sv: "Årlig inflation", en: "Yearly inflation" },
  { key: "realGrowth", sv: "Real tillväxt", en: "Real growth" },
  { key: "realReturn", sv: "Real fondavkastning", en: "Real fund return" },
  { key: "ipsMonthly", sv: "Privat pensionsförsäkring", en: "Private pension insurance" },
  { key: "scheme", sv: "Välj tjänstepension", en: "Occupational pension scheme" },
] as const;

/** The result columns, in the prices of the reference year and per year. */
export const RESULT_COLUMNS: { key: string; head: string; get: (r: TypfallResult) => number }[] = [
  { key: "slutlon", head: "Slutlön", get: (r) => r.slutlon },
  { key: "brutto", head: "Brutto-pension", get: (r) => r.brutto },
  { key: "ip", head: "Inkomstpension", get: (r) => r.ip },
  { key: "tp", head: "Tilläggspension", get: (r) => r.tp },
  { key: "pp", head: "Premiepension", get: (r) => r.pp },
  { key: "gp", head: "Garanti-pension", get: (r) => r.gp },
  { key: "tillagg", head: "P_tillägg", get: (r) => r.tillagg },
  { key: "tjp", head: "Tjänstepension", get: (r) => r.tjp },
  { key: "ips", head: "Privat pensionsförsäkring", get: (r) => r.ips },
  { key: "netto", head: "Efter skatt", get: (r) => r.netto },
  { key: "bidrag", head: "Bostadstillägg + ÄFS", get: (r) => r.bidrag },
  { key: "disp", head: "Disponibel inkomst", get: (r) => r.disp },
];

const clamp = (v: number, b: { min: number; max: number }) => Math.min(Math.max(v, b.min), b.max);

/** The advanced settings that every row is run with. */
export const contextOf = (form: ScenarioForm): TypfallAdvanced => (form.mode === "avancerat" ? form.adv : DEFAULT_ADVANCED);

/** A row from the form, as "Hämta från Prognos" and the saved scenarios give it. */
export function rowFromForm(form: ScenarioForm, id: string): MikrosimRow {
  const { par, wStart } = usedAges(form);
  const saving = contextOf(form).sparManad;
  return {
    id,
    born: clamp(form.born, BOUNDS.born),
    startWorkAge: clamp(wStart, BOUNDS.startWorkAge),
    retirementAge: clamp(par, BOUNDS.retirementAge),
    annualSalary: clamp(Math.round(form.monthlyWage * 12), BOUNDS.annualSalary),
    yearlyInflation: form.inflation / 100,
    realGrowth: form.realGrowth / 100,
    realReturn: form.realReturn / 100,
    ipsMonthly: saving > 1 ? clamp(Math.round(saving), BOUNDS.ipsMonthly) : 0,
    scheme: form.avtal,
  };
}

export const newRow = (id: string) => rowFromForm(DEFAULT_FORM, id);

/** Why a row cannot be run, if it cannot. */
export function rowError(r: MikrosimRow): string | undefined {
  const { born: b, startWorkAge: s, retirementAge: a } = BOUNDS;
  if (!(r.born >= b.min && r.born <= b.max)) return `Födelseår måste vara mellan ${b.min} och ${b.max}.`;
  if (!(r.startWorkAge >= s.min && r.startWorkAge <= s.max))
    return `Ålder vid arbetslivets start måste vara mellan ${s.min} och ${s.max}.`;
  if (!(r.retirementAge >= a.min && r.retirementAge <= a.max)) return `Pensionsåldern måste vara mellan ${a.min} och ${a.max}.`;
  if (r.startWorkAge >= r.retirementAge) return "Ålder vid arbetslivets start måste vara före pensionsåldern.";
  if (!SCHEMES.some((x) => x.value === r.scheme)) return "Ogiltig tjänstepension.";
  return undefined;
}

/** The result of a row, with a warning when the pension age was moved to the earliest possible. */
export type RowRun = { result: TypfallResult; warning?: string; error?: undefined } | { result?: undefined; warning?: undefined; error: string };

const cache = new Map<string, RowRun>();

/** Runs a row with the advanced settings of the form. Equal rows are run once. */
export function runRow(r: MikrosimRow, context: TypfallAdvanced): RowRun {
  const invalid = r.error ?? rowError(r);
  if (invalid) return { error: invalid };
  const { id: _id, error: _error, ...inputs } = r;
  const key = JSON.stringify([inputs, context]);
  const hit = cache.get(key);
  if (hit) return hit;
  let run: RowRun;
  const lowest = riktaldrar(r.born).lowest;
  const par = Math.max(r.retirementAge, lowest);
  try {
    run = {
      ...(par !== r.retirementAge && {
        warning: `Allmän pension först möjlig vid ${lowest} års ålder, räknar pensionsålder vid ${lowest}`,
      }),
      result: runTypfall({
        born: r.born,
        par,
        wStart: r.startWorkAge,
        monthlyWage: r.annualSalary / 12,
        avtal: r.scheme,
        gift: false,
        realGrowth: r.realGrowth,
        realReturn: r.realReturn,
        advanced: { ...context, inflation: r.yearlyInflation, sparManad: r.ipsMonthly },
      }),
    };
  } catch {
    run = { error: "Beräkningen misslyckades för raden." };
  }
  if (cache.size > 2000) cache.clear();
  cache.set(key, run);
  return run;
}

// ---------------- CSV ----------------

const separator = (line: string) => (line.split(";").length >= line.split(",").length ? ";" : ",");

function number(text: string): number | undefined {
  const t = text.trim();
  if (t === "") return undefined;
  const v = Number(t.replace(",", "."));
  return Number.isFinite(v) ? v : undefined;
}

/** The rows of a downloaded file: the input columns, in any order, by their Swedish or English names. */
export function parseMikrosimCsv(text: string, nextId: () => string): { rows: MikrosimRow[]; fileError?: string } {
  const lines = text.replace(/^﻿/, "").split(/\r\n|\r|\n/);
  let first = 0;
  while (first < lines.length && (lines[first]!.trim() === "" || lines[first]!.trim().startsWith("#"))) first++;
  if (first >= lines.length) return { rows: [], fileError: "Filen är tom." };
  const sep = separator(lines[first]!);
  const head = lines[first]!.split(sep).map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const at = INPUT_COLUMNS.map((c) => head.findIndex((h) => h === c.sv.toLowerCase() || h === c.en.toLowerCase()));
  const missing = INPUT_COLUMNS.filter((_, i) => at[i] === -1).map((c) => c.sv);
  if (missing.length > 0) return { rows: [], fileError: `Filen saknar kolumnen "${missing.join('", "')}".` };

  const rows: MikrosimRow[] = [];
  for (const line of lines.slice(first + 1)) {
    if (line.trim() === "") continue;
    if (rows.length >= MAX_ROWS) break;
    const cells = line.split(sep);
    const row = { ...newRow(nextId()) } as MikrosimRow & Record<string, number | string>;
    let problem: string | undefined;
    INPUT_COLUMNS.forEach((c, i) => {
      const raw = cells[at[i]!];
      if (raw === undefined) return void (problem ??= "Raden saknar en eller flera kolumner.");
      const v = number(raw.replace(/^"|"$/g, ""));
      if (v === undefined) return void (problem ??= `Kan inte tolka "${raw.trim()}" som ett tal i kolumnen "${c.sv}".`);
      if (c.key === "scheme") {
        if (!SCHEMES.some((x) => x.value === v)) return void (problem ??= `Ogiltigt värde i kolumnen "${c.sv}": ${raw.trim()}.`);
        row.scheme = v as Avtal;
      } else if (c.key in BOUNDS) row[c.key] = clamp(v, BOUNDS[c.key as keyof typeof BOUNDS]);
      else row[c.key] = v;
    });
    if (problem) row.error = problem;
    rows.push(row);
  }
  return { rows };
}

/** Rows as the file that is downloaded: the input columns and the results, in kronor per year. */
export function mikrosimCsvRows(rows: MikrosimRow[], context: TypfallAdvanced): (string | number | null)[][] {
  const head = [...INPUT_COLUMNS.map((c) => c.sv), ...RESULT_COLUMNS.map((c) => c.head)];
  return [
    head,
    ...rows.map((r) => {
      const run = runRow(r, context);
      return [
        ...INPUT_COLUMNS.map((c) => r[c.key]),
        ...RESULT_COLUMNS.map((c) => (run.result ? Math.round(c.get(run.result)) : null)),
      ];
    }),
  ];
}

// Pensionsgrundande belopp from the sheet PGB in the typfallsmodell: sjuk- och
// aktivitetsersättning (column E, given per year), värnplikt (columns G-I, from the dates of
// service) and studier (columns L-P, from the number of terms). Barnår are in model.ts.
import { at, type Series } from "./series";
import { int } from "./vba";

export interface PgbSa {
  from: number; // första året
  to: number; // sista året
  belopp: number; // PGB per år, kronor i årets priser
}

export interface PgbStudier {
  from: number;
  to: number;
  terminer: number; // terminer per år, 1 eller 2
}

export interface PgbVpl {
  start: string; // inryckning, åååå-mm-dd
  end: string; // muck, åååå-mm-dd
}

export interface PgbInput {
  sa: PgbSa[];
  vpl: PgbVpl | null;
  studier: PgbStudier[];
}

export const NO_PGB: PgbInput = { sa: [], vpl: null, studier: [] };

const day = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d) / 86400000;
const parseDate = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) } : null;
};

/** Days of plikttjänst per calendar year (PGB!H10:J11), at least 120 and at most 730 days. */
export function vplDays(vpl: PgbVpl): Map<number, number> {
  const out = new Map<number, number>();
  const s = parseDate(vpl.start);
  const e = parseDate(vpl.end);
  if (!s || !e) return out;
  const H4 = day(s.y, s.m, s.d);
  const H5 = day(e.y, e.m, e.d);
  if (H5 <= H4) return out;
  const H6 = H5 - H4;
  const H10 = s.y;
  const H11 = H10 >= 1995 ? (H6 < 120 ? 0 : Math.min(day(H10, 12, 31) - H4 + 1, H5 - H4)) : 0;
  const I10 = e.y > s.y ? H10 + 1 : null;
  const J10 = e.y >= s.y + 2 ? H10 + 2 : 0;
  const I11 = I10 === null || I10 < 1995 ? 0 : J10 > 0 ? day(I10, 12, 31) - day(I10, 1, 1) + 1 : H5 - day(I10, 1, 1) + 1;
  const J11 = J10 > 0 ? Math.min(H5 - day(J10, 1, 1) + 1, 730 - I11 - H11) : 0;
  // A year takes the first matching column, as the sheet's nested IF.
  if (J10 > 0) out.set(J10, J11);
  if (I10 !== null) out.set(I10, I11);
  out.set(H10, H11);
  return out;
}

/** PGB per calendar year from SA, plikttjänst and studier, as the sheet's columns E, I and P. */
export function pgbByYear(input: PgbInput, s: Series, year: number) {
  let sa = 0;
  for (const e of input.sa) if (year >= e.from && year <= e.to) sa += e.belopp;
  let vpl = 0;
  if (input.vpl && year > 1959) {
    const days = vplDays(input.vpl).get(year) ?? 0;
    // Half the average PGI for service 1995-2010 and from 2018.
    const g = at(s.MPGI, s, year) * ((year >= 1995 && year <= 2010) || year >= 2018 ? 0.5 : 0);
    // Rounded down to hundreds of kronor, as the web version does.
    vpl = int(((days * g) / 365) / 100) * 100;
  }
  let studier = 0;
  for (const e of input.studier) {
    if (year < e.from || year > e.to || year < 1965) continue;
    // 138 % of the study grant; the sheet reads the factor two rows up, so it applies from 1997.
    const factor = year - 2 >= 1995 ? 1.38 : 0;
    studier += at(s.studiebidrag, s, year) * e.terminer * factor;
  }
  return { sa, vpl, studier };
}

/** The entries without one year: an entry that covers it is cut around it. */
export function withoutPgbYear<T extends { from: number; to: number }>(list: T[], year: number): T[] {
  return list.flatMap((e) => {
    if (year < e.from || year > e.to) return [e];
    const out: T[] = [];
    if (e.from < year) out.push({ ...e, to: year - 1 });
    if (e.to > year) out.push({ ...e, from: year + 1 });
    return out;
  });
}

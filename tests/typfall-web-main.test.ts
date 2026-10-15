// The main view of the model against the figures of the web version (typfallsmodellen.html), which
// is the model's reference: Tabell 1 (the first pension year), Tabell 2 (every year) and the PGB
// table, for 40 combinations of inputs and advanced settings. The fixture holds what the web
// version shows; it was read from the page with a browser.
import { describe, expect, it } from "vitest";
import fixture from "./fixtures/typfall-web-main.json";
import { type Avtal, runTypfall, type TypfallAdvanced } from "../src/lib/typfall/model";

type Basic = { born: number; par: number; wStart: number; salary: number; scheme?: number; gift?: boolean; infl?: number; growth?: number; ret?: number };
type Case = {
  name: string;
  basic: Basic;
  mine: Partial<TypfallAdvanced>;
  t1: Record<string, string>;
  t2: { heads: string[]; rows: string[][] };
  pgb: { heads: string[]; rows: string[][] } | null;
};

const num = (s: string) => Number(s.replace(/[−–]/g, "-"));
type Result = ReturnType<typeof runTypfall>;
type Year = Result["years"][number];

const run = (c: Case) => {
  const b = c.basic;
  return runTypfall({
    born: b.born,
    par: b.par,
    wStart: b.wStart,
    monthlyWage: b.salary,
    avtal: (b.scheme ?? 1) as Avtal,
    gift: Boolean(b.gift),
    realGrowth: (b.growth ?? 0) / 100,
    realReturn: (b.ret ?? 1.7) / 100,
    advanced: { ...c.mine, inflation: (b.infl ?? 0) / 100 },
  });
};

const table1 = (r: Result): Record<string, number> => ({
  slutlon: r.slutlon,
  lonEfterSkatt: r.slutlonNetto ?? NaN,
  dispInkomst: r.dispFore ?? NaN,
  ip: r.ip,
  tp: r.tp,
  pp: r.pp,
  garp: r.gp,
  ptillagg: r.tillagg,
  totAllmanPension: r.allman,
  tjp: r.tjp,
  ips: r.ips,
  totBrutto: r.brutto,
  efterSkatt: r.netto,
  bidrag: r.bidrag,
  pps: r.pps,
  dispEfterSkatt: r.disp,
});

// The columns of Tabell 2, in kronor a month in the prices of the reference year.
const COLUMNS: Record<string, (y: Year) => number | null> = {
  Lön: (y) => y.lon,
  "Inkomst- och tilläggspension": (y) => y.ip,
  Premiepension: (y) => y.pp,
  "Tjänste-pension+IPS": (y) => y.tjp + y.ips,
  Garantipension: (y) => y.gp + y.tillagg,
  "Inkomst brutto": (y) => y.brutto,
  "Kommunal skatt": (y) => y.municipalTax,
  "Statlig skatt": (y) => y.stateTax,
  "Inkomst efter skatt": (y) => y.netto,
  "Bidrag (BT, ÄFS, m.m.)": (y) => y.bidrag,
  "Privat pensionssparande (ISK / KF)": (y) => y.pps,
  "Disponibel inkomst": (y) => y.disp,
};

describe("typfallsmodellen against the web version, main view", () => {
  for (const c of fixture as Case[]) {
    it(c.name, () => {
      const r = run(c);

      // Tabell 1. The taxes are only in the model from 2020, so the net figures of a final salary that
      // reaches back before that are left out.
      const diffs1: string[] = [];
      for (const [key, value] of Object.entries(table1(r))) {
        if (Number.isNaN(value)) continue;
        if (Math.round(value) !== num(c.t1[key]!)) diffs1.push(`${key} ${Math.round(value)}/${c.t1[key]}`);
      }
      expect(diffs1).toEqual([]);

      // Tabell 2
      const diffs2: string[] = [];
      for (const row of c.t2.rows) {
        const age = Number(row[1]);
        const y = r.years.find((x) => x.age === age);
        if (!y) {
          diffs2.push(`age ${age} missing`);
          continue;
        }
        c.t2.heads.forEach((head, k) => {
          const mine = COLUMNS[head]?.(y);
          if (mine === undefined || mine === null) return;
          if (Math.round(mine / 12) !== num(row[k]!)) diffs2.push(`age ${age} ${head} ${Math.round(mine / 12)}/${row[k]}`);
        });
      }
      expect(diffs2).toEqual([]);

      // The PGB table
      if (c.pgb) {
        const names = c.pgb.heads;
        const value = (row: string[], head: string) => {
          const k = names.findIndex((n) => n.startsWith(head));
          return k < 0 ? 0 : num(row[k]!) || 0;
        };
        const diffs3: string[] = [];
        expect(r.pgbRows.map((x) => x.year)).toEqual(c.pgb.rows.map((x) => Number(x[0])));
        for (const row of c.pgb.rows) {
          const m = r.pgbRows.find((x) => x.year === Number(row[0]))!;
          const pairs: [string, number, number][] = [
            ["barn", m.barn, value(row, "Barn")],
            ["studier", m.studier, value(row, "PGB studier")],
            ["vpl", m.vpl, value(row, "PGB värnplikt")],
            ["sa", m.sa, value(row, "Sjuk")],
          ];
          for (const [k, mine, theirs] of pairs) if (Math.round(mine) !== theirs) diffs3.push(`${row[0]} ${k} ${Math.round(mine)}/${theirs}`);
        }
        expect(diffs3).toEqual([]);
      }
    });
  }
});

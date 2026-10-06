import { describe, expect, it } from "vitest";
import fixture from "./fixtures/nettolon-web.json";
import {
  BRYT_OVER,
  BRYT_UNDER,
  DEFAULTS,
  brytText,
  calcNettolon,
  grundavdragOver,
  grundavdragUnder,
  nettolonView,
  rowCells,
  type NettolonInput,
} from "../src/lib/nettolon";
import kommunalskatt from "../src/data/kommunalskatt-2026.json";

// tests/fixtures/nettolon-web.json is what Net_Salary_2026.html (github.com/mathiasboos/Calculators) shows for 190
// sets of inputs, read out of the original in a browser: the edges of the brackets for both ages, and random sets.
interface Case {
  input: NettolonInput;
  expected: {
    netMonth: string;
    netYear: string;
    vaxYear: string;
    totTax: string;
    effRate: string;
    margRate: string;
    bar: string[];
    bryt: string;
    rows: [string, string, string, string, string, string][];
  };
}
const cases = fixture as unknown as Case[];

// The original writes a rate as it was typed ("32.4"); the page writes it with a decimal comma.
const comma = (s: string) => s.replace(/(\d)\.(\d)/g, "$1,$2");

describe("the net salary calculation of Net_Salary_2026.html", () => {
  it("has the cases of the original", () => {
    expect(cases.length).toBe(190);
  });

  it.each(cases.map((c, i) => [i, c] as const))("gives the figures the original shows, case %i", (_i, c) => {
    const v = nettolonView(c.input);
    const e = c.expected;
    expect(v.netMonth).toBe(e.netMonth);
    expect(v.netYear).toBe(e.netYear);
    expect(v.vaxYear).toBe(e.vaxYear);
    expect(v.totTax).toBe(e.totTax);
    expect(v.effRate).toBe(e.effRate);
    expect(v.margRate).toBe(e.margRate);
    expect(v.bar.net).toBeCloseTo(parseFloat(e.bar[0]!), 3);
    expect(v.bar.tax).toBeCloseTo(parseFloat(e.bar[1]!), 3);
    expect(v.bar.vax).toBeCloseTo(parseFloat(e.bar[2]!), 3);
    expect(brytText(v.bryt)).toBe(e.bryt.replace(/<\/?b>/g, ""));
    const rows = v.rows.map((x) => {
      const cells = rowCells(x);
      return [String(x.n), x.name, x.sub, cells.m, cells.y, x.cls];
    });
    expect(rows).toEqual(e.rows.map((r) => [r[0], r[1], comma(r[2]), r[3], r[4], r[5]]));
  });
});

describe("the rules for 2026", () => {
  it("starts the state tax at the brytpunkt: 660 400 kr a year under 66, 760 500 kr from 66", () => {
    expect(grundavdragUnder(700000) + 643000).toBe(BRYT_UNDER);
    expect(BRYT_UNDER).toBe(660400);
    expect(BRYT_OVER).toBe(760500);
    // from 66 the grundavdrag is the ordinary one plus a raised part
    expect(grundavdragOver(760500)).toBeGreaterThan(grundavdragUnder(760500));
  });

  it("pays no state tax below the brytpunkt and 20 % above", () => {
    const below = calcNettolon({ ...DEFAULTS, lon: 55000 });
    expect(below.statlig).toBe(0);
    const above = calcNettolon({ ...DEFAULTS, lon: 80000 });
    expect(above.statlig).toBe(Math.floor(0.2 * (above.bfi - 643000)));
  });

  it("takes a salary deduction off before tax", () => {
    const a = calcNettolon({ ...DEFAULTS, lon: 60000 });
    const b = calcNettolon({ ...DEFAULTS, lon: 60000, vaxling: 5000 });
    expect(b.arbInk).toBe(a.arbInk - 60000);
    expect(b.totalSkatt).toBeLessThan(a.totalSkatt);
  });

  it("treats an empty or negative field as 0", () => {
    const r = calcNettolon({ ...DEFAULTS, lon: -5, pension: Number.NaN, kapInk: -100 });
    expect(r.arslon).toBe(0);
    expect(r.pensAr).toBe(0);
    expect(r.kapInk).toBe(0);
  });
});

describe("the list of municipalities", () => {
  it("has the 290 municipalities and their total tax rates of 2026", () => {
    expect(Object.keys(kommunalskatt)).toHaveLength(290);
    expect(kommunalskatt.Stockholm).toBe(30.55);
    expect(kommunalskatt["Österåker"]).toBe(28.93);
    expect(kommunalskatt.Dorotea).toBe(35.65);
  });
});

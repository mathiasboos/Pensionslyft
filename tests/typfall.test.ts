import { describe, expect, it } from "vitest";
import { FIRST_COHORT, LAST_COHORT, riktaldrar } from "../src/lib/typfall/data";
import { type Avtal, DEFAULT_ADVANCED, runTypfall } from "../src/lib/typfall/model";
import { pensionTable } from "../src/lib/typfall/table";
import fixture from "./fixtures/typfall-1959.json";

// The fixture is the model's own output (sheets Utdata and Start) for its default typfall:
// born 1959, pension at 66, starts working at 23, 38 500 kr a month, no tjänstepension,
// real growth 0 % and real return 1.7 %. The port must give the same kronor.
const defaults = {
  born: 1959,
  par: 66,
  wStart: 23,
  monthlyWage: 38500,
  avtal: 1 as Avtal,
  gift: false,
  realGrowth: 0,
  realReturn: 0.017,
};

type Row = Record<string, number | null>;
const rows = fixture.rows as Row[];

describe("typfallsmodellen, compared with the model's own run for born 1959", () => {
  const result = runTypfall(defaults);

  it("matches every year of the model's detailed output (current prices)", () => {
    const columns = [
      "Lön", "PGI", "IP_rätt", "PP_rätt", "GP_rätt", "IP_PBH", "PP_PBH", "GP_PBH", "IP", "PP", "GP", "ptillagg",
      "Brutto", "Tax_ink", "Grundavdrag", "Pensionavgift", "Besk_inkomst", "Kyrk_begravn", "Kommunal_skatt",
      "Statlig_skatt", "Skattereduktioner", "Nettoinkomst",
    ];
    let compared = 0;
    for (const row of rows) {
      const mine = result.verbose.find((v) => v.age === row["Ålder"])!;
      for (const column of columns) {
        const expected = row[column];
        const actual = mine[column];
        if (expected == null || actual === undefined) continue;
        expect(actual, `${column} at age ${row["Ålder"]}`).toBeCloseTo(expected, 6);
        compared++;
      }
    }
    expect(compared).toBeGreaterThan(1500);
  });

  it("matches the year-by-year table in fixed 2025 prices", () => {
    const pairs: [string, keyof (typeof result.years)[number]][] = [
      ["fixed:Inkomst", "lon"], ["fixed:IP", "ip"], ["fixed:PP", "pp"], ["fixed:GP", "gp"],
      ["fixed:Ptillagg", "tillagg"], ["fixed:TJP", "tjp"], ["fixed:Brutto", "brutto"],
    ];
    // The model writes this table for ages 1-104 only.
    for (const row of rows.filter((r) => r["fixed:Ålder"] != null)) {
      const mine = result.years.find((y) => y.age === row["fixed:Ålder"])!;
      for (const [column, key] of pairs) expect(mine[key], `${column} at ${mine.age}`).toBe(row[column]);
      if (mine.netto !== null) expect(mine.netto, `netto at ${mine.age}`).toBe(row["fixed:Inkomst efter skatt"]);
    }
  });

  it("gives the same result with the advanced settings at their defaults", () => {
    const explicit = runTypfall({ ...defaults, advanced: DEFAULT_ADVANCED });
    expect(explicit.years).toEqual(result.years);
    expect(explicit.netto).toBe(result.netto);
  });

  it("matches Tabell 1 on the start page", () => {
    const t = fixture.table1 as Record<string, (number | null)[]>;
    const col = (label: string) => t[label]![1]!;
    expect(result.slutlon).toBeCloseTo(col("Slutlön, 61 - 65 års ålder"), 6);
    expect(result.slutlonNetto!).toBeCloseTo(col("Lön efter skatt"), 6);
    expect(result.ip).toBe(col("Inkomstpension"));
    expect(result.pp).toBe(col("Premiepension"));
    expect(result.gp).toBe(col("Garantipension"));
    expect(result.tillagg).toBe(col("Pensionstillägg (IPT) (40/40)"));
    expect(result.allman).toBe(col("Total allmän pension"));
    expect(result.tjp).toBe(col("Tjänstepension"));
    expect(result.brutto).toBe(col("Total pension brutto"));
    expect(result.netto).toBe(col("Efter skatt"));
  });

  it("matches all four columns of Tabell 1", () => {
    const t = fixture.table1 as Record<string, (number | null)[]>;
    const table = pensionTable(result);
    const rows = [...table.wage, ...table.pension, ...table.afterTax];
    const labels: [string, string][] = [
      ["Slutlön, 61 - 65 års ålder", "Slutlön, 61 - 65 års ålder"], ["Lön efter skatt", "Lön efter skatt"],
      ["Inkomstpension", "Inkomstpension"], ["Tilläggspension", "Tilläggspension"], ["Premiepension", "Premiepension"],
      ["Garantipension", "Garantipension"], ["Pensionstillägg (IPT) (40/40)", "Pensionstillägg (IPT)"],
      ["Total allmän pension", "Total allmän pension"], ["Tjänstepension", "Tjänstepension"],
      ["Privat pensionssparande (med avdragsrätt)", "Privat pensionssparande (med avdragsrätt)"],
      ["Total pension brutto", "Total pension brutto"], ["Efter skatt", "Efter skatt"],
      ["Privat pensionssparande (ISK / KF)", "Privat pensionssparande (ISK / KF)"],
    ];
    expect(table.title).toBe("Pension vid 66 års ålder");
    for (const [excel, mine] of labels) {
      const row = rows.find((r) => r.label === mine)!;
      const [current, fixedPrice, monthly, share] = t[excel]!;
      expect(row.current!, `${mine} löpande`).toBeCloseTo(current!, 6);
      expect(row.fixed!, `${mine} fasta`).toBeCloseTo(fixedPrice!, 6);
      expect(row.fixed! / 12, `${mine} per månad`).toBeCloseTo(monthly!, 6);
      expect(row.share ?? 0, `${mine} andel`).toBeCloseTo(share as number, 9);
    }
  });
});

describe("typfallsmodellen, other cases", () => {
  it("gives finite, non-negative amounts for every birth year, agreement and pension age", () => {
    for (let born = FIRST_COHORT; born <= LAST_COHORT; born += 3) {
      const { lowest, rikt } = riktaldrar(born);
      for (const par of [lowest, rikt, 72]) {
        for (const avtal of [1, 2, 3, 4, 5, 6, 7, 8] as Avtal[]) {
          const r = runTypfall({ ...defaults, born, par, avtal, realGrowth: 0.016, realReturn: 0.035 });
          for (const v of [r.ip, r.pp, r.gp, r.tillagg, r.tjp, r.brutto, r.netto, r.slutlon]) {
            expect(Number.isFinite(v), `${born} ${par} ${avtal}`).toBe(true);
            expect(v).toBeGreaterThanOrEqual(0);
          }
          if (avtal === 1) expect(r.tjp).toBe(0);
          else expect(r.tjp).toBeGreaterThan(0);
        }
      }
    }
  });

  it("caps the pension at 7.5 inkomstbasbelopp", () => {
    const high = runTypfall({ ...defaults, born: 1980, par: 68, monthlyWage: 70000 });
    const higher = runTypfall({ ...defaults, born: 1980, par: 68, monthlyWage: 120000 });
    expect(higher.allman).toBe(high.allman);
    expect(higher.slutlon).toBeGreaterThan(high.slutlon);
  });

  it("pays garantipension to low earners and less to married people", () => {
    const single = runTypfall({ ...defaults, born: 1980, par: 68, monthlyWage: 12000 });
    const married = runTypfall({ ...defaults, born: 1980, par: 68, monthlyWage: 12000, gift: true });
    expect(single.gp).toBeGreaterThan(0);
    expect(married.gp).toBeLessThan(single.gp);
  });

  it("refuses a pension age below the lowest age for the birth year", () => {
    expect(() => runTypfall({ ...defaults, born: 1990, par: 63 })).toThrow();
  });
});

describe("typfallsmodellen, advanced settings", () => {
  const base = { ...defaults, born: 1980, par: 68, avtal: 2 as Avtal, realGrowth: 0.016, realReturn: 0.035 };
  const run = (advanced: Parameters<typeof runTypfall>[0]["advanced"], extra = {}) =>
    runTypfall({ ...base, ...extra, advanced });
  const plain = run({});

  it("gives finite amounts for every setting", () => {
    const settings = [
      { inflation: 0.02 }, { avkastningsval: 1 as const }, { avkastningsval: 3 as const },
      { loneprofil: 1 as const }, { loneprofil: 2 as const }, { loneprofil: 3 as const }, { loneprofil: 4 as const },
      { slutlonAr: 1 }, { slutlonAr: 10 }, { andradLonAr: 2035, andradLonFaktor: 0.8 }, { barn: [2010, 2013] },
      { forsakringstid: 20 }, { flexpension: 0.02 }, { arvsvinsterTjp: false }, { tempTjp: 5 },
      { sparform: 0 as const, sparManad: 1000 }, { sparform: 1 as const, sparManad: 1000 },
      { sparform: 2 as const, sparManad: 1000, tempSpar: 10 }, { kommunalskatt: 0.34, begravning: 0.01 },
    ];
    for (const advanced of settings) {
      const r = run(advanced);
      for (const v of [r.ip, r.pp, r.gp, r.tillagg, r.tjp, r.ips, r.pps, r.brutto, r.netto, r.slutlon]) {
        expect(Number.isFinite(v), JSON.stringify(advanced)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("adds flexpension to ITP 1 only", () => {
    expect(run({ flexpension: 0.02 }).tjp).toBeGreaterThan(plain.tjp);
    expect(run({ flexpension: 0.02 }, { avtal: 1 }).tjp).toBe(0);
  });

  it("pays a temporary tjänstepension for the given years only", () => {
    const temp = run({ tempTjp: 5 });
    expect(temp.tjp).toBeGreaterThan(3 * plain.tjp);
    const paid = temp.years.filter((y) => y.tjp > 0).map((y) => y.age);
    expect(paid).toEqual([68, 69, 70, 71, 72]);
  });

  it("gives less tjänstepension with återbetalningsskydd", () => {
    expect(run({ arvsvinsterTjp: false }).tjp).toBeLessThan(plain.tjp);
  });

  it("gives pension rights for barnår to low earners", () => {
    const low = { monthlyWage: 20000 };
    const r = run({ barn: [2010, 2013] }, low);
    const pgb = r.verbose.filter((v) => v.PGB! > 0).map((v) => v.year);
    expect(pgb).toEqual([2010, 2011, 2012, 2013, 2014, 2015, 2016]);
    expect(r.ip).toBeGreaterThan(run({}, low).ip);
    // Nothing for incomes above 7.5 inkomstbasbelopp
    const high = { monthlyWage: 80000 };
    expect(run({ barn: [2010] }, high).ip).toBe(run({}, high).ip);
  });

  it("scales garantipension with försäkringstid, at least the working years", () => {
    const late = { wStart: 40, monthlyWage: 15000, avtal: 1 as Avtal };
    const full = run({}, late);
    const r30 = run({ forsakringstid: 30 }, late);
    expect(r30.forsakringstid).toBe(30);
    expect(r30.gp).toBeCloseTo((full.gp * 30) / 40, -2);
    expect(run({ forsakringstid: 10 }, late).forsakringstid).toBe(27);
  });

  it("pays private saving: IPS taxed in brutto, ISK and KF beside it", () => {
    const ips = run({ sparform: 0, sparManad: 1000 });
    expect(ips.ips).toBeGreaterThan(0);
    expect(ips.brutto).toBeCloseTo(plain.brutto + ips.ips, 6);
    const isk = run({ sparform: 2, sparManad: 1000, tempSpar: 10 });
    expect(isk.pps).toBeGreaterThan(0);
    expect(isk.brutto).toBe(plain.brutto);
    const paid = isk.years.filter((y) => y.pps > 0).map((y) => y.age);
    expect(paid[0]).toBe(68);
    expect(paid.at(-1)).toBeLessThanOrEqual(77);
  });

  it("uses an own kommunalskatt for every year", () => {
    expect(run({ kommunalskatt: 0.3 }).netto).toBeGreaterThan(run({ kommunalskatt: 0.35 }).netto);
    expect(run({ kommunalskatt: 0.3, begravning: 0.01 }).netto).toBeLessThan(run({ kommunalskatt: 0.3 }).netto);
  });

  it("changes the wage path with löneprofil and ändrad lön", () => {
    expect(run({ loneprofil: 1 }).slutlon).not.toBeCloseTo(plain.slutlon, 0);
    expect(run({ andradLonAr: 2035, andradLonFaktor: 0.8 }).slutlon).toBeCloseTo(plain.slutlon * 0.8, 6);
  });
});

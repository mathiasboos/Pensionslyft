import { describe, expect, it } from "vitest";
import { FIRST_COHORT, LAST_COHORT, riktaldrar } from "../src/lib/typfall/data";
import { type Avtal, runTypfall } from "../src/lib/typfall/model";
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

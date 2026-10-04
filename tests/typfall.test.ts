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
      "Statlig_skatt", "Skattereduktioner", "Nettoinkomst", "Bidrag", "Ind_Disp",
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
    let benefits = 0;
    // The model writes this table for ages 1-104 only.
    for (const row of rows.filter((r) => r["fixed:Ålder"] != null)) {
      const mine = result.years.find((y) => y.age === row["fixed:Ålder"])!;
      for (const [column, key] of pairs) expect(mine[key], `${column} at ${mine.age}`).toBe(row[column]);
      if (mine.netto !== null) expect(mine.netto, `netto at ${mine.age}`).toBe(row["fixed:Inkomst efter skatt"]);
      if (mine.bidrag !== null) {
        expect(mine.bidrag, `bidrag at ${mine.age}`).toBe(row["fixed:Bidrag"]);
        expect(mine.disp, `disponibel inkomst at ${mine.age}`).toBe(row["fixed:Disponibel inkomst"]);
        if (mine.bidrag > 0) benefits++;
      }
    }
    // Bostadstillägg every year from 66 to 104 (the table ends at 104)
    expect(benefits).toBe(39);
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
    const rows = [
      ...table.wage,
      ...table.pension,
      ...table.afterTax.map((r) => (r.label === "Disponibel inkomst" ? { ...r, label: "Disponibel inkomst efter skatt" } : r)),
    ];
    const labels: [string, string][] = [
      ["Slutlön, 61 - 65 års ålder", "Slutlön, 61 - 65 års ålder"], ["Lön efter skatt", "Lön efter skatt"],
      ["Inkomstpension", "Inkomstpension"], ["Tilläggspension", "Tilläggspension"], ["Premiepension", "Premiepension"],
      ["Garantipension", "Garantipension"], ["Pensionstillägg (IPT) (40/40)", "Pensionstillägg (IPT)"],
      ["Total allmän pension", "Total allmän pension"], ["Tjänstepension", "Tjänstepension"],
      ["Privat pensionssparande (med avdragsrätt)", "Privat pensionssparande (med avdragsrätt)"],
      ["Total pension brutto", "Total pension brutto"], ["Efter skatt", "Efter skatt"],
      ["Privat pensionssparande (ISK / KF)", "Privat pensionssparande (ISK / KF)"],
      ["Bostadstillägg för pensionärer m.m.", "Bostadstillägg för pensionärer m.m."],
      // The fixture keeps the last of the two rows named "Disponibel inkomst", the one after tax.
      ["Disponibel inkomst", "Disponibel inkomst efter skatt"],
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

  it("takes the burial fee as given, also without an own kommunalskatt", () => {
    expect(run({ begravning: null }).netto).toBe(plain.netto); // the historical average, as in the workbook
    expect(run({ begravning: 0.0132 }).netto).toBeLessThan(plain.netto); // a member of the church
    expect(run({ begravning: 0 }).netto).toBeGreaterThan(plain.netto); // in the municipal tax (Stockholm, Tranås)
    // with an own kommunalskatt and no fee given, the average fee is still used
    expect(run({ kommunalskatt: 0.3 }).netto).toBeLessThan(run({ kommunalskatt: 0.3, begravning: 0 }).netto);
  });

  it("gives a reduction for the a-kassa fee, a yearly amount, but none for the union fee", () => {
    const lastWorkYear = (r: ReturnType<typeof run>) => r.years.find((y) => y.age === r.input.par - 1)!.netto!;
    // 25 % of 3 600 kronor, 900, in the prices of 2019, a little more in 2025 prices
    const gain = lastWorkYear(run({ akassa: 3600 })) - lastWorkYear(plain);
    expect(gain).toBeGreaterThan(900);
    expect(gain).toBeLessThan(1500);
    expect(lastWorkYear(run({ fack: 3600 }))).toBe(lastWorkYear(plain));
  });

  it("changes the wage path with löneprofil and ändrad lön", () => {
    expect(run({ loneprofil: 1 }).slutlon).not.toBeCloseTo(plain.slutlon, 0);
    expect(run({ andradLonAr: 2035, andradLonFaktor: 0.8 }).slutlon).toBeCloseTo(plain.slutlon * 0.8, 6);
  });
});

describe("typfallsmodellen, more advanced settings", () => {
  const base = { ...defaults, born: 1975, par: 68, monthlyWage: 33200, avtal: 2 as Avtal };
  const low = { ...base, monthlyWage: 18000, avtal: 1 as Avtal };
  const run = (advanced: Parameters<typeof runTypfall>[0]["advanced"], extra: Partial<typeof base> = {}) =>
    runTypfall({ ...base, ...extra, advanced });
  const plain = run({});
  const at = (r: ReturnType<typeof runTypfall>, age: number) => r.years.find((y) => y.age === age)!;

  it("takes out part of the pension and works part time until the final withdrawal", () => {
    const r = run({ defAr: 70, uttagIP: 0.5, uttagPP: 0.5 });
    expect(r.defAr).toBe(70);
    expect(r.tjpPar).toBe(70); // the tjänstepension follows the final withdrawal
    expect(at(r, 68).lon).toBeCloseTo(at(plain, 67).lon / 2, -1);
    expect(at(r, 69).ip).toBeGreaterThan(0);
    expect(at(r, 69).ip).toBeLessThan(at(r, 70).ip * 0.6);
    expect(at(r, 70).lon).toBe(0);
    const stop = run({ defAr: 70, uttagIP: 0, uttagPP: 0, sysselsattning: 0 });
    expect(at(stop, 68).lon).toBe(0);
    expect(at(stop, 69).ip).toBe(0);
  });

  it("pays the tjänstepension from its own age", () => {
    const r = run({ tjpPar: 65 });
    expect(at(r, 64).tjp).toBe(0);
    expect(at(r, 65).tjp).toBeGreaterThan(0);
    expect(at(r, 65).lon).toBeGreaterThan(0);
    expect(r.tjp).toBeLessThan(plain.tjp);
  });

  it("gives bostadstillägg to low pensions, more with a higher rent and less with wealth", () => {
    const r = run({}, low);
    expect(r.bidrag).toBeGreaterThan(0);
    expect(run({ hyra: 9000 }, low).bidrag).toBeGreaterThan(r.bidrag);
    expect(run({ formogenhet: 500000 }, low).bidrag).toBeLessThan(r.bidrag);
    expect(run({ ansoker: false }, low).bidrag).toBe(0);
    expect(at(run({ ansoker: false }, low), 70).bidrag).toBe(0);
    expect(r.disp).toBeCloseTo(r.netto + r.bidrag, 6);
    expect(plain.bidrag).toBe(0);
  });

  it("taxes capital income at 30 % and counts it for bostadstillägg", () => {
    const k = run({ kapital: 50000 });
    expect(k.netto - plain.netto).toBeCloseTo(50000 * 0.7, 0);
    expect(run({ kapital: 20000 }, low).bidrag).toBeLessThan(run({}, low).bidrag);
  });

  it("gives a tax reduction for the a-kassa fee from 2022", () => {
    expect(run({ akassa: 2000 }).dispFore!).toBeGreaterThan(plain.dispFore!);
    expect(run({ fack: 2000 }).dispFore).toBe(plain.dispFore);
  });

  it("gives PGB for sjuk- och aktivitetsersättning, värnplikt and studier", () => {
    const pgb = (r: ReturnType<typeof runTypfall>) => r.verbose.filter((v) => v.PGB! > 0).map((v) => v.year);
    const sa = run({ pgb: { sa: [{ from: 2000, to: 2002, belopp: 150000 }], vpl: null, studier: [] } });
    expect(pgb(sa)).toEqual([2000, 2001, 2002]);
    const vpl = run({ pgb: { sa: [], vpl: { start: "1995-01-10", end: "1996-01-09" }, studier: [] } });
    expect(pgb(vpl)).toEqual([1995, 1996]);
    expect(vpl.ip).toBeGreaterThan(plain.ip);
    const stud = run({ pgb: { sa: [], vpl: null, studier: [{ from: 1996, to: 1999, terminer: 2 }] } }, { wStart: 25 });
    // 138 % of the study grant, from 1997 in the model
    expect(pgb(stud)).toEqual([1997, 1998, 1999]);
  });

  it("uses an own wage path as given", () => {
    const same = run({ egenLon: plain.wagePath });
    expect(same.brutto).toBe(plain.brutto);
    const higher = run({ egenLon: plain.wagePath.map((w) => ({ ...w, income: w.income * 1.2, wage: w.wage * 1.2 })) });
    expect(higher.ip).toBeGreaterThan(plain.ip);
  });

  it("starts from known balances and deducts fund fees when the return is before fees", () => {
    expect(run({ pbhYear: 2020, pbhPP: 500000 }).pp).toBeGreaterThan(plain.pp);
    expect(run({ pbhYear: 2020, pbhTJP: 800000 }).tjp).toBeGreaterThan(plain.tjp);
    expect(run({ efterFondavgifter: false }).pp).toBeLessThan(plain.pp);
  });

  it("pays child benefits and counts them in the disposable income", () => {
    const r = run({ barn: [2015] }, { ...low, monthlyWage: 15000 });
    const y = r.years.find((x) => x.year === 2025)!;
    expect(y.bidrag!).toBeGreaterThanOrEqual(1250 * 12);
    expect(y.disp).toBe(y.netto! + y.bidrag! + y.pps);
  });
});

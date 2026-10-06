// The löneväxlingskalkylator against the supplied Salary_Exchange_Consumer.html (github.com/mathiasboos/Calculators).
// The fixture holds what that page shows for 246 states, read out of it in a browser.
import { describe, expect, it } from "vitest";
import fixture from "./fixtures/lonevaxling-web.json";
import {
  AG_PCT,
  calcLonevaxling,
  clamp,
  disclaimer,
  fmtKr,
  fmtOneDecimal,
  fmtUplift,
  fvAt,
  itp1Avsattning,
  limitBelopp,
  LIMIT_AVGIFTSTAK,
  LIMIT_BRYTPUNKT,
  maxVaxling,
  parseNum,
  pensionPremie,
  simSeries,
  SLP_PCT,
  suitability,
  upliftPercent,
} from "../src/lib/lonevaxling";

interface State {
  lon: number;
  belopp: number;
  alder: number;
  pensionsalder: number;
  avkastning: number;
  tak: number;
  premie: string;
  uplift: string;
  years: string;
  kapital: string;
  disclaimer: string;
  status: string;
  statusTitle: string;
  statusText: string;
  series: number[];
  sub: string;
}

describe("löneväxlingskalkylatorn against the original", () => {
  it("shows what the original shows for 246 states", () => {
    const diffs: string[] = [];
    for (const s of fixture as State[]) {
      const r = calcLonevaxling(s);
      const at = `${s.lon}/${s.belopp}/${s.alder}/${s.pensionsalder}/${s.avkastning}`;
      const check = (what: string, mine: unknown, theirs: unknown) => {
        if (mine !== theirs) diffs.push(`${at} ${what}: ${String(mine)} / ${String(theirs)}`);
      };
      check("tak", r.tak, s.tak);
      check("premie", fmtKr(r.premie), s.premie);
      // The original writes -100 % when nothing is exchanged; here the share is the same as always
      check("uplift", fmtUplift(r.uplift), s.belopp === 0 ? "5,8 %" : s.uplift);
      check("years", String(r.years), s.years);
      check("kapital", fmtKr(r.kapital), s.kapital);
      check("disclaimer", disclaimer(s.avkastning), s.disclaimer);
      check("status", r.suitability, s.status);
      check("title", r.title, s.statusTitle);
      check("text", r.text, s.statusText);
      check("sub", `Utveckling fram till pension vid ${fmtOneDecimal(s.avkastning)} % avkastning per år.`, s.sub);
      const series = simSeries(pensionPremie(s.belopp), s.avkastning, r.years);
      const mine = [series[0], series[1], series[Math.floor(r.years / 2)], series[r.years]];
      s.series.forEach((v, i) => check(`series[${i}]`, mine[i], v));
    }
    expect(diffs).toEqual([]);
  });

  it("keeps the exchanged amount under the cap, as the original does", () => {
    for (const s of fixture as State[]) {
      expect(limitBelopp(s.lon, s.belopp)).toBe(s.belopp);
    }
    // a larger amount is cut down to the cap
    expect(limitBelopp(60000, 50000)).toBe(16200);
    expect(limitBelopp(10000, 3500)).toBe(3000);
  });
});

describe("löneväxlingskalkylatorn", () => {
  it("gives the default case of the original", () => {
    const r = calcLonevaxling({ lon: 60000, belopp: 3000, alder: 40, pensionsalder: 67, avkastning: 6 });
    expect(r.tak).toBe(16200);
    expect(fmtKr(r.premie)).toBe("3 173 kr");
    expect(fmtUplift(r.uplift)).toBe("5,8 %");
    expect(r.years).toBe(27);
    expect(fmtKr(r.kapital)).toBe("2 503 685 kr");
    expect(r.suitability).toBe("good");
  });

  it("puts the employer's lower payroll tax on top of the exchanged amount", () => {
    // The employer pays 31.42 % on the salary it saves and 24.26 % tax on the premium
    expect(pensionPremie(1000)).toBeCloseTo((1000 * (1 + AG_PCT)) / (1 + SLP_PCT), 9);
    expect(upliftPercent(1000)).toBeCloseTo(5.76, 2);
    expect(upliftPercent(123456)).toBeCloseTo(upliftPercent(1000), 9);
    // also when nothing is exchanged
    expect(upliftPercent(0)).toBeCloseTo(5.76, 2);
  });

  it("grows the premium with the return, paid at the start of every month", () => {
    // 0 % return: only what is paid in
    expect(fvAt(1000, 0, 10)).toBe(120000);
    expect(simSeries(1000, 0, 3)).toEqual([0, 12000, 24000, 36000]);
    // 12 % a year, once: twelve payments at the monthly rate that gives 12 % over the year
    const r = Math.pow(1.12, 1 / 12) - 1;
    expect(fvAt(1000, 12, 1)).toBeCloseTo(1000 * ((Math.pow(1 + r, 12) - 1) / r) * (1 + r), 6);
    // more years and a higher return give more
    expect(fvAt(1000, 6, 20)).toBeGreaterThan(fvAt(1000, 6, 10));
    expect(fvAt(1000, 8, 20)).toBeGreaterThan(fvAt(1000, 6, 20));
  });

  it("caps the exchange at 35 % of the salary and 10 prisbasbelopp, less the employer's ITP1", () => {
    // ITP1: 4.5 % up to 7.5 IBB (52 125 kr a month), 30 % between 7.5 and 30 IBB
    expect(itp1Avsattning(52125)).toBeCloseTo(52125 * 0.045, 9);
    expect(itp1Avsattning(60000)).toBeCloseTo(52125 * 0.045 + 7875 * 0.3, 9);
    expect(itp1Avsattning(300000)).toBeCloseTo(52125 * 0.045 + (208500 - 52125) * 0.3, 9);
    expect(maxVaxling(60000)).toBe(16200);
    // at a high salary the 10 prisbasbelopp (592 000 kr a year) is the lower limit
    const arslon = 150000 * 12;
    expect(Math.min(0.35 * arslon, 592000)).toBe(592000);
    expect(maxVaxling(150000)).toBe(Math.floor((592000 - itp1Avsattning(150000) * 12) / 12 / 100) * 100);
    // never negative, and always whole hundreds
    expect(maxVaxling(0)).toBe(0);
    for (const lon of [1000, 12345, 33333, 99999, 400000]) {
      expect(maxVaxling(lon)).toBeGreaterThanOrEqual(0);
      expect(maxVaxling(lon) % 100).toBe(0);
    }
  });

  it("judges the salary that is left against the two limits", () => {
    expect(suitability(LIMIT_AVGIFTSTAK + 1).kind).toBe("good");
    expect(suitability(LIMIT_AVGIFTSTAK).kind).toBe("amber");
    expect(suitability(LIMIT_BRYTPUNKT + 1).kind).toBe("amber");
    expect(suitability(LIMIT_BRYTPUNKT).kind).toBe("warn");
    expect(suitability(20000).text).toBe("Lön efter växling: 20 000 kr/mån – under avgiftstaket och brytpunkten.");
  });

  it("reads a typed number as the original does", () => {
    expect(parseNum("60 000")).toBe(60000);
    expect(parseNum("60 000")).toBe(60000);
    expect(parseNum("1,5")).toBe(1.5);
    expect(parseNum("3 000,5")).toBe(3000.5);
    expect(Number.isNaN(parseNum("abc"))).toBe(true);
    expect(clamp(parseNum("999999"), 0, 500000)).toBe(500000);
  });
});

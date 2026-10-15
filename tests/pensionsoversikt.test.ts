import { describe, expect, it } from "vitest";
import { calcNettolon, DEFAULTS } from "../src/lib/nettolon";
import {
  DEFAULT_INPUT,
  type KalkylInput,
  kalkylera,
  modelPension,
  pensionNet,
  realRate,
  statusOf,
} from "../src/lib/pensionsoversikt";
import { runTypfall } from "../src/lib/typfall/model";

const base: KalkylInput = { ...DEFAULT_INPUT, thisYear: 2026 };

describe("pensionsöversiktens delar", () => {
  it("räknar om till real takt", () => {
    expect(realRate(2, 2)).toBe(0);
    expect(realRate(5.5, 2)).toBeCloseTo(0.034314, 6);
  });

  it("sätter prognosen efter hur mycket av behovet som är sparat", () => {
    expect(statusOf(Infinity)).toBe("rattTill");
    expect(statusOf(1)).toBe("rattTill");
    expect(statusOf(0.9)).toBe("nastanDar");
    expect(statusOf(0.6)).toBe("paVag");
    expect(statusOf(0.59)).toBe("forbattras");
  });

  it("tar pensionerna från Typfallsmodellen", () => {
    const p = modelPension(base);
    const t = runTypfall({ born: 1986, par: 67, wStart: 23, monthlyWage: 40000, avtal: 2, gift: false, realGrowth: 0, realReturn: 0.017 });
    expect(p.available).toBe(true);
    expect(p.startAge).toBe(67);
    expect(p.first.ip).toBe(t.ip / 12);
    expect(p.first.pp).toBe(t.pp / 12);
    expect(p.first.tjp).toBe(t.tjp / 12);
  });

  it("börjar den allmänna pensionen vid lägsta åldern om man slutar arbeta tidigare", () => {
    const p = modelPension({ ...base, retireAge: 60 });
    expect(p.lowestAge).toBe(66);
    expect(p.startAge).toBe(66);
  });

  it("utanför modellens årskullar finns inga pensioner från modellen", () => {
    expect(modelPension({ ...base, age: 70 }).available).toBe(false);
  });

  it("beskattar pensionen som nettolönekalkylatorn, med förhöjt grundavdrag för äldre", () => {
    const net = pensionNet(25000, true, 32.4, 0.292);
    const r = calcNettolon({ ...DEFAULTS, lon: 0, pension: 25000, over66: true, kommun: 32.4, kyrkaOn: false, begrPct: 0.292 });
    expect(net).toBe(r.netto / 12);
    expect(pensionNet(25000, true, 32.4, 0.292)).toBeGreaterThan(pensionNet(25000, false, 32.4, 0.292));
    expect(pensionNet(0, true, 32.4, 0.292)).toBe(0);
  });
});

describe("kalkylera", () => {
  it("låter egna belopp ersätta modellens", () => {
    const r = kalkylera({ ...base, ownIp: 10000, ownPp: 2000, ownTjp: 0 });
    expect(r.used.ip).toBe(10000);
    expect(r.used.pp).toBe(2000);
    expect(r.used.tjp).toBe(0);
    expect(r.used.allman).toBeCloseTo(12000, 6);
  });

  it("behöver utan avkastning, avgift och inflation exakt summan av glappen", () => {
    const input = { ...base, budget: 27300, returnPct: 0, feePct: 0, iskTaxPct: 0, inflationPct: 0, wageGrowthPct: 0 };
    const r = kalkylera(input);
    const gaps = r.rows.filter((y) => y.age >= input.retireAge).reduce((s, y) => s + Math.max(y.need - y.pensionNet, 0), 0);
    expect(r.needAtRetirement).toBeCloseTo(gaps, -1);
  });

  it("sluter glappet med det extra sparandet", () => {
    const input = { ...base, budget: 27300 };
    const r = kalkylera(input);
    expect(r.status).not.toBe("rattTill");
    expect(r.extraMonthlySaving).toBeGreaterThan(0);
    const more = kalkylera({ ...input, monthlySaving: input.monthlySaving + r.extraMonthlySaving + 1 });
    expect(more.status).toBe("rattTill");
    expect(more.depletedAge).toBeNull();
    expect(more.rows.every((y) => y.shortfall < 1)).toBe(true);
  });

  it("drar det som behövs ur sparandet tills det tar slut", () => {
    const r = kalkylera({ ...base, budget: 27300 });
    expect(r.depletedAge).not.toBeNull();
    const after = r.rows.filter((y) => y.age > r.depletedAge!);
    expect(after.every((y) => y.closing === 0 && y.shortfall > 0)).toBe(true);
  });

  it("linjen för behovet slutar i behovet vid pensionen och i noll vid livslängden", () => {
    const r = kalkylera({ ...base, budget: 27300 });
    const atRet = r.rows.find((y) => y.age === base.retireAge)!;
    expect(atRet.needCapital).toBeCloseTo(r.needAtRetirement, 0);
    expect(r.rows.at(-1)!.closing).toBeGreaterThanOrEqual(0);
  });

  it("ger samma resultat som förut för grundfallet och för pluspensionären", () => {
    const r = kalkylera(base);
    expect(Math.round(r.netPension)).toBe(19396);
    expect(Math.round(r.haveAtRetirement)).toBe(1390990);
    expect(r.needAtRetirement).toBe(0);
    expect(r.status).toBe("rattTill");
    const plus = kalkylera({ ...base, budget: 27300 });
    expect(Math.round(plus.gap)).toBe(7904);
    expect(Math.round(plus.needAtRetirement / 1000)).toBe(1765);
    expect(plus.status).toBe("paVag");
    expect(Math.round(plus.extraMonthlySaving)).toBe(915);
  });
});

describe("allt kapital", () => {
  const onlySalary = { ...base, savings: 0, monthlySaving: 0 };

  it("fyller diagrammet när bara lönen är ifylld", () => {
    const r = kalkylera(onlySalary);
    expect(r.haveAtRetirement).toBe(0);
    expect(r.capitalAtRetirement).toBeGreaterThan(0);
    expect(r.capital.length).toBe(r.rows.length);
    const atRet = r.capital.find((c) => c.age === onlySalary.retireAge)!;
    expect(atRet.savings).toBe(0);
    expect(atRet.ip).toBeGreaterThan(0);
    expect(atRet.pp).toBeGreaterThan(0);
    expect(atRet.tjp).toBeGreaterThan(0);
    expect(atRet.total).toBeCloseTo(r.capitalAtRetirement, 0);
    // Capital grows to the retirement age and is then paid out.
    const first = r.capital[0]!;
    expect(first.total).toBeGreaterThan(0);
    expect(first.total).toBeLessThan(atRet.total);
    expect(r.capital.at(-1)!.total).toBeLessThan(atRet.total);
  });

  it("delar kapitalet på källor som summerar till totalen", () => {
    for (const c of kalkylera(base).capital) {
      expect(c.total).toBeCloseTo(c.savings + c.ip + c.pp + c.gpTillagg + c.tjp + c.other, 6);
    }
  });

  it("ger ett överskott när pensionen räcker till budgeten, och månadsbeloppet följer pensionen", () => {
    const r = kalkylera(onlySalary);
    expect(r.surplus).toBe(true);
    expect(r.capitalDiff).toBeGreaterThan(0);
    // Nettopensionen i det första året är 19 396 mot budgeten 18 400; över livet är den högre (förhöjt grundavdrag).
    expect(r.monthlyDiff).toBeGreaterThan(r.netPension - onlySalary.budget - 100);
    expect(r.monthlyDiff).toBeLessThan(3000);
  });

  it("ger ett underskott för pluspensionären, i nivå med modellens egen brist", () => {
    const plus = kalkylera({ ...base, budget: 27300, savings: 0, monthlySaving: 0 });
    expect(plus.surplus).toBe(false);
    expect(plus.capitalDiff).toBeLessThan(0);
    // The rate is calibrated on the savings run, so the capital view and the savings run agree on the size.
    expect(-plus.capitalDiff).toBeGreaterThan(plus.shortfall * 0.9);
    expect(-plus.capitalDiff).toBeLessThan(plus.shortfall * 1.1);
    expect(plus.monthlyDiff).toBeGreaterThan(0);
  });

  it("behovet är nuvärdet av budgeten och minskar mot livslängden", () => {
    const r = kalkylera(base);
    const need = r.capital.map((c) => c.need);
    expect(r.needTotal).toBeCloseTo(need[base.retireAge - base.age]!, 0);
    expect(need[base.retireAge - base.age]!).toBeGreaterThan(need[0]!);
    expect(need.at(-1)!).toBeLessThan(need[base.retireAge - base.age]!);
  });
});

describe("tidigaste pensionsålder", () => {
  it("är tidigare än vald ålder vid överskott och senare vid underskott", () => {
    const surplus = kalkylera(base);
    expect(surplus.surplus).toBe(true);
    expect(surplus.retireEstimate.age).not.toBeNull();
    expect(surplus.retireEstimate.age!).toBeLessThan(base.retireAge);

    const deficit = kalkylera({ ...base, budget: 27300, savings: 0, monthlySaving: 0 });
    expect(deficit.surplus).toBe(false);
    expect(deficit.retireEstimate.age).not.toBeNull();
    expect(deficit.retireEstimate.age!).toBeGreaterThan(base.retireAge);
  });

  it("räknar ut åldern så att kapitalet precis räcker: ett år senare har inte överskott, valet av den åldern har det", () => {
    const deficit = { ...base, budget: 27300, savings: 0, monthlySaving: 0 };
    const age = kalkylera(deficit).retireEstimate.age!;
    expect(kalkylera({ ...deficit, retireAge: age }).surplus).toBe(true);
    expect(kalkylera({ ...deficit, retireAge: age - 1 }).surplus).toBe(false);
  });

  it("väntar på att pensionen börjar: utan sparande går man inte i pension före lägsta åldern", () => {
    const r = kalkylera({ ...base, savings: 0, monthlySaving: 0 });
    expect(r.retireEstimate.age!).toBeGreaterThanOrEqual(r.pension.lowestAge);
  });

  it("blir tidigare ju mer man har sparat", () => {
    const ages = [0, 300_000, 1_000_000].map((savings) => kalkylera({ ...base, budget: 27300, savings, monthlySaving: 0 }).retireEstimate.age!);
    expect(ages[0]!).toBeGreaterThanOrEqual(ages[1]!);
    expect(ages[1]!).toBeGreaterThanOrEqual(ages[2]!);
  });

  it("ger null när inte ens 75 år räcker", () => {
    const r = kalkylera({ ...base, budget: 90_000, savings: 0, monthlySaving: 0 });
    expect(r.retireEstimate.age).toBeNull();
  });
});

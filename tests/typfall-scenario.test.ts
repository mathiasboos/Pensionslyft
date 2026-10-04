import { afterEach, describe, expect, it, vi } from "vitest";
import { runTypfall } from "../src/lib/typfall/model";
import {
  DEFAULT_FORM,
  freeSlot,
  keyFigures,
  loadSaved,
  runScenario,
  storeSaved,
  usedAges,
} from "../src/lib/typfall/scenario";

describe("typfall scenarios", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("runs the form as the calculator does", () => {
    const r = runScenario(DEFAULT_FORM);
    const direct = runTypfall({
      born: 1975, par: 68, wStart: 23, monthlyWage: 33200, avtal: 1, gift: false, realGrowth: 0, realReturn: 0.017,
    });
    expect(r.brutto).toBe(direct.brutto);
    expect(Math.round(r.brutto / 12)).toBe(20163);
  });

  it("uses the advanced choices only in Avancerat, and inflation in both modes", () => {
    const adv = { ...DEFAULT_FORM.adv, tempTjp: 5 };
    const normal = runScenario({ ...DEFAULT_FORM, avtal: 2, adv });
    const avancerat = runScenario({ ...DEFAULT_FORM, avtal: 2, adv, mode: "avancerat" });
    expect(avancerat.tjp).toBeGreaterThan(normal.tjp);
    expect(runScenario({ ...DEFAULT_FORM, inflation: 2 }).advanced.inflation).toBe(0.02);
  });

  it("clamps the pension age and follows the riktålder", () => {
    const young = usedAges({ ...DEFAULT_FORM, born: 1990, par: 60 });
    expect(young.par).toBe(young.lowest);
    expect(young.lowest).toBe(66);
    expect(usedAges({ ...DEFAULT_FORM, useRikt: true }).par).toBe(usedAges({ ...DEFAULT_FORM }).rikt);
    expect(usedAges({ ...DEFAULT_FORM, wStart: 80 }).wStart).toBe(67);
  });

  it("gives the key figures", () => {
    const k = keyFigures(runScenario(DEFAULT_FORM));
    expect(k.kgrad).toBeCloseTo(58.6, 1);
    expect(k.lastAge).toBe(88);
    expect(Math.round(k.average)).toBe(19219);
  });

  it("stores scenarios and fills in settings added later", () => {
    const store: Record<string, string> = {};
    vi.stubGlobal("window", {
      localStorage: { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => (store[k] = v) },
    });
    storeSaved([{ id: "a", name: "Ett", slot: 1, form: DEFAULT_FORM }]);
    const raw = JSON.parse(Object.values(store)[0]!);
    delete raw[0].form.adv.pgb; // as if saved before the setting existed
    store[Object.keys(store)[0]!] = JSON.stringify(raw);
    const list = loadSaved();
    expect(list[0]!.name).toBe("Ett");
    expect(list[0]!.form.adv.pgb).toEqual(DEFAULT_FORM.adv.pgb);
    expect(freeSlot(list)).toBe(0);
  });

  it("reads the burial fee of scenarios saved before the choice of church", () => {
    const store: Record<string, string> = {};
    vi.stubGlobal("window", {
      localStorage: { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => (store[k] = v) },
    });
    const read = (adv: object) => {
      storeSaved([{ id: "a", name: "Ett", slot: 0, form: { ...DEFAULT_FORM, adv: adv as typeof DEFAULT_FORM.adv } }]);
      return loadSaved()[0]!.form.adv;
    };
    const { kyrka: _kyrka, ...old } = DEFAULT_FORM.adv;
    // no fee used (0 without an own kommunalskatt) becomes the historical average
    expect(read({ ...old, begravning: 0 }).begravning).toBeNull();
    // 0 with an own kommunalskatt was a fee of 0
    expect(read({ ...old, kommunalskatt: 0.3, begravning: 0 }).begravning).toBe(0);
    // a fee of 0 chosen with the church (Stockholm, Tranås) stays 0
    expect(read({ ...DEFAULT_FORM.adv, kyrka: "stockholm", begravning: 0 }).begravning).toBe(0);
  });

  it("returns no scenarios when the storage is blocked or broken", () => {
    vi.stubGlobal("window", { localStorage: { getItem: () => { throw new Error("blocked"); } } });
    expect(loadSaved()).toEqual([]);
    vi.stubGlobal("window", { localStorage: { getItem: () => "{not json" } });
    expect(loadSaved()).toEqual([]);
  });
});

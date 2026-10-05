// Benefits from the VBA module "Bidrag" in the typfallsmodell: bostadstillägg för pensionärer
// (BTP), äldreförsörjningsstöd (SBTP), barnbidrag, underhållsstöd, bostadsbidrag and
// ekonomiskt bistånd. Only the rules from 2020 are ported, the years the model's taxes cover.
// The module uses Option Base 1; the arrays here are written 0-based.
import { riktage } from "./rules";
import { avdragxx, publicAvg } from "./tax";
import { int } from "./vba";

const from2020 = (year: number, what: string) => {
  if (year < 2020) throw new Error(`${what} för ${year} finns inte med`);
};

export interface BtpArgs {
  inkomst: number; // own taxable pension income (without IPT)
  inkomstm: number; // the spouse's income
  hyra: number; // boendekostnad per år
  gift: 0 | 1;
  pbb: number;
  ap: number; // 1 = ålderspensionär
  form: number; // förmögenhet utöver bostaden
  year: number;
  bald: number; // age
  garp: number;
  garpm: number;
}

/** BTP(): bostadstillägg för pensionärer for one year (rng_dela = 2: the individual's own). */
export function btp(a: BtpArgs): number {
  from2020(a.year, "Bostadstillägg");
  const { gift, pbb, year } = a;
  let hyra = a.hyra;
  const PAR = 1;
  const par2 = 0.9;
  const par3 = 0.7;
  const par4 = year >= 2022 ? 0.5 : 0;
  const maxohyra = (year >= 2022 ? 7500 : 7000) * 12;
  if (hyra > maxohyra) hyra = maxohyra;
  if (gift === 1) hyra = hyra / 2;
  // Share of the housing cost in steps: 36 000, 60 000, 84 000 (and 90 000 from 2022) kr a year.
  const k = gift === 1 ? 0.5 : 1;
  const [s1, s2, s3, s4] = [36000 * k, 60000 * k, 84000 * k, 90000 * k];
  let max: number;
  if (hyra < s1 + 1) max = hyra * PAR;
  else if (hyra < s2 + 1) max = s1 * PAR + (hyra - s1) * par2;
  else if (year < 2022 || hyra < s3 + 1)
    max = s1 * PAR + (s2 - s1) * par2 + (Math.min(hyra, s3) - s2) * par3;
  else max = s1 * PAR + (s2 - s1) * par2 + (s3 - s2) * par3 + (Math.min(hyra, s4) - s3) * par4;
  let extra = 0;
  if (year < 2022 && a.bald > 64) extra = (340 * 12) / (1 + gift);
  if (year === 2022) extra = (540 * 7 + 840 * 5) / (gift + 1);
  if (year > 2022) extra = (840 * 12) / (gift + 1);
  max += extra;
  // 15 % of the wealth above 100 000 kr counts as income. As in the VBA and the web version, a
  // wealth below 100 000 kr is kept as it is, so all of it is added to the income.
  const form = a.form > 100000 ? 0.15 * (a.form - 100000) : Math.max(a.form, 0);
  const inkomst = a.inkomst + form;
  const inkomstm = a.inkomstm + form;
  const fri = (single: number, married: number, newSingle: number, newMarried: number) => {
    if (a.ap !== 1) return 2.4 * pbb;
    const [old, nu] = gift === 1 ? [married, newMarried] : [single, newSingle];
    if (year > 2022) return nu * pbb;
    if (year === 2022) return ((7 * old + 5 * nu) * pbb) / 12;
    return old * pbb;
  };
  const f = fri(2.181, 1.951, 2.43, 2.2);
  let red = Math.max(a.garp + (inkomst - a.garp) * 0.93 - f, 0);
  if (gift === 1) {
    const redm = Math.max(a.garpm + (inkomstm - a.garpm) * 0.93 - f, 0);
    red = int((red + redm) / 2);
  }
  return Math.max(max - 0.62 * red, 0);
}

export interface SbtpArgs {
  inkomst: number;
  hyra: number; // per år (a value below 10 000 is taken as per month)
  gift: 0 | 1;
  btpb: number; // bostadstillägg + bostadsbidrag
  avdrag: number; // the year's grundavdrag
  skattesats: number; // kommunalskatt
  form: number;
  pbb: number;
  year: number;
  bald: number;
  kapital: number;
  inkomstm: number;
  born: number;
  /** The model's public variables: the age and year of the loop, IBB that year and Iyear. */
  age: number;
  ageYear: number;
  ageIBB: number;
  iyear: number;
}

/** SBTP(): särskilt bostadstillägg and äldreförsörjningsstöd (rng_dela = 2). */
export function sbtp(a: SbtpArgs): number {
  from2020(a.year, "Äldreförsörjningsstöd");
  const { gift, pbb, year, skattesats, kapital } = a;
  const bald = int(a.bald);
  let hyra = a.hyra;
  if (hyra < 10000) hyra = hyra * 12;
  const form = Math.max(0, ((a.form - 100000) * 0.15) / (gift + 1));
  const maxhyra = (7500 * 12) / (gift + 1);
  const ctxfvi = int(a.inkomst / 100) * 100;
  const ctxfvim = int(a.inkomstm / 100) * 100;
  hyra = hyra / (gift + 1);
  if (hyra > maxhyra) hyra = maxhyra;
  let lev: number;
  if (year > 2021) lev = (gift === 0 ? 1.5357 : 1.2353) * pbb;
  else lev = (gift === 0 ? 1.486 : 1.2105) * pbb;
  lev = int(lev / 12) * 12;
  // The VBA reads the grundavdrag with the rules of Iyear (the last year of the run).
  const xage = riktage(year, 1) + 1;
  const besk = ctxfvi - avdragxx(a.inkomst, pbb, bald, a.iyear, xage);
  const beskm = ctxfvim - avdragxx(a.inkomstm, pbb, bald, a.iyear, xage);
  let disp = ctxfvi - int(besk * skattesats) + int(kapital * 0.7);
  let dispm = gift === 1 ? ctxfvim - int(beskm * skattesats) + int(kapital * 0.7) : 0;
  if (a.age <= 105) {
    disp -= publicAvg(besk, a.age, a.ageYear, a.ageIBB);
    dispm -= publicAvg(beskm, a.age, a.ageYear, a.ageIBB);
  }
  if (disp < 0) disp = 0;
  if (dispm < 0) dispm = 0;
  const base = gift === 0 ? 2.13 : 1.9;
  const frinetto = int(a.born > 1937 ? base * pbb - (base * pbb - a.avdrag) * skattesats : 0);
  if (disp < frinetto) disp = frinetto;
  if (gift === 1 && dispm < frinetto) dispm = frinetto;
  disp = Math.max(disp + form - hyra + a.btpb / (gift + 1), 0);
  dispm = Math.max(dispm + form - hyra + a.btpb / (gift + 1), 0);
  const s = Math.max(lev - disp, 0);
  const sm = gift === 1 ? Math.max(lev - dispm, 0) : 0;
  // Äldreförsörjningsstöd
  let d2 = ctxfvi - int(besk * skattesats) + int(form + kapital) * 0.7 + a.btpb / (gift + 1) + s - hyra;
  if (d2 < 0) d2 = 0;
  const afs = Math.max(lev - d2, 0);
  void sm; // the spouse's part is left out with rng_dela = 2
  return s + afs;
}

/** btp_sbtp(): the sum rounded to whole kronor a month. */
export function btpSbtp(b: number, s: number): number {
  return int((b + s) / 12 + 0.5) * 12;
}

/** CalcAntalBarn(): children 0-18 years old in the year. The VBA tests barn 4 against barn 3 + 20. */
export function antalBarn(ar: number, b: number[]): number {
  const [b1, b2, b3, b4] = [0, 1, 2, 3].map((i) => b[i] ?? 1899) as [number, number, number, number];
  let n = 0;
  if (ar >= b1 && ar < b1 + 20) {
    n = 1;
    if (ar === b1 + 19) n = 0;
  }
  const add = (bk: number, upper: number) => {
    if (ar >= bk && ar < upper) {
      n += 1;
      if (ar === bk + 19) n = Math.max(n - 1, 0);
    }
  };
  add(b2, b2 + 20);
  add(b3, b3 + 20);
  add(b4, b3 + 20);
  return n;
}

/** CalcBarnPerAlder(): children by age group 0, 1-2, 3, 4-6, 7-10, 11-14, 15-18 and 19-20. */
export function barnPerAlder(ar: number, b: number[]): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0, 0];
  for (let k = 0; k < 4; k++) {
    const bk = b[k] ?? 1899;
    if (ar < bk || ar > bk + 20) continue;
    const age = ar - bk;
    const group = age === 0 ? 0 : age < 3 ? 1 : age < 4 ? 2 : age < 7 ? 3 : age < 11 ? 4 : age < 15 ? 5 : age < 19 ? 6 : 7;
    out[group]! += 1;
  }
  return out;
}

/** barnbidraget(): barnbidrag and flerbarnstillägg per year (from 2019). */
export function barnbidrag(antal: number, year: number): number {
  from2020(year, "Barnbidrag");
  const xtill = [0, 150, 580, 1010, 1250].map((x) => x * 12);
  let fb = 0;
  for (let i = 2; i <= antal; i++) fb += xtill[Math.min(i, 5) - 1]!;
  return antal * 1250 * 12 + fb;
}

/** ustod(): underhållsstöd for a single parent. */
export function ustod(barn: number, ensamst: number, year: number): number {
  if (ensamst !== 1) return 0;
  from2020(year, "Underhållsstöd");
  return (year < 2022 ? 1673 : 1823) * 12 * barn;
}

/** bobid(): bostadsbidrag for families with children (from 2017). uboende is the rent per month. */
export function bobid(vuxna: number, inkomst: number, makeInk: number, barn: number, uboende: number, year: number): number {
  from2020(year, "Bostadsbidrag");
  const xfmb = year === 2020 ? 148000 : 150000;
  if (uboende > 50000) uboende = uboende / 12;
  const ZN = [0, 1400, 1400, 1400];
  const ZM = [0, 5300, 5900, 6600];
  const ZO = ZM;
  const ZG = [0, 1300, 1750, 2350];
  const [xand1, xand2] = [0.5, 0.5];
  let ib = 0;
  const n = Math.min(3, barn);
  let zbost = 25 * int(uboende / 25);
  if (barn > 0) {
    if (zbost <= ZN[n]!) ib = 12 * ZG[n]!;
    else if (zbost <= ZM[n]!) ib = 12 * (ZG[n]! + (zbost - ZN[n]!) * xand1);
    else if (zbost <= ZO[n]!) ib = 12 * (ZG[n]! + (ZM[n]! - ZN[n]!) * xand1 + (zbost - ZM[n]!) * xand2);
    else ib = 12 * (ZG[n]! + (ZM[n]! - ZN[n]!) * xand1 + (ZO[n]! - ZM[n]!) * xand2);
  }
  if (vuxna === 1) {
    if (inkomst > xfmb && ib > 0) ib -= 0.2 * (inkomst - xfmb);
  } else {
    if (inkomst > xfmb / 2 && ib > 0) ib -= 0.2 * (inkomst - xfmb / 2);
    if (makeInk > xfmb / 2 && ib > 0) ib -= 0.2 * (makeInk - xfmb / 2);
  }
  if (ib < 0) ib = 0;
  if (ib > 12 * uboende) ib = uboende * 12;
  if (ib > 0 && year === 2020) ib = ib + ib * 0.25 * (6 / 12);
  if (ib < 1200) ib = 0;
  ib = int(ib / 12 / 100) * 100;
  void zbost;
  return 12 * ib;
}

const BIST: Record<number, { xn: number[]; vuxna: number[]; gn: number[] }> = {
  2020: { xn: [2170, 2430, 2160, 2430, 3050, 3510, 3950, 3980], vuxna: [3150, 5680], gn: [1010, 1120, 1410, 1600, 1850, 2090, 2260] },
  2021: { xn: [2180, 2440, 2170, 2440, 3060, 3520, 3970, 4000], vuxna: [3160, 5700], gn: [1020, 1130, 1420, 1610, 1860, 2100, 2270] },
  2022: { xn: [2220, 2480, 2210, 2480, 3110, 3580, 4040, 4070], vuxna: [3210, 5800], gn: [1040, 1150, 1450, 1640, 1890, 2140, 2310] },
  2023: { xn: [2420, 2700, 2410, 2700, 3380, 3890, 4390, 4430], vuxna: [3490, 6300], gn: [1130, 1250, 1580, 1790, 2060, 2330, 2510] },
  2024: { xn: [2640, 2940, 2620, 2940, 3680, 4230, 4780, 4820], vuxna: [3800, 6850], gn: [1230, 1360, 1720, 1950, 2240, 2540, 2730] },
  2025: { xn: [2720, 3030, 2700, 3030, 3790, 4350, 4920, 4960], vuxna: [3910, 7500], gn: [1270, 1400, 1770, 2010, 2310, 2620, 2810] },
};

/**
 * bist25(): ekonomiskt bistånd per year. civ is 1 for a single person and 2 for a couple, kids the
 * children by age group, kpiRatio KPI(age) / KPI(2025) for the norms after 2025.
 */
export function bist25(civ: number, hyra: number, disp: number, kids: number[], wage: number, year: number, kpiRatio: number): number {
  from2020(year, "Ekonomiskt bistånd");
  const t = BIST[Math.min(year, 2025)]!;
  let bistand = 0;
  let antal = 0;
  for (let i = 0; i < 8; i++) {
    bistand += t.xn[i]! * kids[i]!;
    antal += kids[i]!;
  }
  antal += civ;
  bistand += civ === 1 ? t.vuxna[0]! : t.vuxna[1]!;
  const flera = t.gn[6]! - t.gn[5]!;
  bistand += antal > 7 ? t.gn[6]! + flera * (antal - 7) : t.gn[antal - 1]!;
  const just = year > 2025 ? kpiRatio : 1;
  bistand = bistand * just + hyra;
  disp = disp - wage * 0.25;
  if (disp < bistand * 12) return int(12 * bistand - disp + 0.5);
  return 0;
}

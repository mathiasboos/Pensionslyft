// Nettolönkalkylatorn: the calculation and the rules for income year 2026, ported from Net_Salary_2026.html in
// github.com/mathiasboos/Calculators, which is the up-to-date source. The figures, the rounding and the order of the
// arithmetic are the original's, so that the results are the same to the krona (tests/nettolon.test.ts compares
// them with what the original shows). The rules are to be checked every December, see CLAUDE.md in that repository.
import { num } from "./format";

// ── Rules for 2026 ──
export const PBB = 59200; // prisbasbelopp
export const IBB = 83400; // inkomstbasbelopp
export const SKIKT = 643000; // state income tax starts above this taxable income
export const PENS_TAK = 673038; // ceiling of the income the general pension charge is paid on
export const PENS_FRI = 25042; // below this income there is no pension charge
const PS_BASE = 1.42 * IBB; // 118 428
export const PS_MAX = Math.floor(0.01 * PS_BASE); // 1 184
export const BRYT_UNDER = 660400; // skiktgräns + grundavdrag, under 66
export const BRYT_OVER = 760500; // skiktgräns + förhöjt grundavdrag, 66 and over
const KAP_SKATT = 0.3; // tax on a surplus of capital
const KAP_RED1 = 0.3; // tax reduction for a deficit of capital, up to 100 000
const KAP_RED2 = 0.21; // … and on what is above
const KAP_BRYT = 100000;
const ROT_SATS = 0.3; // ROT, 30 % of the labour cost
const RUT_SATS = 0.5; // RUT, 50 %
const ROT_MAX = 50000;
const RUT_MAX = 75000;
const HUS_MAX = 75000; // ROT and RUT together, of which ROT at most 50 000
const AKT_KVOT = 0.7; // an unmatched loss on shares counts for 70 %
const ISK_FRI = 300000; // free amount of ISK and kapitalförsäkring, per person
const ISK_SCHABLON = 0.0355; // 2026: government borrowing rate 30 Nov 2025 (2,55 %) + 1 percentage point
const ISK_GOLV = 0.0125;
const FAST_SATS = 0.0075; // municipal property fee
const FAST_TAK = 10425; // ceiling for a house, income year 2026
const FAST_SPARR = 4042; // lowest cap for pensioners

// ── Defaults and the choices of the controls ──
export const DEFAULTS = {
  lon: 40000,
  kommun: 32.4,
  vaxling: 0,
  pension: 0,
  over66: false,
  kyrkaOn: true,
  kyrkaPct: 1,
  begrOn: true,
  begrPct: 0.292,
  kapInk: 0,
  iskUnderlag: 0,
  aktievinst: 0,
  aktieforlust: 0,
  rantUtg: 0,
  rotArb: 0,
  rutArb: 0,
  taxvarde: 0,
  nybyggt: false,
};

/** The three regimes of the funeral fee: Svenska kyrkan in most of the country, Stockholm and Tranås. */
export const BEGRAVNING = [
  { value: 0.292, label: "Övriga Sverige (Svenska kyrkan) — 0,292 %" },
  { value: 0.07, label: "Stockholms stad — 0,07 %" },
  { value: 0.285, label: "Tranås kommun — 0,285 %" },
] as const;

// ── Helpers, as in the original ──
const ceil100 = (n: number) => Math.ceil(n / 100) * 100;
const floor100 = (n: number) => Math.floor(n / 100) * 100;

/** Rounds to whole 100, but .50 down (the general pension charge). */
function round100pens(n: number): number {
  const h = n / 100;
  const f = Math.floor(h);
  return (h - f <= 0.5 ? f : f + 1) * 100;
}

/** kronor as in the original: rounded, with thousands separators */
export const fmt = (n: number) => num.format(Math.round(n));

/** A rate typed in a field as it is written: 32.4 -> "32,4" */
export const fmtRate = (n: number) => String(n).replace(".", ",");

// ── Grundavdrag ──
function ordinaryGrundavdrag(ffi: number): number {
  if (ffi <= 0.99 * PBB) return 0.423 * PBB;
  if (ffi <= 2.72 * PBB) return 0.423 * PBB + 0.2 * (ffi - 0.99 * PBB);
  if (ffi <= 3.11 * PBB) return 0.77 * PBB;
  if (ffi <= 7.88 * PBB) return 0.77 * PBB - 0.1 * (ffi - 3.11 * PBB);
  return 0.293 * PBB;
}

export function grundavdragUnder(ffi: number): number {
  return ceil100(Math.min(ordinaryGrundavdrag(ffi), ffi));
}

/** The raised grundavdrag from 66: the ordinary one plus the raised part, the sum rounded up to 100. */
export function grundavdragOver(ffi: number): number {
  const ord = ordinaryGrundavdrag(ffi);
  let f: number;
  if (ffi <= 0.91 * PBB) f = 0.687 * PBB;
  else if (ffi <= 1.11 * PBB) f = 0.885 * PBB - ffi * 0.2;
  else if (ffi <= 1.965 * PBB) f = 0.6 * PBB + ffi * 0.057;
  else if (ffi <= 2.72 * PBB) f = 0.333 * PBB + ffi * 0.1949;
  else if (ffi <= 3.11 * PBB) f = ffi * 0.3949 - 0.212 * PBB;
  else if (ffi <= 3.24 * PBB) f = ffi * 0.4949 - 0.523 * PBB;
  else if (ffi <= 5.0 * PBB) f = ffi * 0.356 - 0.073 * PBB;
  else if (ffi <= 7.88 * PBB) f = 0.017 * PBB + ffi * 0.338;
  else if (ffi <= 8.08 * PBB) f = 0.703 * PBB + ffi * 0.251;
  else if (ffi <= 11.16 * PBB) f = 2.732 * PBB;
  else if (ffi <= 12.84 * PBB) f = 9.651 * PBB - ffi * 0.62;
  else f = 1.691 * PBB;
  return ceil100(Math.min(ord + f, ffi));
}

// ── Jobbskatteavdrag ──
function jobbavdragUnder(ai: number, ga: number, ki: number): number {
  let r: number;
  if (ai <= 0.91 * PBB) r = (ai - ga) * ki;
  else if (ai <= 3.24 * PBB) r = (0.91 * PBB + 0.3874 * (ai - 0.91 * PBB) - ga) * ki;
  else if (ai <= 8.08 * PBB) r = (1.813 * PBB + 0.251 * (ai - 3.24 * PBB) - ga) * ki;
  else r = (3.027 * PBB - ga) * ki;
  return Math.max(0, Math.floor(r));
}

function jobbavdragOver(ai: number): number {
  let r: number;
  if (ai <= 1.75 * PBB) r = ai * 0.22;
  else if (ai <= 5.24 * PBB) r = 0.2635 * PBB + 0.07 * ai;
  else r = 0.6293 * PBB;
  return Math.max(0, Math.floor(r));
}

// ── The calculation ──
export interface NettolonInput {
  lon: number; // monthly salary before tax
  kommun: number; // municipal tax rate, percent
  vaxling: number; // gross salary deduction a month (salary exchange, car, bike …)
  pension: number; // pension income a month
  over66: boolean; // 66 or older at the start of the year
  kyrkaOn: boolean;
  kyrkaPct: number;
  begrOn: boolean;
  begrPct: number;
  kapInk: number; // interest and dividends a year
  iskUnderlag: number; // capital in ISK and kapitalförsäkring
  aktievinst: number;
  aktieforlust: number;
  rantUtg: number; // deductible interest a year
  rotArb: number;
  rutArb: number;
  taxvarde: number; // taxable value of a house
  nybyggt: boolean;
}

export interface NettolonResult {
  arslon: number;
  vaxAr: number;
  pensAr: number;
  arbInk: number;
  ffi: number;
  ga: number;
  bfi: number;
  kommunal: number;
  statlig: number;
  jobb: number;
  kyrkaKr: number;
  begrKr: number;
  ps: number;
  forvAnv: number;
  pensAvg: number;
  pensRed: number;
  totalSkatt: number;
  netto: number;
  lon: number;
  vaxM: number;
  pensM: number;
  kapInk: number;
  rantUtg: number;
  aktieV: number;
  aktieF: number;
  aktieKvoterad: number;
  netKap: number;
  kapOver: number;
  kapSkatt: number;
  kapRed: number;
  iskUnd: number;
  iskSchablon: number;
  rotShow: number;
  rutShow: number;
  hus: number;
  brutto: number;
  fastBrutto: number;
  fastPensRed: number;
  fastNet: number;
  taxv: number;
  nybyggt: boolean;
}

/** A field that is empty or not a number counts as 0, and nothing is negative. */
const pos = (v: number) => Math.max(0, +v || 0);

export function calcNettolon(input: NettolonInput): NettolonResult {
  const lon = pos(input.lon);
  const vaxM = pos(input.vaxling);
  const pensM = pos(input.pension);
  const ki = pos(input.kommun) / 100;
  const kyrka = input.kyrkaOn ? pos(input.kyrkaPct) / 100 : 0;
  const begr = input.begrOn ? pos(input.begrPct) / 100 : 0;
  const over = input.over66;

  const arslon = lon * 12;
  const vaxAr = vaxM * 12;
  const pensAr = pensM * 12;
  const arbInk = Math.max(0, arslon - vaxAr); // earned income after the salary deduction
  const ffi = Math.max(0, arbInk + pensAr); // fastställd förvärvsinkomst: salary and pension
  const ga = over ? grundavdragOver(ffi) : grundavdragUnder(ffi);
  const bfi = Math.max(0, ffi - ga); // beskattningsbar förvärvsinkomst

  // Skatteverket: the öre are dropped on the municipal tax, the state tax is exact
  const kommunal = Math.floor(bfi * ki);
  const statlig = bfi > SKIKT ? Math.floor(0.2 * (bfi - SKIKT)) : 0;

  // The general pension charge: 7 % of the earned income (not the pension), with a tax reduction of 100 %
  let pensAvg = 0;
  if (arbInk >= PENS_FRI) {
    pensAvg = round100pens(0.07 * Math.min(arbInk, PENS_TAK));
  }
  const pensRed = Math.min(pensAvg, statlig + kommunal);

  // Jobbskatteavdrag: on the earned income (not the pension), but with the whole grundavdrag
  const ai = floor100(arbInk);
  const jobb = arbInk <= 0 ? 0 : over ? jobbavdragOver(ai) : jobbavdragUnder(ai, ga, ki);

  // The order: the municipal tax is reduced by the part of the pension reduction, then the jobbskatteavdrag,
  // then the reduction for earned income
  let kommKvar = kommunal - Math.max(0, pensRed - statlig);
  const jobbAnv = Math.min(jobb, Math.max(0, kommKvar));
  kommKvar -= jobbAnv;

  // Skattereduktion för förvärvsinkomst
  let forvRed = 0;
  if (bfi > 40000) forvRed = bfi >= 240000 ? 1500 : Math.floor((bfi - 40000) * 0.0075);
  const forvAnv = Math.min(forvRed, Math.max(0, kommKvar));

  // Public service fee
  const ps = Math.min(Math.floor(0.01 * bfi), PS_MAX);

  const kyrkaKr = Math.floor(bfi * kyrka);
  const begrKr = Math.floor(bfi * begr);

  // ── Income from capital (the pool of shares and the 70 % rule) ──
  const kapInk = pos(input.kapInk); // interest and dividends
  const iskUnd = pos(input.iskUnderlag);
  const aktieV = pos(input.aktievinst);
  const aktieF = pos(input.aktieforlust);
  const rantUtg = pos(input.rantUtg);
  // ISK and kapitalförsäkring: (capital − free amount) × the rate, the öre dropped
  const iskSchablon = Math.floor(Math.max(0, iskUnd - ISK_FRI) * Math.max(ISK_SCHABLON, ISK_GOLV) + 1e-6);
  const aktieNet = aktieV - aktieF; // gains and losses are matched in the pool
  const aktieKap = aktieNet >= 0 ? aktieNet : -AKT_KVOT * -aktieNet; // an unmatched loss counts for 70 %
  const aktieKvoterad = aktieNet < 0 ? Math.round(AKT_KVOT * -aktieNet) : 0;
  const netKap = kapInk + iskSchablon + aktieKap - rantUtg;
  const kapOver = Math.max(0, netKap);
  let kapSkatt = 0;
  let kapRed = 0;
  if (netKap >= 0) {
    kapSkatt = Math.floor(KAP_SKATT * netKap); // 30 % on a surplus
  } else {
    const u = -netKap; // deficit of capital
    kapRed = Math.floor(KAP_RED1 * Math.min(u, KAP_BRYT) + KAP_RED2 * Math.max(0, u - KAP_BRYT));
  }

  // ── ROT and RUT ──
  const rotArb = pos(input.rotArb);
  const rutArb = pos(input.rutArb);
  const rotRaw = Math.min(Math.floor(ROT_SATS * rotArb), ROT_MAX);
  const rutRaw = Math.min(Math.floor(RUT_SATS * rutArb), RUT_MAX);
  const rotCap = Math.min(rotRaw, ROT_MAX);
  const rutCap = Math.min(rutRaw, Math.max(0, HUS_MAX - rotCap)); // the common ceiling
  const husCap = rotCap + rutCap;

  // ── Municipal property fee ──
  const taxv = pos(input.taxvarde);
  const nybyggt = input.nybyggt;
  const fastBrutto = taxv <= 0 || nybyggt ? 0 : Math.min(Math.floor(FAST_SATS * taxv), FAST_TAK);
  // The limit for pensioners: the fee is at most 4 % of the income plus the surplus of capital, but not below the cap
  let fastPensRed = 0;
  if (over && fastBrutto > 0) {
    const sparr = Math.max(Math.floor(0.04 * (bfi + kapOver)), FAST_SPARR);
    fastPensRed = Math.max(0, fastBrutto - sparr);
  }
  const fastNet = fastBrutto - fastPensRed;

  // ── The order of the reductions (Skatteverket) ──
  // 1 the reduction of the property fee (pensioners), against the fee itself
  // 2 the pension charge, 3 jobbskatteavdrag, 4 earned income: done above, against the tax on earned income
  const statligKvar = Math.max(0, statlig - pensRed);
  let pool = statligKvar + Math.max(0, kommKvar) + kapSkatt + fastNet; // the property fee is in the pool
  // 5 deficit of capital
  const kapRedAnv = Math.min(kapRed, pool);
  pool -= kapRedAnv;
  // 6 ROT and RUT: not against the funeral fee, the church fee or the general pension charge
  const husAnv = Math.min(husCap, Math.max(0, pool));
  let rotShow = rotCap;
  let rutShow = rutCap;
  if (husCap > 0 && husAnv < husCap) {
    // scaled down in proportion
    rotShow = Math.round((rotCap * husAnv) / husCap);
    rutShow = husAnv - rotShow;
  }

  const totalSkatt =
    statlig + kommunal + kapSkatt + pensAvg + kyrkaKr + begrKr + ps + fastNet - pensRed - jobbAnv - forvAnv - kapRedAnv - husAnv;
  const brutto = ffi + kapOver;
  const netto = brutto - totalSkatt;

  return {
    arslon, vaxAr, pensAr, arbInk, ffi, ga, bfi, kommunal, statlig, jobb: jobbAnv,
    kyrkaKr, begrKr, ps, forvAnv, pensAvg, pensRed, totalSkatt, netto, lon, vaxM, pensM,
    kapInk, rantUtg, aktieV, aktieF, aktieKvoterad, netKap, kapOver, kapSkatt, kapRed: kapRedAnv,
    iskUnd, iskSchablon,
    rotShow, rutShow, hus: husAnv, brutto,
    fastBrutto, fastPensRed, fastNet, taxv, nybyggt,
  };
}

// ── What the page shows ──
export interface BrytNote {
  /** true when state tax is paid */
  over: boolean;
  bryt: number; // a year
  brytM: number; // a month
  /** kronor a month above or below the brytpunkt */
  diffM: number;
}

export interface Row {
  n: number | "";
  name: string;
  sub: string;
  m: number;
  y: number;
  cls: "gross" | "sumrow" | "netrow" | "minus" | "";
}

export interface NettolonView {
  result: NettolonResult;
  netMonth: string;
  netYear: string;
  vaxYear: string;
  totTax: string;
  effRate: string;
  margRate: string;
  /** shares of the gross income, percent */
  bar: { net: number; tax: number; vax: number };
  bryt: BrytNote;
  rows: Row[];
}

const NBSP = " ";

export function nettolonView(input: NettolonInput): NettolonView {
  const r = calcNettolon(input);
  const M = (v: number) => fmt(v / 12);

  const eff = r.brutto > 0 ? (r.totalSkatt / r.brutto) * 100 : 0;

  // Marginal tax: the difference in tax for 1 000 kr more a month
  const r2 = calcNettolon({ ...input, lon: input.lon + 1000 });
  const dGross = r2.arslon - r.arslon;
  const marg = dGross > 0 ? ((r2.totalSkatt - r.totalSkatt) / dGross) * 100 : 0;

  // The bar: of the whole income, salary and pension
  const gross = r.arslon + r.pensAr || 1;
  const wNet = Math.max(0, (r.netto / gross) * 100);
  const wVax = Math.max(0, (r.vaxAr / gross) * 100);
  const wTax = Math.max(0, 100 - wNet - wVax);

  // The brytpunkt for state tax is compared with the earned income (salary after the deduction, and pension)
  const bryt = input.over66 ? BRYT_OVER : BRYT_UNDER;
  const brytNote: BrytNote = {
    over: r.statlig > 0,
    bryt,
    brytM: Math.round(bryt / 12),
    diffM: r.statlig > 0 ? (r.ffi - bryt) / 12 : (bryt - r.ffi) / 12,
  };

  const pensNote = r.pensAvg > 0 ? ` (avgift ${fmt(r.pensAvg / 12)} − reduktion ${fmt(r.pensRed / 12)})` : "";
  const hasKap = r.kapInk > 0 || r.rantUtg > 0 || r.aktieV > 0 || r.aktieF > 0 || r.iskUnd > 0;
  const hasHus = r.rotShow > 0 || r.rutShow > 0;
  const hasFast = r.fastBrutto > 0 || r.taxv > 0;
  const kapSub =
    r.aktieKvoterad > 0
      ? `okvittad aktieförlust kvoterad till 70 % (${fmt(r.aktieKvoterad)} kr)`
      : r.iskSchablon > 0
        ? "inkl. ISK/KF-schablonintäkt"
        : "ränta, utdelning, aktievinst";

  const rows: Row[] = [
    { n: "", name: "Brutto månadslön", sub: "Indata", m: r.lon, y: r.arslon, cls: "gross" },
    { n: "", name: "Årsinkomst lön", sub: "bruttolön × 12", m: r.arslon / 12, y: r.arslon, cls: "" },
    { n: "", name: "Bruttolöneavdrag", sub: "löneväxling, bil m.m. – före skatt", m: -r.vaxM, y: -r.vaxAr, cls: "minus" },
    { n: "", name: "Pensionsinkomst", sub: "skattepliktig, utbetald pension", m: r.pensAr / 12, y: r.pensAr, cls: "" },
    { n: "", name: "Fastställd förvärvsinkomst", sub: "FFI = lön − bruttolöneavdrag + pension", m: r.ffi / 12, y: r.ffi, cls: "sumrow" },
    {
      n: "",
      name: "Grundavdrag",
      sub: input.over66 ? "förhöjt grundavdrag (66+)" : "ordinarie, baserat på FFI",
      m: -r.ga / 12,
      y: -r.ga,
      cls: "minus",
    },
    { n: "", name: "Beskattningsbar inkomst", sub: "BFI = FFI − grundavdrag", m: r.bfi / 12, y: r.bfi, cls: "sumrow" },
    {
      n: "",
      name: "Kommunalskatt",
      sub: `BFI × ${fmtRate(input.kommun)} % (öretal bortfaller)`,
      m: -r.kommunal / 12,
      y: -r.kommunal,
      cls: "minus",
    },
    { n: "", name: "Statlig skatt", sub: `20 % över brytpunkt ${fmt(bryt)} kr/år`, m: -r.statlig / 12, y: -r.statlig, cls: "minus" },
  ];
  if (r.iskUnd > 0) {
    rows.push({
      n: "",
      name: "ISK/KF schablonintäkt",
      sub: `(${fmt(r.iskUnd)} − 300 000) × 3,55 % → kapitalinkomst`,
      m: r.iskSchablon / 12,
      y: r.iskSchablon,
      cls: "",
    });
  }
  if (hasKap && r.netKap > 0) {
    rows.push({
      n: "",
      name: "Skatt på kapitalöverskott",
      sub: `30 % av ${fmt(r.netKap)} kr — ${kapSub}`,
      m: -r.kapSkatt / 12,
      y: -r.kapSkatt,
      cls: "minus",
    });
  }
  if (hasFast) {
    rows.push({
      n: "",
      name: "Fastighetsavgift",
      sub: r.nybyggt
        ? "nybyggt – avgiftsfritt i 15 år"
        : r.fastBrutto >= FAST_TAK
          ? "takbelopp 10 425 kr (0,75 % > tak)"
          : `0,75 % av ${fmt(r.taxv)} kr`,
      m: -r.fastBrutto / 12,
      y: -r.fastBrutto,
      cls: r.fastBrutto ? "minus" : "",
    });
  }
  rows.push(
    { n: "", name: "Jobbskatteavdrag", sub: "endast på arbetsinkomst, ej pension", m: r.jobb / 12, y: r.jobb, cls: "" },
    { n: "", name: "Skattereduktion förvärvsinkomst", sub: "0,75 % över 40 000, max 1 500", m: r.forvAnv / 12, y: r.forvAnv, cls: "" },
    {
      n: "",
      name: "Allmän pensionsavgift",
      sub: "7 % av arbetsinkomst − 100 % red." + pensNote,
      m: -(r.pensAvg - r.pensRed) / 12,
      y: -(r.pensAvg - r.pensRed),
      cls: r.pensAvg - r.pensRed > 0 ? "minus" : "",
    },
  );
  if (r.fastPensRed > 0) {
    rows.push({
      n: "",
      name: "Skattered. fastighetsavgift",
      sub: "pensionärsspärr: 4 % av inkomst, min 4 042",
      m: r.fastPensRed / 12,
      y: r.fastPensRed,
      cls: "",
    });
  }
  if (hasKap && r.netKap < 0) {
    rows.push({
      n: "",
      name: "Skattered. underskott kapital",
      sub: `30 % ≤100 000, 21 % däröver (underskott ${fmt(-r.netKap)} kr)`,
      m: r.kapRed / 12,
      y: r.kapRed,
      cls: "",
    });
  }
  if (hasHus) {
    rows.push({
      n: "",
      name: "ROT-/RUT-avdrag",
      sub: "hushållsarbete – tak 75 000 kr (ROT max 50 000)",
      m: (r.rotShow + r.rutShow) / 12,
      y: r.rotShow + r.rutShow,
      cls: "",
    });
  }
  rows.push(
    {
      n: "",
      name: "Kyrkoavgift",
      sub: input.kyrkaOn ? `BFI × ${fmtRate(input.kyrkaPct)} %` : "ej medlem",
      m: -r.kyrkaKr / 12,
      y: -r.kyrkaKr,
      cls: r.kyrkaKr ? "minus" : "",
    },
    {
      n: "",
      name: "Begravningsavgift",
      sub: input.begrOn ? `BFI × ${fmtRate(input.begrPct)} %` : "—",
      m: -r.begrKr / 12,
      y: -r.begrKr,
      cls: r.begrKr ? "minus" : "",
    },
    { n: "", name: "Public service-avgift", sub: "1 % av BFI, max 1 184", m: -r.ps / 12, y: -r.ps, cls: "minus" },
    {
      n: "",
      name: "Netto i handen",
      sub: hasKap || hasFast ? "inkomst − total skatt & avgift" : "lön + pension efter skatt",
      m: r.netto / 12,
      y: r.netto,
      cls: "netrow",
    },
  );
  // numbered in order, except the net row
  let c = 0;
  for (const x of rows) x.n = x.cls === "netrow" ? "" : ++c;

  return {
    result: r,
    netMonth: M(r.netto),
    netYear: fmt(r.netto),
    vaxYear: fmt(r.vaxAr),
    totTax: `${M(r.totalSkatt)} kr`,
    effRate: `${eff.toFixed(1).replace(".", ",")}${NBSP}%`,
    margRate: `${marg.toFixed(1).replace(".", ",")}${NBSP}%`,
    bar: { net: wNet, tax: wTax, vax: wVax },
    bryt: brytNote,
    rows,
  };
}

/** The text of the two amount cells of a row of the table: with a sign, except for the sums. */
export function rowCells(x: Row): { m: string; y: string } {
  const sum = x.cls === "gross" || x.cls === "sumrow" || x.cls === "netrow";
  const sign = (v: number) => (v > 0 ? "+" : v < 0 ? "−" : "");
  return {
    m: sum ? fmt(Math.abs(x.m)) : sign(x.m) + fmt(Math.abs(x.m)),
    y: sum ? fmt(Math.abs(x.y)) : sign(x.y) + fmt(Math.abs(x.y)),
  };
}

/** The sentence about the brytpunkt, as plain text. */
export function brytText(b: BrytNote): string {
  const head = `Brytpunkt statlig skatt: ${fmt(b.bryt)} kr/år (≈ ${fmt(b.brytM)} kr/mån). `;
  return b.over
    ? `${head}Din förvärvsinkomst ligger ${fmt(b.diffM)} kr/mån över — 20 % statlig skatt på den delen.`
    : `${head}Du ligger ${fmt(b.diffM)} kr/mån under — ingen statlig skatt.`;
}

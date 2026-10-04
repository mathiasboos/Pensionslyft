// Index series by calendar year, as the sheets "Några tal" and "Nyckeltal" compute them.
// Years up to 2026 are the model's data; later years follow the sheet formulas with the
// user's real growth and return. Inflation is fixed at 0 %, so all amounts are in fixed prices.
import { data } from "./data";
import { excelRound, int } from "./vba";

export const LAST_YEAR = 2125;

export interface Series {
  first: number;
  KPIj: number[]; // KPI junidata
  KPI: number[]; // KPI årsmedeltal
  PBB: number[];
  MPGI: number[];
  IBB: number[];
  FPB: number[];
  Iindex: number[];
  Pindex: number[]; // Gällande index (balansindex)
  ipAvg: number[]; // kvar efter administrationsavgift, inkomstpension
  ppAvg: number[]; // kvar efter avgift, premiepension
  yieldQ: number[]; // fondavkastning (andel)
  rgkPct: number[]; // räntan hos Riksgälden, procent
  taxLimit1: number[];
  taxLimit2: number[];
  komSkatt: number[]; // procent
  begravning: number[]; // procent
}

/** VBA Balansindex() with balanstal 1 and two-decimal rounding. */
export function balansindex(bi: number, btal: number, ital1: number, ital2: number): number {
  let b = 0;
  if (bi === 0) {
    if (btal < 1) b = btal * ital1;
  } else {
    b = (btal * bi * ital1) / ital2;
  }
  if (b > ital1) b = ital1;
  return int(b * 100 + 0.49) / 100;
}

export function buildSeries(realGrowth: number, realReturn: number): Series {
  const inflation = 0;
  const first = data.firstYear;
  const lastHard = data.lastHardYear;
  const n = LAST_YEAR - first + 1;
  const pick = (key: string) => {
    const src = data.years[key]!;
    return Array.from({ length: n }, (_, i) => src[i] ?? NaN);
  };
  const s: Series = {
    first,
    KPIj: pick("KPIj"),
    KPI: pick("KPI"),
    PBB: pick("PBB"),
    MPGI: pick("MPGI"),
    IBB: pick("IBB"),
    FPB: pick("FPB"),
    Iindex: pick("Iindex"),
    Pindex: pick("Pindex"),
    ipAvg: pick("ipAvg"),
    ppAvg: pick("ppAvg"),
    yieldQ: pick("yield"),
    rgkPct: pick("rgk"),
    taxLimit1: pick("taxLimit1"),
    taxLimit2: Array.from({ length: n }, () => 1e16),
    komSkatt: [],
    begravning: [],
  };
  const i = (year: number) => year - first;

  // Index projection, rows 2027.. in "Några tal".
  for (let y = lastHard + 1; y <= LAST_YEAR; y++) {
    s.KPIj[i(y)] = excelRound(s.KPIj[i(y - 1)]! * (1 + inflation), 2);
    s.KPI[i(y)] = excelRound(s.KPI[i(y - 1)]! * (1 + inflation), 2);
    s.PBB[i(y)] = excelRound((36396 * s.KPIj[i(y - 1)]!) / 257.38, -2);
    s.FPB[i(y)] = excelRound((s.KPIj[i(y - 1)]! / 257.38) * 37144, -2);
    s.Iindex[i(y)] = s.Iindex[i(y - 1)]! * (1 + realGrowth) * (1 + inflation);
    s.ipAvg[i(y)] = s.ipAvg[i(y - 1)]!;
    s.ppAvg[i(y)] = 1;
  }
  // IBB uses the following year's income index (G74 = ROUND((I75/I52)*G4, -2)).
  for (let y = lastHard + 1; y <= LAST_YEAR; y++) {
    const next = s.Iindex[i(y + 1)] ?? s.Iindex[i(y)]! * (1 + realGrowth);
    s.IBB[i(y)] = excelRound((next / 118.41) * 43313, -2);
    s.MPGI[i(y)] = (s.MPGI[i(y - 1)]! * s.Iindex[i(y)]!) / s.Iindex[i(y - 1)]!;
    s.Pindex[i(y)] = balansindex(s.Pindex[i(y - 1)]!, 1, s.Iindex[i(y)]!, s.Iindex[i(y - 1)]!);
    // Skiktgräns for statlig skatt: KPI + 2 % (Några tal AC74 and on).
    s.taxLimit1[i(y)] =
      int((s.taxLimit1[i(y - 1)]! * (s.KPIj[i(y - 1)]! / s.KPIj[i(y - 2)]! + 0.02)) / 100 + 51) * 100;
  }
  // Fund return from 2026 and Riksgälden's rate from 2025 follow the user's assumptions.
  const rgk = ((1 + inflation) * (1 + realGrowth) * 1.01 - 1) * 100;
  for (let y = first; y <= LAST_YEAR; y++) {
    if (y >= 2026) s.yieldQ[i(y)] = (1 + realReturn) * (1 + inflation) - 1;
    if (y >= 2025) s.rgkPct[i(y)] = rgk;
  }

  // Municipal tax and burial fee: data to 2026, then unchanged.
  const tf = data.taxFirstYear;
  for (let y = first; y <= LAST_YEAR; y++) {
    const k = Math.min(y, lastHard) - tf;
    s.komSkatt[i(y)] = data.komSkatt[k] ?? NaN;
    s.begravning[i(y)] = data.begravning[k] ?? NaN;
  }
  return s;
}

export function at(series: number[], s: Series, year: number): number {
  const v = series[year - s.first];
  if (v === undefined) throw new Error(`År ${year} saknas i indexserierna`);
  return v;
}

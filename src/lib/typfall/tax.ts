// Income tax rules from the VBA module "Skatteregler", for income years 2020 and later.
// Earlier years are not ported; the model only needs them for years the calculator doesn't show.
import { int } from "./vba";

/** Xage(): the age from which the higher grundavdrag and jobbskatteavdrag for older people apply. */
export function xage(year: number, riktage: number): number {
  if (year <= 2023) return 66;
  if (year <= 2026) return 67;
  if (year <= 2028) return 68;
  return riktage + 1;
}

function basicAvdrag(inkomst: number, pbb: number, rules: number): number {
  if (rules === 2024) {
    if (inkomst <= 0.99 * pbb) return 0.423 * pbb;
    if (inkomst <= 2.72 * pbb) return 0.225 * pbb + 0.2 * inkomst;
    if (inkomst <= 3.11 * pbb) return 0.77 * pbb;
    if (inkomst <= 7.88 * pbb) return 1.081 * pbb - 0.1 * inkomst;
    return 0.293 * pbb;
  }
  if (inkomst <= 0.99 * pbb) return 0.423 * pbb;
  if (inkomst <= 2.72 * pbb) return 0.423 * pbb + 0.2 * (inkomst - 0.99 * pbb);
  if (inkomst <= 3.11 * pbb) return 0.77 * pbb;
  if (inkomst <= 7.88 * pbb) return 0.77 * pbb - 0.1 * (inkomst - 3.11 * pbb);
  return 0.293 * pbb;
}

/** The extra grundavdrag for older people, per rule year (avdrag20..avdrag26). */
function extraAvdrag(i: number, p: number, rules: number): number {
  if (rules === 2020) {
    if (i <= 0.99 * p) return 0.687 * p;
    if (i <= 1.11 * p) return 0.885 * p - 0.2 * i;
    if (i <= 2.72 * p) return 0.6 * p + 0.057 * i;
    if (i <= 3.11 * p) return -0.169 * p + 0.34 * i;
    if (i <= 3.21 * p) return -0.48 * p + 0.44 * i;
    if (i <= 4.45 * p) return 0.207 * p + 0.228 * i;
    if (i <= 7.88 * p) return 0.488 * p + 0.165 * i;
    if (i <= 8.08 * p) return 1.276 * p + 0.065 * i;
    if (i <= 11.06 * p) return 2.205 * p - 0.05 * i;
    if (i <= 12.15 * p) return 7.182 * p - 0.5 * i;
    if (i <= 29.65 * p) return 1.654 * p - 0.045 * i;
    if (i <= 34 * p) return 1.031 * p - 0.024 * i;
    return 0.215 * p;
  }
  if (rules === 2021) {
    if (i <= 0.99 * p) return 0.687 * p;
    if (i <= 1.11 * p) return 0.885 * p - 0.2 * i;
    if (i <= 2.72 * p) return 0.6 * p + 0.057 * i;
    if (i <= 3.11 * p) return -0.169 * p + 0.34 * i;
    if (i <= 3.21 * p) return -0.48 * p + 0.44 * i;
    if (i <= 7.88 * p) return 0.207 * p + 0.228 * i;
    if (i <= 8.08 * p) return 0.995 * p + 0.128 * i;
    if (i <= 11.28 * p) return 2.029 * p;
    if (i <= 12.53 * p) return 9.023 * p - 0.62 * i;
    if (i <= 13.54 * p) return 1.253 * p;
    if (i <= 35.36 * p) return 2.03 * p - 0.0574 * i;
    return 0;
  }
  if (rules === 2022) {
    if (i <= 0.91 * p) return 0.687 * p;
    if (i <= 1.11 * p) return 0.885 * p - 0.2 * i;
    if (i <= 1.965 * p) return 0.6 * p + 0.057 * i;
    if (i <= 2.72 * p) return 0.333 * p + 0.1949 * i;
    if (i <= 3.11 * p) return -0.212 * p + 0.3949 * i;
    if (i <= 3.24 * p) return -0.523 * p + 0.4949 * i;
    if (i <= 5.53 * p) return 0.325 * p + 0.233 * i;
    if (i <= 7.88 * p) return 0.441 * p + 0.212 * i;
    if (i <= 8.08 * p) return 1.104 * p + 0.128 * i;
    if (i <= 11.48 * p) return 2.139 * p;
    if (i <= 12.8 * p) return 9.257 * p - 0.62 * i;
    if (i <= 13.54 * p) return 1.32 * p;
    if (i <= 36.54 * p) return 2.097 * p - 0.0574 * i;
    return 0;
  }
  // 2024, 2025 and 2026 use "<" at the breakpoints.
  if (i < 0.91 * p) return 0.687 * p;
  if (i < 1.11 * p) return 0.885 * p - 0.2 * i;
  if (i < 1.965 * p) return 0.6 * p + 0.057 * i;
  if (i < 2.72 * p) return 0.333 * p + 0.1949 * i;
  if (i < 3.11 * p) return -0.212 * p + 0.3949 * i;
  if (i < 3.24 * p) return -0.523 * p + 0.4949 * i;
  if (rules === 2024) {
    if (i < 5 * p) return 0.208 * p + 0.2693 * i;
    if (i < 7.88 * p) return 0.3 * p + 0.2513 * i;
    if (i < 8.08 * p) return 0.986 * p + 0.1643 * i;
    if (i < 10.74 * p) return 2.313 * p;
    if (i < 12.16 * p) return 8.972 * p - 0.62 * i;
    if (i < 13.54 * p) return 1.43 * p;
    if (i < 38.42 * p) return 2.206 * p - 0.0574 * i;
    return 0;
  }
  if (rules === 2025) {
    if (i < 5 * p) return 0.096 * p + 0.304 * i;
    if (i < 7.88 * p) return 0.186 * p + 0.286 * i;
    if (i < 8.08 * p) return 0.872 * p + 0.199 * i;
    if (i < 10.94 * p) return 2.48 * p;
    if (i < 12.47 * p) return 9.263 * p - 0.62 * i;
    return 1.532 * p;
  }
  // 2026
  if (i < 5 * p) return -0.073 * p + 0.356 * i;
  if (i < 7.88 * p) return 0.017 * p + 0.338 * i;
  if (i < 8.08 * p) return 0.703 * p + 0.251 * i;
  if (i < 11.16 * p) return 2.732 * p;
  if (i < 12.84 * p) return 9.652 * p - 0.62 * i;
  return 1.691 * p;
}

/** Rule year for avdragxx(): 2020, 2021, 2022 (also 2023), 2024, 2025 or 2026 (also later). */
function avdragRules(iyear: number): number {
  if (iyear < 2020) throw new Error(`Skatteregler för ${iyear} finns inte med`);
  if (iyear < 2021) return 2020;
  if (iyear < 2022) return 2021;
  if (iyear <= 2023) return 2022;
  if (iyear < 2025) return 2024;
  if (iyear === 2025) return 2025;
  return 2026;
}

/** avdragxx(): grundavdrag. bald is the age at 31/12 of the income year. */
export function avdragxx(inkomst: number, pbb: number, bald: number, iyear: number, xageValue = 66): number {
  const rules = avdragRules(iyear);
  inkomst = int(inkomst / 100) * 100;
  let avdrag = basicAvdrag(inkomst, pbb, rules === 2024 ? 2024 : 0);
  if (bald >= xageValue) avdrag += extraAvdrag(inkomst, pbb, rules);
  if (avdrag > inkomst) avdrag = inkomst;
  return int((avdrag + 99.99) / 100) * 100;
}

function jobbOlder(inkomst: number, pbb: number, rules: number): number {
  if (rules <= 2022) {
    if (inkomst <= 100000) return 0.2 * inkomst;
    if (inkomst <= 300000) return 15000 + 0.05 * inkomst;
    if (inkomst <= 600000) return 30000;
    return 30000 - 0.05 * (inkomst - 600000);
  }
  if (rules === 2023) {
    if (inkomst <= 100000) return 0.22 * inkomst;
    if (inkomst <= 300000) return 15000 + 0.07 * inkomst;
    if (inkomst <= 600000) return 36000;
    return 36000 - 0.03 * (inkomst - 600000);
  }
  if (rules === 2024) {
    if (inkomst < 1.75 * pbb) return 0.22 * inkomst;
    if (inkomst < 5.24 * pbb) return 0.2635 * pbb + 0.07 * inkomst;
    if (inkomst < 10.48 * pbb) return 0.6293 * pbb;
    return 0.6293 * pbb - 0.03 * (inkomst - 10.48 * pbb);
  }
  if (rules === 2025) {
    if (inkomst < 1.7 * pbb) return 0.22 * inkomst;
    if (inkomst < 5.24 * pbb) return 0.2635 * pbb + 0.07 * inkomst;
    return 0.6293 * pbb;
  }
  if (inkomst < 1.7 * pbb) return 0.22 * inkomst;
  if (inkomst < 6.5 * pbb) return 0.2635 * pbb + 0.07 * inkomst;
  return 0.6293 * pbb;
}

/**
 * Jobbxx(): jobbskatteavdrag. inkomst is the wage, binkomst other income (pension), ksats the
 * municipal tax rate. Jobb19..Jobb25 call avdragxx without xage, so 66 is used there.
 */
export function jobbxx(
  inkomst: number,
  alder: number,
  ksats: number,
  pbb: number,
  binkomst: number,
  iyear: number,
  xageValue: number,
): number {
  if (iyear < 2019) throw new Error(`Jobbskatteavdrag för ${iyear} finns inte med`);
  const rules = iyear < 2022 ? 2019 : Math.min(iyear, 2026);
  const avdrag = avdragxx(inkomst + binkomst, pbb, alder, iyear, rules === 2026 ? xageValue : 66);
  let jobb: number;
  if (rules <= 2023) {
    const k = rules === 2019 ? [0.3405, 1.703, 2.323] : [0.3874, 1.812, 2.432];
    if (inkomst <= 0.91 * pbb) jobb = inkomst;
    else if (inkomst <= 3.24 * pbb) jobb = k[0]! * (inkomst - 0.91 * pbb) + 0.91 * pbb;
    else if (inkomst <= 8.08 * pbb) jobb = k[1]! * pbb + 0.128 * (inkomst - 3.24 * pbb);
    else jobb = k[2]! * pbb;
    jobb = inkomst <= 13.54 * pbb ? (jobb - avdrag) * ksats : (jobb - avdrag) * ksats - 0.03 * (inkomst - 13.54 * pbb);
    const older = rules === 2023 ? alder >= 66 : alder >= xageValue;
    if (older) jobb = jobbOlder(inkomst, pbb, rules);
  } else {
    if (inkomst <= 0.91 * pbb) jobb = inkomst;
    else if (inkomst <= 3.24 * pbb) jobb = 0.3874 * (inkomst - 0.91 * pbb) + 0.91 * pbb;
    else if (rules === 2024) {
      if (inkomst <= 8.08 * pbb) jobb = 1.813 * pbb + 0.1643 * (inkomst - 3.24 * pbb);
      else if (inkomst <= 13.54 * pbb) jobb = 2.608 * pbb;
      else jobb = 2.608 * pbb - 0.03 * (inkomst - 13.54 * pbb);
    } else if (inkomst <= 8.08 * pbb) {
      jobb = 1.813 * pbb + (rules === 2025 ? 0.199 : 0.251) * (inkomst - 3.24 * pbb);
    } else jobb = (rules === 2025 ? 2.776 : 3.027) * pbb;
    jobb = (jobb - avdrag) * ksats;
    if (alder > xageValue) jobb = jobbOlder(inkomst, pbb, rules);
  }
  if (jobb < 0) jobb = 0;
  return int(jobb);
}

/** statlig(): statlig inkomstskatt. */
export function statlig(besk: number, lim1: number, lim2: number): number {
  let s = 0;
  if (besk > lim2) s = (besk - lim2) * 0.25 + (lim2 - lim1) * 0.2;
  else if (besk > lim1) s = (besk - lim1) * 0.2;
  return int(s);
}

/** PublicAvg(): public service-avgiften (from 2019). IBB is the year's inkomstbasbelopp. */
export function publicAvg(besk: number, bald: number, year: number, IBB: number): number {
  if (bald <= 18 || besk < 1 || year < 2019) return 0;
  let factor = 2.092;
  if (year === 2021) factor = 1.95;
  if (year === 2022) factor = 1.87;
  if (year === 2023) factor = 1.75;
  if (year === 2024) factor = 1.6;
  if (year === 2025) factor = 1.55;
  if (year >= 2026) factor = 1.42;
  const lim2 = factor * IBB;
  const avg = besk > lim2 ? lim2 * 0.01 : besk * 0.01;
  return int(avg + 0.5);
}

/** FAared(): skattereduktion för förvärvsinkomst (from 2021). */
export function faAred(inkomst: number, year: number): number {
  if (year < 2021) return 0;
  let r = 0;
  if (inkomst > 40000 && inkomst < 240000) r = 0.0075 * (inkomst - 40000);
  else if (inkomst >= 240000) r = 1500;
  if (r > inkomst) r = inkomst;
  return int(r);
}

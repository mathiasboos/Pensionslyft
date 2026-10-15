// The allmän pension rules from the VBA module "Pensionssystemet" and the functions gp() and
// tillagg() from "Bidrag". Names and arguments follow the VBA so the two can be compared line
// by line. marginal is always 0 (the model's normal rounding).
import { cohortValue } from "./data";
import { int, vbaRound } from "./vba";

/** pgi(): pensionsgrundande inkomst (typ 0), pensionsavgift (typ 1) or skattereduktion (typ 2). */
export function pgi(year: number, inkomst: number, pbb: number, IBB: number, FHB: number, typ = 0): number {
  inkomst = int(inkomst / 100) * 100;
  let tak = 8.07 * IBB;
  if (year <= 1994) tak = 7.5 * pbb;
  else if (year < 1999) tak = 7.5 * FHB;
  else if (year === 1999) tak = 8.06 * FHB;
  else if (year === 2000) tak = 8.07 * FHB;

  let golv: number;
  if (year <= 1994) golv = pbb;
  else if (year < 1999) golv = FHB;
  else if (year < 2001) golv = 0.24 * pbb;
  else if (year === 2001) golv = 0.27 * pbb;
  else if (year === 2002) golv = 0.293 * pbb;
  else golv = 0.423 * pbb;

  let p = inkomst <= golv ? 0 : inkomst <= tak ? inkomst : tak;

  let egen: number;
  if (year < 1995) egen = 0;
  else if (year < 1998) egen = 0.01;
  else if (year < 2000) egen = 0.0695;
  else egen = 0.07;
  const pavg = int((p * egen + 49) / 100) * 100;

  // "Dim andel As Long": the VBA stores 0.25..0.875 as whole numbers (banker's rounding).
  let andel: number;
  if (year < 2000) andel = 0;
  else if (year <= 2000) andel = 0.25;
  else if (year <= 2001) andel = 0.5;
  else if (year <= 2002) andel = 0.75;
  else if (year <= 2005) andel = 0.875;
  else andel = 1;
  andel = vbaRound(andel);
  const sred = int((andel * pavg) / 100) * 100;

  if (inkomst < golv) p = 0;
  else if (inkomst <= tak) p = inkomst - pavg;
  else p = tak - pavg;
  p = year < 1999 ? int(p / 50) * 50 : int(p / 100) * 100;
  if (p > 7.5 * IBB) p = 7.5 * IBB;

  if (typ === 1) return pavg;
  if (typ === 2) return sred;
  if (typ === 4) return tak;
  return p;
}

/** Andel of the new system (inkomstpension) by birth year. */
export function andel(kohort: number): number {
  kohort = int(kohort);
  let a = 0;
  if (kohort >= 1938) a = (1 / 20) * (kohort - 1935 + 1);
  if (kohort > 1953) a = 1;
  return a;
}

export function ipavgift(year: number, pgiValue: number, alder: number, andelNya: number, fodd: number): number {
  if (fodd < 1938) return 0;
  let avgift = 0.16;
  if (year <= 1994) avgift = 0.185;
  if (year > 1994 && year <= 1998) avgift = 0.165;
  if (alder > 64) andelNya = 1;
  return int(avgift * pgiValue * andelNya);
}

export function ppavgift(year: number, pgiValue: number, alder: number, andelNya: number, fodd: number): number {
  if (fodd < 1938) return 0;
  let avgift = 0.025;
  if (year <= 1994) avgift = 0;
  if (year > 1994 && year <= 1998) avgift = 0.02;
  if (alder > 64) andelNya = 1;
  return int(avgift * pgiValue * andelNya);
}

export function gpavgift(
  _year: number,
  pgiValue: number,
  alder: number,
  andelNya: number,
  fodd: number,
  rikt: number,
): number {
  if (fodd < 1938) return 0;
  if (alder >= rikt) andelNya = 1;
  return int(0.185 * pgiValue * andelNya);
}

/** deltal(): delningstal read straight from the sheet Nyckeltal (IP: kolumn 4, PP: kolumn 19). */
export function deltal(PAR: number, fodar: number, alder: number, defAr: number, kolumn: "IP" | "PP"): number {
  if (PAR > defAr) defAr = PAR;
  if (defAr > 99) defAr = PAR;
  const konst = int(fodar + PAR + 1 / 1000) > int(fodar) + int(PAR) ? 1 : 0;
  const table = kolumn === "IP" ? "dIPn" : "dPPn";
  const cell = (age: number) => cohortValue(int(fodar), table, age);
  const kolAge = int(alder - konst);
  const month1 = 12 - int((PAR - int(PAR)) * 12);
  const month2 = 12 - int((defAr - int(defAr)) * 12);
  let d: number;
  // Before 61 (only tjänstepension): extrapolated from premiepensionens delningstal at 61 and 62.
  if (PAR <= 60) {
    const p61 = cohortValue(int(fodar), "dPPn", 61);
    d = (p61 - cohortValue(int(fodar), "dPPn", 62)) * (61 - PAR) + p61;
  } else if (alder < int(PAR + konst)) d = 0;
  else if (alder === int(PAR + konst)) d = cell(kolAge) * (month1 / 12) + cell(kolAge + 1) * ((12 - month1) / 12);
  else if (PAR === defAr) d = cell(kolAge);
  else if (alder < int(defAr + 1)) d = cell(kolAge);
  else if (alder === int(defAr + 1)) d = cell(kolAge) * (month2 / 12) + cell(kolAge + 1) * ((12 - month2) / 12);
  else d = cell(kolAge);
  return int(d * 100 + 0.4999) / 100;
}

/** fnDeltal_IP(): delningstal for inkomstpension from aDeltal_IP (mortality-based for born 1958+). */
export function fnDeltalIP(born: number, curAge: number, adjustProportional = false): number {
  let ageFraction = curAge - int(curAge);
  if (adjustProportional && ageFraction === 0) {
    curAge += 0.5;
    ageFraction = 0.5;
  }
  const month = vbaRound((curAge - int(curAge)) * 12, 0);
  const at = (age: number) => {
    if (age > 82) throw new Error("Delningstal saknas efter 82 års ålder");
    return cohortValue(born, "dIP", age);
  };
  const d = ageFraction > 0 ? ((12 - month) / 12) * at(int(curAge)) + (month / 12) * at(int(curAge) + 1) : at(curAge);
  return int(d * 100 + 0.4999) / 100;
}

/** fnDeltal_IP2(): as fnDeltal_IP, but halfway into the year when the pension starts. */
export function fnDeltalIP2(born: number, curAge: number, PAR: number, defAr: number): number {
  if (curAge > defAr) curAge = defAr + 1;
  const adjust = int(PAR) === curAge || int(defAr) === curAge;
  return fnDeltalIP(born, curAge, adjust);
}

/**
 * IP_(): one year of inkomstpension. Typ 0 gives the pension, 1 arvsvinst, 2 indexering,
 * 3 förvaltningskostnad and 4 the pension balance at year end.
 */
export function IP_(
  year: number,
  PAR: number,
  born: number,
  pratt: number,
  arvsf1: number,
  arvsf2: number,
  kostf: number,
  pbhIng: number,
  andelUttag: number,
  pens: number,
  deltalValue: number,
  index: number,
  defAr = 999,
  typ = 0,
  bindex = 0,
): number {
  if (born < 1938) return 0;
  let arv = 0;
  let inx = 0;
  let kost = 0;
  let pbh = 0;
  let pension = 0;
  if (year > 2014 && bindex < 1 && bindex > 0) pratt = pratt * bindex;
  const konst = int(born + PAR + 1 / 1000) > int(born) + int(PAR) ? 1 : 0;
  const alder = year - int(born);
  let month = 12 - int(12 * (born + PAR - int(born + PAR)));
  if (PAR > defAr) defAr = PAR;
  if (defAr > 100) defAr = PAR;
  let finx = index / 1.016;
  if (year === 2000) finx = index / 0.996;
  let underlag = 0;

  if (alder < int(PAR + konst)) {
    arv = (arvsf1 - 1) * pbhIng;
    arv = arv * arvsf2 + (pbhIng + pratt) * (arvsf2 - 1);
    inx = (arv + pratt + pbhIng) * (index - 1);
    kost = (inx + arv + pratt + pbhIng) * (kostf - 1);
    pbh = pratt + arv + inx + kost + pbhIng;
  } else if (alder === int(PAR + konst)) {
    arv = ((arvsf2 - 1) * pbhIng * (12 - month)) / 12 + pratt * (arvsf2 - 1);
    inx = (arv + pratt) * (index - 1) + ((index * 0.016 * pbhIng) / 1.016) * ((12 - month) / 12);
    kost = (inx + arv + pratt + pbhIng) * (kostf - 1);
    if (typ === 9) deltalValue = 1;
    if (deltalValue > 0) pension = (pbhIng * andelUttag) / deltalValue;
    pbh = pbhIng * (1 - andelUttag) + (pratt + arv + inx + kost);
  } else if (alder > int(PAR + konst) && alder < int(defAr)) {
    arv = (arvsf2 - 1) * pbhIng + (arvsf2 - 1) * pratt;
    inx = (arv + pratt) * (index - 1) + ((index * 0.016 * pbhIng) / 1.016) * ((12 - month) / 12);
    kost = (inx + arv + pratt + pbhIng) * (kostf - 1);
    if (pbhIng > 0) {
      if (alder + 1 > int(PAR + konst)) month = 12;
      if (deltalValue > 0)
        pension = ((pbhIng + pens * finx * deltalValue * (12 / month)) * andelUttag) / deltalValue;
      underlag = int(int(pens * finx + 0.49) * deltalValue + 0.49);
      pbh = (pbhIng + underlag) * (1 - andelUttag) + (pratt + arv + inx + kost);
    } else {
      pension = pens * finx * (12 / month) * deltalValue;
      pbh = 0;
    }
    month = 12;
  } else if (alder === int(defAr + konst)) {
    andelUttag = 1;
    arv = (arvsf2 - 1) * (pbhIng + pratt);
    inx = (arv + pratt) * (index - 1) + ((index * 0.016 * pbhIng) / 1.016) * ((12 - month) / 12);
    kost = (inx + arv + pratt + pbhIng) * (kostf - 1);
    if (deltalValue > 0)
      pension = ((pbhIng + pens * finx * deltalValue * (12 / month)) * andelUttag) / deltalValue;
    underlag = int(int(pens * finx + 0.49) * deltalValue + 0.49);
    pbh = (pbhIng + underlag) * (1 - andelUttag) + (pratt + arv + inx + kost);
  } else if (alder > int(defAr + konst)) {
    andelUttag = 1;
    if (alder > int(defAr + konst + 1)) month = 12;
    if (pbhIng > 0 || pratt > 0) {
      if (deltalValue > 0)
        pension = ((pbhIng + pens * finx * deltalValue * (12 / month)) * andelUttag) / deltalValue;
      underlag = int(pens * finx * deltalValue * (12 / month) + 0.49);
      pbh = pbhIng + underlag + (pratt + arv + inx + kost);
      if (deltalValue > 0) pension = pbh / deltalValue;
      pbh = pbh * (1 - andelUttag);
    } else if (alder <= 65) {
      underlag = int(int(pens * finx + 0.49) * deltalValue + 0.49);
      if (deltalValue > 0) pension = underlag / deltalValue;
    } else {
      pension = pens * finx;
    }
    month = 12;
  }
  if (pbh < 0) pbh = 0;
  pbh = int(pbh);
  pension = int(pension / 12 + 0.5) * 12;
  pension = pension * (month / 12);

  if (typ === 1) return arv;
  if (typ === 2) return inx;
  if (typ === 3) return kost;
  if (typ === 4) return pbh;
  return pension;
}

/**
 * ppkassa(): premiepension for one year from the fund balance. uttagPP is the input UttagPP
 * (the share taken out between PAR and defAr), andelUttag the share in the first year.
 */
export function ppkassa(
  PAR: number,
  born: number,
  alder: number,
  pbh: number,
  defAr = 999,
  andelUttag = 1,
  uttagPP = 1,
): number {
  if (PAR > defAr) defAr = PAR;
  if (defAr < 61) defAr = PAR;
  if (defAr > 99) defAr = PAR;
  const konst = int(born + PAR + 1 / 1000) > int(born) + int(PAR) ? 1 : 0;
  const konst2 = int(born + defAr + 1 / 1000) > int(born) + int(defAr) ? 1 : 0;
  if (born < 1938) return 0;
  if (andelUttag > 1) andelUttag = 1;
  if (andelUttag < 0.1) return 0;
  const delTal = alder < 101 ? deltal(PAR, born, alder, defAr, "PP") : 2;
  if (pbh < 0) pbh = 0;
  let kassa = 0;
  let month = 0;
  if (alder < int(PAR + konst)) {
    kassa = 0;
  } else if (alder === int(PAR + konst)) {
    kassa = (andelUttag * pbh) / delTal;
    month = 12 - int(12 * (born + PAR - int(born + PAR)));
    if (alder === int(defAr + konst2))
      month = month + (12 - 12 * (born + defAr - int(born + defAr + 1 / 1000))) * (1 - uttagPP);
  } else if (alder < int(defAr + konst)) {
    kassa = pbh / delTal;
    month = 12 * uttagPP;
  } else if (alder === int(defAr + konst)) {
    kassa = pbh / delTal;
    month = 12 * uttagPP + (12 - 12 * (born + defAr - int(born + defAr + 1 / 1000))) * (1 - uttagPP);
  } else {
    kassa = pbh / delTal;
    month = 12;
  }
  if (month > 12) month = 12;
  if (month < 0) month = 0;
  month = vbaRound(month); // "Dim month As Long"
  return int(kassa / 12 + 0.5) * month;
}

/** gp(): garantipension for one year (fodar > 1937). */
export function gp(
  inkomst: number,
  civ: number,
  fodar: number,
  pbb: number,
  ftid: number,
  alder: number,
  year: number,
  rikt: number,
  andelUttag: number,
): number {
  let g = 0;
  if (alder < rikt) return 0;
  if (fodar > 1937) {
    if (civ === 0) {
      if (inkomst <= 1.26 * pbb) {
        g = 2.13 * pbb - inkomst;
        if (year > 2019) g = 2.181 * pbb - inkomst;
        if (year === 2022) g = ((2.181 * 7 + 2.43 * 5) * pbb) / 12 - inkomst;
        if (year > 2022) g = 2.43 * pbb - inkomst;
      } else {
        g = 0.87 * pbb - 0.48 * (inkomst - 1.26 * pbb);
        if (year > 2019) g = 0.921 * pbb - 0.48 * (inkomst - 1.26 * pbb);
        if (year === 2022) g = ((7 * 0.921 + 5 * 1.17) * pbb) / 12 - 0.48 * (inkomst - 1.26 * pbb);
        if (year > 2022) g = 1.17 * pbb - 0.48 * (inkomst - 1.26 * pbb);
      }
    } else {
      if (inkomst <= 1.14 * pbb) {
        g = 1.9 * pbb - inkomst;
        if (year > 2019) g = 1.951 * pbb - inkomst;
        if (year === 2022) g = ((7 * 1.951 + 5 * 2.2) * pbb) / 12 - inkomst;
        if (year > 2022) g = 2.2 * pbb - inkomst;
      } else {
        g = 0.76 * pbb - 0.48 * (inkomst - 1.14 * pbb);
        if (year > 2019) g = 0.811 * pbb - 0.48 * (inkomst - 1.14 * pbb);
        if (year === 2022) g = ((7 * 0.811 + 5 * 1.06) * pbb) / 12 - 0.48 * (inkomst - 1.14 * pbb);
        if (year > 2022) g = 1.06 * pbb - 0.48 * (inkomst - 1.14 * pbb);
      }
    }
    if (g < 0 || ftid < 4) g = 0;
  }
  if (ftid < 40 && g > 0) g = (g * ftid) / 40;
  if (andelUttag < 1) g = g * andelUttag;
  return 12 * int(g / 12 + 0.5);
}

/** tillagg(): inkomstpensionstillägg (from 2021). Returns a VBA Single. */
export function tillagg(
  underl: number,
  year: number,
  index: number,
  index2021: number,
  andelUttag: number,
  ftid: number,
  born: number,
): number {
  if (year < 2021 || ftid < 1) return 0;
  const i = index / index2021 / 1.016 ** (year - 2021);
  const u = underl / i;
  if (u < 108000 || u >= 204000) return 0;
  let t: number;
  if (u < 132000) t = int(((u - 108000) * 0.3) / 600) * 600 + 300;
  else if (u <= 168000) t = 7200;
  else t = int((7200 - (u - 168000) * 0.2) / 600) * 600 + 300;
  if (andelUttag <= 1) t = t * andelUttag;
  if (int(born) > 1944 && ftid < 40) t = (t * ftid) / 40;
  return Math.fround(t);
}

/** riktage(): riktålder (typ 1) or lowest pension age (typ 0) by income year. */
export function riktage(year: number, typ: 0 | 1): number {
  let rikt: number;
  let riktl: number;
  if (year < 2020) [rikt, riktl] = [65, 61];
  else if (year < 2023) [rikt, riktl] = [65, 62];
  else if (year < 2026) [rikt, riktl] = [66, 63];
  else if (year < 2038) [rikt, riktl] = [67, 64];
  else if (year < 2051) [rikt, riktl] = [68, 65];
  else if (year < 2068) [rikt, riktl] = [69, 66];
  else [rikt, riktl] = [70, 67];
  return typ === 0 ? riktl : rikt;
}

/** avkskatt(): avkastningsskatt on pension insurance (val 0) or ISK/KF (val 1). */
export function avkskatt(year: number, val: 0 | 1): number {
  const rates: Record<number, number> = {
    1998: 0.05, 1999: 0.0489, 2000: 0.0534, 2001: 0.0497, 2002: 0.0515, 2003: 0.0439, 2004: 0.043,
    2005: 0.0325, 2006: 0.0361, 2007: 0.0413, 2008: 0.0388, 2009: 0.0309, 2010: 0.0277, 2011: 0.0258,
    2012: 0.0152, 2013: 0.02, 2014: 0.0163, 2015: 0.0058, 2016: 0.0034, 2017: 0.0051, 2018: 0.0048,
    2019: 0.0004, 2020: -0.0007, 2021: 0.0016, 2022: 0.0194, 2023: 0.0262, 2024: 0.0196, 2025: 0.0255,
  };
  const year2 = year - 1;
  let bondi = year2 < 1998 ? 0.0498 : (rates[year2] ?? 0.025);
  if (year > 2016 && val === 0 && bondi < 0.005) bondi = 0.005;
  if (val === 0) return bondi * 0.15;
  if (bondi < 0.0025) bondi = 0.0025;
  return (0.01 + bondi) * 0.3;
}

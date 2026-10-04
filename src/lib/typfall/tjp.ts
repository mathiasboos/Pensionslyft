// Tjänstepension from the VBA modules "Tjänstepensioner" and "TjänstepensionerFörmån".
// The VBA uses public variables (born, W_start, tjp_par, the current age and the wage and
// basbelopp arrays); here they come in through TjpContext. marginal is always 0.
import { deltal } from "./rules";
import { int, maxi, mini, vbaRound } from "./vba";

/** Avtalsområde, numbered as rng_TJP_Val in the model. */
export type Avtal = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface TjpContext {
  born: number;
  wStart: number;
  tjpPar: number;
  avtal: Avtal;
  riktage: number; // Rng_riktage
  /** Arrays indexed by age (31/12). */
  wage: number[];
  IBB: number[];
  pbb: number[];
  FPB: number[];
  KPIj: number[];
  /** rng_FlexPens: extra premium for ITP 1 and SAF-LO from 2014. */
  flex: number;
  /** rng_Temp_Tjp_Uttag: years of temporary payout, 0 for a lifelong payout. */
  tempYears: number;
}

const yearOf = (c: TjpContext, age: number) => int(c.born) + age;

export function tlITP1(c: TjpContext, alder: number, inkomst: number, IBB: number, Zpar: number): number {
  const { born } = c;
  if (Zpar > 65) Zpar = 65;
  if (yearOf(c, alder) > 2022) Zpar = 66;
  if (inkomst <= 0) return 0;
  let month: number;
  if (alder < 25) return 0;
  else if (int(alder) === 25) {
    month = int((int(born + 25 + 1) - born - c.wStart) * 12);
    if (month > 12) month = 12;
    if (month < 0) month = 0;
  } else if (alder < int(Zpar)) {
    month = alder > c.wStart ? 12 : int((int(born + c.wStart + 1) - born - c.wStart) * 12);
  } else if (alder === int(Zpar)) {
    if (Zpar < 65) month = int((born + Zpar - int(born + Zpar)) * 12);
    else {
      month = int((born - int(born)) * 12);
      const m = int(born + c.tjpPar - int(born + c.tjpPar));
      if (m > 0) inkomst = (inkomst * month) / int((born + c.tjpPar - int(born + c.tjpPar)) * 12);
    }
  } else month = 0;
  if (IBB === 0) IBB = inkomst;
  if (month === 0) return 0;
  inkomst = inkomst / month;
  const flex = yearOf(c, alder) > 2013 ? c.flex : 0;
  let p: number;
  if (inkomst <= (7.5 * IBB) / month) p = (0.045 + flex) * inkomst;
  else {
    if (yearOf(c, alder) > 2022 && inkomst > 30 * IBB) inkomst = 30 * IBB;
    p = (0.3 + flex) * (inkomst - (7.5 * IBB) / 12) + ((0.045 + flex) * 7.5 * IBB) / 12;
  }
  return int(p + 0.5) * month;
}

export function tlITP2A(c: TjpContext, alder: number, inkomst: number, Zpar: number): number {
  const { born } = c;
  if (yearOf(c, alder) < 1997) return 0;
  if (inkomst <= 0) return 0;
  let month: number;
  if (Zpar > 65) Zpar = 65;
  if (alder < 28) return 0;
  else if (int(alder) === 28) {
    month = int((int(born + 28 + 1) - born - c.wStart) * 12);
    if (month > 12) month = 12;
  } else if (alder < int(Zpar)) {
    month = alder > c.wStart ? 12 : int((int(born + c.wStart + 1) - born - c.wStart) * 12);
  } else if (alder === int(Zpar)) {
    if (Zpar < 65) month = int((born + Zpar - int(born + Zpar)) * 12);
    else {
      month = int((born - int(born)) * 12);
      const m = int((born + c.tjpPar - int(born + c.tjpPar)) * 12);
      if (m > 0) inkomst = (inkomst * month) / m;
    }
  } else month = 0;
  if (month === 0) return 0;
  return int((0.02 * inkomst * month) / 12 + 0.5);
}

/** DC_underlag(): final salary for the förmånsbestämd ITP 2 / PA 03 (stat 1: no caps). */
export function dcUnderlag(c: TjpContext, stat: 0 | 1): number {
  let Zpar = c.tjpPar;
  if (Zpar > 65) Zpar = 65;
  const z = int(Zpar);
  let [W1, W2, W3, W4, W5, W6] = [1, 2, 3, 4, 5, 6].map((k) => c.wage[z - k] ?? 0) as [
    number, number, number, number, number, number,
  ];
  const pbb = (k: number) => c.pbb[z - k]!;
  const ibb = (k: number) => c.IBB[z - k]!;
  if (W6 === 0 || W5 === 0 || W4 === 0 || W3 === 0 || W2 === 0 || W1 === 0) return 0;
  if (stat === 0) {
    if (W5 / W6 > (1.2 * ibb(5)) / ibb(6)) W5 = W6 * ((1.2 * ibb(6)) / ibb(5));
    if (W4 / W5 > (1.15 * ibb(4)) / ibb(5)) W4 = W5 * ((1.15 * ibb(4)) / ibb(5));
    if (W3 / W4 > (1.1 * ibb(3)) / ibb(4)) W3 = W4 * ((1.1 * ibb(3)) / ibb(4));
    if (W2 / W3 > (1.05 * ibb(2)) / ibb(3)) W2 = W3 * ((1.05 * ibb(2)) / ibb(3));
    if (W1 / W2 > ibb(1) / ibb(2)) W1 = W2 * (ibb(1) / ibb(2));
  }
  W5 = (W5 * pbb(1)) / pbb(5);
  W4 = (W4 * pbb(1)) / pbb(4);
  W3 = (W3 * pbb(1)) / pbb(3);
  W2 = (W2 * pbb(1)) / pbb(2);
  return int((W1 + W2 + W3 + W4 + W5) / 5 + 0.5);
}

export function tlITP2F(c: TjpContext, inkomst: number, IBB: number, year = 30): number {
  let b = 0;
  if (inkomst <= 0) return 0;
  if (inkomst <= 7.5 * IBB) b = 0.1 * inkomst;
  else if (inkomst <= 20 * IBB) b = 0.65 * (inkomst - 7.5 * IBB) + 0.1 * 7.5 * IBB;
  else if (inkomst <= 30 * IBB) b = 0.325 * (inkomst - 20 * IBB) + 0.65 * (10 - 7.5) * IBB + 0.1 * 7.5 * IBB;
  else b = 0.325 * (30 - 20) * IBB + 0.65 * (10 - 7.5) * IBB + 0.1 * 7.5 * IBB;
  if (year < 30) b = (b * year) / 30;
  const Zpar = c.tjpPar;
  let faktor: number;
  if (int(Zpar) <= 64) faktor = 1 - 0.005 * vbaRound(int((65 - Zpar) * 12));
  else if (int(Zpar) <= 70) faktor = 1 + 0.006 * vbaRound(int((Zpar - 65) * 12));
  else faktor = 1 + 0.006 * 60;
  b = b * faktor;
  return int(b / 12 + 0.5) * 12;
}

export function kapan(c: TjpContext, year: number, fodar: number, IBB: number, wage: number, Zpar = 65): number {
  const { born } = c;
  if (wage <= 0) return 0;
  const alder = year - int(fodar);
  if (alder > int(Zpar)) return 0;
  let prem: number;
  if (year < 1991) prem = 0;
  else if (year <= 1993) prem = 0.013;
  else if (year === 1994) prem = 0.015;
  else if (year <= 2002) prem = 0.019;
  else prem = 0.02;
  if (year > 2002 && wage > 30 * IBB) wage = 30 * IBB;
  const lowAge = year <= 2007 ? 28 : 23;
  const highAge = year > 2023 ? 69 : 65;
  if (Zpar > highAge) Zpar = highAge;
  let month: number;
  if (alder < lowAge) return 0;
  if (alder === lowAge) {
    month = int((int(born + lowAge + 1) - born - c.wStart) * 12);
    if (month > 12) month = 12;
    return (wage * prem * month) / 12;
  }
  if (alder < int(Zpar)) {
    month = alder > c.wStart ? 12 : int((int(born + c.wStart + 1) - born - c.wStart) * 12);
    return (wage * prem * month) / 12;
  }
  if (alder === int(Zpar)) {
    if (Zpar < highAge) {
      month = int((born + Zpar - int(born + Zpar)) * 12);
      return (wage * prem * month) / 12;
    }
    month = int((born - int(born)) * 12);
    const m = int((born + c.tjpPar - int(born + c.tjpPar)) * 12);
    return m ? (wage * prem * month) / m : 0;
  }
  return 0;
}

export function paIndiv(c: TjpContext, year: number, fodar: number, IBB: number, wage: number, Zpar = 67): number {
  const { born } = c;
  if (wage <= 0) return 0;
  const alder = year - int(fodar);
  if (alder > Zpar) return 0;
  let prem: number;
  if (year < 2003) prem = 0;
  else if (year < 2008) prem = 0.023;
  else prem = 0.025;
  if (year > 2023 && year < 2026) prem = int(fodar) < 1965 ? 0.03 : 0.04;
  else if (year === 2026) prem = int(fodar) < 1965 ? (0.031 * 9 + 0.032 * 3) / 12 : (0.041 * 9 + 0.042 * 3) / 12;
  else if (year > 2026) prem = int(fodar) < 1965 ? 0.032 : 0.042;
  if (year > 2002 && wage > 30 * IBB) wage = 30 * IBB;
  const highAge = year > 2023 ? 69 : 65;
  if (Zpar > highAge) Zpar = highAge;
  let month: number;
  if (alder < 23) return 0;
  if (alder === 23) {
    month = vbaRound(int((int(born + 23 + 1) - born - c.wStart) * 12));
    if (month > 12) month = 12;
    return (wage * prem * month) / 12;
  }
  if (alder < int(Zpar)) {
    month = alder > c.wStart ? 12 : int((int(born + c.wStart + 1) - born - c.wStart) * 12);
    return (wage * prem * month) / 12;
  }
  if (alder === int(Zpar)) {
    if (Zpar < highAge) {
      month = int((born + Zpar - int(born + Zpar)) * 12);
      return (wage * prem * month) / 12;
    }
    month = int((born - int(born)) * 12);
    const m = int((born + c.tjpPar - int(born + c.tjpPar)) * 12);
    return m ? (wage * prem * month) / m : 0;
  }
  return 0;
}

const PA03: Record<number, [number, number, number]> = {
  1943: [0.095, 0.6485, 0.324], 1944: [0.093, 0.647, 0.323], 1945: [0.091, 0.6455, 0.322],
  1946: [0.089, 0.644, 0.321], 1947: [0.087, 0.6425, 0.32], 1948: [0.084, 0.641, 0.319],
  1949: [0.082, 0.6395, 0.318], 1950: [0.079, 0.638, 0.317], 1951: [0.077, 0.6365, 0.316],
  1952: [0.074, 0.635, 0.315], 1953: [0.072, 0.6335, 0.314], 1954: [0.069, 0.632, 0.313],
  1955: [0.066, 0.6305, 0.312], 1956: [0.063, 0.629, 0.311], 1957: [0.06, 0.6275, 0.31],
  1958: [0.057, 0.626, 0.309], 1959: [0.054, 0.6245, 0.308], 1960: [0.051, 0.623, 0.307],
  1961: [0.047, 0.6215, 0.306], 1962: [0.043, 0.62, 0.305], 1963: [0.039, 0.6185, 0.304],
  1964: [0.036, 0.617, 0.303], 1965: [0.032, 0.615, 0.302], 1966: [0.029, 0.613, 0.301],
  1967: [0.025, 0.611, 0.3], 1968: [0.021, 0.609, 0.3], 1969: [0.017, 0.607, 0.3],
  1970: [0.013, 0.605, 0.3], 1971: [0.009, 0.603, 0.3], 1972: [0.005, 0.601, 0.3],
};

export function tlPA03(c: TjpContext, inkomst: number, aar = 30, inkbas = 45900, fodar = 1959): number {
  if (inkomst <= 0) return 0;
  if (c.avtal === 8) return 0;
  const [par1, par2, par3] = fodar < 1943 ? [0.1, 0.65, 0.325] : fodar >= 1973 ? [0, 0.6, 0.3] : PA03[fodar]!;
  let b: number;
  if (inkomst > 30 * inkbas) b = (30 - 20) * inkbas * par3 + (20 - 7.5) * par2 * inkbas + 7.5 * inkbas * par1;
  else if (inkomst > 20 * inkbas)
    b = (inkomst - 20 * inkbas) * par3 + (20 - 7.5) * par2 * inkbas + 7.5 * inkbas * par1;
  else if (inkomst > 7.5 * inkbas) b = (inkomst - 7.5 * inkbas) * par2 + 7.5 * inkbas * par1;
  else b = inkomst * par1;
  if (aar < 30) b = b * (aar / 30);
  return b;
}

export function tlPA16(c: TjpContext, alder: number, inkomst: number, IBB: number, Zpar: number): number {
  const { born } = c;
  if (inkomst <= 0) return 0;
  const year = yearOf(c, alder);
  const maxAge = year > 2003 ? 67 : 65;
  if (Zpar > maxAge) Zpar = maxAge;
  let month: number;
  if (alder < c.wStart) return 0;
  else if (int(alder) === c.wStart) {
    month = int((int(born + c.wStart + 1) - born - c.wStart) * 12);
    if (month > 12) month = 12;
  } else if (alder < int(Zpar)) month = 12;
  else if (alder === int(Zpar)) {
    if (Zpar < maxAge) month = int((born + Zpar - int(born + Zpar)) * 12);
    else {
      month = int((born - int(born)) * 12);
      if (int(born + c.tjpPar - int(born + c.tjpPar)) > 0)
        inkomst = (inkomst * month) / int((born + c.tjpPar - int(born + c.tjpPar)) * 12);
    }
  } else month = 0;
  if (IBB === 0) IBB = inkomst;
  if (month === 0) return 0;
  inkomst = inkomst / month;
  const low = inkomst <= (7.5 * IBB) / month;
  let p: number;
  if (year < 2026) p = low ? 0.06 * inkomst : 0.315 * (inkomst - (7.5 * IBB) / 12) + (0.06 * 7.5 * IBB) / 12;
  else if (year === 2026) {
    const r1 = (0.061 * 9 + 0.062 * 3) / 12;
    const r2 = (0.316 * 9 + 0.317 * 3) / 12;
    p = low ? r1 * inkomst : r2 * (inkomst - (7.5 * IBB) / 12) + (r1 * 7.5 * IBB) / 12;
  } else p = low ? 0.062 * inkomst : 0.317 * (inkomst - (7.5 * IBB) / 12) + (0.062 * 7.5 * IBB) / 12;
  return int(p + 0.5) * month;
}

export function safLo(c: TjpContext, alder: number, inkomst: number, IBB: number, Zpar: number, year: number): number {
  const { born } = c;
  if (inkomst <= 0) return 0;
  if (year < 1996) return 0;
  if (Zpar > 65) Zpar = 65;
  let lowAge: number;
  if (year < 2000) lowAge = 28;
  else if (year < 2021) lowAge = 25;
  else if (year < 2022) lowAge = 24;
  else if (year < 2023) lowAge = 23;
  else lowAge = 22;
  if (IBB === 0) IBB = inkomst;
  let p1: number;
  let p2: number;
  if (year < 1996) [p1, p2] = [0, 0];
  else if (year < 2000) [p1, p2] = [0.02, 0.02];
  else if (year < 2008) [p1, p2] = [0.035, 0.035];
  else if (year === 2008) [p1, p2] = [0.039, 0.06];
  else if (year === 2009) [p1, p2] = [0.04, 0.12];
  else if (year === 2010) [p1, p2] = [0.041, 0.18];
  else if (year === 2011) [p1, p2] = [0.043, 0.24];
  else if (year <= 2013) [p1, p2] = [0.045, 0.3];
  else [p1, p2] = [0.045 + c.flex, 0.3 + c.flex];
  let month: number;
  if (alder < lowAge) return 0;
  else if (int(alder) === lowAge) {
    month = int((int(born + lowAge + 1) - born - c.wStart) * 12);
    if (month > 12) month = 12;
  } else if (alder < int(Zpar)) {
    month = alder > c.wStart ? 12 : int((int(born + c.wStart + 1) - born - c.wStart) * 12);
  } else if (alder === int(Zpar)) {
    if (Zpar < 65) month = int((born + Zpar - int(born + Zpar)) * 12);
    else {
      month = int((born - int(born)) * 12);
      if (int(born + c.tjpPar - int(born + c.tjpPar)) > 0)
        inkomst = (inkomst * month) / int((born + c.tjpPar - int(born + c.tjpPar)) * 12);
    }
  } else month = 0;
  if (month === 0) return 0;
  inkomst = inkomst / month;
  const p = inkomst <= (7.5 * IBB) / month ? p1 * inkomst : p2 * (inkomst - (7.5 * IBB) / 12) + (p1 * 7.5 * IBB) / 12;
  return int(p + 0.5) * month;
}

/** STP_(): the old förmånsbestämd STP in SAF-LO. */
export function stp(c: TjpContext, medel: number, antal: number, pbb: number): number {
  if (antal < 3) return 0;
  let PAR = c.tjpPar;
  if (PAR < 65) PAR = 65;
  if (PAR > 70) PAR = 70;
  const born = int(c.born);
  let faktor = 1;
  if (PAR > 65) faktor = int(PAR) <= 70 ? 1 + 0.006 * int((PAR - 65) * 12) : 1 + 0.006 * 60;
  if (int(born + PAR) > 1999) faktor = 1.025 * faktor;
  let stpAr: number;
  if (born <= 1937) stpAr = 30;
  else if (born <= 1940) stpAr = 32;
  else if (born <= 1941) stpAr = 33;
  else if (born <= 1942) stpAr = 34;
  else if (born <= 1943) stpAr = 35;
  else if (born <= 1944) stpAr = 36;
  else stpAr = 37;
  pbb = vbaRound(pbb); // "ByVal pbb As Long"
  const s = antal < stpAr ? (faktor * medel * pbb * 0.1 * antal) / stpAr : faktor * medel * pbb * 0.1;
  return int(s / 12 + 0.49) * 12;
}

/** PA_KLBPP(): the old PA-KL benefit level from the five best of seven years. */
export function paKlBpp(c: TjpContext, Zpar: number): number {
  const z = int(Zpar);
  const yp = [2, 3, 4, 5, 6, 7, 8].map((k) => (c.wage[z - k] ?? 0) / c.FPB[z - k]!);
  const [, y2, y3, y4, y5, y6, y7] = yp as [number, number, number, number, number, number, number];
  const large = (k: number) => [...yp].sort((a, b) => b - a)[k - 1]!;
  const avg = (...xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  // The VBA writes "yearpoint7 = 0 & yearpoint6 <> 0". "&" joins strings before the comparison,
  // so it reads (yearpoint7 = Val("0" & yearpoint6)) <> 0, with yearpoint6 as a 15-digit string.
  const str = (x: number) => Number(x.toPrecision(15));
  let y: number;
  if (y7 !== 0) y = avg(large(1), large(2), large(3), large(4), large(5));
  else if (y7 === str(y6)) y = avg(large(1), large(2), large(3), large(4));
  else if (y6 === str(y5)) y = avg(large(1), large(2), large(3));
  else if (y5 === str(y4)) y = avg(large(1), large(2));
  else if (y4 === str(y3)) y = avg(large(1), large(2));
  else if (y3 === str(y2)) y = avg(large(1), large(2));
  else y = avg(large(1));
  let bpp = 0;
  if (y >= 0 && y <= 1) bpp = y * 0.96;
  else if (y <= 2.5) bpp = 0.96 + (y - 1) * 0.785;
  else if (y <= 3.5) bpp = 0.96 + 1.5 * 0.785 + (y - 2.5) * 0.6;
  else if (y <= 7.5) bpp = 0.96 + 1.5 * 0.785 + 0.6 + (y - 3.5) * 0.64;
  else if (y <= 20) bpp = 0.96 + 1.5 * 0.785 + 0.6 + 4 * 0.64 + (y - 7.5) * 0.65;
  else bpp = 0.96 + 1.5 * 0.785 + 0.6 + 4 * 0.64 + 12.5 * 0.65 + (y - 20) * 0.325;
  return bpp;
}

export function paKl(c: TjpContext, Zpar: number, year: number, bpp: number): number {
  if (year > 1997) return 0;
  let tid = year < 1997 ? Zpar - c.wStart : 1997 - (int(c.born) + c.wStart);
  if (tid > 30) tid = 30;
  const base = year < 1997 ? c.FPB[int(Zpar)]! : c.pbb[int(Zpar)]!;
  return int(((tid / 30) * bpp * base) / 12 + 0.5) * 12;
}

function kapRates(c: TjpContext, alder: number, year: number, akap: boolean): [number, number, number] {
  const born = c.born;
  let p1 = 0;
  let p2 = 0;
  let monthZero = false;
  if (!akap) {
    if (year < 1998) {
      [p1, p2] = [0.035, 0.011];
      if (alder < 28) [monthZero, p1, p2] = [true, 0, 0];
    } else if (year <= 2002) {
      if (alder > 27) [p1, p2] = [0.034, 0.01];
    } else if (year < 2005) {
      p1 = 0.035;
      if (alder > 27) p2 = 0.011;
    } else if (year === 2006 || int(born) <= 1946) [p1, p2] = [0.045, 0.021];
    else if (year === 2007) [p1, p2] = [0.04, 0.04];
    else if (year <= 2009) [p1, p2] = [0.0425, 0.0425];
    else [p1, p2] = [0.045, 0.045];
  } else {
    if (year < 2003) {
      [p1, p2] = [0.035, 0.011];
      if (alder < 28) [monthZero, p1, p2] = [true, 0, 0];
    } else if (year < 2005) {
      p1 = 0.035;
      if (alder > 27) p2 = 0.011;
    } else if (year === 2006 && int(born) <= 1946) [p1, p2] = [0.045, 0.021];
    else if (year === 2006 && int(born) > 1946) [p1, p2] = [0.04, 0.04];
    else if (year <= 2007) [p1, p2] = [0.04, 0.04];
    else if (year <= 2009) [p1, p2] = [0.0425, 0.0425];
    else [p1, p2] = [0.045, 0.045];
    if (int(born) > 1985 && year >= 2014 && year < 2023) [p1, p2] = [0.045, 0.3];
    const las = c.riktage + 3;
    if (year >= 2023 && alder <= las) [p1, p2] = [0.06, 0.315];
    else if (year >= 2023 && alder > las) [p1, p2] = [0.06, 0.06];
  }
  return [p1, p2, monthZero ? 0 : 1];
}

function kapMonth(c: TjpContext, alder: number, Zpar: number, highAge: number, year: number) {
  const { born } = c;
  let inkomstFactor = 1;
  let month: number;
  if (Zpar > highAge) Zpar = highAge;
  if (born > 1985 && alder < 21 && year >= 2014) {
    if (alder < c.wStart) return { month: 0, factor: 0 };
    if (c.wStart === alder) {
      month = int((int(born + alder + 1) - born - c.wStart) * 12);
      month = Math.max(0, Math.min(12, month));
      inkomstFactor = month / 12;
    } else month = 12;
  } else if (alder < 21) return { month: 0, factor: 0 };
  else if (alder === 21) {
    month = int((int(born + 21 + 1) - born - c.wStart) * 12);
    month = Math.max(0, Math.min(12, month));
    inkomstFactor = month / 12;
  } else if (alder < int(Zpar)) {
    if (alder > c.wStart) month = 12;
    else {
      month = int((int(born + c.wStart + 1) - born - c.wStart) * 12);
      inkomstFactor = month / 12;
    }
  } else if (alder === int(Zpar)) {
    month = Zpar < highAge ? int((born + Zpar - int(born + Zpar)) * 12) : int((born - int(born)) * 12);
    inkomstFactor = month / 12;
  } else month = 0;
  return { month, factor: inkomstFactor };
}

export function tlKapKl(c: TjpContext, alder: number, inkomst: number, IBB: number, Zpar: number, year: number): number {
  if (year < 1998) return 0;
  if (alder < 21) return 0;
  const highAge = year > 2002 ? 67 : 65;
  const { month, factor } = kapMonth(c, alder, Zpar, highAge, year);
  inkomst = inkomst * factor;
  if (IBB === 0) IBB = inkomst;
  if (month === 0) return 0;
  const [p1, p2, keep] = kapRates(c, alder, year, false);
  if (!keep) return 0;
  if (inkomst > 30 * IBB) inkomst = 30 * IBB;
  const p = inkomst <= 7.5 * IBB ? p1 * inkomst : p2 * (inkomst - 7.5 * IBB) + p1 * 7.5 * IBB;
  return int(p + 0.5);
}

export function tlAkapKr(c: TjpContext, alder: number, inkomst: number, IBB: number, Zpar: number, year: number): number {
  const highAge = year < 2003 ? 65 : year < 2023 ? 67 : 150;
  const { month, factor } = kapMonth(c, alder, Zpar, highAge, year);
  inkomst = inkomst * factor;
  if (IBB === 0) IBB = inkomst;
  if (month === 0) return 0;
  const [p1, p2, keep] = kapRates(c, alder, year, true);
  if (!keep) return 0;
  if (inkomst > 30 * IBB) inkomst = 30 * IBB;
  const p = inkomst <= 7.5 * IBB ? p1 * inkomst : p2 * (inkomst - 7.5 * IBB) + p1 * 7.5 * IBB;
  return int(p + 0.5);
}

const KAPKL: Record<number, [number, number]> = {
  1947: [0.6214, 0.3107], 1948: [0.6179, 0.3089], 1949: [0.6143, 0.3071], 1950: [0.6107, 0.3054],
  1951: [0.6071, 0.3036], 1952: [0.6036, 0.3018], 1953: [0.6, 0.3], 1954: [0.5964, 0.2982],
  1955: [0.5929, 0.2964], 1956: [0.5893, 0.2946], 1957: [0.5857, 0.2929], 1958: [0.5821, 0.2911],
  1959: [0.5786, 0.2893], 1960: [0.575, 0.2875], 1961: [0.5714, 0.2857], 1962: [0.5679, 0.2839],
  1963: [0.5643, 0.2821], 1964: [0.5607, 0.2804], 1965: [0.5571, 0.2786], 1966: [0.5536, 0.268],
};

export function kapKlF(arsmedel: number, aar = 30, IBB = 45900, fodar = 1959): number {
  let p2: number;
  let p3: number;
  if (fodar <= 1946) [p2, p3] = [0.625, 0.3125];
  else if (fodar <= 1966) [p2, p3] = KAPKL[fodar]!;
  else if (fodar < 1986) [p2, p3] = [0.55, 0.275];
  else [p2, p3] = [0, 0];
  let b: number;
  if (arsmedel > 30 * IBB) b = (30 - 20) * IBB * p3 + (20 - 7.5) * p2 * IBB;
  else if (arsmedel > 20 * IBB) b = (arsmedel - 20 * IBB) * p3 + (20 - 7.5) * p2 * IBB;
  else if (arsmedel > 7.5 * IBB) b = (arsmedel - 7.5 * IBB) * p2;
  else b = 0;
  if (aar < 30) b = b * (aar / 30);
  return b;
}

/** TJP_ratt: the premium (pensionsrätt) to the tjänstepension for one year. */
export function tjpRatt(c: TjpContext, age: number, wage: number, IBB: number, year: number): number {
  switch (c.avtal) {
    case 2:
      return tlITP1(c, age, wage, IBB, c.tjpPar);
    case 3:
      return year > 1976 ? tlITP2A(c, age, wage, c.tjpPar) : 0;
    case 4:
      return safLo(c, age, wage, vbaRound(IBB), c.tjpPar, year);
    case 5:
      return tlKapKl(c, age, wage, vbaRound(IBB), c.tjpPar, year);
    case 6:
      return tlAkapKr(c, age, wage, vbaRound(IBB), c.tjpPar, year);
    case 7:
      return kapan(c, year, int(c.born), IBB, wage, c.tjpPar) + paIndiv(c, year, int(c.born), IBB, wage, c.tjpPar);
    case 8:
      return tlPA16(c, age, wage, IBB, c.tjpPar);
    default:
      return 0;
  }
}

/**
 * tjp_ddeltal(): adjusts the delningstal to the agreement's interest rate and life expectancy,
 * or for a temporary payout returns the annuity factor for the payout years.
 * Rng_ddelat is 0, so a lifelong payout keeps the delningstal.
 */
export function tjpDdeltal(c: TjpContext, tal: number, val: number, year: number): number {
  let utbtid = c.tempYears;
  if (utbtid <= 0) utbtid = 100;
  if (utbtid > 98) return tal;
  let kranta0: number;
  let life0: number;
  if (year < 2018) [kranta0, life0] = year < 2002 ? [4, 20.3] : [3, 20.3];
  else [kranta0, life0] = [1.75, 22.65];
  const late = year > 2019;
  const [b1, b2] = late ? [-0.16216, 0.84517] : [-0.27166, 0.78457];
  let kranta: number;
  let life: number;
  if (val === 1) [kranta, life] = late ? [3.5, 22.6] : [2.5, 22];
  else if (val < 4) [kranta, life] = late ? [2.2, 22] : [2.9, 22];
  else if (val === 4) [kranta, life] = late ? [1.3, 20.8] : [2.25, 21.3];
  else if (val < 7) [kranta, life] = late ? [2.75, 23.1] : [2.75, 22.8];
  else [kranta, life] = late ? [2, 23.3] : [2, 21.9];
  if (utbtid < 30) {
    // Makeham mortality, discounted at the agreement's interest rate.
    const PAR = c.tjpPar;
    const surv = 1 - (0.0002 + 0.000007 * Math.exp(0.1071 * PAR));
    let S = 0;
    for (let i = PAR; i <= PAR + int(utbtid) - 1; i++) {
      const my = 0.0002 + 0.000007 * Math.exp(0.1071 * i);
      S += (1 - my) / (1 + kranta / 100) ** (i - PAR);
    }
    return S / surv;
  }
  return vbaRound(tal * (1 + b1 * (kranta / kranta0 - 1) + b2 * (life / life0 - 1)), 2);
}

/** FTJP's correction of a förmånsbestämd pension for a temporary payout. */
function tempFactor(c: TjpContext, age: number): number {
  if (c.tempYears <= 0) return 1;
  return deltal(c.tjpPar, int(c.born), age, 99, "PP") / tjpDdeltal(c, 15, 4, yearOf(c, age));
}

/** tjpkassa(): yearly tjänstepension from the premium balance. */
export function tjpkassa(c: TjpContext, alder: number, pbh: number, tMonth: number): number {
  if (pbh < 1) return 0;
  const { born, tjpPar } = c;
  const konst = int(born + tjpPar + 1 / 1000) > int(born) + int(tjpPar) ? 1 : 0;
  let delTal: number;
  if (born < 1938) delTal = 13;
  else if (alder < 98) {
    delTal = deltal(tjpPar, born, alder, 999, "PP");
    if (delTal <= 0) delTal = deltal(tjpPar + 1, born, alder, 999, "PP") + 0.6;
  } else delTal = 2;
  delTal = tjpDdeltal(c, delTal, c.avtal, yearOf(c, alder));
  let month = tMonth;
  let kassa = 0;
  if (alder < int(tjpPar + konst)) kassa = 0;
  else if (alder === int(tjpPar + konst)) kassa = pbh / delTal;
  else {
    kassa = pbh / delTal;
    month = 12;
  }
  return int(kassa / 12 + 0.5) * month;
}

/** FTJP(): adds the förmånsbestämd parts of ITP 2, STP, KAP-KL and PA 03 in the first pension year. */
export function ftjp(
  c: TjpContext,
  tjpAge: number,
  startage: number,
  age: number,
  stpPoints: number[],
  tp: number[],
  tMonth: number,
): number {
  const { born, tjpPar, avtal } = c;
  const yr = (a: number) => int(born) + a;
  const ratio = () =>
    age === 65 ? 1 : deltal(65, int(born), 65, 99, "PP") / deltal(tjpPar, int(born), age, 99, "PP");

  if (avtal === 3) {
    let tpYear = 0;
    for (let k = startage; k <= 68; k++) if ((c.wage[k] ?? 0) > 0) tpYear++;
    const diverse = ratio() * tempFactor(c, age);
    let underlag = dcUnderlag(c, 0);
    underlag = tlITP2F(c, underlag, c.IBB[age - 1]!, tpYear) * diverse;
    tjpAge += (underlag * tMonth) / 12;
  }
  if (avtal === 4) {
    let underlag = 0;
    let tpYear = 0;
    for (let k = 28; k <= 64; k++) {
      if (born < 1968) {
        if (yr(k) < 1996) {
          tpYear++;
          underlag += stpPoints[k] ?? 0;
        }
      } else if (k >= 55 && k <= 59 && (stpPoints[k] ?? 0) > 0) {
        tpYear++;
        underlag += (stpPoints[k] ?? 0) / 5;
      }
    }
    let diverse = 0;
    if (yr(65) > 1960) diverse = tjpPar < 65 ? c.FPB[int(tjpPar)]! : c.FPB[65]!;
    underlag = tpYear > 0 && underlag > 0 ? stp(c, underlag / tpYear + 1, tpYear, diverse) : 0;
    tjpAge += (underlag * ratio() * tempFactor(c, age) * tMonth) / 12;
  }
  if (avtal === 5 || avtal === 6) {
    const und = [0, 0, 0, 0, 0, 0, 0];
    let tpYear = 0;
    let d = 0;
    for (let k = 28; k <= 70; k++) {
      if ((stpPoints[k] ?? 0) > 0) tpYear++;
      if (tjpPar - k >= 2 && tjpPar - k < 9) {
        let v = mini(c.wage[k] ?? 0, c.IBB[k]! * 30);
        if (yr(k) >= 1960) v = (v * c.KPIj[tjpPar - 1]!) / c.KPIj[k]!;
        und[d] = v;
        d++;
      }
    }
    und.sort((a, b) => a - b);
    let underlag = 0;
    for (let k = 2; k <= 6; k++) underlag += und[k]! / 5;
    underlag = vbaRound(underlag, 0);
    const diverse = ratio() * tempFactor(c, age);
    if (yr(age) > 1997) {
      if (yr(28) < 1995) {
        const age1997 = 1997 - int(born);
        const bpp = paKlBpp(c, age1997);
        let workyear = 1997 - (int(born) + c.wStart);
        if (workyear > 30) workyear = 30;
        underlag =
          (paKl(c, age1997, 1997, bpp) -
            0.6 * (stpPoints[age1997] ?? 0) * (workyear / 30) * c.pbb[age1997]! -
            0.96 * c.pbb[age1997]! * (workyear / 30)) *
          1.08 *
          (c.IBB[age - 1]! / c.IBB[1998 - int(born)]!);
        // The VBA passes this amount (not the salary) to KAPKL_f.
        underlag =
          underlag < 0
            ? kapKlF(underlag, tpYear, c.IBB[tjpPar - 1]!, born)
            : kapKlF(underlag, tpYear, c.IBB[tjpPar - 1]!, born) + underlag;
      } else {
        underlag = kapKlF(underlag, tpYear, c.IBB[tjpPar - 1]!, born);
      }
    } else {
      const bpp = paKlBpp(c, tjpPar);
      underlag = paKl(c, tjpPar, yr(age), bpp) - (tp[age] ?? 0);
      if (underlag < 1200) underlag = 1200;
    }
    tjpAge += underlag * diverse;
  }
  if (avtal === 7) {
    let tpYear = 0;
    for (let k = 28; k <= 64; k++) if ((c.wage[k] ?? 0) > 0) tpYear++;
    let underlag = dcUnderlag(c, 1);
    const b = maxi(1938, int(born));
    const diverse =
      (age === 65 ? 1 : deltal(65, b, 65, 99, "PP") / deltal(tjpPar, b, age, 99, "PP")) * tempFactor(c, age);
    underlag = (tlPA03(c, underlag, tpYear, c.IBB[age - 1]!, born) * diverse) / 12;
    underlag = int(underlag + 0.49);
    tjpAge += underlag * tMonth;
  }
  return tjpAge;
}

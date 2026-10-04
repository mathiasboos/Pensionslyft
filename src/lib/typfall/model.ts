// Port of the VBA procedures startsetup() and Mcalc() in Pensionsmyndighetens typfallsmodell
// (ver. 4.8), for the model's default settings:
// - wage given in 2025's wage level, "rak löneprofil" (the wage follows inkomstindex)
// - whole-year birth year and pension age, 100 % withdrawal, tjänstepension from the same age
// - inflation 0 %, results in fixed 2025 prices, historical average municipal tax
// - no children, no PGB, no private savings, no housing supplement (bostadstillägg)
import { cohortValue, riktaldrar } from "./data";
import {
  IP_,
  andel,
  deltal,
  fnDeltalIP,
  fnDeltalIP2,
  gp,
  gpavgift,
  ipavgift,
  pgi,
  ppavgift,
  ppkassa,
  tillagg,
} from "./rules";
import { at, buildSeries } from "./series";
import { avdragxx, faAred, jobbxx, publicAvg, statlig, xage } from "./tax";
import { type Avtal, type TjpContext, ftjp, tjpRatt, tjpkassa } from "./tjp";
import { avkskatt } from "./rules";
import { excelRound, int, maxi, vbaRound } from "./vba";

export type { Avtal };

export interface TypfallInput {
  born: number; // födelseår
  par: number; // pensionsålder (allmän pension och tjänstepension)
  wStart: number; // ålder när man börjar arbeta
  monthlyWage: number; // månadslön i 2025 års lönenivå
  avtal: Avtal;
  gift: boolean;
  realGrowth: number; // real tillväxt per år, t.ex. 0.016
  realReturn: number; // real avkastning efter avgifter, t.ex. 0.017
}

export interface TypfallYear {
  year: number;
  age: number;
  /** Amounts per year in fixed 2025 prices, rounded as the model's Utdata sheet. */
  lon: number;
  ip: number;
  pp: number;
  gp: number;
  tillagg: number;
  tjp: number;
  brutto: number;
  netto: number | null; // null for years before 2020 (tax rules not included)
}

export interface TypfallResult {
  input: TypfallInput;
  riktalder: number;
  lowestAge: number;
  pensionYear: number;
  /** Tabell 1: yearly amounts at the pension age in fixed 2025 prices. */
  slutlon: number; // average wage the 5 years before the pension
  slutlonNetto: number | null;
  ip: number;
  pp: number;
  gp: number;
  tillagg: number;
  allman: number;
  tjp: number;
  brutto: number;
  netto: number;
  years: TypfallYear[];
  /** Raw yearly values in current prices, for comparison with the model's verbose output. */
  verbose: Record<string, number>[];
}

export const W_REF = 2025;
const STARTAGE = 1;
const SLUTAGE = 105;

export function runTypfall(input: TypfallInput): TypfallResult {
  const born = input.born;
  const PAR = input.par;
  const defAr = PAR;
  const tjpPar = PAR;
  const { lowest: riktl, rikt: riktalder } = riktaldrar(born);
  if (PAR < riktl) throw new Error(`Allmän pension går att ta ut tidigast vid ${riktl} års ålder`);
  const s = buildSeries(input.realGrowth, input.realReturn);
  const civ = input.gift ? 1 : 0;
  const forstid = 40;
  const wStart = input.wStart;
  const andelnya = andel(born);
  const income = input.monthlyWage * 12;
  const wTime = W_REF - born;
  // rng_Boundray_Year = 0, so the rules are never income-indexed (kvoten = 1) and drop out.

  const n = SLUTAGE + 2;
  const arr = () => new Array<number>(n).fill(0);
  const year_ = arr();
  const IBB = arr(), pbb = arr(), FPB = arr(), KPI = arr(), KPIj = arr();
  const Iindex = arr(), Pindex = arr(), yieldF = arr(), RGK = arr(), MPGI = arr();
  const IP_avg = arr(), PP_avg = arr(), TP_avg = arr();
  const IP_arv1 = arr(), IP_arv2 = arr(), PP_arv = arr();
  const Kom_skatt = arr(), Begravavg = arr(), Tax_limit1 = arr(), Tax_limit2 = arr();
  const Income_ = arr(), Wage_ = arr();

  // ---------------- startsetup ----------------
  const nyck = (series: number[], year: number) => at(series, s, year);
  for (let age = STARTAGE; age <= SLUTAGE; age++) {
    const year = int(born) + age;
    year_[age] = year;
    if (year > 1959) {
      KPIj[age] = nyck(s.KPIj, year);
      KPI[age] = nyck(s.KPI, year);
      pbb[age] = nyck(s.PBB, year);
      IBB[age] = nyck(s.IBB, year);
      FPB[age] = nyck(s.FPB, year);
      MPGI[age] = nyck(s.MPGI, year);
      Iindex[age] = nyck(s.Iindex, year);
      Pindex[age] = nyck(s.Pindex, year);
      if (Pindex[age]! < 1 || Pindex[age]! > Iindex[age]!) Pindex[age] = Iindex[age]!;
      yieldF[age] = 1 + nyck(s.yieldQ, year); // rng_Avkastning_val = 2: historical PPM index
    } else {
      yieldF[age] = 1.09;
      KPIj[age] = KPI[age] = 25.39;
      pbb[age] = IBB[age] = FPB[age] = 4200;
      Iindex[age] = 6.54 / 1.06 ** (1960 - year);
    }
    RGK[age] = year > 1995 ? 1 + nyck(s.rgkPct, year) / 100 : 1;
    IP_avg[age] = year < 1960 ? 1 : nyck(s.ipAvg, year);
    PP_avg[age] = year < 2000 ? 1 : nyck(s.ppAvg, year);
    TP_avg[age] = PP_avg[age]!;

    // Arvsvinster
    if (age < 17 || year < 2000) {
      IP_arv1[age] = 1;
      IP_arv2[age] = 1;
    } else {
      if (age < riktl) {
        IP_arv1[age] = cohortValue(born, "arvIP1", age) || 1;
        IP_arv2[age] = 1;
        if (age === riktl - 1) IP_arv2[age] = cohortValue(born, "arvIP2", age);
        if (IP_arv2[age] === 0) IP_arv2[age] = 1;
      }
      if (age >= riktl) {
        IP_arv1[age] = 1;
        IP_arv2[age] = cohortValue(born, "arvIP2", age);
        if (IP_arv2[age] === 0) IP_arv2[age] = IP_arv2[age - 1]!;
        if (IP_arv2[age] === 0) IP_arv2[age] = 1;
      }
    }
    if (age < 15 || year < 2003) PP_arv[age] = 1;
    else PP_arv[age] = age < 106 ? cohortValue(born, "arvPP", age) : 0;

    // Taxes: historical average municipal tax (rng_Kommunalskatt = 0)
    Kom_skatt[age] = nyck(s.komSkatt, Math.max(year, 1930)) / 100;
    Tax_limit1[age] = year >= 2020 ? nyck(s.taxLimit1, year) : NaN;
    Tax_limit2[age] = year >= 2020 ? nyck(s.taxLimit2, year) : NaN;
    Begravavg[age] = year < 2000 ? 0 : nyck(s.begravning, year) / 100;

    Income_[age] = wages(age, year);
    Wage_[age] = Income_[age]!;
  }

  function wages(age: number, year: number): number {
    if (age < wStart) return 0;
    // The public uttagIP in Lön_mm is 0 before the pension and is not set in the pension year.
    const uttagIP = age > defAr ? 1 : 0;
    const wSlut = int(born + wTime);
    const konst = int(born + PAR + 1 / 1000) > int(born) + int(PAR) ? 1 : 0;
    const konst2 = int(born + defAr + 1 / 1000) > int(born) + int(defAr) ? 1 : 0;
    const konst3 = int(born + wStart + 1 / 1000) > int(born) + int(wStart) ? 1 : 0;
    if (age < int(wStart + konst3)) return 0;
    let wage = income;
    if (age <= int(defAr + konst) && age >= int(wStart)) {
      wage = (wage * nyck(s.Iindex, year)) / nyck(s.Iindex, wSlut);
    }
    // Nominal = False: the wage is in fixed prices of w_ref; KPI(wSlut)/KPI(w_ref) = 1.
    wage = (wage * nyck(s.KPI, wSlut)) / nyck(s.KPI, W_REF);
    let month: number;
    if (age === int(wStart + konst3)) month = int(12 - 12 * (born + wStart - int(born + wStart + 1 / 1000)));
    else if (age < int(PAR + konst)) month = 12;
    else if (age === int(PAR + konst)) {
      if (age === int(defAr + konst2))
        month = int(12 * (born + PAR - int(born + PAR + 1 / 1000))) + int(12 * (defAr - PAR) * (1 - uttagIP));
      else {
        month = int(12 * (born + PAR - int(born + PAR + 1 / 1000)));
        month = month + (12 - month) * (1 - uttagIP);
      }
    } else if (age < int(defAr + konst2)) month = 12 * (1 - uttagIP);
    else if (age === int(defAr + konst2)) month = 12 * (born + defAr - int(born + defAr + 1 / 1000)) * (1 - uttagIP);
    else month = 0;
    month = vbaRound(month); // "Dim month As Long"
    return (month * wage) / 12;
  }

  // ---------------- Mcalc ----------------
  const pgi_ = arr(), IP_ratt = arr(), TP_points = arr(), GP_ratt = arr(), PP_ratt = arr(), TJP_ratt = arr();
  const IP_pbh = arr(), GP_pbh = arr(), PP_pbh = arr(), TJP_pbh = arr();
  const ip = arr(), tp = arr(), pp = arr(), garp = arr(), ptillagg = arr(), TJP = arr();
  const STP_points = arr();
  const brutto = arr(), Netto = new Array<number>(n).fill(NaN);
  const pmonth = 12 - int(12 * (born + PAR - int(born + PAR)));
  const Tmonth = 12 - int(12 * (born + tjpPar - int(born + tjpPar)));
  const ARV_tjp = 1; // rng_Arvsvinster_TJP: utan återbetalningsskydd
  let pgiYears = 0;
  let pgbYears = 0;
  let uttagIP = 0;
  let uttagPP = 0;
  let dtalIP = 0;
  let gpUnd = 0;
  let mpension = 0;
  let gpundtab1 = 0;
  let Gage = 0;
  let rakassa = 0;
  const verbose: Record<string, number>[] = [];

  const ctx: TjpContext = {
    born,
    wStart,
    tjpPar,
    avtal: input.avtal,
    riktage: riktalder,
    wage: Wage_,
    IBB,
    pbb,
    FPB,
    KPIj,
  };

  // Garantipensionens delningstal: mortality!L5 for born 1959 and later.
  const gpDeltal = excelRound(
    cohortValue(born, "mIP", riktalder) * (cohortValue(born, "dIPn", PAR) / cohortValue(born, "mIP", PAR)),
    2,
  );

  for (let age = STARTAGE; age <= SLUTAGE; age++) {
    const year = year_[age]!;
    const Utgyear = year;
    const Skyear = year;
    pgi_[age] = pgi(Utgyear, Income_[age]!, pbb[age]!, IBB[age]!, FPB[age]!);

    if (age < PAR && int(born) > 1937) {
      uttagIP = 0;
      uttagPP = 0;
      if (age > 15 && age <= riktalder) {
        // No PGB (sjukersättning, barnår, plikt, studier) in the default typfall.
        if (pgi_[age]! > 0 && age < 71) pgbYears++;
      }
    }

    if (age === STARTAGE) {
      IP_ratt[age] = 0;
      if (age < 65 && year > 1959) {
        TP_points[age] = vbaRound(maxi(pgi_[age]! / FPB[age]! - 1, 0), 2);
        STP_points[age] = TP_points[age]!;
      }
      GP_ratt[age] = 0;
      PP_ratt[age] = 0;
    } else {
      if (age < 65) {
        if (year > 1959) {
          TP_points[age] = vbaRound(maxi(pgi_[age]! / FPB[age]! - 1, 0), 2);
          STP_points[age] = TP_points[age]!;
        } else {
          TP_points[age] = 0;
          STP_points[age] = 0;
        }
      }
      // pgbYears only changes which of three identical formulas the VBA uses when PGB is 0.
      IP_ratt[age] = ipavgift(year - 1, pgi_[age - 1]!, age - 1, andelnya, int(born));
      PP_ratt[age] = ppavgift(year - 1, pgi_[age - 1]!, age - 1, andelnya, int(born));
      GP_ratt[age] = gpavgift(year - 1, pgi_[age - 1]!, age - 1, andelnya, int(born), riktalder);
      if (age <= riktalder) {
        if (IP_ratt[age]! > 0 || TP_points[age - 1]! > 0) pgiYears++;
      }
    }

    TJP_ratt[age] = tjpRatt(ctx, age, Wage_[age]!, IBB[age]!, year);

    // Uttagsandel and delningstal
    if (age < int(PAR)) {
      dtalIP = 0;
      uttagIP = 0;
      uttagPP = 0;
    } else {
      if (age >= defAr) {
        uttagIP = 1;
        uttagPP = 1;
      }
      dtalIP = fnDeltalIP2(int(born), age, PAR, defAr);
    }

    const pRatio = Pindex[age]! / Pindex[age - 1]!;
    const bIndex = Pindex[age]! / Iindex[age]!;

    // Allmänna pensioner
    if (age < int(PAR)) {
      ip[age] = 0;
      tp[age] = 0;
      pp[age] = 0;
      garp[age] = 0;
      ptillagg[age] = 0;
      mpension = 0;
    } else if (age === int(PAR)) {
      ip[age] = IP_(year, PAR, born, IP_ratt[age]!, IP_arv1[age]!, IP_arv2[age]!, IP_avg[age]!, IP_pbh[age - 1]!, uttagIP, ip[age - 1]!, dtalIP, pRatio, defAr, 0, bIndex);
      gpundtab1 = 0;
      if (age < riktalder || year < int(PAR) + born) {
        garp[age] = 0;
      } else {
        dtalIP = gpDeltal;
        gpUnd = IP_(year, maxi(PAR, riktalder), born, GP_ratt[age]!, IP_arv1[age]!, IP_arv2[age]!, IP_avg[age]!, GP_pbh[age - 1]!, 1, garp[age - 1]!, dtalIP, pRatio, defAr, 0, bIndex);
        garp[age] = gp((gpUnd * 12) / pmonth, civ, int(born), pbb[age]!, forstid, age, Utgyear, riktalder, uttagIP);
        if (int(PAR) === age) garp[age] = ((garp[age]! * pmonth) / 12) * uttagIP;
        mpension = gpUnd / pmonth;
        if (age === int(PAR)) gpundtab1 = mpension;
      }
      pp[age] = ppkassa(PAR, born, age, PP_pbh[age - 1]! * yieldF[age]! ** ((12 - pmonth) / 12), defAr, uttagPP);
      if (age < riktalder || year < int(PAR) + born) ptillagg[age] = 0;
      else {
        const i2021 = 2021 - int(born) > STARTAGE ? Iindex[2021 - int(born)]! : 186.52;
        ptillagg[age] = tillagg(12 * mpension, Utgyear, Iindex[age]!, i2021, uttagIP, pgiYears, born);
        ptillagg[age] = year === 2021 ? (ptillagg[age]! * Math.min(4, pmonth)) / 12 : (ptillagg[age]! * pmonth) / 12;
      }
    } else {
      let ppmonth = pmonth;
      if (int(PAR) + 1 < age) ppmonth = 12;
      if (age <= defAr) dtalIP = fnDeltalIP(born, age);
      ip[age] = IP_(year, PAR, born, IP_ratt[age]!, IP_arv1[age]!, IP_arv2[age]!, IP_avg[age]!, IP_pbh[age - 1]!, uttagIP, ip[age - 1]!, dtalIP, pRatio, defAr, 0, bIndex);
      tp[age] = 0;
      dtalIP = gpDeltal;
      gpUnd = IP_(year, maxi(PAR, riktalder), born, GP_ratt[age]!, IP_arv1[age]!, IP_arv2[age]!, IP_avg[age]!, GP_pbh[age - 1]!, 1, gpUnd, dtalIP, pRatio, defAr, 0, bIndex);
      garp[age] = age >= riktalder ? gp(gpUnd, civ, int(born), pbb[age]!, forstid, age, Utgyear, riktalder, uttagIP) : 0;
      mpension = gpUnd / pmonth;
      if (mpension === 0 && ip[age]! > 0) mpension = (ip[age]! * (185 / 160) * (1 / uttagIP)) / ppmonth;
      pp[age] = ppkassa(PAR, born, age, PP_pbh[age - 1]!, defAr, uttagPP);
      if (age < riktalder || year < int(PAR) + born) ptillagg[age] = 0;
      else {
        const i2021 = 2021 - int(born) > STARTAGE ? Iindex[2021 - int(born)]! : 182.58;
        ptillagg[age] = tillagg(12 * mpension, Utgyear, Iindex[age]!, i2021, uttagIP, pgiYears, born);
        ptillagg[age] = year === 2021 ? (ptillagg[age]! * Math.min(4, pmonth)) / 12 : (ptillagg[age]! * pmonth) / 12;
      }
    }

    // Tjänstepension
    if (age < int(tjpPar)) {
      TJP[age] = 0;
    } else if (year === int(born + tjpPar)) {
      TJP[age] = tjpkassa(ctx, age, (TJP_ratt[age]! + TJP_pbh[age - 1]!) * yieldF[age]! ** ((12 - Tmonth) / 12), Tmonth);
      TJP[age] = ftjp(ctx, TJP[age]!, STARTAGE, age, STP_points, tp, Tmonth);
    } else {
      TJP[age] = (TJP[age - 1]! * pbb[age]!) / pbb[age - 1]!;
      if (year === int(tjpPar + born + 1)) TJP[age] = TJP[age]! * (12 / Tmonth);
    }

    ip[age] = int(ip[age]! / 12 + 0.5) * 12;
    pp[age] = int(pp[age]! / 12 + 0.5) * 12;
    TJP[age] = int(TJP[age]! / 12 + 0.5) * 12;

    // Pensionskapital, utgående balans
    if (age === STARTAGE) {
      IP_pbh[age] = 0;
      GP_pbh[age] = 0;
      PP_pbh[age] = 0;
      TJP_pbh[age] = 0;
    } else if (year > 1960) {
      if (age < SLUTAGE) {
        IP_pbh[age] = IP_(year, PAR, born, IP_ratt[age]!, IP_arv1[age]!, IP_arv2[age]!, IP_avg[age]!, IP_pbh[age - 1]!, uttagIP, ip[age - 1]!, dtalIP, pRatio, defAr, 4, bIndex);
        GP_pbh[age] = IP_(year, maxi(PAR, riktalder), born, GP_ratt[age]!, IP_arv1[age]!, IP_arv2[age]!, IP_avg[age]!, GP_pbh[age - 1]!, 1, ip[age - 1]!, dtalIP, pRatio, defAr, 4, bIndex);
      }
      const y = yieldF[age]!;
      // PPMavg() is 0: the fund return is already net of fees (rng_Avkastning_fondavgifter = 1).
      if (year_[age - 1]! < 2010)
        PP_pbh[age] = PP_pbh[age - 1]! * y + PP_pbh[age - 1]! * (PP_arv[age]! - 1) + RGK[age]! * PP_ratt[age]!;
      else
        PP_pbh[age] = PP_pbh[age - 1]! * y + (PP_pbh[age - 1]! * (PP_arv[age]! - 1)) / y ** (6 / 12) + RGK[age]! * PP_ratt[age]!;
    }
    if (age === STARTAGE) {
      TJP_pbh[age] = TJP_ratt[age]! * yieldF[age]! ** 0.5;
    } else {
      const y = yieldF[age]!;
      PP_pbh[age] = PP_pbh[age]! - pp[age]! * y ** 0.5;
      TJP_pbh[age] =
        TJP_ratt[age]! * y ** 0.5 + TJP_pbh[age - 1]! * y * TP_avg[age]! + TJP_pbh[age - 1]! * (PP_arv[age - 1]! - 1) * ARV_tjp;
      const kskatt = TJP_pbh[age]! * avkskatt(year, 0);
      TJP_pbh[age] = TJP_pbh[age]! - kskatt - TJP[age]! * y ** 0.5;
    }
    if (TJP_pbh[age]! < 0) TJP_pbh[age] = 0;
    IP_pbh[age] = int(IP_pbh[age]!);
    GP_pbh[age] = int(GP_pbh[age]!);
    PP_pbh[age] = int(PP_pbh[age]!);
    TJP_pbh[age] = int(TJP_pbh[age]!);

    // Brutto och skatt
    brutto[age] = Income_[age]! + ip[age]! + tp[age]! + garp[age]! + pp[age]! + TJP[age]! + ptillagg[age]!;
    Gage = xage(Skyear, riktalder);
    if (Skyear >= 2020) {
      const ctxfvi = int(brutto[age]! / 100) * 100;
      const grundavdrag = avdragxx(ctxfvi, pbb[age]!, age, Skyear, Gage);
      const pensionavgift = pgi(Utgyear, Income_[age]!, pbb[age]!, IBB[age]!, FPB[age]!, 1);
      const sred = pgi(Utgyear, Income_[age]!, pbb[age]!, IBB[age]!, FPB[age]!, 2);
      const cbefvi = ctxfvi - grundavdrag - pensionavgift + sred;
      const kinkskatt = int(cbefvi * Kom_skatt[age]!);
      const kyrkskatt = int(cbefvi * Begravavg[age]!);
      const statskatt = statlig(cbefvi, Tax_limit1[age]!, Tax_limit2[age]!) + publicAvg(cbefvi, age, Skyear, IBB[age]!);
      const pensredukt = sred;
      let jobbavdrag = jobbxx(Wage_[age]!, age, Kom_skatt[age]!, pbb[age]!, ctxfvi - Wage_[age]!, Skyear, Gage);
      if (kinkskatt - pensredukt < jobbavdrag) jobbavdrag = kinkskatt - pensredukt;
      rakassa = 0; // a-kassa and fackavgift are 0
      let faAvdrag = faAred(cbefvi, Skyear);
      if (kinkskatt - faAvdrag - jobbavdrag < faAvdrag) faAvdrag = kinkskatt - faAvdrag - jobbavdrag;
      Netto[age] =
        brutto[age]! - maxi(kinkskatt + kyrkskatt + statskatt + pensionavgift - pensredukt - jobbavdrag - rakassa - faAvdrag, 0);
      verbose.push({
        age, year, Tax_ink: ctxfvi, Grundavdrag: grundavdrag, Pensionavgift: pensionavgift, Besk_inkomst: cbefvi,
        Kyrk_begravn: kyrkskatt, Kommunal_skatt: kinkskatt, Statlig_skatt: statskatt,
        Skattereduktioner: pensredukt + jobbavdrag + faAvdrag, Nettoinkomst: Netto[age]!,
      });
    } else verbose.push({ age, year });
    Object.assign(verbose[verbose.length - 1]!, {
      Lön: Wage_[age]!, PGI: pgi_[age]!, IP_rätt: IP_ratt[age]!, PP_rätt: PP_ratt[age]!, GP_rätt: GP_ratt[age]!,
      IP_PBH: IP_pbh[age]!, PP_PBH: PP_pbh[age]!, GP_PBH: GP_pbh[age]!, TJP_PBH: TJP_pbh[age]!,
      IP: ip[age]!, PP: pp[age]!, GP: garp[age]!, ptillagg: ptillagg[age]!, TJP: TJP[age]!, Brutto: brutto[age]!,
      TJP_premie: TJP_ratt[age]!,
    });
  }

  // ---------------- Tabell 1: the pension at PAR including the last pension right ----------------
  const fixed = (age: number) => KPI[Math.max(STARTAGE, W_REF - int(born))]! / KPI[age]!;
  const avgYears = 5;
  let slut = 0;
  let slutNetto = 0;
  let nettoKnown = true;
  for (let k = 1; k <= avgYears; k++) {
    const a = int(PAR) - k;
    slut += Income_[a]! * fixed(a);
    if (Number.isNaN(Netto[a]!)) nettoKnown = false;
    slutNetto += Netto[a]! * fixed(a);
  }
  slut /= avgYears;
  slutNetto /= avgYears;

  const P = int(PAR);
  const dIPn = deltal(PAR, int(born), PAR, defAr, "IP");
  const dPPn = deltal(PAR, int(born), PAR, defAr, "PP");
  IP_pbh[P] = (12 / pmonth) * ip[P]! * dIPn + IP_pbh[P]!;
  tp[P] = tp[P]! * (12 / pmonth);
  PP_pbh[P] = (12 / pmonth) * pp[P]! * dPPn + PP_ratt[P]!;
  ip[P] = IP_pbh[P]! / dIPn;
  pp[P] = PP_pbh[P]! / dPPn;
  const dtalRikt = deltal(riktalder, int(born), riktalder, riktalder, "IP");
  if (dtalRikt > 0 && PAR >= riktalder) {
    let und = IP_(year_[P]!, PAR, born, GP_ratt[P]!, IP_arv1[P]!, IP_arv2[P]!, IP_avg[P]!, GP_pbh[P - 1]!, 1, garp[P - 1]!, dtalRikt, Pindex[P]! / Pindex[P - 1]!, defAr, 0, Pindex[P]! / Iindex[P]!);
    und = und + GP_pbh[P]! / dtalRikt;
    und = int((und + 0.49) / 12) * 12;
    garp[P] = gp(und + tp[P]!, civ, int(born), pbb[P]!, forstid, P, year_[P]!, riktalder, uttagIP);
  } else garp[P] = 0;
  {
    const i2021 = 2021 - int(born) > STARTAGE ? Iindex[2021 - int(born)]! : 182.58;
    ptillagg[P] = tillagg(gpundtab1 * 12, year_[P]!, Iindex[P]!, i2021, uttagIP, pgiYears, born);
    if (year_[P] === 2021) ptillagg[P] = (ptillagg[P]! * Math.min(4, pmonth)) / 12;
  }
  ip[P] = int((ip[P]! + 0.49) / 12) * 12;
  pp[P] = int((pp[P]! + 0.49) / 12) * 12;
  const tableBrutto = ip[P]! + tp[P]! + pp[P]! + garp[P]! + TJP[P]! + ptillagg[P]!;

  // Tax on the first pension year (no wage, no jobbskatteavdrag).
  let netto: number;
  {
    const ctxfvi = int(tableBrutto / 100) * 100;
    const grundavdrag = avdragxx(ctxfvi, pbb[P]!, P, year_[P]!, Gage);
    const cbefvi = ctxfvi - grundavdrag;
    const kinkskatt = int(cbefvi * Kom_skatt[P]!);
    const kyrkskatt = int(cbefvi * Begravavg[P]!);
    let statskatt = statlig(cbefvi, Tax_limit1[P]!, Tax_limit2[P]!) + publicAvg(cbefvi, P, year_[P]!, IBB[P]!);
    statskatt = int(statskatt);
    let faAvdrag = faAred(cbefvi, year_[P]!);
    if (kinkskatt - faAvdrag < faAvdrag) faAvdrag = kinkskatt - faAvdrag;
    netto = tableBrutto - maxi(kinkskatt + kyrkskatt + statskatt - rakassa - faAvdrag, 0);
  }

  const j0 = fixed(P);
  const years: TypfallYear[] = [];
  for (let age = STARTAGE; age <= SLUTAGE; age++) {
    const m = fixed(age);
    const r = (x: number) => vbaRound(x * m, 0);
    years.push({
      year: year_[age]!,
      age,
      lon: r(Income_[age]!),
      ip: r(age === P ? verbose[age - STARTAGE]!.IP! : ip[age]!),
      pp: r(age === P ? verbose[age - STARTAGE]!.PP! : pp[age]!),
      gp: r(age === P ? verbose[age - STARTAGE]!.GP! : garp[age]!),
      tillagg: r(age === P ? verbose[age - STARTAGE]!.ptillagg! : ptillagg[age]!),
      tjp: r(TJP[age]!),
      brutto: r(brutto[age]!),
      netto: Number.isNaN(Netto[age]!) ? null : r(Netto[age]!),
    });
  }

  return {
    input,
    riktalder,
    lowestAge: riktl,
    pensionYear: year_[P]!,
    slutlon: slut,
    slutlonNetto: nettoKnown ? slutNetto : null,
    ip: ip[P]! * j0,
    pp: pp[P]! * j0,
    gp: garp[P]! * j0,
    tillagg: ptillagg[P]! * j0,
    allman: (ip[P]! + tp[P]! + pp[P]! + garp[P]! + ptillagg[P]!) * j0,
    tjp: TJP[P]! * j0,
    brutto: tableBrutto * j0,
    netto: netto * j0,
    years,
    verbose,
  };
}

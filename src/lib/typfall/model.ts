// Port of the VBA procedures startsetup() and Mcalc() in Pensionsmyndighetens typfallsmodell
// (ver. 4.8). The basic input is the start page; TypfallAdvanced holds the settings from the
// sheets Adv_settings and PGB that the calculator offers. Birth year and pension ages are whole
// years. Taxes, benefits and the disposable income are computed from 2020.
import {
  antalBarn,
  barnbidrag,
  barnPerAlder,
  bist25,
  bobid,
  btp,
  btpSbtp,
  sbtp,
  ustod,
} from "./benefits";
import { cohortValue, riktaldrar } from "./data";
import { NO_PGB, type PgbInput, pgbByYear } from "./pgb";
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
  advanced?: Partial<TypfallAdvanced>;
}

/** Löneprofil (wage_profil): 0 rak, 1-4 the model's age profiles. */
export type Loneprofil = 0 | 1 | 2 | 3 | 4;
/** rng_Avkastning_val: 1 the given return also historically, 2 PPM index, 3 AP7 Såfa. */
export type Avkastningsval = 1 | 2 | 3;
/** rng_Kapitalförsäkring: 0 IPS, 1 kapitalförsäkring, 2 investeringssparkonto. */
export type Sparform = 0 | 1 | 2;
/** "": the historical average; "egen": a fee given by the user. */
export type Kyrka = "" | "medlem" | "stockholm" | "tranas" | "ovriga" | "egen";

/** The settings in the sheet Adv_settings that the calculator offers. */
export interface TypfallAdvanced {
  inflation: number; // rng_Yearly_Inflation, t.ex. 0.02
  avkastningsval: Avkastningsval;
  loneprofil: Loneprofil;
  slutlonAr: number; // Average_Earning: years in the average final wage
  andradLonAr: number; // TL_spec_y: the wage changes from this year (0: no change)
  andradLonFaktor: number; // TL_special: factor on the wage from andradLonAr
  barn: number[]; // rng_Född_Barn1-4: the children's birth years (barnår)
  forsakringstid: number; // rng_Försäkringstid_vid_65, years (max 40)
  flexpension: number; // rng_FlexPens: extra premium in ITP 1 and SAF-LO, t.ex. 0.02
  arvsvinsterTjp: boolean; // rng_Arvsvinster_TJP: true = utan återbetalningsskydd
  tempTjp: number; // rng_Temp_Tjp_Uttag: years, 0 = lifelong
  sparform: Sparform;
  sparManad: number; // IPS_Monthly: kr a month, or a share of the wage if at most 1
  sparStart: number; // IPS_start: first year of saving
  tempSpar: number; // rng_Temp_IPS_Uttag: years, 0 = over the remaining life expectancy
  kommunalskatt: number; // rng_Kommunalskatt: 0 = historical average, otherwise e.g. 0.3241
  // rng_Begravningsavgift: null = the historical average burial fee (not a member of a church).
  // The VBA reads it only together with an own kommunalskatt; here it applies on its own too.
  begravning: number | null;
  kyrka: Kyrka; // the church membership chosen in the form, only to show it again (not used in the model)
  // Allmän pension: partial withdrawal from par, all of it from defAr
  defAr: number; // rng_def_ar: 0 = everything from par
  uttagIP: number; // UttagIP before defAr: 0, 0.25, 0.5, 0.75 or 1
  uttagPP: number; // UttagPP before defAr
  sysselsattning: "deltid" | 0 | 1; // rngLönPartUttag: work during partial withdrawal
  tjpPar: number; // TJP_PAR: 0 = the same age as the final withdrawal
  // Bostadstillägg
  ansoker: boolean; // Rng_Ansokt
  hyra: number | null; // boendekostnad per månad in w_ref prices; null = 6 300 kr (+1 200 kr for married)
  makensInkomst: number | null; // per år; null = 80 % of the own wage for married, else 0
  formogenhet: number; // utöver bostaden
  kapital: number; // kapitalinkomster brutto per år, from the pension
  // Inkomstskatt
  fack: number; // fackföreningsavgift per år in 2019 prices
  akassa: number; // a-kasseavgift per år in 2019 prices
  // Kapital och avkastning: known balances at the end of an income year (null = not given)
  pbhYear: number; // rng_PBHYear: 0 = none
  pbhIP: number | null;
  pbhPP: number | null;
  pbhTJP: number | null;
  pbhPrivat: number | null;
  efterFondavgifter: boolean; // rng_Avkastning_fondavgifter
  // Lön: own income and wage by age (rng_Egen_Lon), in current prices
  egenLon: { age: number; year: number; income: number; wage: number }[] | null;
  pgb: PgbInput;
}

export const DEFAULT_ADVANCED: TypfallAdvanced = {
  inflation: 0,
  avkastningsval: 2,
  loneprofil: 0,
  slutlonAr: 5,
  andradLonAr: 0,
  andradLonFaktor: 1,
  barn: [],
  forsakringstid: 40,
  flexpension: 0,
  arvsvinsterTjp: true,
  tempTjp: 0,
  sparform: 0,
  sparManad: 0,
  sparStart: 2026,
  tempSpar: 0,
  kommunalskatt: 0,
  begravning: null,
  kyrka: "",
  defAr: 0,
  uttagIP: 1,
  uttagPP: 1,
  sysselsattning: "deltid",
  tjpPar: 0,
  ansoker: true,
  hyra: null,
  makensInkomst: null,
  formogenhet: 0,
  kapital: 0,
  fack: 0,
  akassa: 0,
  pbhYear: 0,
  pbhIP: null,
  pbhPP: null,
  pbhTJP: null,
  pbhPrivat: null,
  efterFondavgifter: true,
  egenLon: null,
  pgb: NO_PGB,
};

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
  ips: number; // private pension savings (IPS), taxed
  pps: number; // withdrawal from kapitalförsäkring or ISK, after tax
  brutto: number;
  netto: number | null; // null for years before 2020 (tax rules not included)
  bidrag: number | null; // bostadstillägg, bostadsbidrag, barnbidrag and bistånd
  disp: number | null; // disponibel inkomst: netto + bidrag + pps
}

export interface TypfallResult {
  input: TypfallInput;
  advanced: TypfallAdvanced;
  /** Försäkringstid used for garantipension, after the model's check against the working years. */
  forsakringstid: number;
  riktalder: number;
  lowestAge: number;
  pensionYear: number;
  /** Tabell 1: yearly amounts at the pension age in fixed 2025 prices. */
  slutlon: number; // average wage the advanced.slutlonAr years before the pension
  slutlonNetto: number | null;
  ip: number;
  tp: number; // tilläggspension (ATP), 0 for those born 1954 and later
  pp: number;
  gp: number;
  tillagg: number;
  allman: number;
  tjp: number;
  ips: number;
  pps: number;
  brutto: number;
  netto: number;
  bidrag: number; // bostadstillägg för pensionärer m.m.
  disp: number; // disponibel inkomst
  dispFore: number | null; // disponibel inkomst before the pension, average as slutlön
  /** Tabell 1 in current prices (the column "Löpande priser"). */
  current: {
    slutlon: number;
    slutlonNetto: number | null;
    ip: number;
    tp: number;
    pp: number;
    gp: number;
    tillagg: number;
    allman: number;
    tjp: number;
    ips: number;
    pps: number;
    brutto: number;
    netto: number;
    bidrag: number;
    disp: number;
    dispFore: number | null;
  };
  years: TypfallYear[];
  /** Income and wage by age in current prices, as used (for the table "egen löneutveckling"). */
  wagePath: { age: number; year: number; income: number; wage: number }[];
  /** Ages actually used: pension, final withdrawal and tjänstepension. */
  defAr: number;
  tjpPar: number;
  /** Raw yearly values in current prices, for comparison with the model's verbose output. */
  verbose: Record<string, number>[];
}

export const W_REF = 2025;
const STARTAGE = 1;
const SLUTAGE = 105;

// Coefficients of the fifth-degree age polynomials in wages() for the löneprofiler 1-4.
const PROFILES: Record<1 | 2 | 3 | 4, number[]> = {
  1: [-33.01341746, 4.354364353, -0.212974964, 0.005053746, -0.0000583887, 0.000000263128],
  2: [-20.6648551, 2.496893883, -0.10843247, 0.002287573, -0.0000236622, 0.0000000962164],
  3: [-23.73767932, 3.104093675, -0.149408507, 0.003477166, -0.0000392148, 0.000000171834],
  4: [-17.18584424, 2.203777173, -0.10280891, 0.00234388, -0.0000261194, 0.000000113668],
};
const poly = (b: number[], x: number) => b.reduce((sum, bk, k) => sum + bk * x ** k, 0);

/** pgb_barn(): pensionsgrundande belopp for barnår, the best of the three methods. */
function pgbBarn(ar: number, jink: number, uink: number, barn: number, parent: number, medel: number, IBB: number, rikt: number): number {
  if (barn <= 1959 || parent >= rikt) return 0;
  if (ar < barn || ar >= barn + 4) return 0;
  let v = jink - uink;
  if (0.75 * medel - uink > v) v = medel * 0.75 - uink;
  if (IBB > v) v = IBB;
  return int((v + 49) / 100) * 100;
}

// Statslåneräntan the year before the income year (Schablonintakt()).
const SLR: Record<number, number> = {
  1986: 0.1077, 1987: 0.1167, 1988: 0.1135, 1989: 0.1118, 1990: 0.1313, 1991: 0.1072, 1992: 0.1003,
  1993: 0.0855, 1994: 0.0957, 1995: 0.1014, 1996: 0.0789, 1997: 0.0647, 1998: 0.0498, 1999: 0.0489,
  2000: 0.0534, 2001: 0.0498, 2002: 0.0515, 2003: 0.0439, 2004: 0.043, 2005: 0.0324, 2006: 0.0362,
  2007: 0.0414, 2008: 0.0387, 2009: 0.0311, 2010: 0.0277, 2011: 0.0165, 2012: 0.0149, 2013: 0.0209,
  2014: 0.009, 2015: 0.0065, 2016: 0.0027, 2017: 0.0049, 2018: 0.0051, 2019: -0.0009, 2020: -0.001,
  2021: 0.0023, 2022: 0.0194, 2023: 0.0262, 2024: 0.0196, 2025: 0.0255,
};

export function schablonintakt(ar: number): number {
  let slr = ar > 2025 ? 0.025 : (SLR[ar - 1] ?? 0);
  if (ar > 2015 && ar < 2018) slr = Math.max(slr + 0.0075, 0.0125);
  else if (ar > 2017) slr = Math.max(slr + 0.01, 0.0125);
  return slr;
}

/** AvkastningsskattKFISK(): the yearly tax on a kapitalförsäkring or ISK, with the tax-free amount from 2025. */
export function avkastningsskattKfIsk(underlag: number, ar: number): number {
  if (ar < 2012) return underlag * 0.27 * schablonintakt(ar);
  if (ar < 2025) return underlag * 0.3 * schablonintakt(ar);
  const fri = ar === 2025 ? 150000 : 300000;
  return underlag > fri ? (underlag - fri) * 0.3 * schablonintakt(ar) : 0;
}

/** PrivatSpar(): next year's balance of a kapitalförsäkring (typ 1) or ISK (typ 2). */
export function privatSpar(ingaende: number, sparande: number, y: number, ar: number, typ: 1 | 2): number {
  if (typ === 1) {
    const ul = ingaende + sparande * (6 / 12) + sparande * (6 / 12) * 0.5;
    return ingaende * y + sparande * y ** (180 / 360) - avkastningsskattKfIsk(ul, ar);
  }
  if (ar <= 2011) return ingaende; // ISK came in 2012
  const ul =
    (ingaende +
      ingaende * y ** (90 / 360) + sparande * (3 / 12) * y ** (45 / 360) +
      ingaende * y ** (180 / 360) + sparande * (6 / 12) * y ** (90 / 360) +
      ingaende * y ** (270 / 360) + sparande * (9 / 12) * y ** (135 / 360) +
      sparande) / 4;
  return ingaende * y + sparande * y ** (180 / 360) - avkastningsskattKfIsk(ul, ar);
}

export function runTypfall(input: TypfallInput): TypfallResult {
  const born = input.born;
  const PAR = input.par;
  const { lowest: riktl, rikt: riktalder } = riktaldrar(born);
  if (PAR < riktl) throw new Error(`Allmän pension går att ta ut tidigast vid ${riktl} års ålder`);
  const adv: TypfallAdvanced = { ...DEFAULT_ADVANCED, ...input.advanced };
  // Partial withdrawal: UttagIP/UttagPP apply only when the final withdrawal is later than PAR.
  const defAr = adv.defAr > PAR && adv.defAr <= 100 ? adv.defAr : PAR;
  const UttagIP = defAr > PAR ? adv.uttagIP : 1;
  const UttagPP = defAr > PAR ? adv.uttagPP : 1;
  const tjpPar = adv.tjpPar >= 55 ? adv.tjpPar : defAr;
  const s = buildSeries(input.realGrowth, input.realReturn, adv.inflation);
  const civ = input.gift ? 1 : 0;
  const wStart = input.wStart;
  const egenW = adv.egenLon !== null;
  // Försäkringstid: raised to the working years if those are more (at most 40), not with own wages.
  let forstid = adv.forsakringstid;
  if (forstid < 40 && int(PAR - wStart - 1) > forstid && !egenW) forstid = Math.min(PAR - wStart - 1, 40);
  const ownTax = adv.kommunalskatt >= 0.1;
  const barnYears = adv.barn.filter((b) => b > 0).sort((a, b) => a - b).slice(0, 4);
  const barnAll = [...barnYears, 1899, 1899, 1899, 1899].slice(0, 4); // year(0) of an empty date is 1899
  const andelnya = andel(born);
  const income = input.monthlyWage * 12;
  const wTime = W_REF - born;
  const iyear = int(born) + SLUTAGE; // rng_Boundray_Year = 0, so the rules are never income-indexed
  // Bostadstillägg: boendekostnad per månad and the spouse's income
  let hyra = adv.hyra ?? 6300 + 1200 * civ;
  if (hyra > 60000) hyra = hyra / 12;
  const makensInkomst = adv.makensInkomst ?? (civ ? 0.8 * income : 0);
  const makaRatio = makensInkomst > 0 && income > 0 ? makensInkomst / income : 0;
  const kapital = adv.kapital;

  const n = SLUTAGE + 2;
  const arr = () => new Array<number>(n).fill(0);
  const year_ = arr();
  const IBB = arr(), pbb = arr(), FPB = arr(), KPI = arr(), KPIj = arr();
  const Iindex = arr(), Pindex = arr(), yieldF = arr(), RGK = arr(), MPGI = arr();
  const IP_avg = arr(), PP_avg = arr(), TP_avg = arr();
  const IP_arv1 = arr(), IP_arv2 = arr(), PP_arv = arr();
  const Kom_skatt = arr(), Begravavg = arr(), Tax_limit1 = arr(), Tax_limit2 = arr();
  const Income_ = arr(), Wage_ = arr();
  const pgbSA = arr(), pgbVPL = arr(), pgbStud = arr();

  // ---------------- startsetup ----------------
  const nyck = (series: number[], year: number) => at(series, s, year);
  // The public uttagIP that wages() in Lön_mm sets and keeps between the calls.
  let wagesUttagIP = 0;
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
      if (adv.avkastningsval === 1) {
        // The given real return in every year, also historically.
        yieldF[age] = age > STARTAGE ? (1 + input.realReturn) * (KPI[age]! / KPI[age - 1]!) : 1 + input.realReturn;
        if (!adv.efterFondavgifter) yieldF[age] = yieldF[age]! - 0.002;
      } else yieldF[age] = 1 + nyck(adv.avkastningsval === 2 ? s.yieldQ : s.yieldR, year);
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

    // Taxes: the historical average municipal tax, or the given rate for every year
    Kom_skatt[age] = ownTax ? adv.kommunalskatt : nyck(s.komSkatt, Math.max(year, 1930)) / 100;
    Tax_limit1[age] = year >= 2020 ? nyck(s.taxLimit1, year) : NaN;
    Tax_limit2[age] = year >= 2020 ? nyck(s.taxLimit2, year) : NaN;
    if (adv.begravning !== null) Begravavg[age] = adv.begravning;
    else Begravavg[age] = year < 2000 ? 0 : nyck(s.begravning, year) / 100;

    if (egenW) {
      // Egen löneutveckling: the income and the wage by age, as given
      const e = adv.egenLon!.find((x) => x.age === age);
      Income_[age] = age >= 15 && e ? e.income : 0;
      Wage_[age] = age >= 15 && e ? e.wage : 0;
    } else {
      Income_[age] = wages(age, year);
      // Ändrad lön (TL_spec_y, TL_special) from a given year
      if (adv.andradLonAr > 1959 && Income_[age]! > 0 && year >= adv.andradLonAr && adv.andradLonFaktor !== 1)
        Income_[age] = Income_[age]! * adv.andradLonFaktor;
      Wage_[age] = Income_[age]!;
    }

    // The sheet PGB, by age (rows 15-76)
    if (age >= 15) {
      const g = pgbByYear(adv.pgb, s, year);
      pgbSA[age] = g.sa;
      pgbVPL[age] = g.vpl;
      pgbStud[age] = g.studier;
    }
  }

  function wages(age: number, year: number): number {
    if (age < wStart) return 0;
    if (age < int(PAR)) wagesUttagIP = 0;
    else if (age >= int(PAR) && PAR <= defAr && age < defAr) {
      // rngLönPartUttag: "Arbetar deltid" works the share not taken out, 0 and 1 are fixed shares
      wagesUttagIP = adv.sysselsattning === "deltid" ? UttagIP : 1 - adv.sysselsattning;
      if (PAR === defAr) wagesUttagIP = 1;
    } else if (age > defAr) wagesUttagIP = 1;
    const uttagIP = wagesUttagIP;
    const wSlut = int(born + wTime);
    const konst = int(born + PAR + 1 / 1000) > int(born) + int(PAR) ? 1 : 0;
    const konst2 = int(born + defAr + 1 / 1000) > int(born) + int(defAr) ? 1 : 0;
    const konst3 = int(born + wStart + 1 / 1000) > int(born) + int(wStart) ? 1 : 0;
    if (age < int(wStart + konst3)) return 0;
    let wage = income;
    if (age <= int(defAr + konst) && age >= int(wStart)) {
      wage = (wage * nyck(s.Iindex, year)) / nyck(s.Iindex, wSlut);
      const profil = adv.loneprofil;
      if (profil > 0) {
        const b = PROFILES[profil as 1 | 2 | 3 | 4];
        // Profile 1 is flat from 61; the others use the ages as they are.
        const capped = (x: number) => (profil === 1 ? Math.min(x, 61) : x);
        let ref = poly(b, capped(age)) / poly(b, capped(wTime));
        if (ref < 0) ref = 0;
        wage = wage * ref;
      }
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
  const STP_points = arr(), PGB_ = arr();
  const IPS_pbh = arr(), PPS_pbh = arr(), ips = arr(), pps = arr();
  const brutto = arr(), Netto = new Array<number>(n).fill(NaN);
  const Bidrag = new Array<number>(n).fill(NaN), IndDisp = new Array<number>(n).fill(NaN);
  const pmonth = 12 - int(12 * (born + PAR - int(born + PAR)));
  const Tmonth = 12 - int(12 * (born + tjpPar - int(born + tjpPar)));
  const ARV_tjp = adv.arvsvinsterTjp ? 1 : 0; // 1: utan återbetalningsskydd
  const tak = 7.5;
  // Payout time for the private savings: the remaining life expectancy at PAR, or the temporary years.
  const sparUttag = adv.tempSpar === 0 ? cohortValue(born, "eLife", PAR) : adv.tempSpar;
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
  // Values the VBA keeps from the last year of the loop and uses again in Tabell 1.
  let grundavdragLast = 0;
  let kapskatt = 0;
  let makaInk = makensInkomst; // MakaInk starts as the input and is updated for married pensioners
  let tjpm = 0;
  let hyraT = hyra;
  let barnbidragLast = 0;
  let bostadsbidragLast = 0;
  let ap = 0;
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
    flex: adv.flexpension,
    tempYears: adv.tempTjp,
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
        // PGB: sjuk- och aktivitetsersättning, barnår (one child a year), värnplikt and studier
        const cap = () => {
          if (pgi_[age]! + PGB_[age]! > tak * IBB[age]!) PGB_[age] = maxi(tak * IBB[age]! - pgi_[age]!, 0);
        };
        PGB_[age] = pgbSA[age]!;
        cap();
        let barnPgb = 0;
        barnYears.forEach((barn, k) => {
          const counter = k === 0 ? barn - int(born) : barn - int(born) - 1;
          if (barn <= 1960 || counter <= 15 || (k > 0 && barnPgb !== 0)) return;
          const uink = k === 0 ? (pgi_[age]! * KPI[counter]!) / KPI[counter - 1]! + PGB_[age]! : pgi_[age]! + PGB_[age]!;
          barnPgb = pgbBarn(year, Income_[counter]!, uink, barn, age, MPGI[age]!, IBB[age]!, riktalder);
        });
        PGB_[age] = PGB_[age]! + barnPgb;
        PGB_[age] = PGB_[age]! + pgbVPL[age]!;
        cap();
        PGB_[age] = PGB_[age]! + int(pgbStud[age]! / 100) * 100;
        cap();
        if (PGB_[age]! + pgi_[age]! > 0 && age < 71) pgbYears++;
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
          TP_points[age] = vbaRound(maxi((pgi_[age]! + PGB_[age]!) / FPB[age]! - 1, 0), 2);
          STP_points[age] = TP_points[age]!;
        } else {
          TP_points[age] = 0;
          STP_points[age] = 0;
        }
      }
      // With fewer than five years of income, PGB goes to inkomstpension only (scaled 185/160).
      const p = pgi_[age - 1]!;
      const b = PGB_[age - 1]!;
      const [ipBase, ppBase, gpBase] =
        pgbYears >= 5 ? [p + b, p + b, p + b] : pgbYears > 0 ? [p + int((b * 185) / 160), p, p + (b * 185) / 160] : [p, p, p];
      IP_ratt[age] = ipavgift(year - 1, ipBase, age - 1, andelnya, int(born));
      PP_ratt[age] = ppavgift(year - 1, ppBase, age - 1, andelnya, int(born));
      GP_ratt[age] = gpavgift(year - 1, gpBase, age - 1, andelnya, int(born), riktalder);
      if (age <= riktalder) {
        if (IP_ratt[age]! > 0 || TP_points[age - 1]! > 0) pgiYears++;
      }
    }

    TJP_ratt[age] = tjpRatt(ctx, age, Wage_[age]!, IBB[age]!, year);

    // Private saving (IPS, kapitalförsäkring or ISK), no saving after the tjänstepension starts
    let IPS_ratt = 0;
    if (adv.sparManad > 0 && adv.sparStart <= year && age < tjpPar)
      IPS_ratt = adv.sparManad > 1 ? adv.sparManad * 12 : adv.sparManad * Income_[age]!;

    // Uttagsandel and delningstal
    if (age < int(PAR)) {
      dtalIP = 0;
      uttagIP = 0;
      uttagPP = 0;
    } else if (age >= int(PAR) && PAR <= defAr && age < defAr) {
      uttagIP = PAR === defAr ? 1 : UttagIP;
      uttagPP = PAR === defAr ? 1 : UttagPP;
      dtalIP = fnDeltalIP2(int(born), age, PAR, defAr);
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
      pp[age] = ppkassa(PAR, born, age, PP_pbh[age - 1]! * yieldF[age]! ** ((12 - pmonth) / 12), defAr, uttagPP, UttagPP);
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
      pp[age] = ppkassa(PAR, born, age, PP_pbh[age - 1]!, defAr, uttagPP, UttagPP);
      if (age < riktalder || year < int(PAR) + born) ptillagg[age] = 0;
      else {
        const i2021 = 2021 - int(born) > STARTAGE ? Iindex[2021 - int(born)]! : 182.58;
        ptillagg[age] = tillagg(12 * mpension, Utgyear, Iindex[age]!, i2021, uttagIP, pgiYears, born);
        ptillagg[age] = year === 2021 ? (ptillagg[age]! * Math.min(4, pmonth)) / 12 : (ptillagg[age]! * pmonth) / 12;
      }
    }

    // Tjänstepension and private saving
    if (age < int(tjpPar)) {
      TJP[age] = 0;
    } else if (year === int(born + tjpPar)) {
      TJP[age] = tjpkassa(ctx, age, (TJP_ratt[age]! + TJP_pbh[age - 1]!) * yieldF[age]! ** ((12 - Tmonth) / 12), Tmonth);
      ips[age] = (IPS_pbh[age - 1]! * (1 + input.realReturn) ** (sparUttag / 2)) / sparUttag;
      pps[age] = (PPS_pbh[age - 1]! * (1 + input.realReturn) ** (sparUttag / 2)) / sparUttag;
      TJP[age] = ftjp(ctx, TJP[age]!, STARTAGE, age, STP_points, tp, Tmonth);
    } else {
      const k = (pbb[age]! / pbb[age - 1]!) * (year === int(tjpPar + born + 1) ? 12 / Tmonth : 1);
      TJP[age] = TJP[age - 1]! * k;
      ips[age] = ips[age - 1]! * k;
      pps[age] = pps[age - 1]! * k;
      // Temporary payout
      if (adv.tempTjp > 0) {
        if (age === tjpPar + adv.tempTjp) TJP[age] = (TJP[age]! * (12 - Tmonth)) / 12;
        else if (age > tjpPar + adv.tempTjp) TJP[age] = 0;
      }
      if (adv.tempSpar > 0) {
        if (age === tjpPar + adv.tempSpar) {
          ips[age] = (ips[age]! * (12 - Tmonth)) / 12;
          pps[age] = (pps[age]! * (12 - Tmonth)) / 12;
        } else if (age > tjpPar + adv.tempSpar) {
          ips[age] = 0;
          pps[age] = 0;
        }
      }
      // The withdrawal cannot be more than the balance
      if (PPS_pbh[age - 1]! < pps[age]!) pps[age] = PPS_pbh[age - 1]! * yieldF[age]!;
    }

    ip[age] = int(ip[age]! / 12 + 0.5) * 12;
    pp[age] = int(pp[age]! / 12 + 0.5) * 12;
    TJP[age] = int(TJP[age]! / 12 + 0.5) * 12;
    ips[age] = int(ips[age]! / 12 + 0.5) * 12;
    pps[age] = int(pps[age]! / 12 + 0.5) * 12;

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
      // PPMavg(): a fee only when the return is before fund fees (rng_Avkastning_fondavgifter = 0).
      const fee = adv.efterFondavgifter ? 0 : ppmAvg(Utgyear, PP_pbh[age - 1]!, PP_avg[age]!, y);
      if (year_[age - 1]! < 2010)
        PP_pbh[age] = PP_pbh[age - 1]! * y + PP_pbh[age - 1]! * (PP_arv[age]! - 1) + RGK[age]! * PP_ratt[age]! + fee;
      else
        PP_pbh[age] =
          PP_pbh[age - 1]! * y + (PP_pbh[age - 1]! * (PP_arv[age]! - 1)) / y ** (6 / 12) + RGK[age]! * PP_ratt[age]! + fee;
    }
    if (age === STARTAGE) {
      TJP_pbh[age] = TJP_ratt[age]! * yieldF[age]! ** 0.5;
      IPS_pbh[age] = IPS_ratt * yieldF[age]! ** 0.5;
      PPS_pbh[age] = IPS_ratt * yieldF[age]! ** 0.5;
    } else {
      const y = yieldF[age]!;
      PP_pbh[age] = PP_pbh[age]! - pp[age]! * y ** 0.5;
      TJP_pbh[age] =
        TJP_ratt[age]! * y ** 0.5 + TJP_pbh[age - 1]! * y * TP_avg[age]! + TJP_pbh[age - 1]! * (PP_arv[age - 1]! - 1) * ARV_tjp;
      const kskatt = TJP_pbh[age]! * avkskatt(year, 0);
      TJP_pbh[age] = TJP_pbh[age]! - kskatt - TJP[age]! * y ** 0.5;
      if (adv.sparform !== 0) {
        PPS_pbh[age] = privatSpar(PPS_pbh[age - 1]!, IPS_ratt, y, year, adv.sparform) - pps[age]! * y ** 0.5;
      } else {
        // IPS: no arvsvinster, the same fees as the tjänstepension and avkastningsskatt
        IPS_pbh[age] = IPS_ratt * y ** 0.5 + IPS_pbh[age - 1]! * y * TP_avg[age]!;
        IPS_pbh[age] = IPS_pbh[age]! - IPS_pbh[age]! * avkskatt(year, 0) - ips[age]! * y ** 0.5;
      }
    }
    if (TJP_pbh[age]! < 0) TJP_pbh[age] = 0;
    if (IPS_pbh[age]! < 0) IPS_pbh[age] = 0;
    if (PPS_pbh[age]! < 0) PPS_pbh[age] = 0;

    // Known balances at the end of an income year (rng_PBHYear). The VBA sets GP_pbh to
    // PBH_IP / IP_pbh; here the GP balance is scaled by the same ratio as the IP balance, and
    // only the balances that are given are replaced.
    if (adv.pbhYear > 0 && year === adv.pbhYear) {
      if (adv.pbhIP !== null && adv.pbhIP > 0) {
        if (IP_pbh[age]! > 0) GP_pbh[age] = (GP_pbh[age]! * adv.pbhIP) / IP_pbh[age]!;
        IP_pbh[age] = adv.pbhIP;
      }
      if (adv.pbhPP !== null && adv.pbhPP > 0) PP_pbh[age] = adv.pbhPP;
      if (adv.pbhTJP !== null && adv.pbhTJP > 0) TJP_pbh[age] = adv.pbhTJP;
      if (adv.pbhPrivat !== null && adv.pbhPrivat > 0) {
        if (adv.sparform === 0) IPS_pbh[age] = adv.pbhPrivat;
        else PPS_pbh[age] = adv.pbhPrivat;
      }
    }
    IP_pbh[age] = int(IP_pbh[age]!);
    GP_pbh[age] = int(GP_pbh[age]!);
    PP_pbh[age] = int(PP_pbh[age]!);
    TJP_pbh[age] = int(TJP_pbh[age]!);
    IPS_pbh[age] = int(IPS_pbh[age]!);
    PPS_pbh[age] = int(PPS_pbh[age]!);

    // Brutto och skatt. IPS is taxed as income; the deduction for IPS premiums ended in 2016.
    brutto[age] = Income_[age]! + ip[age]! + tp[age]! + garp[age]! + pp[age]! + TJP[age]! + ptillagg[age]!;
    if (adv.sparform === 0) brutto[age] = brutto[age]! + ips[age]!;
    Gage = xage(Skyear, riktalder);
    if (Skyear >= 2020) {
      const ctxfvi = int(brutto[age]! / 100) * 100;
      const grundavdrag = avdragxx(ctxfvi, pbb[age]!, age, Skyear, Gage);
      grundavdragLast = grundavdrag;
      const pensionavgift = pgi(Utgyear, Income_[age]!, pbb[age]!, IBB[age]!, FPB[age]!, 1);
      const sred = pgi(Utgyear, Income_[age]!, pbb[age]!, IBB[age]!, FPB[age]!, 2);
      const cbefvi = ctxfvi - grundavdrag - pensionavgift + sred;
      let kinkskatt = int(cbefvi * Kom_skatt[age]!);
      const kyrkskatt = int(cbefvi * Begravavg[age]!);
      let statskatt = statlig(cbefvi, Tax_limit1[age]!, Tax_limit2[age]!) + publicAvg(cbefvi, age, Skyear, IBB[age]!);
      // Kapitalinkomster from the pension: 30 % tax, or a reduction for a deficit
      kapskatt = 0;
      if (age >= int(PAR) && kapital !== 0) {
        kapskatt = kapital < -100000 ? -30000 + (kapital + 100000) * 0.7 * 0.3 : kapital * 0.3;
        if (kapskatt < 0) {
          if (statskatt > -kapskatt) statskatt = statskatt + kapskatt;
          else {
            kinkskatt = kinkskatt + statskatt + kapskatt;
            statskatt = 0;
          }
        } else statskatt = statskatt + kapskatt;
      }
      const pensredukt = sred;
      let jobbavdrag = jobbxx(Wage_[age]!, age, Kom_skatt[age]!, pbb[age]!, ctxfvi - Wage_[age]!, Skyear, Gage);
      if (kinkskatt - pensredukt < jobbavdrag) jobbavdrag = kinkskatt - pensredukt;
      // A-kassa: a reduction of 25 % of the fee from 2022 (half of it 2022); fackavgift gives none after 2019.
      let akassa = adv.akassa;
      if (age >= wStart && age <= PAR) {
        if (2019 - int(born) > STARTAGE) akassa = (akassa * KPI[age]!) / KPI[2019 - int(born)]!;
        if (age === PAR) akassa = akassa * (12 - pmonth);
      } else akassa = 0;
      rakassa = 0;
      if (Skyear >= 2022) {
        rakassa = 0.25 * akassa;
        if (Skyear === 2022) rakassa = rakassa / 2;
      }
      rakassa = int(rakassa);
      let faAvdrag = faAred(cbefvi, Skyear);
      if (kinkskatt - faAvdrag - jobbavdrag < faAvdrag) faAvdrag = kinkskatt - faAvdrag - jobbavdrag;
      // The VBA leaves the capital income itself out of the yearly netto (only its tax is in);
      // it is added here, as in Tabell 1.
      Netto[age] =
        brutto[age]! +
        (age >= int(PAR) ? kapital : 0) -
        maxi(kinkskatt + kyrkskatt + statskatt + pensionavgift - pensredukt - jobbavdrag - rakassa - faAvdrag, 0);

      // Bidrag: barnbidrag, underhållsstöd, bostadsbidrag, bostadstillägg and ekonomiskt bistånd
      const antal = antalBarn(year, barnAll);
      const barnbidragY = barnbidrag(antal, Utgyear) + ustod(antal, civ + 1, Utgyear);
      if (year >= 1960) hyraT = (hyra * KPI[age]!) / KPI[W_REF - int(born)]!;
      let bostadsbidrag = bobid(civ + 1, brutto[age]! - ptillagg[age]!, 0, antal, hyraT, Utgyear);
      let bostadstillagg = 0;
      if (defAr > PAR && defAr <= age) {
        uttagIP = 1;
        uttagPP = 1;
      }
      if ((age >= int(PAR) && age >= riktalder && uttagIP > 0) || pgbSA[Math.max(age, 15)]! > 0) {
        if (age >= int(PAR)) ap = 1;
        tjpm = 0;
        if (civ === 1) {
          if (makensInkomst > 0) {
            makaInk = (brutto[age]! - kapskatt - ptillagg[age]!) * makaRatio;
            tjpm = TJP[age]! * makaRatio;
          } else makaInk = 0;
        }
        const finalYear = int(defAr) === age;
        const scale = finalYear ? 12 / pmonth : 1;
        // The VBA subtracts the tax on the capital income but leaves the income itself out, so a
        // capital income would raise the bostadstillägg. It is counted after tax here, as the
        // VBA does for äldreförsörjningsstödet in Tabell 1.
        const kap = age >= int(PAR) ? kapital : 0;
        const btpIncome =
          (finalYear ? (brutto[age]! - Wage_[age]!) * scale : brutto[age]!) + kap - kapskatt - ptillagg[age]!;
        const b =
          uttagIP *
          btp({
            inkomst: btpIncome,
            inkomstm: makaInk * scale,
            hyra: 12 * hyraT,
            gift: civ as 0 | 1,
            pbb: pbb[age]!,
            ap,
            form: adv.formogenhet,
            year: Utgyear,
            bald: age,
            garp: garp[age]! * scale,
            garpm: garp[age]! * scale,
          });
        const sb = sbtp({
          inkomst: btpIncome,
          hyra: 12 * hyraT,
          gift: civ as 0 | 1,
          btpb: b + bostadsbidrag,
          avdrag: grundavdrag,
          skattesats: Kom_skatt[age]!,
          form: adv.formogenhet,
          pbb: pbb[age]!,
          year: Utgyear,
          bald: age,
          kapital: 0,
          inkomstm: makaInk,
          born,
          age,
          ageYear: year,
          ageIBB: IBB[age]!,
          iyear,
        });
        let bt = b;
        let sbt = sb;
        if (!adv.ansoker) {
          bt = 0;
          sbt = 0;
          bostadsbidrag = 0;
        }
        bostadstillagg = (btpSbtp(bt, sbt) * pmonth) / 12;
      }
      barnbidragLast = barnbidragY;
      bostadsbidragLast = bostadsbidrag;
      Bidrag[age] = Math.max(barnbidragY + bostadsbidrag + bostadstillagg, 0);
      IndDisp[age] = Netto[age]! + Bidrag[age]! + pps[age]!;
      if (antal > 0) {
        // Ekonomiskt bistånd (for those without children the VBA multiplies it by (12 - pmonth) / 12 = 0)
        let bist = bist25(civ + 1, hyraT, IndDisp[age]!, barnPerAlder(year, barnAll), 0, year, KPI[age]! / KPI[2025 - int(born)]!);
        if (civ === 1 && bist > 0) bist = bist / 2;
        if (bist > 0) {
          Bidrag[age] = Bidrag[age]! + bist;
          IndDisp[age] = IndDisp[age]! + bist;
        }
      }

      verbose.push({
        age, year, Tax_ink: ctxfvi, Grundavdrag: grundavdrag, Pensionavgift: pensionavgift, Besk_inkomst: cbefvi,
        Kyrk_begravn: kyrkskatt, Kommunal_skatt: kinkskatt, Statlig_skatt: statskatt,
        Skattereduktioner: pensredukt + jobbavdrag + faAvdrag, Nettoinkomst: Netto[age]!, Bidrag: Bidrag[age]!,
        Ind_Disp: IndDisp[age]!,
      });
    } else verbose.push({ age, year });
    Object.assign(verbose[verbose.length - 1]!, {
      Lön: Wage_[age]!, PGI: pgi_[age]!, IP_rätt: IP_ratt[age]!, PP_rätt: PP_ratt[age]!, GP_rätt: GP_ratt[age]!,
      IP_PBH: IP_pbh[age]!, PP_PBH: PP_pbh[age]!, GP_PBH: GP_pbh[age]!, TJP_PBH: TJP_pbh[age]!,
      IP: ip[age]!, PP: pp[age]!, GP: garp[age]!, ptillagg: ptillagg[age]!, TJP: TJP[age]!, Brutto: brutto[age]!,
      TJP_premie: TJP_ratt[age]!, PGB: PGB_[age]!, IPS: ips[age]!, PPS: pps[age]!, IPS_PBH: IPS_pbh[age]!,
      PPS_PBH: PPS_pbh[age]!,
    });
  }

  // ---------------- Tabell 1: the pension at PAR including the last pension right ----------------
  const fixed = (age: number) => KPI[Math.max(STARTAGE, W_REF - int(born))]! / KPI[age]!;
  const avgYears = Math.max(1, int(adv.slutlonAr));
  let slut = 0;
  let slutNetto = 0;
  let slutDisp = 0;
  let slutNominal = 0;
  let slutNettoNominal = 0;
  let slutDispNominal = 0;
  let nettoKnown = true;
  for (let k = 1; k <= avgYears; k++) {
    const a = int(PAR) - k;
    slut += Income_[a]! * fixed(a);
    slutNominal += Income_[a]!;
    if (Number.isNaN(Netto[a]!)) nettoKnown = false;
    slutNetto += Netto[a]! * fixed(a);
    slutNettoNominal += Netto[a]!;
    slutDisp += IndDisp[a]! * fixed(a);
    slutDispNominal += IndDisp[a]!;
  }
  slut /= avgYears;
  slutNetto /= avgYears;
  slutDisp /= avgYears;
  slutNominal /= avgYears;
  slutNettoNominal /= avgYears;
  slutDispNominal /= avgYears;

  // The yearly table is taken before Tabell 1 changes the pension in the first year.
  const years: TypfallYear[] = [];
  for (let age = STARTAGE; age <= SLUTAGE; age++) {
    const m = fixed(age);
    const r = (x: number) => vbaRound(x * m, 0);
    years.push({
      year: year_[age]!,
      age,
      lon: r(Income_[age]!),
      ip: r(ip[age]!),
      pp: r(pp[age]!),
      gp: r(garp[age]!),
      tillagg: r(ptillagg[age]!),
      tjp: r(TJP[age]!),
      ips: r(ips[age]!),
      pps: r(pps[age]!),
      brutto: r(brutto[age]!),
      netto: Number.isNaN(Netto[age]!) ? null : r(Netto[age]!),
      bidrag: Number.isNaN(Bidrag[age]!) ? null : r(Bidrag[age]!),
      disp: Number.isNaN(IndDisp[age]!) ? null : r(IndDisp[age]!),
    });
  }

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
  const tableBrutto = ip[P]! + tp[P]! + pp[P]! + garp[P]! + TJP[P]! + ips[P]! + ptillagg[P]!;

  // Tax on the first pension year (no wage, no jobbskatteavdrag), with the capital income.
  let netto: number;
  {
    const ctxfvi = int(tableBrutto / 100) * 100;
    const grundavdrag = avdragxx(ctxfvi, pbb[P]!, P, year_[P]!, Gage);
    const cbefvi = ctxfvi - grundavdrag;
    let kinkskatt = int(cbefvi * Kom_skatt[P]!);
    const kyrkskatt = int(cbefvi * Begravavg[P]!);
    let statskatt = statlig(cbefvi, Tax_limit1[P]!, Tax_limit2[P]!) + publicAvg(cbefvi, P, year_[P]!, IBB[P]!);
    kapskatt = kapital < -100000 ? -30000 + (kapital + 100000) * 0.7 * 0.3 : kapital * 0.3;
    if (kapskatt < 0) {
      if (statskatt > -kapskatt) statskatt = statskatt + kapskatt;
      else {
        kinkskatt = kinkskatt + statskatt + kapskatt;
        statskatt = 0;
      }
    } else statskatt = statskatt + kapskatt;
    statskatt = int(statskatt);
    let faAvdrag = faAred(cbefvi, year_[P]!);
    if (kinkskatt - faAvdrag < faAvdrag) faAvdrag = kinkskatt - faAvdrag;
    netto = tableBrutto + kapital - maxi(kinkskatt + kyrkskatt + statskatt - rakassa - faAvdrag, 0);
  }

  // Bostadstillägg in Tabell 1. As in the VBA, the rent, the spouse's income, the grundavdrag,
  // barnbidrag and bostadsbidrag are those of the last year of the loop.
  let bostadstillaggTab = 0;
  if (PAR >= riktalder && uttagIP === 1 && uttagPP === 1) {
    const scale = 12 / pmonth;
    const b = btp({
      inkomst: tableBrutto * scale + kapital - kapskatt - ptillagg[P]!, // the VBA sets Wage_(PAR) to 0 first
      inkomstm: makaInk * scale,
      hyra: 12 * hyraT,
      gift: civ as 0 | 1,
      pbb: pbb[P]!,
      ap,
      form: adv.formogenhet,
      year: year_[P]!,
      bald: P,
      garp: garp[P]! * scale,
      garpm: garp[P]! * scale,
    });
    let sb = sbtp({
      inkomst: tableBrutto + kapital - kapskatt - ptillagg[P]!,
      hyra: hyraT,
      gift: civ as 0 | 1,
      btpb: b + bostadsbidragLast,
      avdrag: grundavdragLast,
      skattesats: Kom_skatt[P]!,
      form: adv.formogenhet,
      pbb: pbb[P]!,
      year: year_[P]!,
      bald: P,
      kapital: 0,
      inkomstm: makaInk,
      born,
      age: P,
      ageYear: year_[P]!,
      ageIBB: IBB[P]!,
      iyear,
    });
    // The VBA keeps BTP here when there is no application; it is left out as in the yearly table.
    if (!adv.ansoker) sb = 0;
    bostadstillaggTab = adv.ansoker ? btpSbtp(b, sb) : 0;
  }
  const bidragTab = barnbidragLast + bostadsbidragLast + bostadstillaggTab;
  const dispTab = netto + bidragTab + pps[P]!;

  const j0 = fixed(P);
  const wagePath = [];
  for (let age = 15; age <= SLUTAGE; age++) wagePath.push({ age, year: year_[age]!, income: Income_[age]!, wage: Wage_[age]! });

  return {
    input,
    advanced: adv,
    forsakringstid: forstid,
    riktalder,
    lowestAge: riktl,
    pensionYear: year_[P]!,
    slutlon: slut,
    slutlonNetto: nettoKnown ? slutNetto : null,
    ip: ip[P]! * j0,
    tp: tp[P]! * j0,
    pp: pp[P]! * j0,
    gp: garp[P]! * j0,
    tillagg: ptillagg[P]! * j0,
    allman: (ip[P]! + tp[P]! + pp[P]! + garp[P]! + ptillagg[P]!) * j0,
    tjp: TJP[P]! * j0,
    ips: ips[P]! * j0,
    pps: pps[P]! * j0,
    brutto: tableBrutto * j0,
    netto: netto * j0,
    bidrag: bidragTab * j0,
    disp: dispTab * j0,
    dispFore: nettoKnown ? slutDisp : null,
    current: {
      slutlon: slutNominal,
      slutlonNetto: nettoKnown ? slutNettoNominal : null,
      ip: ip[P]!,
      tp: tp[P]!,
      pp: pp[P]!,
      gp: garp[P]!,
      tillagg: ptillagg[P]!,
      allman: ip[P]! + tp[P]! + pp[P]! + garp[P]! + ptillagg[P]!,
      tjp: TJP[P]!,
      ips: ips[P]!,
      pps: pps[P]!,
      brutto: tableBrutto,
      netto,
      bidrag: bidragTab,
      disp: dispTab,
      dispFore: nettoKnown ? slutDispNominal : null,
    },
    years,
    wagePath,
    defAr,
    tjpPar,
    verbose,
  };
}

/** PPMavg(): the fee on the premiepension when the return is given before fund fees. */
function ppmAvg(year: number, kapital: number, faktor: number, avkast: number): number {
  let avg = year < 2011 ? kapital * (1 - faktor) : kapital * (1 - faktor) * (1 + avkast) ** 0.5;
  // The VBA's caps: below 2007 the fee itself, otherwise the cap or 100 kr.
  if (year < 2007) {
    // unchanged
  } else if (year === 2007 && avg > 100) avg = 100;
  else if (year < 2010 && avg > 110) avg = 110;
  else if (year === 2010 && avg > 125) avg = 125;
  else if (year < 2014 && avg > 110) avg = 110;
  else if (year < 2017 && avg > 120) avg = 120;
  else if (year < 2018 && avg > 125) avg = 125;
  else if (year < 2019 && avg > 125) avg = 160;
  else avg = 100;
  return -avg;
}

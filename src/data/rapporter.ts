/**
 * The reports and statistics on /rapporter: links to the authorities' own pages, grouped by publisher.
 *
 * Link to a page that lists every edition rather than to one year's PDF, so the link stays right when the
 * next edition comes out. The links were checked in October 2026: the Pensionsmyndigheten and Skatteverket
 * pages are the ones github.com/mathiasboos/Pensionsmyndigheten reads every weekday, the others were found
 * through web search.
 */
export interface Report {
  title: string;
  /** What is in it, in one line. */
  description: string;
  /** How often it comes out. */
  frequency: string;
  url: string;
}

export interface Publisher {
  name: string;
  reports: Report[];
}

export const publishers: Publisher[] = [
  {
    name: "Pensionsmyndigheten",
    reports: [
      {
        title: "Orange rapport – pensionssystemets årsredovisning",
        description: "Hur inkomstpensionens tillgångar och skulder utvecklas, balanstalet och premiepensionens värde.",
        frequency: "En gång per år",
        url: "https://www.pensionsmyndigheten.se/statistik-och-rapporter/rapporter/arsredovisningar",
      },
      {
        title: "Korta pensionsfakta",
        description: "Nyckeltal om pensionerna: genomsnittlig pension, antal pensionärer och pensionsåldrar.",
        frequency: "Uppdateras löpande",
        url: "https://www.pensionsmyndigheten.se/statistik-och-rapporter/statistik/kortapensionsfakta",
      },
      {
        title: "Pensionsåldrar och arbetslivets längd",
        description: "När svenskarna går i pension och hur långt arbetslivet är, för kvinnor och män.",
        frequency: "En gång per år",
        url: "https://www.pensionsmyndigheten.se/statistik/publikationer/pensionsaldrar-arbetslivets-langd-2026/",
      },
      {
        title: "Pensionsstatistik",
        description: "Pensionsmyndighetens statistikdatabas med inbetalningar, utbetalningar och pensionärer.",
        frequency: "Uppdateras löpande",
        url: "https://www.pensionsmyndigheten.se/statistik/pensionsstatistik/",
      },
      {
        title: "Basbelopp, beräkningsfaktorer och värderegler",
        description: "Prisbasbelopp, inkomstbasbelopp, delningstal och de andra talen pensionen räknas med.",
        frequency: "En gång per år",
        url: "https://www.pensionsmyndigheten.se/forsta-din-pension/om-pensionssystemet/sa-beraknas-din-pension-basbelopp-berakningsfaktorer-och-varderegler",
      },
      {
        title: "Så blir pensionen 2026",
        description: "Hur den allmänna pensionen ändras vid årsskiftet, för olika pensionsnivåer.",
        frequency: "En gång per år",
        url: "https://www.pensionsmyndigheten.se/nyheter-och-press/pressrum/sa-blir-pensionen-2026",
      },
    ],
  },
  {
    name: "Skatteverket",
    reports: [
      {
        title: "Belopp och procent",
        description: "Årets skattesatser, grundavdrag, skiktgräns, brytpunkter och andra belopp.",
        frequency: "En gång per år",
        url: "https://www.skatteverket.se/privat/skatter/beloppochprocent.4.18e1b10334ebe8bc80004109.html",
      },
    ],
  },
  {
    name: "Riksbanken",
    reports: [
      {
        title: "Penningpolitisk rapport",
        description: "Riksbankens bedömning av inflationen och ekonomin, med prognos för styrräntan.",
        frequency: "Fyra gånger per år",
        url: "https://www.riksbank.se/sv/penningpolitik/penningpolitisk-rapport/penningpolitiska-rapporter-och-uppdateringar/",
      },
      {
        title: "Finansiell stabilitet",
        description: "Riskerna i det finansiella systemet: bankerna, hushållens skulder och fastighetsbolagen.",
        frequency: "Två gånger per år",
        url: "https://www.riksbank.se/sv/finansiell-stabilitet/finansiell-stabilitetsrapport/",
      },
    ],
  },
  {
    name: "Finansinspektionen",
    reports: [
      {
        title: "Stabilitetsrapport",
        description: "FI:s bedömning av stabiliteten i det finansiella systemet och av kreditgivningen till hushåll.",
        frequency: "Två gånger per år",
        url: "https://www.fi.se/sv/finansiell-stabilitet/stabilitetsrapport/",
      },
      {
        title: "Konsumentskyddsrapport",
        description: "De största riskerna för konsumenter på finansmarknaden, bland annat avgifter i tjänstepension.",
        frequency: "En gång per år",
        url: "https://www.fi.se/sv/publicerat/rapporter/konsumentskyddsrapport/",
      },
    ],
  },
  {
    name: "Konjunkturinstitutet",
    reports: [
      {
        title: "Konjunkturläget",
        description: "Prognoser för svensk och internationell ekonomi: BNP, inflation, arbetslöshet och räntor.",
        frequency: "Fyra gånger per år",
        url: "https://www.konj.se/publikationer/konjunkturlaget/",
      },
      {
        title: "Konjunkturbarometern",
        description: "Hur företag och hushåll ser på ekonomin just nu.",
        frequency: "Varje månad",
        url: "https://www.konj.se/publikationer/konjunkturbarometern",
      },
    ],
  },
  {
    name: "SCB",
    reports: [
      {
        title: "Statistik från SCB",
        description: "Officiell statistik om befolkning, löner, priser och ekonomi, och Statistikdatabasen.",
        frequency: "Uppdateras löpande",
        url: "https://www.scb.se/hitta-statistik/",
      },
    ],
  },
];

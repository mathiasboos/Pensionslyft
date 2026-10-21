import {
  BookOpen,
  Calculator,
  Compass,
  FileText,
  Flame,
  Gauge,
  LineChart,
  Newspaper,
  PiggyBank,
  Receipt,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

/**
 * The pages of the site, in one place. The header and its menus, the footer, the home page and /kalkylatorer
 * are all built from these lists, so a new page is added here once.
 */
/** How demanding a calculator is to use: a few fields and an answer at once, more choices, or several tabs and many settings. */
export type Level = "Enkel" | "Medel" | "Avancerad";

export const LEVELS: readonly { level: Level; text: string }[] = [
  { level: "Enkel", text: "några få fält och svaret direkt" },
  { level: "Medel", text: "fler val och inställningar" },
  { level: "Avancerad", text: "flera flikar och många inställningar för dig som vill gå på djupet" },
];

export interface NavItem {
  href: string;
  title: string;
  /** One line under the title in the menus and on the cards. */
  description: string;
  icon: LucideIcon;
  /** The calculators say how demanding they are; the other pages do not. */
  level?: Level;
  /** Search words for a calculator: the page's keywords and its structured data. */
  keywords?: string[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

const planner: NavItem = {
  href: "/pensionsplaneraren",
  title: "Pensionsplaneraren",
  description: "Planera hela pensionen: tillgångar, utgifter, uttag och scenarier år för år.",
  icon: Compass,
  level: "Avancerad",
  keywords: ["pensionsplanerare", "pensionsplanering", "uttag pension", "monte carlo", "tjänstepension"],
};

const pension: NavItem = {
  href: "/pensionskalkylator",
  title: "Pensionssparkalkylatorn",
  description: "Se ditt framtida pensionskapital och vad det blir per månad efter avgifter.",
  icon: Calculator,
  level: "Enkel",
  keywords: ["pensionssparkalkylator", "sparkalkylator", "pensionskapital", "pensionssparande", "ips", "avgifter"],
};

const overview: NavItem = {
  href: "/pensionsoversikt",
  title: "Pensionsöversikten",
  description: "Räcker pensionen och sparandet? Se din prognos och hur mycket mer du behöver spara.",
  icon: Gauge,
  level: "Medel",
  keywords: ["pensionsöversikt", "räcker pensionen", "pensionsprognos", "allmän pension", "budget pension"],
};

const typfall: NavItem = {
  href: "/typfallsmodellen",
  title: "Typfallsmodellen",
  description: "Allmän pension och tjänstepension år för år, enligt Pensionsmyndighetens modell.",
  icon: UsersRound,
  level: "Avancerad",
  keywords: ["typfallsmodellen", "pensionsmyndigheten", "inkomstpension", "premiepension", "garantipension"],
};

const lonevaxling: NavItem = {
  href: "/lonevaxlingskalkylator",
  title: "Löneväxlingskalkylatorn",
  description: "Se vad löneväxling ger i extra pensionskapital och när det passar din lönenivå.",
  icon: PiggyBank,
  level: "Enkel",
  keywords: ["löneväxling", "löneväxlingskalkylator", "tjänstepension", "särskild löneskatt"],
};

const nettolon: NavItem = {
  href: "/nettolonkalkylator",
  title: "Nettolönkalkylatorn",
  description: "Se vad som blir kvar efter skatt 2026, steg för steg, med kommunalskatt, avdrag och avgifter.",
  icon: Receipt,
  level: "Medel",
  keywords: ["nettolönkalkylator", "lön efter skatt", "kommunalskatt", "nettolön 2026"],
};

const compound: NavItem = {
  href: "/ranta-pa-ranta",
  title: "Ränta på ränta",
  description: "Jämför hur mycket som är dina insättningar och hur mycket avkastningen gör.",
  icon: LineChart,
  level: "Enkel",
  keywords: ["ränta på ränta", "ränta på ränta kalkylator", "sparkalkylator", "månadssparande"],
};

const fire: NavItem = {
  href: "/fire-kalkylator",
  title: "FIRE-kalkylatorn",
  description: "Se vid vilken ålder ditt sparande räcker för att leva på avkastningen.",
  icon: Flame,
  level: "Medel",
  keywords: ["fire kalkylator", "ekonomisk frihet", "tidig pension", "4-procentsregeln"],
};

// The simplest calculator, Ränta på ränta, comes first in the menu: "Lön och sparande" is the left column and starts with it.
export const calculatorGroups: NavGroup[] = [
  { title: "Lön och sparande", items: [compound, nettolon, fire] },
  { title: "Pension", items: [pension, lonevaxling, overview, planner, typfall] },
];

export const calculators: NavItem[] = calculatorGroups.flatMap((group) => group.items);

/** The calculator shown in the "Utvalt" box of the Kalkylatorer menu: the newest one. */
export const featuredCalculator: NavItem = overview;

export const insights: NavItem[] = [
  {
    href: "/artiklar",
    title: "Artiklar",
    description: "Guider och analyser om allmän pension, tjänstepension och sparande.",
    icon: BookOpen,
  },
  {
    href: "/rapporter",
    title: "Rapporter",
    description: "Statistik och rapporter från Pensionsmyndigheten och andra myndigheter.",
    icon: FileText,
  },
  {
    href: "/nyheter",
    title: "Nyheter",
    description: "Nya belopp, regler och beräkningar inom pension, kortfattat och med länk till källan.",
    icon: Newspaper,
  },
];

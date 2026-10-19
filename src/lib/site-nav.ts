import {
  BookOpen,
  Calculator,
  Compass,
  FileText,
  Flame,
  Gauge,
  LineChart,
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
};

const pension: NavItem = {
  href: "/pensionskalkylator",
  title: "Sparkalkylatorn",
  description: "Se ditt framtida pensionskapital och vad det blir per månad efter avgifter.",
  icon: Calculator,
  level: "Enkel",
};

const overview: NavItem = {
  href: "/pensionsoversikt",
  title: "Pensionsöversikten",
  description: "Räcker pensionen och sparandet? Se din prognos och hur mycket mer du behöver spara.",
  icon: Gauge,
  level: "Medel",
};

const typfall: NavItem = {
  href: "/typfallsmodellen",
  title: "Typfallsmodellen",
  description: "Allmän pension och tjänstepension år för år, enligt Pensionsmyndighetens modell.",
  icon: UsersRound,
  level: "Avancerad",
};

const lonevaxling: NavItem = {
  href: "/lonevaxlingskalkylator",
  title: "Löneväxlingskalkylatorn",
  description: "Se vad löneväxling ger i extra pensionskapital och när det passar din lönenivå.",
  icon: PiggyBank,
  level: "Enkel",
};

const nettolon: NavItem = {
  href: "/nettolonkalkylator",
  title: "Nettolönkalkylatorn",
  description: "Se vad som blir kvar efter skatt 2026, steg för steg, med kommunalskatt, avdrag och avgifter.",
  icon: Receipt,
  level: "Medel",
};

const compound: NavItem = {
  href: "/ranta-pa-ranta",
  title: "Ränta på ränta",
  description: "Jämför hur mycket som är dina insättningar och hur mycket avkastningen gör.",
  icon: LineChart,
  level: "Enkel",
};

const fire: NavItem = {
  href: "/fire-kalkylator",
  title: "FIRE-kalkylatorn",
  description: "Se vid vilken ålder ditt sparande räcker för att leva på avkastningen.",
  icon: Flame,
  level: "Medel",
};

export const calculatorGroups: NavGroup[] = [
  { title: "Pension", items: [pension, lonevaxling, overview, planner, typfall] },
  { title: "Lön och sparande", items: [nettolon, compound, fire] },
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
];

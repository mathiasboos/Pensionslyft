import {
  BookOpen,
  Calculator,
  FileText,
  Flame,
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
export interface NavItem {
  href: string;
  title: string;
  /** One line under the title in the menus and on the cards. */
  description: string;
  icon: LucideIcon;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

const pension: NavItem = {
  href: "/pensionskalkylator",
  title: "Pensionskalkylatorn",
  description: "Se ditt framtida pensionskapital och vad det blir per månad efter avgifter.",
  icon: Calculator,
};

const typfall: NavItem = {
  href: "/typfallsmodellen",
  title: "Typfallsmodellen",
  description: "Allmän pension och tjänstepension år för år, enligt Pensionsmyndighetens modell.",
  icon: UsersRound,
};

const lonevaxling: NavItem = {
  href: "/lonevaxlingskalkylator",
  title: "Löneväxlingskalkylatorn",
  description: "Se vad löneväxling ger i extra pensionskapital och när det passar din lönenivå.",
  icon: PiggyBank,
};

const nettolon: NavItem = {
  href: "/nettolonkalkylator",
  title: "Nettolönkalkylatorn",
  description: "Se vad som blir kvar efter skatt 2026, steg för steg, med kommunalskatt, avdrag och avgifter.",
  icon: Receipt,
};

const compound: NavItem = {
  href: "/ranta-pa-ranta",
  title: "Ränta på ränta",
  description: "Jämför hur mycket som är dina insättningar och hur mycket avkastningen gör.",
  icon: LineChart,
};

const fire: NavItem = {
  href: "/fire-kalkylator",
  title: "FIRE-kalkylatorn",
  description: "Se vid vilken ålder ditt sparande räcker för att leva på avkastningen.",
  icon: Flame,
};

export const calculatorGroups: NavGroup[] = [
  { title: "Pension", items: [pension, typfall, lonevaxling] },
  { title: "Lön och sparande", items: [nettolon, compound, fire] },
];

export const calculators: NavItem[] = calculatorGroups.flatMap((group) => group.items);

/** The calculator shown in the "Utvalt" box of the Kalkylatorer menu: the newest one. */
export const featuredCalculator: NavItem = nettolon;

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

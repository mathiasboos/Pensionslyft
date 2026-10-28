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
  Target,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { Lang } from "./i18n";

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
  /** The English page, when the calculator has one (the others are in Swedish for now). */
  enHref?: string;
  /** Set by navItem for an item whose English page is in English. */
  english?: boolean;
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

// Shown as it is in github.com/mathiasboos/Calculators (Pension Savings Calculator.html), see scripts/sync-apps.mjs.
const pension: NavItem = {
  href: "/pensionskalkylator",
  enHref: "/en/pension-savings-calculator",
  title: "Pensionssparkalkylatorn",
  description: "Se ditt framtida pensionskapital och vad det blir per månad efter avgifter.",
  icon: Calculator,
  level: "Enkel",
  keywords: ["pensionssparkalkylator", "sparkalkylator", "pensionskapital", "pensionssparande", "ips", "avgifter"],
};

// Shown as it is in github.com/mathiasboos/Calculators (Pension Overview.html), see scripts/sync-apps.mjs.
const overview: NavItem = {
  href: "/pensionsoversikt",
  enHref: "/en/pension-overview",
  title: "Pensionsöversikten",
  description: "Räcker pensionen och sparandet? Se din prognos och hur mycket mer du behöver spara.",
  icon: Gauge,
  level: "Medel",
  keywords: ["pensionsöversikt", "räcker pensionen", "pensionsprognos", "allmän pension", "budget pension"],
};

// Shown as it is in github.com/mathiasboos/Calculators (Replacement rate goal calculator.html), see scripts/sync-apps.mjs.
const replacement: NavItem = {
  href: "/pensionsmalkalkylatorn",
  enHref: "/en/replacement-rate-calculator",
  title: "Pensionsmålkalkylatorn",
  description: "Se hur mycket du behöver spara för att nå din önskade pensionsnivå, före eller efter skatt.",
  icon: Target,
  level: "Medel",
  keywords: ["pensionsmål", "pensionsmålkalkylator", "kompensationsgrad", "önskad pension", "månadssparande pension"],
};

const typfall: NavItem = {
  href: "/typfallsmodellen",
  title: "Typfallsmodellen",
  description: "Allmän pension och tjänstepension år för år, enligt Pensionsmyndighetens modell.",
  icon: UsersRound,
  level: "Avancerad",
  keywords: ["typfallsmodellen", "pensionsmyndigheten", "inkomstpension", "premiepension", "garantipension"],
};

// Shown as it is in github.com/mathiasboos/Calculators (Salary_Exchange.html), see scripts/sync-apps.mjs.
const lonevaxling: NavItem = {
  href: "/lonevaxlingskalkylator",
  enHref: "/en/salary-exchange",
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

// Shown as it is in github.com/mathiasboos/Calculators (Compound Interest Calculator.html), see scripts/sync-apps.mjs.
const compound: NavItem = {
  href: "/ranta-pa-ranta",
  enHref: "/en/compound-interest",
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
  { title: "Pension", items: [pension, lonevaxling, replacement, overview, planner, typfall] },
];

export const calculators: NavItem[] = calculatorGroups.flatMap((group) => group.items);

/** The calculator shown in the "Utvalt" box of the Kalkylatorer menu: the newest one. */
export const featuredCalculator: NavItem = replacement;

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

// ── English ──
// Most calculators are in Swedish for now; the English pages show their English names and descriptions and link to the
// Swedish pages (marked as Swedish). A calculator with an `enHref` has an English page. The insights (articles, reports, news) have no English pages yet.
const NAV_EN: Record<string, { title: string; description: string }> = {
  "/pensionsmalkalkylatorn": {
    title: "Replacement rate calculator",
    description: "See how much you need to save to reach the pension level you want, before or after tax.",
  },
  "/pensionsplaneraren": {
    title: "Pension planner",
    description: "Plan your whole retirement: assets, spending, withdrawals and scenarios, year by year.",
  },
  "/pensionskalkylator": {
    title: "Pension savings calculator",
    description: "See your future pension capital and what it gives per month after fees.",
  },
  "/pensionsoversikt": {
    title: "Pension overview",
    description: "Will your pension and savings last? See your forecast and how much more you need to save.",
  },
  "/typfallsmodellen": {
    title: "The Typfall model",
    description: "The public and occupational pension year by year, according to the Swedish Pensions Agency's model.",
  },
  "/lonevaxlingskalkylator": {
    title: "Salary exchange calculator",
    description: "See what salary exchange gives in extra pension capital and when it suits your salary level.",
  },
  "/nettolonkalkylator": {
    title: "Net salary calculator",
    description: "See what is left after tax in 2026, step by step, with municipal tax, deductions and fees.",
  },
  "/ranta-pa-ranta": {
    title: "Compound interest",
    description: "Compare how much is your deposits and how much the return does.",
  },
  "/fire-kalkylator": {
    title: "FIRE calculator",
    description: "See at what age your savings are enough to live on the return.",
  },
};

const GROUP_EN: Record<string, string> = { "Lön och sparande": "Salary and savings", Pension: "Pension" };
const LEVEL_EN: Record<Level, string> = { Enkel: "Simple", Medel: "Intermediate", Avancerad: "Advanced" };
const LEVEL_TEXT_EN: Record<Level, string> = {
  Enkel: "a few fields and the answer at once",
  Medel: "more choices and settings",
  Avancerad: "several tabs and many settings for those who want to go deeper",
};

/** A calculator or page as it is called and described in the language. */
export function navItem(item: NavItem, lang: Lang): NavItem {
  const en = lang === "en" ? NAV_EN[item.href] : undefined;
  if (!en) return item;
  return item.enHref ? { ...item, ...en, href: item.enHref, english: true } : { ...item, ...en };
}
export function groupTitle(group: NavGroup, lang: Lang): string {
  return lang === "en" ? (GROUP_EN[group.title] ?? group.title) : group.title;
}
export function levelName(level: Level, lang: Lang): string {
  return lang === "en" ? LEVEL_EN[level] : level;
}
export function levelText(level: Level, lang: Lang): string {
  return lang === "en" ? LEVEL_TEXT_EN[level] : (LEVELS.find((l) => l.level === level)?.text ?? "");
}

const INSIGHTS_EN: NavItem[] = [
  {
    href: "/en/articles",
    title: "Articles",
    description: "Guides and analysis about the public pension, occupational pension and saving.",
    icon: BookOpen,
  },
  {
    href: "/en/news",
    title: "News",
    description: "New amounts, rules and calculations, in brief and with a link to the source.",
    icon: Newspaper,
  },
];

/** The pages under Insights in the language (the reports are in Swedish only). */
export const insightsFor = (lang: Lang): NavItem[] => (lang === "en" ? INSIGHTS_EN : insights);

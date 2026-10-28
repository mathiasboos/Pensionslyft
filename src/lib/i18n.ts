// Swedish and English. Swedish is the main language and keeps its URLs; the English pages live under /en. A page that
// exists in both languages is listed in PAIRS, which is what the language switch, the hreflang links and the tests use.
export type Lang = "sv" | "en";
export const LANGS: readonly Lang[] = ["sv", "en"];

/** Swedish path ↔ English path of the pages that are written by hand and exist in both languages. */
export const PAGE_PAIRS: readonly (readonly [string, string])[] = [
  ["/", "/en"],
  ["/kalkylatorer", "/en/calculators"],
  ["/om-pensionslyft", "/en/about"],
  ["/nyheter", "/en/news"],
  ["/artiklar", "/en/articles"],
];

// The English news items and articles name the Swedish one they translate ("translation_of"), which gives their pairs.
// The files are read as text so that this also works where Astro's content collections are not available (the tests).
const englishFiles = import.meta.glob(["/src/content/en/articles/*.md", "/src/content/en/news/*.md"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function contentPairs(): [string, string][] {
  const pairs: [string, string][] = [];
  for (const [file, text] of Object.entries(englishFiles)) {
    const swedish = text.match(/^translation_of:\s*"?([^"\n]+?)"?\s*$/m)?.[1];
    const english = file.split("/").pop()?.replace(/\.md$/, "");
    if (!swedish || !english) continue;
    pairs.push(file.includes("/articles/") ? [`/artiklar/${swedish}`, `/en/articles/${english}`] : [`/nyheter/${swedish}`, `/en/news/${english}`]);
  }
  return pairs;
}

/** Swedish path ↔ English path of every page that exists in both languages. */
export const PAIRS: readonly (readonly [string, string])[] = [...PAGE_PAIRS, ...contentPairs()];

/** The path as the pages are served: no ".html", no "/index", no trailing slash (except the root). */
export function cleanPath(pathname: string): string {
  const p = pathname.replace(/\.html$/, "").replace(/\/index$/, "").replace(/\/+$/, "");
  return p === "" ? "/" : p;
}

export function langOf(pathname: string): Lang {
  const p = cleanPath(pathname);
  return p === "/en" || p.startsWith("/en/") ? "en" : "sv";
}

/** The same page in the other language, or null when there is none (yet). */
export function twinOf(pathname: string): string | null {
  const p = cleanPath(pathname);
  for (const [sv, en] of PAIRS) {
    if (p === sv) return en;
    if (p === en) return sv;
  }
  return null;
}

/** The Swedish and the English address of a page, for the hreflang links; null when the page has no twin. */
export function alternates(pathname: string): Record<Lang, string> | null {
  const p = cleanPath(pathname);
  const twin = twinOf(p);
  if (!twin) return null;
  return langOf(p) === "sv" ? { sv: p, en: twin } : { sv: twin, en: p };
}

/**
 * Where the language switch leads from a page: its twin, or else the other language's list of the same kind (a news tag
 * page goes to the news list), or else the other language's front page.
 */
export function switchTarget(pathname: string): string {
  const twin = twinOf(pathname);
  if (twin) return twin;
  const p = cleanPath(pathname);
  if (langOf(p) === "sv") return p.startsWith("/nyheter") ? "/en/news" : p.startsWith("/artiklar") ? "/en/articles" : "/en";
  return p.startsWith("/en/news") ? "/nyheter" : p.startsWith("/en/articles") ? "/artiklar" : "/";
}

export const HOME: Record<Lang, string> = { sv: "/", en: "/en" };
export const LOCALE: Record<Lang, string> = { sv: "sv_SE", en: "en_GB" };

/** The addresses of the news and the articles in the language. */
export const newsListPath = (lang: Lang) => (lang === "en" ? "/en/news" : "/nyheter");
export const newsPath = (lang: Lang, id: string) => `${newsListPath(lang)}/${id}`;
export const newsTagPath = (lang: Lang, slug: string) => (lang === "en" ? `/en/news/tag/${slug}` : `/nyheter/tagg/${slug}`);
export const articlesListPath = (lang: Lang) => (lang === "en" ? "/en/articles" : "/artiklar");
export const articlePath = (lang: Lang, id: string) => `${articlesListPath(lang)}/${id}`;

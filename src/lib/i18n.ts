// Swedish and English. Swedish is the main language and keeps its URLs; the English pages live under /en. A page that
// exists in both languages is listed in PAIRS, which is what the language switch, the hreflang links and the tests use.
export type Lang = "sv" | "en";
export const LANGS: readonly Lang[] = ["sv", "en"];

/** Swedish path ↔ English path of the pages that exist in both languages. */
export const PAIRS: readonly (readonly [string, string])[] = [
  ["/", "/en"],
  ["/kalkylatorer", "/en/calculators"],
  ["/om-pensionslyft", "/en/about"],
];

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

export const HOME: Record<Lang, string> = { sv: "/", en: "/en" };
export const LOCALE: Record<Lang, string> = { sv: "sv_SE", en: "en_GB" };

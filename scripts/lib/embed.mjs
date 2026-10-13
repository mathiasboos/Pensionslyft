/*
 * Shared by the scripts that show a web app from another project on this site (scripts/sync-typfallsmodellen.mjs,
 * scripts/sync-pensionsplaneraren.mjs): what the site adds to the app's single HTML file – its fonts, a stylesheet with
 * its colours and a small script – is put in just before the app's </head>, between two comments, so that it can be
 * taken out and put in again when the site's part changes.
 */

// The fonts of the site, the same link as in src/layouts/BaseLayout.astro (the apps use 700 for their bold text).
export const FONTS = [
  '<link rel="preconnect" href="https://fonts.googleapis.com" />',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..700&family=IBM+Plex+Mono:wght@400;500&display=swap" />',
].join("\n");

// What the site adds sits between these two comments.
export const BEGIN = "<!-- pensionslyft:begin -->";
export const END = "<!-- pensionslyft:end -->";

/** The app without what the site added. */
export function stripSiteChanges(html) {
  return html.replace(new RegExp(`${BEGIN}[\\s\\S]*?${END}\\n?`), "");
}

/**
 * Where the app's own </head> is: the first one outside a <script>. A bundled library can have "</head>" in a string
 * (SheetJS writes HTML), and that one must not be taken for the end of the head.
 */
export function headEnd(html) {
  const scripts = scriptRanges(html);
  for (const m of html.matchAll(/<\/head>/gi)) {
    if (!scripts.some(([from, to]) => m.index > from && m.index < to)) return m.index;
  }
  return -1;
}

/** The ranges of the <script> elements, where a tag in a string is not a tag of the page. */
function scriptRanges(html) {
  return [...html.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)].map((m) => [m.index, m.index + m[0].length]);
}

/** The page's <title> set to `title` (the first one outside a <script>), or the HTML as it was if it has none. */
export function setTitle(html, title) {
  const scripts = scriptRanges(html);
  for (const m of html.matchAll(/<title>[\s\S]*?<\/title>/gi)) {
    if (scripts.some(([from, to]) => m.index > from && m.index < to)) continue;
    const escaped = title.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    return html.slice(0, m.index) + `<title>${escaped}</title>` + html.slice(m.index + m[0].length);
  }
  return html;
}

/** The app with the site's fonts, stylesheet and script put in before its </head>; the older ones are taken out first. */
export function injectSiteChanges(html, { css, js, name = "the app" }) {
  const app = stripSiteChanges(html);
  const at = headEnd(app);
  if (at < 0) throw new Error(`The HTML of ${name} has no </head>, so the site's changes cannot be put in.`);
  if (js.includes("</script")) throw new Error(`The site script for ${name} must not contain </script.`);
  if (css.includes("</style")) throw new Error(`The site stylesheet for ${name} must not contain </style.`);
  const block = `${BEGIN}\n${FONTS}\n<style id="pensionslyft-theme">\n${css}</style>\n<script id="pensionslyft-site">\n${js}</script>\n${END}\n`;
  return app.slice(0, at) + block + app.slice(at);
}

/*
 * Puts the site's colours and fonts into a web app that was written with its own, by changing the app's text.
 *
 * The Pensionsplaneraren (Retirement_Planner.html from github.com/mathiasboos/Calculators) writes its colours straight
 * into its CSS, its inline styles, the HTML it builds in JavaScript and its Chart.js configurations, so a stylesheet on
 * top cannot reach them all (a canvas has no CSS). Instead every colour in the app's own code is looked up in a map and
 * replaced, before the file is published. One colour of the app can stand for different things, though: the app's
 * green is the colour of its buttons (with navy text on them), of its figures (green text) and of a series in the
 * charts. So each colour is replaced according to how it is used where it stands:
 *
 *   ink      the colour of text: `color:` in CSS and in style attributes, `.style.color =`, a `color:` key in JavaScript
 *   surface  the colour of an area or a line around it: background, border, outline, box-shadow, fill and stroke
 *   series   everything else, which in this app is the colours of the charts (Chart.js keys such as borderColor and
 *            backgroundColor, palettes in arrays, canvas fillStyle/strokeStyle and gradient stops)
 *
 * The map gives the site colour per context: { "48b866": { ink: "#0c2a49", surface: "#f0c75e", series: "#72b3a6" } }
 * (keys are 6-digit lower-case hex without "#"; a missing context falls back to `all`, then to series, surface, ink).
 * Colours written as rgb()/rgba() keep their alpha, and the parts of a colour that the app puts together in code
 * ('rgba(72,184,102,' + a + ')') are found too. The bundled libraries (Chart.js, SheetJS) are left as they are.
 *
 * The app's own colour variables (`--gold: #48B866` in :root) are left as they are: the site's stylesheet sets them.
 * Where the app uses one of them for text although the site gives it a colour for areas (the app's green `--gold` is
 * both), `vars: { gold: { ink: "pl-gold-ink" } }` makes `color: var(--gold)` read `color: var(--pl-gold-ink)`, a
 * variable the site's stylesheet defines.
 *
 * Fonts are replaced by name (`fonts: { "DM Mono": "Inter" }`) wherever the app's own code names them.
 *
 * The result is the same for the same input, so a new version of the app makes a change only where the app changed.
 */

/** The banners of the libraries the app bundles inline; a <script> that contains one is left untouched. */
const LIBRARY_BANNERS = ["Chart.js v", "make_xlsx_lib", "@kurkle/color"];

// #rgb or #rrggbb – not an HTML character reference such as &#228; and not inside a name
const HEX = /(?<![&\w])#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-zA-Z_-])/g;
// rgb(r,g,b …  and  rgba(r,g,b …  – only the three numbers are replaced, so an alpha (or code after them) stays.
const RGB = /(rgba?\(\s*)(\d{1,3})(\s*,\s*)(\d{1,3})(\s*,\s*)(\d{1,3})/g;

// A CSS property, a style attribute, a JavaScript key or an assignment: `color:`, `border-left :`, `fillStyle =`.
const NAME = /(\.style\.)?([A-Za-z-][A-Za-z0-9-]*)['"]?\s*(?::(?!:)|=(?!=))/g;
const INK = new Set([
  "color",
  "caret-color",
  "text-decoration-color",
  "-webkit-text-fill-color",
  "text-shadow",
  "caretColor",
  "textDecorationColor",
  // Chart.js: the text of a tooltip
  "titleColor",
  "bodyColor",
  "footerColor",
]);
const SURFACE = new Set([
  "background",
  "background-color",
  "background-image",
  "border",
  "border-color",
  "border-top",
  "border-right",
  "border-bottom",
  "border-left",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "outline",
  "outline-color",
  "box-shadow",
  "fill",
  "stroke",
  "column-rule",
  "accent-color",
  "backgroundImage",
  "outlineColor",
  "boxShadow",
  "borderTop",
  "borderRight",
  "borderBottom",
  "borderLeft",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
]);
// Chart.js and canvas; borderColor and backgroundColor are the colours of a series unless they are set on an
// element's style (`el.style.borderColor =`), where they are the colours of the element.
const SERIES = new Set([
  "borderColor",
  "backgroundColor",
  "pointBackgroundColor",
  "pointBorderColor",
  "pointHoverBackgroundColor",
  "pointHoverBorderColor",
  "hoverBackgroundColor",
  "hoverBorderColor",
  "fillStyle",
  "strokeStyle",
  "shadowColor",
]);

/** Splits the HTML into the app's own text and the bundled libraries, keeping the order. */
export function splitSegments(html) {
  const segments = [];
  const script = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
  let last = 0;
  for (const match of html.matchAll(script)) {
    const library = LIBRARY_BANNERS.some((banner) => match[0].includes(banner));
    if (!library) continue;
    if (match.index > last) segments.push({ text: html.slice(last, match.index), library: false });
    segments.push({ text: match[0], library: true });
    last = match.index + match[0].length;
  }
  if (last < html.length) segments.push({ text: html.slice(last), library: false });
  return segments;
}

/**
 * How the colour at `index` in `text` is used: "ink", "surface", "series" or "variable" (the definition of one of the
 * app's CSS variables). It looks back on the same line (up to 200 characters) for the nearest property, key or
 * assignment it knows; a colour with none (a palette in an array, an argument) is a "series".
 */
export function contextAt(text, index) {
  const lineStart = text.lastIndexOf("\n", index - 1) + 1;
  const before = text.slice(Math.max(lineStart, index - 200), index);

  // the app's own CSS variables, `--gold: #48B866;` – set by the site's stylesheet, not here
  if (/(?:^|[\s;{(])--[A-Za-z0-9-]+\s*:[^;{}]*$/.test(before)) return "variable";
  // gradient stops on a canvas
  if (/addColorStop\([^)]*$/.test(before)) return "series";

  let found;
  for (const m of before.matchAll(NAME)) {
    const [, style, name] = m;
    if (style && (name === "backgroundColor" || name === "borderColor")) found = "surface";
    else if (INK.has(name)) found = "ink";
    else if (SURFACE.has(name) || SURFACE.has(name.toLowerCase())) found = "surface";
    else if (SERIES.has(name)) found = "series";
  }
  return found ?? "series";
}

function hex6(hex) {
  const h = hex.toLowerCase();
  return h.length === 3 ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2] : h;
}

function rgbToHex(r, g, b) {
  return [r, g, b].map((n) => Number(n).toString(16).padStart(2, "0")).join("");
}

function hexToRgb(hex) {
  const h = hex6(hex.replace(/^#/, ""));
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

/** The site colour for an app colour in a context, or undefined when the map has none. */
export function target(map, key, context) {
  const entry = map[key];
  if (!entry) return undefined;
  if (typeof entry === "string") return entry;
  return entry[context] ?? entry.all ?? entry.series ?? entry.surface ?? entry.ink;
}

/**
 * Replaces the app's colours, colour variables used for text, and fonts. Returns the new HTML, how many replacements
 * each colour and context got (`counts["48b866 surface"]`), and the colours that are not in the map with how often
 * they occur.
 */
export function recolor(html, { colors = {}, vars = {}, fonts = {} } = {}) {
  const counts = {};
  const unmapped = {};
  const count = (bucket, key) => (bucket[key] = (bucket[key] ?? 0) + 1);

  const out = splitSegments(html).map((segment) => {
    if (segment.library) return segment.text;
    let text = segment.text;

    // Colours first, from the end so that the positions found stay valid.
    const hits = [];
    for (const m of text.matchAll(HEX)) {
      hits.push({ index: m.index, length: m[0].length, key: hex6(m[1]), form: "hex", match: m });
    }
    for (const m of text.matchAll(RGB)) {
      hits.push({ index: m.index, length: m[0].length, key: rgbToHex(m[2], m[4], m[6]), form: "rgb", match: m });
    }
    hits.sort((a, b) => b.index - a.index);
    for (const hit of hits) {
      const context = contextAt(text, hit.index);
      if (context === "variable") continue;
      const to = target(colors, hit.key, context);
      if (!to) {
        count(unmapped, hit.key);
        continue;
      }
      count(counts, `${hit.key} ${context}`);
      let replacement;
      if (hit.form === "hex") {
        replacement = `#${hex6(to.replace(/^#/, ""))}`;
        // keep the case style of the app (#48B866 → #F0C75E) so a diff stays readable
        if (hit.match[1] === hit.match[1].toUpperCase()) replacement = replacement.toUpperCase();
      } else {
        const [r, g, b] = hexToRgb(to);
        const m = hit.match;
        replacement = `${m[1]}${r}${m[3]}${g}${m[5]}${b}`;
      }
      text = text.slice(0, hit.index) + replacement + text.slice(hit.index + hit.length);
    }

    // The app's colour variables used for text, where the site gives the variable a colour for areas.
    const varHits = [...text.matchAll(/var\(--([A-Za-z0-9-]+)/g)].filter((m) => vars[m[1]]).sort((a, b) => b.index - a.index);
    for (const m of varHits) {
      const context = contextAt(text, m.index);
      const to = vars[m[1]][context];
      if (!to) continue;
      count(counts, `var(--${m[1]}) ${context}`);
      text = text.slice(0, m.index) + `var(--${to}` + text.slice(m.index + m[0].length);
    }

    for (const [from, to] of Object.entries(fonts)) text = text.replaceAll(from, to);
    return text;
  });

  return { html: out.join(""), counts, unmapped };
}

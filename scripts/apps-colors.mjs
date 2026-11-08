/*
 * The colours of the calculators that do not have the site's palette in Calculators (Pensionskompassen; earlier Nettolön, Löneväxling, FIRE), by
 * how the app uses them (see scripts/lib/recolor.mjs): for every colour the app writes into its code, the site colour
 * that replaces it. The calculators that already have the site's palette (`native` in scripts/lib/apps.mjs) need none.
 * A colour a calculator starts to use later and that is not here keeps its own colour; the sync lists such colours.
 *
 * Site tokens (src/styles/global.css): navy #0c2a49, ink #0f2034, primary-soft #22507b, muted-foreground #545f6c,
 * border #e7e5e0, input #d9d6cf, muted #f5f4f1, sand #ece0ca, highlight #f0c75e, destructive #cc2827, gold #a18142,
 * steel #4675a4, teal #72b3a6, dark teal #2f6f73, brick #9c4438.
 */
const NAVY = "#0c2a49";
const INK = "#0f2034";
const MUTED = "#545f6c";
const STEEL = "#4675a4";
const SAND = "#c0a778";

export const colors = {
  nettolon: {},
  lonevaxling: {},
  fire: {},
  // Pensionskompassen (Pensionskompassen_offline.html): the app's green is its buttons, selected choices, figures and the
  // occupational pension in the charts. As text and areas it is the site's navy; as a series it is steel blue, and the
  // public pension (the app's light blue) is the site's sand, as in the Pensionsplaneraren. Neutral greys become the
  // site's ink, muted text and border colours; the app's orange-red (periods, warnings) is the site's brick.
  pensionskompassen: {
    "1b5c36": { ink: NAVY, surface: NAVY, series: STEEL },
    "0d3d22": NAVY,
    "2a7a4a": "#22507b",
    f0faf5: "#eaf0f6",
    f2faf5: "#eaf0f6",
    b8ddc6: "#b7c7da",
    e0f3ea: "#e4ecf4",
    "4b7dc2": SAND,
    "7ba8d9": SAND,
    e84a26: "#9c4438",
    f2a050: SAND,
    e8a0aa: "#d9d6cf",
    fff5f0: "#faf3f1",
    fff8f0: "#faf3f1",
    f5c0a0: "#d9b4ac",
    f9c8a8: "#d9b4ac",
    c0391a: "#cc2827",
    c89f00: "#f0c75e",
    fff9cc: "#fdf3d6",
    f4f5f7: "#ffffff",
    f9f9f9: "#f5f4f1",
    f8f8f8: "#f5f4f1",
    f7f7f7: "#f5f4f1",
    f4f4f4: "#f5f4f1",
    f0f0f0: "#e7e5e0",
    eeeeee: "#e7e5e0",
    e4e4e4: "#e7e5e0",
    e0e0e0: "#e7e5e0",
    dddddd: "#d9d6cf",
    cccccc: "#d9d6cf",
    bbbbbb: { ink: MUTED, surface: "#d9d6cf", series: "#d9d6cf" },
    aaaaaa: { ink: MUTED, surface: "#d9d6cf", series: MUTED },
    "888888": { ink: MUTED, surface: "#d9d6cf", series: MUTED },
    "666666": MUTED,
    "555555": MUTED,
    "444444": INK,
    "333333": INK,
    "1a1a1a": INK,
    "111111": INK,
  },
};

export const vars = { nettolon: {}, lonevaxling: {}, fire: {}, pensionskompassen: {} };

export const fonts = {
  nettolon: {},
  lonevaxling: {},
  fire: {},
  // The app's body font and the monospace of its number fields become the site's Inter (numbers are set tabular in the
  // stylesheet scripts/apps/pensionskompassen.css).
  pensionskompassen: {
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif": "Inter, ui-sans-serif, system-ui, sans-serif",
    "ui-monospace, 'SF Mono', Consolas, 'Liberation Mono', monospace": "Inter, ui-sans-serif, system-ui, sans-serif",
  },
};

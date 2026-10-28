/*
 * The colours of the calculators that do not have the site's palette in Calculators (Nettolön, Löneväxling, FIRE), by
 * how the app uses them (see scripts/lib/recolor.mjs): for every colour the app writes into its code, the site colour
 * that replaces it. The calculators that already have the site's palette (`native` in scripts/lib/apps.mjs) need none.
 * A colour a calculator starts to use later and that is not here keeps its own colour; the sync lists such colours.
 *
 * Site tokens (src/styles/global.css): navy #0c2a49, ink #0f2034, primary-soft #22507b, muted-foreground #545f6c,
 * border #e7e5e0, input #d9d6cf, muted #f5f4f1, sand #ece0ca, highlight #f0c75e, destructive #cc2827, gold #a18142,
 * steel #4675a4, teal #72b3a6, dark teal #2f6f73, brick #9c4438.
 */
export const colors = {
  nettolon: {},
  // Salary_Exchange.html: the Pensionsmyndigheten-style green and beige palette becomes the site's navy, teal and sand.
  // The colour variables of its :root are set in scripts/apps/lonevaxling.css; these are the colours it writes elsewhere
  // (the canvas chart, the scenario table, inline styles).
  lonevaxling: {
    "015d34": "#0c2a49", // dark green: the figures and the value line -> navy
    "014426": "#081d33",
    "48b866": "#2f6f73", // green: slider fill, ticks -> dark teal
    "4885c4": "#4675a4", // blue: the paid-in capital line -> steel
    fac110: "#c0a778", // yellow: scenario dot, highlights -> gold
    "8f6c00": "#795f28",
    ff5b2e: "#9c4438", // orange: scenario dot -> brick
    cc3a10: "#cc2827",
    "1e7a42": "#2f6f73",
    "2b2b2b": "#0f2034",
    "5f5f5f": "#545f6c",
    "9a9a9a": "#8a929c",
    cfcfcf: "#d9d6cf",
    d3c4a5: "#ece0ca",
    ece4cf: "#f5f4f1",
    f7f4ec: "#ffffff",
    f0f0f0: "#f5f4f1",
    f0ecdf: "#f5f4f1",
    eeeae0: "#f5f4f1",
    e3ddcc: "#e7e5e0",
    e3ddd0: "#e7e5e0",
    e9e4d6: "#e7e5e0",
    d8d2c2: "#d9d6cf",
    bdb6a4: "#b9b5ac",
    e4f3ea: "#e6f0ef",
    e8f6ed: "#e6f0ef",
    fdf6dd: "#fbf6e8",
    fdf2cf: "#fbf6e8",
    ffe7df: "#fbeceb",
  },
  fire: {},
};

export const vars = { nettolon: {}, lonevaxling: {}, fire: {} };

export const fonts = {
  nettolon: {},
  lonevaxling: {},
  fire: {},
};

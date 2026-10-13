/*
 * The colours of the Pensionsplaneraren on pensionslyft.se: for every colour the app (Retirement_Planner.html in
 * github.com/mathiasboos/Calculators) writes into its code, the site colour that replaces it, by how the colour is used
 * there (see scripts/lib/recolor.mjs): `ink` for text, `surface` for areas and lines around them, `series` for charts.
 * scripts/sync-pensionsplaneraren.mjs applies it every time the app is fetched. A colour the app starts to use later
 * and that is not here keeps its own colour; the sync script and the GitHub Action list such colours.
 *
 * Site tokens (src/styles/global.css): navy #0c2a49, ink #0f2034, primary-soft #22507b, muted-foreground #545f6c,
 * border #e7e5e0, muted #f5f4f1, sand #ece0ca, highlight #f0c75e (navy text on it is 9:1), destructive #cc2827, and the
 * chart colours navy, gold #a18142, steel #4675a4, teal #72b3a6, brick #9c4438.
 *
 * The app groups its accounts in three families and draws each in shades of one hue: accounts taxed already (ISK, KF,
 * cash) green, pension insurance (occupational pensions, private pension, salary exchange) blue, state pensions beige.
 * Here they are teal, steel blue and gold. Each shade keeps a place in the lightness order chosen so that the accounts
 * the app draws next to each other (its palettes PAL_AFTER, PAL_PINS, PAL_STATE and the portfolio chart's acctColors)
 * differ clearly. Run through the dataviz validator: neighbours in the three palettes, the three families, the tax
 * chart, the flows chart and the scenarios pass the colour-vision (ΔE >= 8) and normal-vision (ΔE >= 15) checks; only
 * the 10th and 11th account of the portfolio chart (gold next to teal) are closer (ΔE 10). As with the site's own
 * muted palette, the lightness band and chroma floor fail and the light shades are below 3:1 against white; the relief
 * is in the app: a legend and a hover readout on every chart, and the numbers in tables.
 *
 * The app's green is also its colour for buttons and selected toggles (with navy text on them) and for figures. As an
 * area it becomes the site's gold highlight, as text the site's navy. Its own CSS variables (--gold, --emerald …) are
 * set in scripts/pensionsplaneraren-theme.css; `vars` says which of them get another variable where they colour text.
 */

const TEAL = { base: "#7bb0ab" };
const STEEL = { base: "#4675a4" };
const GOLD = { base: "#c0a778" };

export const colors = {
  // ── the app's green: buttons and toggles, figures, and the accounts taxed already ──
  "48b866": { ink: "#0c2a49", surface: "#f0c75e", series: TEAL.base },
  "3cbb6e": TEAL.base, // the family colour (rgba with alpha: rows and charts)
  "28955a": "#206762",
  "1a7044": "#b4dad6",
  "52d484": "#4a8e88",
  "70e89a": "#104c48",
  "218f50": "#9bc8c3",
  "8af2b0": "#2d736d",
  "166838": "#6fa8a2",
  "1c6b3c": "#18625c",
  "73d69a": "#3a7f79",
  "8dd6a0": "#acd4d0",
  "2e8a54": "#3a7f79",

  // ── blue: pension insurance; as text the site's soft navy ──
  "4885c4": { ink: "#22507b", surface: STEEL.base, series: STEEL.base },
  "4a8fcc": STEEL.base,
  "2e6fa8": "#99bbdf",
  "1a4f80": "#244a6f",
  "5ba8e5": "#739cc7",
  "7cc0f0": "#0e3458",
  "3d7ab8": "#b4d1f0",
  "91c8f5": "#2a5885",
  "276090": "#6490be",
  "1a4f7a": "#244a6f",
  "6aaede": "#82a9d1",
  "8fcfee": "#bfdbf8",
  "a8dcff": "#2a5885",

  // ── beige: state pensions; as text a gold dark enough to read ──
  "c4b89a": { ink: "#795f28", surface: "#ece0ca", series: GOLD.base },
  "8e7b5e": "#876d40",
  "a8956e": "#e5d2af",
  "d4c8aa": "#a08145",
  "7a6848": "#68512d",
  "d4ccb0": "#dfcba6",
  "8a7a52": "#795f28",

  // ── red: expenses, withdrawals, negative figures, state tax; errors ──
  ff5b2e: "#9c4438",
  e84f2a: "#9c4438",
  f08060: "#cf8073",
  e05555: "#cc2827",
  ff6b5e: "#cc2827",
  dc3c3c: "#cc2827",

  // ── yellow: municipal tax, yield tax, the guide's attention pulse; warnings ──
  e9b84a: { ink: "#795f28", surface: "#f0c75e", series: "#a08145" },
  f0c142: { ink: "#795f28", surface: "#f0c75e", series: "#f0c75e" },
  f5b428: { ink: "#795f28", surface: "#f0c75e", series: "#cda448" },
  f7c95a: "#f0c75e",
  f9c20d: "#f0c75e",
  d9a500: "#826423", // the retirement year on the x axes, bold

  // ── purple and violet: capital tax, Monte Carlo survival and histogram, the retirement line ──
  "8e6bbf": "#0c2a49",
  "5a64d2": "#22507b",
  "4650d2": STEEL.base,
  "5ba4ff": STEEL.base,

  // ── navy, ink and greys ──
  "0f1f3d": "#0c2a49",
  "0a0e1a": "#0c2a49",
  "1a1a2e": "#0c2a49",
  "000000": "#0f2034", // mostly rgba(0,0,0,…) for grid lines and shadows
  "08111e": "#0f2034",
  "1e3050": "#545f6c",
  "64748b": "#545f6c",
  "6b85a8": "#545f6c",
  "7a96be": "#545f6c",
  "4a6180": "#545f6c",
  "3a5575": "#545f6c",
  "94a3b8": "#8a929c",
  // the tooltips are white on the site, so their light text becomes ink
  edf2ff: "#0f2034",
  c8d8e8: "#0f2034",
  ffffff: "#ffffff",
  f0f7ff: "#f5f4f1",
  edf1f8: "#f5f4f1",
  d8e4f0: "#ebe7df",
  fbf6e8: "#fbf6e8", // the retirement year's column, already the site's warm tint
};

/** The app's colour variables that colour text in places, and the variable they get there. */
export const vars = {
  gold: { ink: "pl-gold-ink" },
  gold2: { ink: "pl-gold-ink" },
  emerald: { ink: "pl-emerald-ink" },
  amber: { ink: "pl-amber-ink" },
};

/** Fonts the app's code names, and the site font that replaces them. */
export const fonts = {
  // with the fallbacks, so a chart drawn before Inter has loaded is not set in the browser's serif font
  "DM Mono": "Inter, ui-sans-serif, system-ui, sans-serif",
};

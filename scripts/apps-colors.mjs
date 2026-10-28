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
  lonevaxling: {},
  fire: {},
};

export const vars = { nettolon: {}, lonevaxling: {}, fire: {} };

export const fonts = {
  nettolon: {},
  lonevaxling: {},
  fire: {},
};

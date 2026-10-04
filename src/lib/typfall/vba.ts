// Small helpers that reproduce how Excel and VBA round numbers, so the port gives the same
// kronor as Pensionsmyndighetens typfallsmodell.

/** VBA Int(): rounds down, also for negative numbers. */
export const int = Math.floor;

/** VBA Round() and CLng(): round half to even ("banker's rounding"). */
export function vbaRound(x: number, digits = 0): number {
  const f = 10 ** digits;
  const y = x * f;
  const floor = Math.floor(y);
  const diff = y - floor;
  let r: number;
  if (Math.abs(diff - 0.5) < 1e-9) r = floor % 2 === 0 ? floor : floor + 1;
  else r = Math.round(y);
  return r / f;
}

/** Excel ROUND(): round half away from zero. */
export function excelRound(x: number, digits = 0): number {
  const f = 10 ** digits;
  return (Math.sign(x) * Math.floor(Math.abs(x) * f + 0.5 + 1e-9)) / f;
}

/** VBA Single: the value stored in single precision. */
export const single = Math.fround;

export const mini = (a: number, b: number) => (a < b ? a : b);
export const maxi = (a: number, b: number) => (a > b ? a : b);

export const sek = new Intl.NumberFormat("sv-SE", {
  style: "currency",
  currency: "SEK",
  maximumFractionDigits: 0,
});

export const num = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 });

export function formatSek(value: number): string {
  return sek.format(Math.round(value));
}

export function formatDate(value?: Date | string | null, lang: "sv" | "en" = "sv"): string {
  if (!value) return "";
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "sv-SE", { dateStyle: "long", timeZone: "Europe/Stockholm" }).format(
    new Date(value),
  );
}

/** An amount of kronor for the English pages: "59,200 kr" (English separators, kronor kept). */
export function formatKrEn(value: number): string {
  return `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(Math.round(value))} kr`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

/** Percent with a Swedish decimal comma, e.g. formatPercent(6.5, 1) -> "6,5 %". */
export function formatPercent(value: number, digits: number): string {
  return `${new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)} %`;
}

const compact = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 1 });

/** Short amounts for chart axes, e.g. 1500000 -> "1,5 mkr", 250000 -> "250 tkr". */
export function formatSekShort(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${compact.format(value / 1_000_000)} mkr`;
  if (Math.abs(value) >= 1_000) return `${num.format(value / 1_000)} tkr`;
  return `${num.format(value)} kr`;
}

/**
 * A number typed in a field, written with thousands separators and a decimal comma: "1234567.5" -> "1 234 567,5".
 * Anything that is not a digit or a decimal separator is dropped; a trailing comma stays so that "32," can be typed.
 */
export function groupDigits(text: string): string {
  const cleaned = text.replace(/[^\d,.]/g, "");
  const point = cleaned.search(/[.,]/);
  const whole = (point === -1 ? cleaned : cleaned.slice(0, point)).replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  return point === -1 ? grouped : `${grouped},${cleaned.slice(point + 1).replace(/\D/g, "")}`;
}

/** The number in a text typed in a field (spaces ignored, a comma is a decimal point). NaN when there is none. */
export function parseAmount(text: string): number {
  return parseFloat(text.replace(/\s/g, "").replace(",", "."));
}

/**
 * One step up (direction 1) or down (-1) in an amount field. The value goes to the next step on the grid, as in a
 * native number input: with step 100, 2 550 goes to 2 600 up and 2 500 down. Kept between min and max.
 */
export function stepValue(value: number, step: number, direction: 1 | -1, min = 0, max = Infinity): number {
  const position = Math.round((value / step) * 1e9) / 1e9;
  const next = direction > 0 ? Math.floor(position) + 1 : Math.ceil(position) - 1;
  return Math.min(max, Math.max(min, next * step));
}

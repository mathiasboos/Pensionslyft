export const sek = new Intl.NumberFormat("sv-SE", {
  style: "currency",
  currency: "SEK",
  maximumFractionDigits: 0,
});

export const num = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 });

export function formatSek(value: number): string {
  return sek.format(Math.round(value));
}

export function formatDate(value?: Date | string | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("sv-SE", { dateStyle: "long", timeZone: "Europe/Stockholm" }).format(
    new Date(value),
  );
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

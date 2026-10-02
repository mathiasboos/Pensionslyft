export const sek = new Intl.NumberFormat("sv-SE", {
  style: "currency",
  currency: "SEK",
  maximumFractionDigits: 0,
});

export const num = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 });

export function formatSek(value: number): string {
  return sek.format(Math.round(value));
}

export function formatDate(value?: string | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("sv-SE", { dateStyle: "long" }).format(new Date(value));
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

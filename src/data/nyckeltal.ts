/**
 * The key figures that scroll in the second band at the top of the home page, in the owner's order. `note` is what stands in
 * brackets: the change on last year in percent, or last year's value. Change it here when a new year's figures are out.
 */
export interface KeyFigure {
  label: string;
  value: string;
  note?: string;
}

export const KEY_FIGURES_YEAR = 2026;

export const keyFigures: KeyFigure[] = [
  { label: "Prisbasbelopp", value: "59 200 kr", note: "+0,7 %" },
  { label: "Förhöjt prisbasbelopp", value: "60 500 kr", note: "+0,8 %" },
  { label: "Inkomstbasbelopp", value: "83 400 kr", note: "+3,5 %" },
  { label: "Intjänande tak allmän pension", value: "56 087 kr/mån", note: "+3,5 %" },
  { label: "Intjänande golv allmän pension", value: "25 042 kr/år", note: "+0,7 %" },
  { label: "Brytpunkt statlig skatt, ej fyllt 67 år", value: "55 033 kr/mån", note: "+2,7 %" },
  { label: "Brytpunkt statlig skatt, fyller 67 år", value: "63 375 kr/mån", note: "+3,7 %" },
  { label: "Avkastningsskatt pensionsförsäkring", value: "0,35 %", note: "0,32" },
  { label: "Avkastningsskatt ISK K-försäkr.", value: "1,065 %", note: "0,89" },
  { label: "Riktålder allmän pension", value: "67 år", note: "66" },
  { label: "Allmän pension tidigast uttagsålder", value: "64 år", note: "63" },
  { label: "Garantipension tidigast uttagsålder", value: "67 år", note: "66" },
  { label: "Förhöjt grundavdrag", value: "Fyller 67 år", note: "67" },
  { label: "Förstärkt jobbskatteavdrag", value: "Fyller 67 år", note: "67" },
  { label: "LAS-åldern", value: "69 år", note: "69" },
  { label: "ITP1 tidigast uttagsålder", value: "55 år", note: "55" },
  { label: "SAF-LO tidigast uttagsålder", value: "55 år", note: "55" },
  { label: "AKAP-KR tidigast uttagsålder", value: "62 år", note: "60" },
  { label: "PA16 avdelning 1 tidigast uttagsålder", value: "63 år", note: "63" },
  { label: "Genomsnittlig pension total (inkl. tjänstepension)", value: "26 200 kr år 2025", note: "23 900 kr" },
  { label: "Balanstalet", value: "1,147 år 2025", note: "1,169" },
  { label: "Inkomstindex", value: "+3,6 %", note: "+5,7" },
  { label: "Följsamhetsindex", value: "+1,9 %", note: "+4,0" },
];

// ── English ──
// The same figures for the English home page. Amounts keep kronor and the Swedish way of writing thousands; ratios and
// percentages are written with a decimal point.
const LABELS_EN: Record<string, { label: string; value?: string }> = {
  "Prisbasbelopp": { label: "Price base amount" },
  "Förhöjt prisbasbelopp": { label: "Raised price base amount" },
  "Inkomstbasbelopp": { label: "Income base amount" },
  "Intjänande tak allmän pension": { label: "Pension-earning ceiling, public pension", value: "56 087 kr/month" },
  "Intjänande golv allmän pension": { label: "Pension-earning floor, public pension", value: "25 042 kr/year" },
  "Brytpunkt statlig skatt, ej fyllt 67 år": { label: "State tax threshold, under 67", value: "55 033 kr/month" },
  "Brytpunkt statlig skatt, fyller 67 år": { label: "State tax threshold, turning 67 or older", value: "63 375 kr/month" },
  "Avkastningsskatt pensionsförsäkring": { label: "Yield tax, pension insurance" },
  "Avkastningsskatt ISK K-försäkr.": { label: "Yield tax, ISK and endowment insurance" },
  "Riktålder allmän pension": { label: "Guide age (riktålder), public pension", value: "67 years" },
  "Allmän pension tidigast uttagsålder": { label: "Earliest withdrawal age, public pension", value: "64 years" },
  "Garantipension tidigast uttagsålder": { label: "Earliest withdrawal age, guarantee pension", value: "67 years" },
  "Förhöjt grundavdrag": { label: "Raised basic allowance", value: "From the year you turn 67" },
  "Förstärkt jobbskatteavdrag": { label: "Enhanced earned income tax credit", value: "From the year you turn 67" },
  "LAS-åldern": { label: "Employment protection age (LAS)", value: "69 years" },
  "ITP1 tidigast uttagsålder": { label: "ITP1 earliest withdrawal age", value: "55 years" },
  "SAF-LO tidigast uttagsålder": { label: "SAF-LO earliest withdrawal age", value: "55 years" },
  "AKAP-KR tidigast uttagsålder": { label: "AKAP-KR earliest withdrawal age", value: "62 years" },
  "PA16 avdelning 1 tidigast uttagsålder": { label: "PA16 division 1 earliest withdrawal age", value: "63 years" },
  "Genomsnittlig pension total (inkl. tjänstepension)": { label: "Average total pension (incl. occupational pension)", value: "26 200 kr in 2025" },
  "Balanstalet": { label: "Balance ratio (balanstal)", value: "1.147 in 2025" },
  "Inkomstindex": { label: "Income index" },
  "Följsamhetsindex": { label: "Adjustment index (följsamhetsindex)" },
};
const point = (text?: string) => text?.replace(/(\d),(\d)/g, "$1.$2");

export const keyFiguresEn: KeyFigure[] = keyFigures.map((f) => {
  const en = LABELS_EN[f.label];
  return { label: en?.label ?? f.label, value: en?.value ?? point(f.value) ?? f.value, note: point(f.note) };
});

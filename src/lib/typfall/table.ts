// Tabell 1 on the model's start page: the pension in the first year, in current prices, in fixed
// prices, per month and as a share of the final wage (or of the wage after tax, after tax).
import type { TypfallResult } from "./model";

export interface TableRow {
  label: string;
  current: number | null;
  fixed: number | null;
  share: number | null;
  strong?: boolean;
}

export interface PensionTable {
  /** "Pension vid 68 års ålder" */
  title: string;
  wage: TableRow[];
  pension: TableRow[];
  afterTax: TableRow[];
}

export function pensionTable(r: TypfallResult): PensionTable {
  const par = r.input.par;
  const n = r.advanced.slutlonAr;
  const slut = r.slutlon;
  const netto = r.slutlonNetto;
  const c = r.current;
  const ofWage = (v: number) => (slut > 0 ? v / slut : null);
  const ofNetto = (v: number) => (netto ? v / netto : null);
  const row = (label: string, current: number, fixed: number, share: number | null, strong?: boolean): TableRow => ({
    label,
    current,
    fixed,
    share,
    strong,
  });
  return {
    title: `Pension vid ${par} års ålder`,
    wage: [
      row(n > 1 ? `Slutlön, ${par - n} - ${par - 1} års ålder` : `Slutlön, ${par - 1} års ålder`, c.slutlon, slut, ofWage(slut)),
      { label: "Lön efter skatt", current: c.slutlonNetto, fixed: netto, share: netto === null ? null : ofWage(netto) },
      { label: "Disponibel inkomst", current: c.dispFore, fixed: r.dispFore, share: r.dispFore === null ? null : ofWage(r.dispFore) },
    ],
    pension: [
      row("Inkomstpension", c.ip, r.ip, ofWage(r.ip)),
      row("Tilläggspension", c.tp, r.tp, ofWage(r.tp)),
      row("Premiepension", c.pp, r.pp, ofWage(r.pp)),
      row("Garantipension", c.gp, r.gp, ofWage(r.gp)),
      row("Pensionstillägg (IPT)", c.tillagg, r.tillagg, ofWage(r.tillagg)),
      row("Total allmän pension", c.allman, r.allman, ofWage(r.allman), true),
      row("Tjänstepension", c.tjp, r.tjp, ofWage(r.tjp)),
      row("Privat pensionssparande (med avdragsrätt)", c.ips, r.ips, ofWage(r.ips)),
      row("Total pension brutto", c.brutto, r.brutto, ofWage(r.brutto), true),
    ],
    afterTax: [
      row("Efter skatt", c.netto, r.netto, ofNetto(r.netto), true),
      // The VBA leaves the share at 0 when there were no benefits the year before the pension.
      row("Bostadstillägg för pensionärer m.m.", c.bidrag, r.bidrag, 0),
      row("Privat pensionssparande (ISK / KF)", c.pps, r.pps, ofWage(r.pps)),
      row("Disponibel inkomst", c.disp, r.disp, r.dispFore ? r.disp / r.dispFore : null, true),
    ],
  };
}

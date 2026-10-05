// "Pensionsgrundande belopp (PGB)": a form to add pension rights from barnår, värnplikt,
// sjuk-/aktivitetsersättning and studier, and the table of what the model counts, as in the
// model's web version.
import { useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { num } from "@/lib/format";
import type { TypfallAdvanced, TypfallResult } from "@/lib/typfall/model";
import { vplDays, withoutPgbYear } from "@/lib/typfall/pgb";
import { cn } from "@/lib/utils";
import { NumberRow, SelectRow } from "./TypfallFields";

type Typ = "barn" | "vpl" | "sa" | "studier";
type Row = TypfallResult["pgbRows"][number];

const MIN_AGE = 16; // the youngest and the oldest age that earn pension rights
const MAX_AGE = 70;
const MAX_TERMS = 2;

const CHILD = ["1:a barnet", "2:a barnet", "3:e barnet", "4:e barnet"];

const COLUMNS = [
  {
    key: "barn",
    head: "Barn-PGB, kr",
    info: "Ett barns pensionsgrundande belopp kan falla ut för upp till fyra år (födelseåret och de tre följande). Om flera barns fyraårsperioder överlappar samma år räknas bara ett barns belopp det året.",
  },
  { key: "studier", head: "PGB studier, kr", remove: "studier" },
  { key: "vpl", head: "PGB värnplikt, kr" },
  { key: "sa", head: "Sjuk-/aktivitetsersättning, kr", remove: "sa" },
] as const;

const pill =
  "cursor-pointer rounded-full border border-foreground/70 bg-card font-semibold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50";

/** The four slots of the children's birth years, 0 for a free one. */
const slotsOf = (barn: number[]) => [...barn, 0, 0, 0, 0].slice(0, 4).map((b) => (b > 0 ? b : 0));

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-grid size-[18px] shrink-0 cursor-pointer place-items-center rounded-full border border-foreground/50 text-[0.85rem] leading-none text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      ×
    </button>
  );
}

/** A year typed in a small field, committed when the field is left. */
function ChildYear({ label, year, onCommit }: { label: string; year: number; onCommit: (year: number) => void }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={label}
      defaultValue={year}
      key={year}
      className="h-8 w-[90px] rounded-md border border-input bg-card px-1.5 text-right text-sm tabular-nums"
      onBlur={(e) => {
        const v = Math.round(Number(e.target.value.replace(/\s/g, "")));
        if (!Number.isFinite(v) || v < 1900 || v > 2100) e.target.value = String(year);
        else onCommit(v);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}

function PgbTable({ rows, onRemove }: { rows: Row[]; onRemove: (kind: "sa" | "studier", year: number) => void }) {
  const shown = COLUMNS.filter((c) => rows.some((r) => r[c.key] > 0));
  const th = "bg-secondary px-2.5 py-2 align-bottom text-xs font-semibold text-primary";
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-sm tabular-nums">
        <thead>
          <tr>
            <th scope="col" className={cn(th, "text-left")}>
              År
            </th>
            <th scope="col" className={cn(th, "text-left")}>
              Ålder
            </th>
            {shown.map((c) => (
              <th key={c.key} scope="col" className={cn(th, "text-right")}>
                {"info" in c ? (
                  <abbr title={c.info} className="cursor-help underline decoration-dotted underline-offset-2">
                    {c.head}
                  </abbr>
                ) : (
                  c.head
                )}
              </th>
            ))}
            <th scope="col" className={cn(th, "text-right")}>
              Summa PGB, kr
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.year} className="border-t border-border">
              <td className="px-2.5 py-2">{r.year}</td>
              <td className="px-2.5 py-2">{r.age}</td>
              {shown.map((c) => (
                <td key={c.key} className="whitespace-nowrap px-2.5 py-2 text-right">
                  {r[c.key] > 0 && num.format(r[c.key])}
                  {r[c.key] > 0 && "remove" in c && (
                    <span className="ml-1.5 align-middle">
                      <RemoveButton label={`Ta bort ${c.head.replace(", kr", "")} ${r.year}`} onClick={() => onRemove(c.remove, r.year)} />
                    </span>
                  )}
                </td>
              ))}
              <td className="whitespace-nowrap px-2.5 py-2 text-right font-semibold">
                {num.format(r.barn + r.studier + r.vpl + r.sa)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PgbSection({
  adv,
  onChange,
  born,
  rows,
}: {
  adv: TypfallAdvanced;
  onChange: (patch: Partial<TypfallAdvanced>) => void;
  born: number;
  /** What the model counts, by year. */
  rows: Row[];
}) {
  const [typ, setTyp] = useState<Typ>("barn");
  const [year, setYear] = useState(0);
  const [slot, setSlot] = useState(0);
  const [amount, setAmount] = useState(0);
  const [terms, setTerms] = useState(1);
  const [vplStart, setVplStart] = useState(adv.pgb.vpl?.start ?? "");
  const [vplEnd, setVplEnd] = useState(adv.pgb.vpl?.end ?? "");
  const [feedback, setFeedback] = useState("");
  const [checkChild, setCheckChild] = useState(0); // the birth year just added, to see if it gave pension rights
  const [expanded, setExpanded] = useState(false);

  const pgb = adv.pgb;
  const slots = slotsOf(adv.barn);
  const freeSlot = slots.indexOf(0);
  const useSlot = slots[slot] === 0 ? slot : Math.max(freeSlot, 0);
  const age = (y: number) => (y > 0 ? y - Math.trunc(born) : null);

  const childMessage =
    checkChild > 0 && !rows.some((r) => r.barn > 0 && r.year >= checkChild && r.year <= checkChild + 3)
      ? "Födelseåret gav ingen pensionsrätt -- du måste ha varit minst 16 år vid barnets födelse."
      : "";

  const vplReadout = (() => {
    if (!vplStart || !vplEnd) return "";
    const days = [...vplDays({ start: vplStart, end: vplEnd })].filter(([, d]) => d > 0);
    if (days.length === 0) return "Perioden är kortare än 120 dagar och ger ingen pensionsrätt.";
    const earns = days.some(([y]) => (y >= 1995 && y <= 2010) || y >= 2018);
    return earns ? "" : "Perioden ger ingen pensionsrätt -- värnplikt ger bara pensionsrätt 1995–2010 och från 2018.";
  })();

  const changeTyp = (t: Typ) => {
    setTyp(t);
    setFeedback("");
    setCheckChild(0);
    if (t === "vpl") {
      setVplStart(pgb.vpl?.start ?? "");
      setVplEnd(pgb.vpl?.end ?? "");
    }
  };

  const add = () => {
    setFeedback("");
    setCheckChild(0);
    const outside = (y: number) => {
      const a = age(y)!;
      return a < MIN_AGE || a > MAX_AGE;
    };
    const outsideText = `Året motsvarar en ålder utanför ${MIN_AGE}–${MAX_AGE} år, och ger ingen pensionsrätt.`;
    if (typ === "barn") {
      if (year <= 0 || slots[useSlot] !== 0) return;
      const next = [...slots];
      next[useSlot] = year;
      onChange({ barn: next });
      setCheckChild(year);
      setYear(0);
    } else if (typ === "vpl") {
      if (!vplStart || !vplEnd) return;
      onChange({ pgb: { ...pgb, vpl: { start: vplStart, end: vplEnd } } });
    } else if (typ === "sa") {
      if (year <= 0 || amount <= 0) return;
      if (outside(year)) return setFeedback(outsideText);
      onChange({ pgb: { ...pgb, sa: [...withoutPgbYear(pgb.sa, year), { from: year, to: year, belopp: amount }] } });
      setYear(0);
      setAmount(0);
    } else {
      if (year <= 0 || terms <= 0) return;
      if (outside(year)) return setFeedback(outsideText);
      onChange({
        pgb: { ...pgb, studier: [...withoutPgbYear(pgb.studier, year), { from: year, to: year, terminer: terms }] },
      });
      if (year - 2 < 1995) setFeedback("Studier ger pensionsrätt i modellen först från 1997.");
      setYear(0);
      setTerms(1);
    }
  };

  const removeFromTable = (kind: "sa" | "studier", y: number) =>
    onChange({
      pgb: kind === "sa" ? { ...pgb, sa: withoutPgbYear(pgb.sa, y) } : { ...pgb, studier: withoutPgbYear(pgb.studier, y) },
    });

  const setChild = (i: number, y: number) => {
    const next = [...slots];
    next[i] = y;
    onChange({ barn: next });
  };

  const open = expanded && rows.length > 0;
  const summary = (
    <div className="mt-1">
      <div className={cn("mb-1.5 flex items-center", open ? "justify-between" : "justify-end")}>
        {open && <span className="text-sm font-bold text-primary">Pensionsgrundande belopp (PGB)</span>}
        {rows.length > 0 && (
          <button
            type="button"
            className={cn(pill, "h-8 px-3.5 text-xs")}
            aria-label={open ? "Dölj den utökade PGB-tabellen" : "Visa PGB-tabellen större, utan att stänga formuläret"}
            onClick={() => setExpanded(!open)}
          >
            {open ? "Dölj tabellen" : "Visa alla kolumner"}
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">Inga poster ännu.</p>
      ) : (
        <PgbTable rows={rows} onRemove={removeFromTable} />
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Barnår, sjuk- eller aktivitetsersättning, värnplikt och studier ger alla pensionsrätt utöver den vanliga
        inkomsten. Välj typ nedan, fyll i det som gäller och klicka Lägg till.
      </p>

      <SelectRow<Typ>
        id="typfall-pgb-typ"
        label="Typ"
        value={typ}
        onChange={changeTyp}
        options={[
          { value: "barn", label: "Barn" },
          { value: "vpl", label: "Värnplikt" },
          { value: "sa", label: "Sjuk-/aktivitetsersättning" },
          { value: "studier", label: "Studier" },
        ]}
      />

      {typ !== "vpl" && (
        <NumberRow
          id="typfall-pgb-ar"
          stacked
          label={typ === "barn" ? "Barnets födelseår" : "År"}
          value={year}
          onChange={setYear}
          min={0}
          max={2100}
        >
          <span className="min-w-10 text-xs text-muted-foreground" aria-live="polite">
            {age(year) === null ? "" : `${age(year)} år`}
          </span>
        </NumberRow>
      )}

      {typ === "barn" && (
        <SelectRow<string>
          id="typfall-pgb-barn"
          label="Vilket barn"
          value={String(useSlot)}
          onChange={(v) => setSlot(Number(v))}
          options={CHILD.map((label, i) => ({ value: String(i), label, disabled: slots[i] !== 0 }))}
        />
      )}

      {typ === "sa" && (
        <NumberRow id="typfall-pgb-belopp" stacked label="Belopp, kr" value={amount} onChange={setAmount} min={0} max={10000000} />
      )}

      {typ === "studier" && (
        <NumberRow id="typfall-pgb-terminer" stacked label="Antal terminer" value={terms} onChange={setTerms} min={1} max={MAX_TERMS} />
      )}

      {typ === "vpl" && (
        <div>
          <span className="text-sm">Värnplikt, period</span>
          <div className="mt-1.5 flex flex-wrap items-end gap-x-3 gap-y-2">
            <label className="block">
              <span className="mb-0.5 block text-[0.68rem] text-muted-foreground">Från</span>
              <Input type="date" min="1995-01-01" max="2100-12-31" value={vplStart} className="w-40 bg-card" onChange={(e) => setVplStart(e.target.value)} aria-label="Värnplikt, startdatum" />
            </label>
            <label className="block">
              <span className="mb-0.5 block text-[0.68rem] text-muted-foreground">Till</span>
              <Input type="date" min="1995-01-01" max="2100-12-31" value={vplEnd} className="w-40 bg-card" onChange={(e) => setVplEnd(e.target.value)} aria-label="Muck (slutdatum)" />
            </label>
            {pgb.vpl && (
              <button
                type="button"
                aria-label="Rensa värnpliktsperiod"
                className="cursor-pointer pb-2 text-xs text-primary underline underline-offset-2 hover:no-underline"
                onClick={() => {
                  onChange({ pgb: { ...pgb, vpl: null } });
                  setVplStart("");
                  setVplEnd("");
                }}
              >
                Rensa
              </button>
            )}
            {vplReadout && <p className="basis-full text-[0.68rem] text-muted-foreground">{vplReadout}</p>}
          </div>
        </div>
      )}

      <button
        type="button"
        className={cn(pill, "h-9 w-fit px-4 text-sm")}
        disabled={typ === "barn" && freeSlot === -1}
        onClick={add}
      >
        Lägg till
      </button>
      {(feedback || childMessage) && <p className="-mt-1 text-xs text-primary">{feedback || childMessage}</p>}

      {slots.some((b) => b > 0) && (
        <div className="rounded-lg border border-border p-2.5">
          <h4 className="mb-1.5 text-[0.72rem] font-bold uppercase tracking-wide text-primary">Barn</h4>
          <div className="grid gap-1.5">
            {slots.map((b, i) =>
              b === 0 ? null : (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex-1 text-sm">{CHILD[i]}</span>
                  <ChildYear label={`Födelseår, ${CHILD[i]}`} year={b} onCommit={(y) => setChild(i, y)} />
                  <RemoveButton label={`Ta bort ${CHILD[i]}`} onClick={() => setChild(i, 0)} />
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {open ? (
        createPortal(
          <aside
            aria-label="Pensionsgrundande belopp (PGB)"
            className="fixed inset-x-4 bottom-4 z-40 max-h-[55vh] overflow-auto rounded-lg border border-border bg-card p-3 shadow-2xl lg:left-auto lg:right-6 lg:w-[min(48vw,640px)]"
          >
            {summary}
          </aside>,
          document.body,
        )
      ) : (
        summary
      )}
    </div>
  );
}

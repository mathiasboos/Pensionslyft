// "Jämför scenarier": the current form next to saved scenarios, as a table and a chart of the
// income per month by age.
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { downloadCsv } from "@/lib/csv";
import { formatPercent, formatSek, formatSekShort, num } from "@/lib/format";
import type { Avtal, TypfallResult } from "@/lib/typfall/model";
import { W_REF } from "@/lib/typfall/model";
import {
  keyFigures,
  MAX_SAVED,
  runScenario,
  type SavedScenario,
  type ScenarioForm,
  usedAges,
} from "@/lib/typfall/scenario";
import { cn } from "@/lib/utils";
import { changedSections } from "./TypfallAdvanced";
import { Segmented } from "./TypfallFields";

// The current form keeps the first colour; a saved scenario keeps the colour of its slot.
const CURRENT_COLOR = "var(--color-chart-1)";
const SLOT_COLORS = ["var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-5)", "#5CA28B"];

const AVTAL_SHORT: Record<Avtal, string> = {
  1: "Ingen",
  2: "ITP 1",
  3: "ITP 2",
  4: "SAF-LO",
  5: "KAP-KL",
  6: "AKAP-KR",
  7: "PA 16 avd. 2",
  8: "PA 16 avd. 1",
};

const button =
  "flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-foreground/70 bg-card px-3 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50";

/** A short name from the main inputs, used when the user gives none. */
export function autoName(f: ScenarioForm): string {
  const { par } = usedAges(f);
  return `Född ${f.born}, ${par} år, ${num.format(f.monthlyWage)} kr`;
}

interface Column {
  key: string;
  name: string;
  color: string;
  form: ScenarioForm;
  result: TypfallResult | null;
  saved?: SavedScenario;
}

type Row =
  | { group: string }
  | {
      label: string;
      value: (c: Column) => number | string | null;
      format?: (v: number) => string;
      /** Show the difference from the current form. */
      diff?: boolean;
      strong?: boolean;
    };

const kr = (v: number) => formatSek(v);
const pct = (v: number) => formatPercent(v, 1);
const perMonth = (pick: (r: TypfallResult) => number) => (c: Column) => (c.result ? pick(c.result) / 12 : null);

const ROWS: Row[] = [
  { group: "Indata" },
  { label: "Födelseår", value: (c) => c.form.born },
  {
    label: "Går i pension vid",
    value: (c) => `${usedAges(c.form).par} år${c.form.useRikt ? " (riktålder)" : ""}`,
  },
  { label: "Börjar arbeta vid", value: (c) => `${usedAges(c.form).wStart} år` },
  { label: "Månadslön", value: (c) => c.form.monthlyWage, format: kr },
  { label: "Tjänstepension", value: (c) => AVTAL_SHORT[c.form.avtal] },
  { label: "Gift", value: (c) => (c.form.gift ? "Ja" : "Nej") },
  { label: "Årlig inflation", value: (c) => c.form.inflation, format: pct },
  { label: "Real tillväxt", value: (c) => c.form.realGrowth, format: pct },
  { label: "Real avkastning", value: (c) => c.form.realReturn, format: pct },
  {
    label: "Inställningar",
    value: (c) => {
      const n = changedSections(c.form.adv);
      return c.form.mode === "normal" || n === 0 ? "Normala" : `Avancerade, ${n} ${n === 1 ? "sektion" : "sektioner"}`;
    },
  },
  { group: `Vid pensioneringen, kronor per månad i ${W_REF} års priser` },
  { label: "Pension före skatt", value: perMonth((r) => r.brutto), format: kr, diff: true, strong: true },
  { label: "Efter skatt", value: perMonth((r) => r.netto), format: kr, diff: true },
  { label: "Bostadstillägg m.m.", value: perMonth((r) => r.bidrag), format: kr, diff: true },
  { label: "Disponibel inkomst", value: perMonth((r) => r.disp), format: kr, diff: true, strong: true },
  {
    label: "Kompensationsgrad",
    value: (c) => (c.result ? keyFigures(c.result).kgrad : null),
    format: pct,
    diff: true,
  },
  {
    label: "Genomsnittlig pension, 20 år",
    value: (c) => (c.result ? keyFigures(c.result).average : null),
    format: kr,
    diff: true,
  },
  { label: "Inkomstpension", value: perMonth((r) => r.ip), format: kr, diff: true },
  { label: "Premiepension", value: perMonth((r) => r.pp), format: kr, diff: true },
  { label: "Garantipension", value: perMonth((r) => r.gp), format: kr, diff: true },
  { label: "Pensionstillägg", value: perMonth((r) => r.tillagg), format: kr, diff: true },
  { label: "Tjänstepension", value: perMonth((r) => r.tjp), format: kr, diff: true },
  { label: "Privat sparande", value: perMonth((r) => r.ips + r.pps), format: kr, diff: true },
  { label: "Slutlön", value: perMonth((r) => r.slutlon), format: kr, diff: true },
];

const safeRun = (f: ScenarioForm) => {
  try {
    return runScenario(f);
  } catch {
    return null;
  }
};

export function ScenarioCompare({
  current,
  currentResult,
  saved,
  onSave,
  onRemove,
  onLoad,
}: {
  current: ScenarioForm;
  currentResult: TypfallResult;
  saved: SavedScenario[];
  onSave: (name: string) => void;
  onRemove: (id: string) => void;
  onLoad: (s: SavedScenario) => void;
}) {
  const [name, setName] = useState("");
  const [measure, setMeasure] = useState<"brutto" | "disp">("brutto");

  const columns: Column[] = useMemo(
    () => [
      { key: "current", name: "Nuvarande", color: CURRENT_COLOR, form: current, result: currentResult },
      ...saved.map((s) => ({
        key: s.id,
        name: s.name,
        color: SLOT_COLORS[s.slot]!,
        form: s.form,
        result: safeRun(s.form),
        saved: s,
      })),
    ],
    [current, currentResult, saved],
  );

  // Ages from five years before the earliest pension to 95.
  const firstAge = Math.min(...columns.map((c) => usedAges(c.form).par)) - 5;
  const chartData = useMemo(() => {
    const rows: Record<string, number | null>[] = [];
    for (let age = firstAge; age <= 95; age++) {
      const row: Record<string, number | null> = { age };
      for (const c of columns) {
        const y = c.result?.years.find((x) => x.age === age);
        const v = y ? (measure === "brutto" ? y.brutto : y.disp) : null;
        row[c.key] = v === null || v === undefined ? null : v / 12;
      }
      rows.push(row);
    }
    return rows;
  }, [columns, measure, firstAge]);

  const full = saved.length >= MAX_SAVED;
  const save = () => {
    onSave(name.trim() || autoName(current));
    setName("");
  };

  const cellValue = (row: Extract<Row, { label: string }>, c: Column) => {
    const v = row.value(c);
    if (v === null) return "–";
    return typeof v === "number" ? (row.format ? row.format(v) : String(v)) : v;
  };

  const diffText = (row: Extract<Row, { label: string }>, c: Column) => {
    if (!row.diff || c.key === "current") return null;
    const a = row.value(c);
    const b = row.value(columns[0]!);
    if (typeof a !== "number" || typeof b !== "number") return null;
    const d = a - b;
    if (Math.abs(d) < (row.format === pct ? 0.05 : 0.5)) return "±0";
    const sign = d > 0 ? "+" : "−";
    return row.format === pct ? `${sign}${formatPercent(Math.abs(d), 1)}` : `${sign}${num.format(Math.round(Math.abs(d)))}`;
  };

  const csv = () =>
    downloadCsv("typfall-scenarier.csv", [
      ["", ...columns.map((c) => c.name)],
      ...ROWS.filter((r): r is Extract<Row, { label: string }> => "label" in r).map((r) => [
        r.label,
        ...columns.map((c) => {
          const v = r.value(c);
          return typeof v === "number" ? Math.round(v * 10) / 10 : v;
        }),
      ]),
    ]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-serif text-xl font-semibold">Jämför scenarier</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Spara formuläret som ett scenario, ändra något och jämför. Nuvarande följer formuläret. Upp till{" "}
          {MAX_SAVED} scenarier sparas i den här webbläsaren.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="typfall-scenario-namn" className="sr-only">
            Namn på scenariot
          </label>
          <Input
            id="typfall-scenario-namn"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !full) save();
            }}
            placeholder={autoName(current)}
            maxLength={40}
            className="bg-card"
          />
          <button type="button" className={cn(button, "h-9 px-4 text-sm")} onClick={save} disabled={full}>
            <Upload className="size-4" aria-hidden="true" />
            Spara nuvarande
          </button>
        </div>
        {full && <p className="mt-2 text-xs text-muted-foreground">Ta bort ett scenario för att spara ett nytt.</p>}
      </div>

      <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-xl font-semibold">Inkomst per månad</h2>
          <div className="w-full sm:w-80">
            <Segmented
              label="Visa"
              value={measure}
              onChange={setMeasure}
              options={[
                { value: "brutto", label: "Före skatt" },
                { value: "disp", label: "Disponibel inkomst" },
              ]}
              size="sm"
            />
          </div>
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {columns.map((c) => (
            <li key={c.key} className="flex items-center gap-2">
              <span className="h-0.5 w-4 rounded-full" style={{ background: c.color }} aria-hidden="true" />
              {c.name}
            </li>
          ))}
        </ul>
        <p className="mt-1 text-sm text-muted-foreground">
          {measure === "brutto"
            ? `Lön och pension före skatt, i ${W_REF} års priser.`
            : `Efter skatt med bidrag och uttag från ISK och kapitalförsäkring, i ${W_REF} års priser.`}
        </p>
        <div className="mt-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8 }}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="age" tickLine={false} axisLine={false} fontSize={12} minTickGap={12} />
              <YAxis tickFormatter={formatSekShort} tickLine={false} axisLine={false} fontSize={12} width={72} />
              <Tooltip
                formatter={(v: number) => formatSek(v)}
                labelFormatter={(age) => `Vid ${age} år`}
                separator=": "
                itemStyle={{ color: "var(--color-foreground)" }}
                // Long scenario names wrap instead of running out of the card on a phone.
                wrapperStyle={{ maxWidth: "min(80%, 340px)" }}
                contentStyle={{ fontSize: 12, whiteSpace: "normal" }}
                cursor={{ stroke: "var(--color-muted-foreground)", strokeWidth: 1 }}
              />
              {columns.map((c) => (
                <Line
                  key={c.key}
                  type="linear"
                  dataKey={c.key}
                  name={c.name}
                  stroke={c.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-card)" }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-secondary px-4 py-3 sm:px-6">
          <h2 className="font-serif text-xl font-semibold">Jämförelse</h2>
          <button type="button" onClick={csv} className={button}>
            <Download className="size-3.5" aria-hidden="true" />
            Ladda ner CSV
          </button>
        </div>
        {saved.length === 0 ? (
          <p className="px-4 pt-3 text-sm text-muted-foreground sm:px-6">
            Inga sparade scenarier än. Spara det nuvarande, ändra formuläret och se skillnaden här.
          </p>
        ) : (
          <p className="px-4 pt-3 text-xs text-muted-foreground sm:px-6 md:hidden">
            Dra tabellen i sidled för att se alla scenarier. Skillnaden mot Nuvarande står under varje belopp.
          </p>
        )}
        <div className="overflow-x-auto pb-4">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="border-b border-border align-bottom">
                <th scope="col" className="sticky left-0 z-10 bg-card px-4 py-3 text-left text-xs font-medium text-muted-foreground sm:px-6">
                  <span className="sr-only">Uppgift</span>
                </th>
                {columns.map((c) => (
                  <th key={c.key} scope="col" className="min-w-36 px-3 py-3 text-right align-bottom font-semibold">
                    <span className="inline-flex items-center justify-end gap-2">
                      <span className="h-0.5 w-4 shrink-0 rounded-full" style={{ background: c.color }} aria-hidden="true" />
                      <span className="text-left">{c.name}</span>
                    </span>
                    {c.saved && (
                      <span className="mt-2 flex justify-end gap-1.5">
                        <button type="button" className={button} onClick={() => onLoad(c.saved!)}>
                          Visa
                        </button>
                        <button
                          type="button"
                          className="grid size-8 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label={`Ta bort ${c.name}`}
                          onClick={() => onRemove(c.saved!.id)}
                        >
                          <X className="size-4" aria-hidden="true" />
                        </button>
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) =>
                "group" in row ? (
                  <tr key={`g${i}`}>
                    <th
                      scope="colgroup"
                      colSpan={columns.length + 1}
                      className="px-4 pt-5 pb-2 text-left text-xs font-semibold tracking-wider text-muted-foreground uppercase sm:px-6"
                    >
                      <span className="sticky left-4 sm:left-6">{row.group}</span>
                    </th>
                  </tr>
                ) : (
                  <tr key={row.label} className={cn("border-b border-border/60", row.strong && "font-semibold")}>
                    <th
                      scope="row"
                      className={cn(
                        "sticky left-0 z-10 bg-card px-4 py-2 text-left sm:px-6",
                        row.strong ? "font-semibold" : "font-normal",
                      )}
                    >
                      {row.label}
                    </th>
                    {columns.map((c) => {
                      const d = diffText(row, c);
                      return (
                        <td key={c.key} className="px-3 py-2 text-right whitespace-nowrap">
                          {cellValue(row, c)}
                          {d && <span className="block text-xs font-normal text-muted-foreground">{d}</span>}
                        </td>
                      );
                    })}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

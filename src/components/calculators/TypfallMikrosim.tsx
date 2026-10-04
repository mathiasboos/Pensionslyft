// "Mikrosim": rows of standalone typfall with the results in a table and a chart, as in the model's
// web version. The rows use the advanced settings of the form.
import { useRef, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, LabelList, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { downloadCsv } from "@/lib/csv";
import { formatSek, formatSekShort, num } from "@/lib/format";
import {
  BOUNDS,
  contextOf,
  INPUT_COLUMNS,
  MAX_ROWS,
  type MikrosimRow,
  mikrosimCsvRows,
  newRow,
  parseMikrosimCsv,
  RESULT_COLUMNS,
  rowFromForm,
  runRow,
  SCHEMES,
} from "@/lib/typfall/mikrosim";
import type { Avtal } from "@/lib/typfall/model";
import type { SavedScenario, ScenarioForm } from "@/lib/typfall/scenario";
import { cn } from "@/lib/utils";
import { ChartCard, LegendItem } from "./TypfallCharts";
import { Segmented } from "./TypfallFields";

const pill =
  "h-9 cursor-pointer rounded-full border border-foreground/70 bg-card px-3.5 text-sm font-semibold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50";

const INK = "var(--color-foreground)";

// The parts of the pension in the order they are stacked, each in its own colour.
const PARTS = [
  { key: "ip", label: "Inkomstpension", color: "var(--color-chart-1)" },
  { key: "tp", label: "Tilläggspension", color: "#8A8F98" },
  { key: "pp", label: "Premiepension", color: "var(--color-chart-2)" },
  { key: "gp", label: "Garanti-pension", color: "var(--color-chart-5)" },
  { key: "tillagg", label: "P_tillägg", color: "color-mix(in oklab, var(--color-chart-5) 50%, var(--color-card))" },
  { key: "tjp", label: "Tjänstepension", color: "var(--color-chart-3)" },
  { key: "ips", label: "Privat pensionsförsäkring", color: "#5CA28B" },
] as const;

const PRIVATE_INFO =
  "Månadssparande i kr. Beräkningen utgår ifrån att du sparar fram till pensionen. För att ändra, välj Avancerat/Privat sparande/Sparandet börjar år.";

const parse = (text: string): number | null => {
  const t = text.replace(/\s/g, "").replace(",", ".");
  if (t === "") return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
};

/** A number in a table cell, committed when the cell is left. A percentage is shown as percent. */
function Cell({
  label,
  value,
  onChange,
  bounds,
  percent,
  width,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  bounds?: { min: number; max: number };
  percent?: boolean;
  width: string;
}) {
  const shown = (v: number) => String(percent ? Math.round(v * 100_000) / 1000 : Math.round(v * 1000) / 1000).replace(".", ",");
  const [text, setText] = useState(shown(value));
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setText(shown(value));
  }
  return (
    <input
      type="text"
      inputMode={percent ? "decimal" : "numeric"}
      autoComplete="off"
      aria-label={label}
      value={text}
      className={cn("h-8 rounded-md border border-input bg-card px-1.5 text-right text-sm tabular-nums", width)}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const v = parse(text);
        if (v === null) return setText(shown(value));
        const raw = percent ? v / 100 : v;
        const next = bounds ? Math.min(Math.max(Math.round(raw), bounds.min), bounds.max) : raw;
        setText(shown(next));
        if (next !== value) onChange(next);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}

const th = "bg-secondary px-2 py-2 align-bottom text-xs font-semibold text-primary";

export function Mikrosim({
  form,
  saved,
  rows,
  onRows,
}: {
  form: ScenarioForm;
  saved: SavedScenario[];
  rows: MikrosimRow[];
  onRows: (rows: MikrosimRow[]) => void;
}) {
  const [monthly, setMonthly] = useState(false);
  const [fileError, setFileError] = useState("");
  const counter = useRef(rows.length + 1);
  const nextId = () => String(counter.current++);
  const context = contextOf(form);
  const runs = rows.map((r) => runRow(r, context));
  const room = MAX_ROWS - rows.length;

  const edit = (id: string, patch: Partial<MikrosimRow>) =>
    onRows(rows.map((r) => (r.id === id ? { ...r, ...patch, error: undefined } : r)));
  const add = (more: MikrosimRow[]) => onRows([...rows, ...more.slice(0, Math.max(room, 0))]);

  const importFile = async (file: File) => {
    const parsed = parseMikrosimCsv(await file.text(), nextId);
    if (parsed.fileError) return setFileError(parsed.fileError);
    setFileError("");
    onRows(parsed.rows.length > 0 ? parsed.rows : [newRow(nextId())]);
  };

  const divisor = monthly ? 12 : 1;
  const data = rows.map((_, i) => {
    const res = runs[i]!.result;
    const row: Record<string, number | null> = { n: i + 1 };
    for (const p of PARTS) row[p.key] = res ? res[p.key] / divisor : null;
    row.total = res ? res.brutto / divisor : null;
    row.disp = res ? res.disp / divisor : null;
    return row;
  });
  const used = PARTS.filter((p) => data.some((d) => (d[p.key] ?? 0) > 0));

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Mikrosim körs som ett eget läge: varje rad är ett fristående typfall, inte en avvikelse mot formuläret till
          vänster. Lägg till rader för hand, hämta en rad från Prognos eller Jämför scenarier, eller importera en
          CSV-fil -- resultatkolumnerna fylls i direkt.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={pill} disabled={room <= 0} onClick={() => add([newRow(nextId())])}>
            + Lägg till rad
          </button>
          <button type="button" className={pill} disabled={room <= 0} onClick={() => add([rowFromForm(form, nextId())])}>
            Hämta från Prognos
          </button>
          <button
            type="button"
            className={pill}
            disabled={room <= 0}
            onClick={() => add(saved.map((s) => rowFromForm(s.form, nextId())))}
          >
            Hämta från Jämför scenarier
          </button>
          <label className={cn(pill, "inline-flex items-center focus-within:ring-2 focus-within:ring-ring")}>
            Importera CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void importFile(file);
              }}
            />
          </label>
          <button type="button" className={pill} onClick={() => downloadCsv("mikrosim.csv", mikrosimCsvRows(rows, context))}>
            Ladda ner CSV
          </button>
        </div>
        <p className="text-sm text-muted-foreground">Att importera en fil ersätter alla rader i tabellen.</p>
        {fileError && (
          <p role="alert" className="text-sm text-destructive">
            {fileError}
          </p>
        )}
      </div>

      <section className="space-y-2">
        <h2 className="font-serif text-xl font-semibold">Indata</h2>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th scope="col" className={th} />
                <th scope="col" className={th} />
                {INPUT_COLUMNS.map((c) => (
                  <th key={c.key} scope="col" className={cn(th, "text-right")}>
                    {c.key === "ipsMonthly" ? (
                      <abbr title={PRIVATE_INFO} className="cursor-help underline decoration-dotted underline-offset-2">
                        {c.sv}
                      </abbr>
                    ) : (
                      c.sv
                    )}
                  </th>
                ))}
                <th scope="col" className={th} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const run = runs[i]!;
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-2 py-1.5 text-xs text-muted-foreground">{i + 1}</td>
                    <td className="px-1 py-1.5 text-center">
                      {run.error && (
                        <abbr title={run.error} className="cursor-help font-bold text-destructive no-underline">
                          !
                        </abbr>
                      )}
                    </td>
                    <td className="px-1.5 py-1.5 text-right">
                      <Cell label={`Födelseår, rad ${i + 1}`} value={r.born} bounds={BOUNDS.born} width="w-[4.5rem]" onChange={(v) => edit(r.id, { born: v })} />
                    </td>
                    <td className="px-1.5 py-1.5 text-right">
                      <Cell label={`Börjar arbeta vid ålder, rad ${i + 1}`} value={r.startWorkAge} bounds={BOUNDS.startWorkAge} width="w-14" onChange={(v) => edit(r.id, { startWorkAge: v })} />
                    </td>
                    <td className="px-1.5 py-1.5 text-right">
                      <Cell label={`Går i pension vid ålder, rad ${i + 1}`} value={r.retirementAge} bounds={BOUNDS.retirementAge} width="w-14" onChange={(v) => edit(r.id, { retirementAge: v })} />
                    </td>
                    <td className="px-1.5 py-1.5 text-right">
                      <Cell label={`Årslön, rad ${i + 1}`} value={r.annualSalary} bounds={BOUNDS.annualSalary} width="w-24" onChange={(v) => edit(r.id, { annualSalary: v })} />
                    </td>
                    <td className="px-1.5 py-1.5 text-right">
                      <Cell label={`Årlig inflation, rad ${i + 1}`} value={r.yearlyInflation} percent width="w-16" onChange={(v) => edit(r.id, { yearlyInflation: v })} />
                    </td>
                    <td className="px-1.5 py-1.5 text-right">
                      <Cell label={`Real tillväxt, rad ${i + 1}`} value={r.realGrowth} percent width="w-16" onChange={(v) => edit(r.id, { realGrowth: v })} />
                    </td>
                    <td className="px-1.5 py-1.5 text-right">
                      <Cell label={`Real fondavkastning, rad ${i + 1}`} value={r.realReturn} percent width="w-16" onChange={(v) => edit(r.id, { realReturn: v })} />
                    </td>
                    <td className="px-1.5 py-1.5 text-right">
                      <Cell label={`Privat pensionsförsäkring, rad ${i + 1}`} value={r.ipsMonthly} bounds={BOUNDS.ipsMonthly} width="w-20" onChange={(v) => edit(r.id, { ipsMonthly: v })} />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <select
                        aria-label={`Välj tjänstepension, rad ${i + 1}`}
                        value={r.scheme}
                        className="h-8 w-44 rounded-md border border-input bg-card px-1.5 text-sm"
                        onChange={(e) => edit(r.id, { scheme: Number(e.target.value) as Avtal })}
                      >
                        {SCHEMES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-1.5 py-1.5">
                      <button
                        type="button"
                        aria-label={`Ta bort raden ${i + 1}`}
                        disabled={rows.length <= 1}
                        onClick={() => onRows(rows.filter((x) => x.id !== r.id))}
                        className="inline-grid size-[18px] cursor-pointer place-items-center rounded-full border border-foreground/50 text-[0.85rem] leading-none text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-serif text-xl font-semibold">Resultat</h2>
        <p className="text-xs text-muted-foreground">Kronor per år, i fasta priser.</p>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full border-collapse text-sm tabular-nums">
            <thead>
              <tr>
                <th scope="col" className={th} />
                {RESULT_COLUMNS.map((c) => (
                  <th key={c.key} scope="col" className={cn(th, "text-right")}>
                    {c.head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const res = runs[i]!.result;
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-2 py-1.5 text-xs text-muted-foreground">{i + 1}</td>
                    {RESULT_COLUMNS.map((c) => (
                      <td key={c.key} className="whitespace-nowrap px-2 py-1.5 text-right">
                        {res ? num.format(c.get(res)) : ""}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="space-y-4">
        <div className="max-w-xs">
          <Segmented
            label="Visa"
            value={monthly ? "manad" : "ar"}
            onChange={(v) => setMonthly(v === "manad")}
            options={[
              { value: "ar", label: "Årsvis" },
              { value: "manad", label: "Månadsvis" },
            ]}
          />
        </div>
        <ChartCard
          title="Pensionens sammansättning per rad"
          subtitle={monthly ? "Kronor per månad, i fasta priser" : "Kronor per år, i fasta priser"}
          legend={
            <>
              {used.map((p) => (
                <LegendItem key={p.key} kind="box" color={p.color}>
                  {p.label}
                </LegendItem>
              ))}
              <LegendItem kind="line" color={INK}>
                Disponibel inkomst
              </LegendItem>
            </>
          }
          notes={["En rad som inte kunnat beräknas visas som en tom kolumn."]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 24, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="n" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickFormatter={formatSekShort} tickLine={false} axisLine={false} fontSize={12} width={72} />
              <Tooltip
                separator=": "
                itemStyle={{ color: INK }}
                wrapperStyle={{ maxWidth: "min(80%, 340px)" }}
                labelFormatter={(n) => `Rad ${n}`}
                formatter={(v: number) => formatSek(v)}
                cursor={{ fill: "var(--color-muted)" }}
              />
              {PARTS.map((p) => (
                <Bar key={p.key} dataKey={p.key} name={p.label} stackId="a" fill={p.color} />
              ))}
              <Line dataKey="disp" name="Disponibel inkomst" type="linear" stroke={INK} strokeWidth={2} dot={false} />
              {/* The gross pension above each bar, as a line with no stroke that only carries the labels. */}
              <Line dataKey="total" name="Total pension brutto" stroke="none" dot={false} activeDot={false} legendType="none" tooltipType="none" isAnimationActive={false}>
                {rows.length <= 10 && (
                  <LabelList dataKey="total" position="top" offset={6} fontSize={12} fontWeight={700} fill={INK} formatter={(v: number) => num.format(v)} />
                )}
              </Line>
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

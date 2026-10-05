// The figures under the pension table in /typfallsmodellen, as in the model's web version:
// income and pension in three price levels, disposable income, and tax. All in kronor per month.
import type { ReactNode } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatSek, formatSekShort } from "@/lib/format";
import { W_REF, type TypfallResult } from "@/lib/typfall/model";

type Year = TypfallResult["years"][number];

const INK = "var(--color-foreground)";
const GRID = "var(--color-border)";
// Net income in a dark colour and the tax on top of it in its tint, so that the whole bar is the gross income.
const NET = "var(--color-chart-1)";
const GROSS = "color-mix(in oklab, var(--color-chart-1) 22%, var(--color-card))";
const MUNICIPAL = "var(--color-chart-2)";
const STATE = "var(--color-chart-5)";

const PER_MONTH = 12;

export function ChartCard({
  title,
  subtitle,
  legend,
  notes,
  children,
}: {
  title: string;
  subtitle?: string;
  legend: ReactNode;
  notes?: string[];
  children: ReactNode;
}) {
  return (
    <figure className="rounded-xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <figcaption className="font-serif text-xl font-semibold">{title}</figcaption>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">{legend}</ul>
      </div>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-4 h-80">{children}</div>
      {notes?.map((n) => (
        <p key={n} className="mt-2 text-xs text-muted-foreground">
          {n}
        </p>
      ))}
    </figure>
  );
}

export function LegendItem({ kind, color, dash, children }: { kind: "box" | "line"; color: string; dash?: string; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      {kind === "box" ? (
        <span className="size-2.5 rounded-sm" style={{ background: color }} aria-hidden="true" />
      ) : (
        <svg width="18" height="4" aria-hidden="true">
          <line x1="0" x2="18" y1="2" y2="2" stroke={color} strokeWidth="2" strokeDasharray={dash} />
        </svg>
      )}
      {children}
    </li>
  );
}

const tooltipProps = {
  separator: ": ",
  itemStyle: { color: INK },
  wrapperStyle: { maxWidth: "min(80%, 340px)" },
} as const;

/** A diamond marker on a line, 9 px across. */
function Diamond({ cx, cy }: { cx?: number; cy?: number }) {
  if (cx === undefined || cy === undefined) return null;
  return <path d={`M ${cx} ${cy - 4.5} L ${cx + 4.5} ${cy} L ${cx} ${cy + 4.5} L ${cx - 4.5} ${cy} Z`} fill={INK} stroke="var(--color-card)" strokeWidth={1} />;
}

/** The ages from five years before the pension to 100, as the web version's bar charts. */
export const barYears = (years: Year[], par: number) => years.filter((y) => y.age >= par - 5 && y.age <= 100);

const monthly = (v: number | null) => (v === null ? null : v / PER_MONTH);

/** "Disponibel inkomst": the net income and the tax making up the gross income, with the disposable income as a line. */
export function DisposableChart({ years, par }: { years: Year[]; par: number }) {
  const rows = barYears(years, par);
  const data = rows.map((y) => ({
    age: y.age,
    netto: monthly(y.netto),
    skatt: y.netto === null ? null : Math.max(y.brutto - y.netto, 0) / PER_MONTH,
    brutto: y.brutto / PER_MONTH,
    disp: monthly(y.disp),
  }));
  const last = rows.at(-1)?.age ?? par;
  return (
    <ChartCard
      title="Disponibel inkomst"
      subtitle={`Fasta priser (${W_REF}). Disponibel inkomst är efter skatt, med bidrag och uttag från ISK och kapitalförsäkring.`}
      legend={
        <>
          <LegendItem kind="box" color={GROSS}>
            Bruttoinkomst
          </LegendItem>
          <LegendItem kind="box" color={NET}>
            Nettoinkomst
          </LegendItem>
          <LegendItem kind="line" color={INK}>
            Disponibel inkomst
          </LegendItem>
        </>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 8 }} barCategoryGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <ReferenceArea x1={par} x2={last} fill="var(--color-muted)" fillOpacity={0.7} ifOverflow="visible" />
          <XAxis dataKey="age" tickLine={false} axisLine={false} fontSize={12} minTickGap={12} />
          <YAxis tickFormatter={formatSekShort} tickLine={false} axisLine={false} fontSize={12} width={72} />
          <Tooltip
            {...tooltipProps}
            labelFormatter={(age) => `Vid ${age} år`}
            // The tax bar stands for the whole gross income in the tooltip.
            formatter={(v: number, name, item) => formatSek(name === "Bruttoinkomst" ? (item.payload as { brutto: number }).brutto : v)}
            cursor={{ fill: "var(--color-muted)" }}
          />
          <Bar dataKey="netto" name="Nettoinkomst" stackId="a" fill={NET} />
          <Bar dataKey="skatt" name="Bruttoinkomst" stackId="a" fill={GROSS} />
          <Line dataKey="disp" name="Disponibel inkomst" type="linear" stroke={INK} strokeWidth={2} dot={<Diamond />} activeDot={{ r: 5, stroke: "var(--color-card)", strokeWidth: 2 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/** "Skatt per månad": municipal and state tax. */
export function TaxChart({ years, par }: { years: Year[]; par: number }) {
  const rows = barYears(years, par);
  const data = rows.map((y) => ({ age: y.age, kommunal: monthly(y.municipalTax), statlig: monthly(y.stateTax) }));
  const last = rows.at(-1)?.age ?? par;
  return (
    <ChartCard
      title="Skatt per månad"
      subtitle={`Fasta priser (${W_REF})`}
      legend={
        <>
          <LegendItem kind="box" color={MUNICIPAL}>
            Kommunal skatt
          </LegendItem>
          <LegendItem kind="box" color={STATE}>
            Statlig skatt
          </LegendItem>
        </>
      }
      notes={["Statlig skatt inkluderar public service-avgiften och eventuell kapitalskatt."]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 8 }} barCategoryGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <ReferenceArea x1={par} x2={last} fill="var(--color-muted)" fillOpacity={0.7} ifOverflow="visible" />
          <XAxis dataKey="age" tickLine={false} axisLine={false} fontSize={12} minTickGap={12} />
          <YAxis tickFormatter={formatSekShort} tickLine={false} axisLine={false} fontSize={12} width={72} />
          <Tooltip {...tooltipProps} formatter={(v: number) => formatSek(v)} labelFormatter={(age) => `Vid ${age} år`} cursor={{ fill: "var(--color-muted)" }} />
          <Bar dataKey="kommunal" name="Kommunal skatt" stackId="a" fill={MUNICIPAL} />
          <Bar dataKey="statlig" name="Statlig skatt" stackId="a" fill={STATE} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/** The age, and under every tenth age the year. */
function AgeYearTick({ x, y, payload, yearOf }: { x?: number; y?: number; payload?: { value: number }; yearOf: Map<number, number> }) {
  if (x === undefined || y === undefined || !payload) return null;
  const age = payload.value;
  const year = age % 10 === 0 ? yearOf.get(age) : undefined;
  return (
    <g transform={`translate(${x},${y})`} fontSize={12} fill="var(--color-muted-foreground)" textAnchor="middle">
      <text dy={14}>{age}</text>
      {year !== undefined && (
        <text dy={29} fontSize={11}>
          {year}
        </text>
      )}
    </g>
  );
}

/** "Löneinkomst och pension": the gross income in the prices of the year, in fixed prices and in today's wage level. */
export function WageChart({ years, wStart, par }: { years: Year[]; wStart: number; par: number }) {
  const data = years.map((y) => ({
    age: y.age,
    year: y.year,
    current: y.bruttoCurrent / PER_MONTH,
    fixed: y.brutto / PER_MONTH,
    level: y.bruttoWageLevel / PER_MONTH,
  }));
  const yearOf = new Map(years.map((y) => [y.age, y.year]));
  const first = years[0]?.age ?? 0;
  const last = years.at(-1)?.age ?? 100;
  const ticks = Array.from({ length: Math.floor(last / 5) + 1 }, (_, i) => i * 5).filter((a) => a >= first && a <= last);
  return (
    <ChartCard
      title={`Löneinkomst mellan ${wStart}-${par} och pension från ${par} års ålder`}
      legend={
        <>
          <LegendItem kind="line" color="var(--color-chart-3)" dash="2 3">
            Löpande priser
          </LegendItem>
          <LegendItem kind="line" color={NET}>
            Fasta priser ({W_REF})
          </LegendItem>
          <LegendItem kind="line" color={STATE} dash="6 4">
            Dagens ({W_REF}) lönenivå
          </LegendItem>
        </>
      }
      notes={[
        "Fasta priser (reala priser) – priset justerat för inflation",
        "Löpande priser (nominella priser) – priset anges i aktuell prisnivå",
      ]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 8, bottom: 14 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="age" type="number" domain={[first, last]} ticks={ticks} tickLine={false} axisLine={false} height={44} tick={<AgeYearTick yearOf={yearOf} />} />
          <YAxis tickFormatter={formatSekShort} tickLine={false} axisLine={false} fontSize={12} width={72} />
          <Tooltip
            {...tooltipProps}
            formatter={(v: number) => formatSek(v)}
            labelFormatter={(age) => `Vid ${age} år, ${yearOf.get(Number(age)) ?? ""}`}
          />
          <Line dataKey="current" name="Löpande priser" type="linear" stroke="var(--color-chart-3)" strokeWidth={2} strokeDasharray="2 3" dot={false} />
          <Line dataKey="fixed" name={`Fasta priser (${W_REF})`} type="linear" stroke={NET} strokeWidth={3} dot={false} />
          <Line dataKey="level" name={`Dagens (${W_REF}) lönenivå`} type="linear" stroke={STATE} strokeWidth={2} strokeDasharray="6 4" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

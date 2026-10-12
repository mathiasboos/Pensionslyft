import { useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { calculateCompound, requiredMonthlyDeposit } from "@/lib/pension";
import { formatPercent, formatSek, num } from "@/lib/format";
import { AmountField, NumberField, SelectField, SliderField, Stat } from "./fields";

type ChartKind = "ranta" | "totalt" | "sparmal" | "arsfloden";

const CHARTS: { value: ChartKind; label: string }[] = [
  { value: "ranta", label: "Ränta på ränta" },
  { value: "totalt", label: "Totalt belopp" },
  { value: "sparmal", label: "Sparmål" },
  { value: "arsfloden", label: "Årsflöden" },
];

const NAVY = "var(--color-chart-1)";
const GOLD = "var(--color-chart-2)";
const STEEL = "var(--color-chart-3)";
const TEAL = "var(--color-chart-4)";
const BRICK = "var(--color-chart-5)";

// The amounts on the axes are written out in kronor ("100 000"), never as "tkr".
const kronor = (v: number) => num.format(v);
const axisProps = { tickLine: false, axisLine: false, fontSize: 12 } as const;
const yAxis = <YAxis tickFormatter={kronor} width={92} {...axisProps} />;
const grid = <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />;
const money = (v: number) => formatSek(v);
// The legend text stays in the text colour; the swatch beside it carries the series colour.
const legend = <Legend formatter={(value: string) => <span className="text-foreground">{value}</span>} />;

function ChartFrame({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <>
      <div className="mt-4 h-80">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
      {caption && <p className="mt-3 text-center text-xs font-medium text-muted-foreground">{caption}</p>}
    </>
  );
}

export default function CompoundCalculator() {
  const [startCapital, setStartCapital] = useState(50000);
  const [monthlyDeposit, setMonthlyDeposit] = useState(2500);
  const [goal, setGoal] = useState<number | null>(null);
  const [years, setYears] = useState(20);
  const [annualReturn, setAnnualReturn] = useState(7);
  const [annualFee, setAnnualFee] = useState(0.3);
  const [yieldTax, setYieldTax] = useState(1.05);
  const [chart, setChart] = useState<ChartKind>("totalt");

  // With a goal, the monthly saving is what it takes to reach it; the saving the visitor typed comes back with "Återställ".
  const base = { startCapital, years, annualReturn, annualFee, yieldTax };
  const requiredDeposit = goal === null ? null : requiredMonthlyDeposit(base, goal);
  const effectiveDeposit = requiredDeposit ?? monthlyDeposit;

  const result = useMemo(
    () => calculateCompound({ ...base, monthlyDeposit: effectiveDeposit }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startCapital, effectiveDeposit, years, annualReturn, annualFee, yieldTax],
  );

  const rows = result.rows;
  const netRate = formatPercent(result.netReturn, 2);

  // Diagram a): what the capital is made of, year by year.
  const parts = rows.map((r) => ({
    year: r.year,
    Startkapital: Math.round(startCapital),
    Sparande: Math.round(r.cumulativeDeposits),
    [`Enkel ränta (${netRate})`]: Math.round(r.simpleInterest),
    "Ränta-på-ränta": Math.round(r.compoundInterest),
  }));
  const simpleKey = `Enkel ränta (${netRate})`;

  // Diagram b): the capital, from today.
  const total = [{ year: 0, Totalt: Math.round(startCapital) }, ...rows.map((r) => ({ year: r.year, Totalt: Math.round(r.closing) }))];

  // Diagram c): how much of the final value exists each year.
  const final = result.finalCapital;
  const share = rows.map((r) => ({ year: r.year, share: final > 0 ? (r.closing / final) * 100 : 0 }));
  const halfYear = share.find((p) => p.share >= 50)?.year ?? years;
  const shareData = share.map((p) => ({ ...p, half: p.year <= halfYear ? p.share : null }));
  const halfPoint = share.find((p) => p.year === halfYear);

  // Diagram d): what comes in and what goes out each year.
  const flows = [
    { name: "Start", Startkapital: Math.round(startCapital), Månadssparande: 0, Ränta: 0, "Årlig avgift": 0, Skatt: 0 },
    ...rows.map((r) => ({
      name: String(r.year),
      Startkapital: 0,
      Månadssparande: Math.round(r.deposits),
      Ränta: Math.round(r.growth),
      "Årlig avgift": -Math.round(r.fees),
      Skatt: -Math.round(r.tax),
    })),
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
      <div className="space-y-6 self-start rounded-xl border border-border bg-card p-6">
        <NumberField
          id="start-capital" stepBy={10000}
          label="Startkapital"
          value={startCapital}
          onChange={setStartCapital}
          suffix="kr"
        />
        <div>
          <AmountField
            id="monthly-deposit" stepBy={100}
            label="Månadssparande"
            value={Math.round(effectiveDeposit)}
            onChange={setMonthlyDeposit}
            suffix="kr"
            disabled={goal !== null}
            hint={goal !== null ? "Beräknat från sparmålet." : undefined}
          />
        </div>
        <div>
          <AmountField
            id="goal" stepBy={10000}
            label="Sparmål"
            value={goal ?? Math.round(final)}
            onChange={setGoal}
            suffix="kr"
            action={
              goal !== null && (
                <button
                  type="button"
                  onClick={() => setGoal(null)}
                  className="cursor-pointer text-xs font-medium text-primary hover:underline"
                >
                  Återställ
                </button>
              )
            }
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {goal === null
              ? "Följer slutkapitalet. Skriv in ett belopp, till exempel 1 000 000 kr, så räknas månadssparandet fram."
              : requiredDeposit === 0
                ? `Startkapitalet ensamt ger redan ${formatSek(goal)} efter ${years} år.`
                : `Du behöver spara ${formatSek(requiredDeposit ?? 0)} i månaden i ${years} år för att nå ${formatSek(goal)}.`}
          </p>
        </div>
        <SliderField
          label="Sparhorisont"
          value={years}
          onChange={setYears}
          min={1}
          max={50}
          step={1}
          display={`${years} år`}
        />
        <SliderField
          label="Förväntad avkastning"
          value={annualReturn}
          onChange={setAnnualReturn}
          min={0}
          max={12}
          step={0.1}
          display={formatPercent(annualReturn, 1)}
        />
        <SliderField
          label="Årlig avgift"
          value={annualFee}
          onChange={setAnnualFee}
          min={0}
          max={2.5}
          step={0.05}
          display={formatPercent(annualFee, 2)}
        />
        <div>
          <SliderField
            label="Avkastningsskatt"
            value={yieldTax}
            onChange={setYieldTax}
            min={0}
            max={3}
            step={0.05}
            display={formatPercent(yieldTax, 2)}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Schablonskatten på investeringssparkonto och kapitalförsäkring, per år av kapitalet.
          </p>
        </div>
      </div>

      <div className="min-w-0 space-y-6">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-xl font-semibold">{CHARTS.find((c) => c.value === chart)?.label}</h2>
            <div className="w-full sm:w-56">
              <SelectField id="chart" label="Välj diagram" value={chart} onChange={(v) => setChart(v as ChartKind)}>
                {CHARTS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>

          {chart === "ranta" && (
            <ChartFrame>
              <BarChart data={parts}>
                {grid}
                <XAxis dataKey="year" {...axisProps} />
                {yAxis}
                <Tooltip formatter={money} labelFormatter={(l) => `År ${l}`} />
                {legend}
                <Bar dataKey="Startkapital" stackId="a" fill={NAVY} />
                <Bar dataKey="Sparande" stackId="a" fill={GOLD} />
                <Bar dataKey={simpleKey} stackId="a" fill={STEEL} />
                <Bar dataKey="Ränta-på-ränta" stackId="a" fill={TEAL} />
              </BarChart>
            </ChartFrame>
          )}

          {chart === "totalt" && (
            <ChartFrame caption="Sparhorisont (år)">
              <LineChart data={total}>
                {grid}
                <XAxis dataKey="year" {...axisProps} />
                {yAxis}
                <Tooltip formatter={money} labelFormatter={(l) => (l === 0 ? "Idag" : `År ${l}`)} />
                <Line type="monotone" dataKey="Totalt" name="Totalt belopp" stroke={NAVY} strokeWidth={3} dot={false} />
              </LineChart>
            </ChartFrame>
          )}

          {chart === "sparmal" && (
            <ChartFrame
              caption={`Mörka området visar när hälften av ditt slutvärde skapas (år 1–${halfYear}).`}
            >
              <AreaChart data={shareData}>
                {grid}
                <XAxis dataKey="year" {...axisProps} />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 20, 40, 60, 80, 100]}
                  tickFormatter={(v: number) => `${v} %`}
                  width={60}
                  {...axisProps}
                />
                <Tooltip formatter={(v: number) => formatPercent(v, 1)} labelFormatter={(l) => `År ${l}`} />
                <Area type="monotone" dataKey="share" name="Kumulativ andel" stroke={NAVY} strokeWidth={2} fill="none" />
                <Area
                  type="monotone"
                  dataKey="half"
                  name="Första hälften"
                  stroke="none"
                  fill={STEEL}
                  fillOpacity={0.35}
                  connectNulls={false}
                  legendType="none"
                  tooltipType="none"
                />
                {halfPoint && <ReferenceDot x={halfPoint.year} y={halfPoint.share} r={5} fill={NAVY} stroke="#fff" strokeWidth={2} />}
              </AreaChart>
            </ChartFrame>
          )}

          {chart === "arsfloden" && (
            <ChartFrame>
              <BarChart data={flows} stackOffset="sign">
                {grid}
                <XAxis dataKey="name" {...axisProps} />
                {yAxis}
                <Tooltip
                  formatter={(v: number) => (v === 0 ? "–" : money(v))}
                  labelFormatter={(l) => (l === "Start" ? "Start" : `År ${l}`)}
                />
                {legend}
                <Bar dataKey="Startkapital" stackId="f" fill={NAVY} />
                <Bar dataKey="Månadssparande" stackId="f" fill={STEEL} />
                <Bar dataKey="Ränta" stackId="f" fill={TEAL} />
                <Bar dataKey="Årlig avgift" stackId="f" fill={BRICK} />
                <Bar dataKey="Skatt" stackId="f" fill={GOLD} />
              </BarChart>
            </ChartFrame>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Startkapital" value={formatSek(result.startCapital)} />
          <Stat label="+ Månadssparande" value={formatSek(result.totalDeposits)} />
          <Stat label="+ Ränta" value={formatSek(result.totalGrowth)} />
          <Stat label="− Årlig avgift" value={formatSek(result.totalFees)} />
          <Stat label="− Avkastningsskatt" value={formatSek(result.totalTax)} />
          <Stat label="= Slutkapital" value={formatSek(result.finalCapital)} highlight />
        </div>
      </div>
    </div>
  );
}

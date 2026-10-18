import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { calculatePayout } from "@/lib/pension";
import { formatPercent, formatSek, formatSekShort } from "@/lib/format";
import type { ExportColumn } from "@/lib/export";
import { cn } from "@/lib/utils";
import { NumberField, SliderField, Stat } from "./fields";
import { YearTable } from "./YearTable";

interface PensionYear {
  year: number;
  opening: number;
  deposits: number;
  growth: number;
  paid: number;
  closing: number;
  totalIn: number;
}

const COLUMNS: ExportColumn<PensionYear>[] = [
  { label: "År", value: (r) => r.year, plain: true },
  { label: "Ingående kapital", value: (r) => r.opening },
  { label: "Insättningar", value: (r) => r.deposits },
  { label: "Avkastning efter avgift", value: (r) => r.growth },
  { label: "Utbetalning", value: (r) => r.paid },
  { label: "Utgående kapital", value: (r) => r.closing },
  { label: "Insatt totalt", value: (r) => r.totalIn },
];

export default function PensionCalculator() {
  const [currentCapital, setCurrentCapital] = useState(350000);
  const [monthlyDeposit, setMonthlyDeposit] = useState(2000);
  const [yearsToRetirement, setYearsToRetirement] = useState(25);
  const [annualReturn, setAnnualReturn] = useState(6.5);
  const [annualFee, setAnnualFee] = useState(0.6);
  const [payoutYears, setPayoutYears] = useState(20);

  const result = useMemo(
    () =>
      calculatePayout({
        currentCapital,
        monthlyDeposit,
        yearsToRetirement,
        annualReturn,
        annualFee,
        payoutYears,
      }),
    [currentCapital, monthlyDeposit, yearsToRetirement, annualReturn, annualFee, payoutYears],
  );

  // The result year by year, from the running totals of the calculation: first the saving, then the payout.
  const saving: PensionYear[] = result.series.slice(1).map((point, i) => {
    const before = result.series[i]!;
    const deposits = point.deposits - before.deposits;
    return {
      year: point.year,
      opening: before.capital,
      deposits,
      growth: point.capital - before.capital - deposits,
      paid: 0,
      closing: point.capital,
      totalIn: point.deposits,
    };
  });
  const payout: PensionYear[] = result.payouts.map((row) => ({
    year: row.year,
    opening: row.opening,
    deposits: 0,
    growth: row.growth,
    paid: row.paid,
    closing: row.closing,
    totalIn: result.totalDeposits,
  }));
  const rows = [...saving, ...payout];

  // The chart: the capital up to the retirement and then down to 0, with what is paid out every year as bars.
  const chartData = [
    ...result.series.map((point) => ({
      year: point.year,
      capital: point.capital,
      deposits: point.deposits,
      paid: undefined as number | undefined,
    })),
    ...result.payouts.map((row) => ({
      year: row.year,
      capital: row.closing,
      deposits: undefined as number | undefined,
      paid: row.paid,
    })),
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
      <div className="space-y-6 self-start rounded-xl border border-border bg-card p-6">
        <NumberField
          id="current-capital" stepBy={10000}
          label="Nuvarande pensionskapital"
          value={currentCapital}
          onChange={setCurrentCapital}
          suffix="kr"
        />
        <NumberField
          id="monthly-deposit" stepBy={100}
          label="Månadssparande"
          value={monthlyDeposit}
          onChange={setMonthlyDeposit}
          suffix="kr"
        />
        <SliderField
          label="År till pension"
          value={yearsToRetirement}
          onChange={setYearsToRetirement}
          min={1}
          max={45}
          step={1}
          display={`${yearsToRetirement} år`}
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
        <SliderField
          label="Utbetalas under"
          value={payoutYears}
          onChange={setPayoutYears}
          min={5}
          max={30}
          step={1}
          display={`${payoutYears} år`}
          info={{
            title: "Tjänstepension och privat pension:",
            text: "Du kan välja att få din pension utbetald under en tidsbegränsad period (t.ex. 5, 10, 15 eller 20 år) eller livsvarigt (så länge du lever). Kortare tid än 5 år tillåts generellt inte av Skatteverket för att det ska räknas som en pensionsförsäkring.",
          }}
        />
      </div>

      <div className="min-w-0 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Stat label="Kapital vid pension" value={formatSek(result.finalCapital)} highlight />
          <Stat
            label="Per månad i uttag"
            value={formatSek(result.monthlyPension)}
            note={`i ${payoutYears} år`}
            highlight
          />
          <Stat label="Totalt utbetalt" value={formatSek(result.totalPaid)} />
          <Stat label="Egna insättningar" value={formatSek(result.totalDeposits)} />
          <div className="sm:col-span-2">
            <Stat label="Varav avkastning" value={formatSek(result.totalGrowth)} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-xl font-semibold">Kapital och utbetalningar</h2>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {[
                { label: "Kapital", cls: "bg-chart-1" },
                { label: "Insättningar", cls: "bg-chart-2" },
                { label: "Utbetalning per år", cls: "bg-chart-4" },
              ].map((l) => (
                <li key={l.label} className="flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-sm", l.cls)} aria-hidden="true" />
                  {l.label}
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Kapitalet växer till pensionen och betalas sedan ut under {payoutYears} år. Före skatt.
          </p>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 24, right: 28 }}>
                <defs>
                  <linearGradient id="capital" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="year" tickLine={false} axisLine={false} fontSize={12} minTickGap={16} />
                <YAxis tickFormatter={formatSekShort} tickLine={false} axisLine={false} fontSize={12} width={80} />
                <Tooltip
                  formatter={(v: number) => formatSek(v)}
                  labelFormatter={(l) => `År ${l}`}
                  separator=": "
                  itemStyle={{ color: "var(--color-foreground)" }}
                />
                <Area
                  type="monotone"
                  dataKey="deposits"
                  name="Insättningar"
                  stroke="var(--color-chart-2)"
                  fill="var(--color-chart-2)"
                  fillOpacity={0.15}
                  connectNulls={false}
                />
                <Area type="monotone" dataKey="capital" name="Kapital" stroke="var(--color-chart-1)" fill="url(#capital)" />
                <Bar
                  dataKey="paid"
                  name="Utbetalning per år"
                  fill="var(--color-chart-4)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <ReferenceLine
                  x={yearsToRetirement}
                  stroke="var(--color-foreground)"
                  strokeDasharray="3 3"
                  label={{ value: "Pension", position: "top", fontSize: 12, fill: "var(--color-foreground)" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <YearTable
          id="pension-table"
          title={`År för år (${rows.length} år)`}
          columns={COLUMNS}
          rows={rows}
          rowKey={(r) => r.year}
          fileName="sparkalkylator"
          sheet="Sparkalkylator"
        />

        <div className="rounded-xl border border-border bg-secondary/50 p-6 text-sm">
          <p className="mb-3">
            Du får <strong>{formatSek(result.monthlyPension)}</strong> i månaden i {payoutYears} år, tillsammans{" "}
            <strong>{formatSek(result.totalPaid)}</strong> före skatt. Det som står kvar under uttaget fortsätter att
            växa, så du får ut mer än du hade sparat vid pensionen.
          </p>
          Avgiften på {formatPercent(annualFee, 2)} kostar dig ungefär{" "}
          <strong>{formatSek(result.feeCost)}</strong> fram till pension jämfört med ett avgiftsfritt
          sparande. Läs mer i vår artikel om{" "}
          <a href="/artiklar/avgifter-som-ater-upp-din-pension" className="text-primary underline">
            avgifter
          </a>
          .
        </div>
      </div>
    </div>
  );
}

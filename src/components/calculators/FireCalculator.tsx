import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateFire, FIRE_YEARS, ISK_TAX_FREE_AMOUNT, type FireYear } from "@/lib/pension";
import { formatPercent, formatSek, formatSekShort, num } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SliderField } from "./fields";

const COLUMNS: { label: string; value: (r: FireYear) => number }[] = [
  { label: "År", value: (r) => r.year },
  { label: "Ålder", value: (r) => r.age },
  { label: "Månadssparande", value: (r) => r.monthlySavings },
  { label: "Årssparande", value: (r) => r.yearlySavings },
  { label: "Portfölj vid årets start", value: (r) => r.opening },
  { label: "Avkastning", value: (r) => r.growth },
  { label: "Skatt", value: (r) => r.tax },
  { label: "Avgifter", value: (r) => r.fees },
  { label: "Portfölj vid årets slut", value: (r) => r.closing },
  { label: "FIRE-mål", value: (r) => r.target },
  { label: "Kvar till målet", value: (r) => r.gap },
];

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadCsv(rows: FireYear[]) {
  // Semicolons and a byte order mark let Swedish Excel open the file directly.
  const lines = [
    COLUMNS.map((c) => c.label).join(";"),
    ...rows.map((r) => COLUMNS.map((c) => Math.round(c.value(r))).join(";")),
  ];
  download(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), "fire-kalkyl.csv");
}

async function downloadExcel(rows: FireYear[]) {
  const { default: writeExcelFile } = await import("write-excel-file/browser");
  const data = [
    COLUMNS.map((c) => ({ value: c.label, fontWeight: "bold" as const })),
    ...rows.map((r) => COLUMNS.map((c, i) => ({ value: Math.round(c.value(r)), format: i < 2 ? "0" : "#,##0" }))),
  ];
  const blob = await writeExcelFile(data, {
    sheet: "FIRE-kalkyl",
    columns: COLUMNS.map((c, i) => ({ width: i < 2 ? 7 : Math.max(12, c.label.length + 2) })),
    stickyRowsCount: 1,
  }).toBlob();
  download(blob, "fire-kalkyl.xlsx");
}

export default function FireCalculator() {
  const [currentAge, setCurrentAge] = useState(20);
  const [monthlySalary, setMonthlySalary] = useState(40000);
  const [savingsRate, setSavingsRate] = useState(50);
  const [fireMultiple, setFireMultiple] = useState(25);
  const [annualReturn, setAnnualReturn] = useState(6.1);
  const [annualFee, setAnnualFee] = useState(0.25);
  const [yieldTax, setYieldTax] = useState(1.05);
  const [taxFreeAmount, setTaxFreeAmount] = useState(ISK_TAX_FREE_AMOUNT);
  const [startCapital, setStartCapital] = useState(0);
  const [tableOpen, setTableOpen] = useState(false);

  const result = useMemo(
    () =>
      calculateFire({
        currentAge,
        monthlySalary,
        savingsRate,
        fireMultiple,
        annualReturn,
        annualFee,
        yieldTax,
        taxFreeAmount,
        startCapital,
      }),
    [
      currentAge,
      monthlySalary,
      savingsRate,
      fireMultiple,
      annualReturn,
      annualFee,
      yieldTax,
      taxFreeAmount,
      startCapital,
    ],
  );
  const { rows, fireAge, fireYear } = result;

  // Show the years up to a while after FIRE, so the chart isn't dominated by the decades after it.
  // Memoized so that opening the table doesn't restart the chart animation.
  const chartData = useMemo(() => {
    const lastAge = fireAge === null ? 90 : Math.max(fireAge + 5, Math.min(fireAge + 15, 90));
    return [
      { age: currentAge, closing: startCapital, target: result.target },
      ...rows.filter((r) => r.age <= lastAge),
    ];
  }, [rows, fireAge, currentAge, startCapital, result.target]);

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
      <div className="space-y-6 self-start">
        <div className="space-y-6 rounded-xl border border-border bg-card p-6">
          <SliderField
            label="Din ålder"
            value={currentAge}
            onChange={setCurrentAge}
            min={15}
            max={60}
            step={1}
            display={`${currentAge} år`}
          />
          <div>
            <SliderField
              label="Månadslön efter skatt"
              value={monthlySalary}
              onChange={setMonthlySalary}
              min={5000}
              max={200000}
              step={1000}
              display={formatSek(monthlySalary)}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Du sparar {formatSek(result.monthlySavings)} och lever på{" "}
              {formatSek(result.monthlySpending)} i månaden.
            </p>
          </div>
          <SliderField
            label="Sparkvot"
            value={savingsRate}
            onChange={setSavingsRate}
            min={5}
            max={95}
            step={1}
            display={formatPercent(savingsRate, 0)}
          />
          <div>
            <SliderField
              label="FIRE-multipel"
              value={fireMultiple}
              onChange={setFireMultiple}
              min={10}
              max={50}
              step={1}
              display={`${fireMultiple}\u00a0×`}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Målet är {fireMultiple} gånger dina årsutgifter. 25&nbsp;× motsvarar 4&nbsp;%-regeln.
            </p>
          </div>
          <div>
            <SliderField
              label="Nuvarande sparande"
              value={startCapital}
              onChange={setStartCapital}
              min={0}
              max={2000000}
              step={10000}
              display={formatSek(startCapital)}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Det du redan har sparat och investerat.
            </p>
          </div>

          <div className="h-px bg-border" />

          <SliderField
            label="Avkastning per år"
            value={annualReturn}
            onChange={setAnnualReturn}
            min={1}
            max={15}
            step={0.1}
            display={formatPercent(annualReturn, 1)}
          />
          <SliderField
            label="Avgifter per år"
            value={annualFee}
            onChange={setAnnualFee}
            min={0}
            max={2}
            step={0.05}
            display={formatPercent(annualFee, 2)}
          />
          <div>
            <SliderField
              label="Skatt på ISK/KF per år"
              value={yieldTax}
              onChange={setYieldTax}
              min={0}
              max={3}
              step={0.05}
              display={formatPercent(yieldTax, 2)}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Schablonskatten på investeringssparkonto och kapitalförsäkring.
            </p>
          </div>
          <div>
            <SliderField
              label="Skattefritt belopp"
              value={taxFreeAmount}
              onChange={setTaxFreeAmount}
              min={0}
              max={500000}
              step={10000}
              display={formatSek(taxFreeAmount)}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Från 2026 är de första {formatSek(ISK_TAX_FREE_AMOUNT)} skattefria, totalt för ISK,
              kapitalförsäkring och PEPP-konto. Välj 0 kr för att räkna utan.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 text-sm">
          <h2 className="font-serif text-lg font-semibold">Avkastning efter kostnader</h2>
          <dl className="mt-3 space-y-2">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Avkastning</dt>
              <dd>{formatPercent(annualReturn, 2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">− Skatt</dt>
              <dd>{formatPercent(yieldTax, 2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">− Avgifter</dt>
              <dd>{formatPercent(annualFee, 2)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold">
              <dt>= Netto, ungefär</dt>
              <dd>{formatPercent(result.netReturn, 2)}</dd>
            </div>
          </dl>
          {taxFreeAmount > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Skatten tas bara ut på det som överstiger {formatSek(taxFreeAmount)}, så den blir lägre
              än så. Mest märks det i början, när portföljen är liten.
            </p>
          )}
        </div>
      </div>

      <div className="min-w-0 space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-primary p-5 text-primary-foreground">
            <p className="text-xs tracking-wider uppercase opacity-75">FIRE-ålder</p>
            {fireAge === null ? (
              <p className="mt-2 font-serif text-xl font-semibold">Nås inte inom {FIRE_YEARS} år</p>
            ) : (
              <>
                <p className="mt-2 font-serif text-4xl font-semibold">{fireAge} år</p>
                <p className="mt-1 text-sm opacity-75">om {fireYear} år</p>
              </>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs tracking-wider text-muted-foreground uppercase">FIRE-mål</p>
            <p className="mt-2 font-serif text-2xl font-semibold">{formatSek(result.target)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatSek(result.monthlySpending)}/mån × 12 × {fireMultiple}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs tracking-wider text-muted-foreground uppercase">Månadssparande</p>
            <p className="mt-2 font-serif text-2xl font-semibold">{formatSek(result.monthlySavings)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatSek(result.monthlySavings * 12)}/år
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-serif text-xl font-semibold">Vägen till målet</h2>
          <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {result.milestones.map((m) => (
              <li
                key={m.percent}
                className={cn(
                  "rounded-lg border p-3 text-center",
                  m.age === null ? "border-border text-muted-foreground" : "border-primary/20 bg-secondary/60",
                )}
              >
                <p className="font-serif text-lg font-semibold">{m.percent}&nbsp;%</p>
                <p className="text-xs">{m.age === null ? "–" : `vid ${m.age} år`}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-serif text-xl font-semibold">Portföljens utveckling</h2>
            <ul className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-4 rounded-sm bg-chart-1/70" aria-hidden="true" />
                Portfölj
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 border-t-2 border-dashed border-chart-2" aria-hidden="true" />
                FIRE-mål
              </li>
            </ul>
          </div>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 8 }}>
                <defs>
                  <linearGradient id="fire-portfolio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="age" tickLine={false} axisLine={false} fontSize={12} minTickGap={16} />
                <YAxis
                  tickFormatter={formatSekShort}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  width={80}
                />
                <Tooltip
                  formatter={(v: number) => formatSek(v)}
                  labelFormatter={(age) => `Vid ${age} år`}
                  separator=": "
                  itemStyle={{ color: "var(--color-foreground)" }}
                />
                <Area
                  type="monotone"
                  dataKey="closing"
                  name="Portfölj"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2}
                  fill="url(#fire-portfolio)"
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  name="FIRE-mål"
                  stroke="var(--color-chart-2)"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                />
                {fireAge !== null && (
                  <ReferenceLine
                    x={fireAge}
                    stroke="var(--color-foreground)"
                    strokeDasharray="3 3"
                    label={{
                      value: `FIRE vid ${fireAge}`,
                      position: "top",
                      fontSize: 12,
                      fill: "var(--color-foreground)",
                    }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-6">
            <button
              type="button"
              className="flex cursor-pointer items-center gap-2 font-serif text-lg font-semibold"
              aria-expanded={tableOpen}
              aria-controls="fire-table"
              onClick={() => setTableOpen(!tableOpen)}
            >
              År för år ({rows.length} år)
              <ChevronDown
                className={cn("size-5 transition-transform", tableOpen && "rotate-180")}
                aria-hidden="true"
              />
            </button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => downloadCsv(rows)}>
                <Download aria-hidden="true" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => downloadExcel(rows)}>
                <Download aria-hidden="true" /> Excel
              </Button>
            </div>
          </div>
          {tableOpen && (
            <div id="fire-table" className="max-h-96 overflow-auto border-t border-border">
              <table className="w-full text-right text-xs tabular-nums">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    {COLUMNS.map((c) => (
                      <th key={c.label} scope="col" className="px-3 py-2 font-medium whitespace-nowrap first:text-left">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.year}
                      className={cn(
                        "border-t border-border",
                        r.gap <= 0 && "bg-secondary/50",
                        r.year === fireYear && "font-semibold",
                      )}
                    >
                      {COLUMNS.map((c, i) => (
                        <td key={c.label} className="px-3 py-1.5 whitespace-nowrap first:text-left">
                          {i < 2 ? c.value(r) : num.format(c.value(r))}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

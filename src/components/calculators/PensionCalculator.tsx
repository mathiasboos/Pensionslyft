import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { calculatePension } from "@/lib/pension";
import { formatPercent, formatSek, num } from "@/lib/format";
import { NumberField, SliderField, Stat } from "./fields";

export default function PensionCalculator() {
  const [currentCapital, setCurrentCapital] = useState(350000);
  const [monthlyDeposit, setMonthlyDeposit] = useState(2000);
  const [yearsToRetirement, setYearsToRetirement] = useState(25);
  const [annualReturn, setAnnualReturn] = useState(6.5);
  const [annualFee, setAnnualFee] = useState(0.6);
  const [payoutYears, setPayoutYears] = useState(20);

  const result = useMemo(
    () =>
      calculatePension({
        currentCapital,
        monthlyDeposit,
        yearsToRetirement,
        annualReturn,
        annualFee,
        payoutYears,
      }),
    [currentCapital, monthlyDeposit, yearsToRetirement, annualReturn, annualFee, payoutYears],
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
      <div className="space-y-6 self-start rounded-xl border border-border bg-card p-6">
        <NumberField
          id="current-capital"
          label="Nuvarande pensionskapital"
          value={currentCapital}
          onChange={setCurrentCapital}
          step={10000}
          suffix="kr"
        />
        <NumberField
          id="monthly-deposit"
          label="Månadssparande"
          value={monthlyDeposit}
          onChange={setMonthlyDeposit}
          step={500}
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
          label="Uttagstid"
          value={payoutYears}
          onChange={setPayoutYears}
          min={5}
          max={30}
          step={1}
          display={`${payoutYears} år`}
        />
      </div>

      <div className="min-w-0 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Stat label="Kapital vid pension" value={formatSek(result.finalCapital)} highlight />
          <Stat label="Per månad i uttag" value={formatSek(result.monthlyPension)} highlight />
          <Stat label="Egna insättningar" value={formatSek(result.totalDeposits)} />
          <Stat label="Varav avkastning" value={formatSek(result.totalGrowth)} />
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-xl font-semibold">Kapitalets utveckling</h2>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={result.series}>
                <defs>
                  <linearGradient id="capital" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="year" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis
                  tickFormatter={(v: number) => `${num.format(v / 1000)} tkr`}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  width={80}
                />
                <Tooltip formatter={(v: number) => formatSek(v)} labelFormatter={(l) => `År ${l}`} />
                <Area
                  type="monotone"
                  dataKey="deposits"
                  name="Insättningar"
                  stroke="var(--color-chart-2)"
                  fill="var(--color-chart-2)"
                  fillOpacity={0.15}
                />
                <Area
                  type="monotone"
                  dataKey="capital"
                  name="Kapital"
                  stroke="var(--color-chart-1)"
                  fill="url(#capital)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-secondary/50 p-6 text-sm">
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

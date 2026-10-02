import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { calculateCompound } from "@/lib/pension";
import { formatPercent, formatSek, num } from "@/lib/format";
import { NumberField, SliderField, Stat } from "./fields";

export default function CompoundCalculator() {
  const [startAmount, setStartAmount] = useState(50000);
  const [monthlyDeposit, setMonthlyDeposit] = useState(2500);
  const [years, setYears] = useState(20);
  const [annualReturn, setAnnualReturn] = useState(7);
  const [annualFee, setAnnualFee] = useState(0.3);

  const result = useMemo(
    () => calculateCompound({ startAmount, monthlyDeposit, years, annualReturn, annualFee }),
    [startAmount, monthlyDeposit, years, annualReturn, annualFee],
  );

  const chartData = result.series.map((p) => ({
    year: p.year,
    Insättningar: Math.round(p.deposits),
    Avkastning: Math.round(p.growth),
  }));

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
      <div className="space-y-6 self-start rounded-xl border border-border bg-card p-6">
        <NumberField
          id="start-amount"
          label="Startbelopp"
          value={startAmount}
          onChange={setStartAmount}
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
      </div>

      <div className="min-w-0 space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Slutkapital" value={formatSek(result.finalCapital)} highlight />
          <Stat label="Egna insättningar" value={formatSek(result.totalDeposits)} />
          <Stat label="Avkastning" value={formatSek(result.totalGrowth)} />
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-serif text-xl font-semibold">Insättningar och avkastning</h2>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
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
                <Legend />
                <Bar dataKey="Insättningar" stackId="a" fill="var(--color-chart-2)" />
                <Bar dataKey="Avkastning" stackId="a" fill="var(--color-chart-1)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

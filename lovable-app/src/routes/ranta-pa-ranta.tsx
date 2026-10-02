import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { calculateCompound } from "@/lib/pension";
import { formatSek, num } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { NumberField, SliderField, Stat } from "./pensionskalkylator";

export const Route = createFileRoute("/ranta-pa-ranta")({
  head: () => ({
    meta: [
      { title: "Ränta på ränta-kalkylator – Pensionslyft" },
      {
        name: "description",
        content:
          "Se hur ditt sparande växer med ränta på ränta och hur stor del som är egna insättningar respektive avkastning.",
      },
      { property: "og:title", content: "Ränta på ränta-kalkylator – Pensionslyft" },
      {
        property: "og:description",
        content: "Räkna på månadssparande, avkastning och avgifter över tid.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CompoundCalculator,
});

function CompoundCalculator() {
  const [startAmount, setStartAmount] = useState(50000);
  const [monthlyDeposit, setMonthlyDeposit] = useState(2500);
  const [years, setYears] = useState(20);
  const [annualReturn, setAnnualReturn] = useState(7);
  const [annualFee, setAnnualFee] = useState(0.3);
  const { user } = useAuth();

  const result = useMemo(
    () => calculateCompound({ startAmount, monthlyDeposit, years, annualReturn, annualFee }),
    [startAmount, monthlyDeposit, years, annualReturn, annualFee],
  );

  const chartData = result.series.map((p) => ({
    year: p.year,
    Insättningar: Math.round(p.deposits),
    Avkastning: Math.round(p.growth),
  }));

  const save = async () => {
    if (!user) return;
    const { error } = await supabase.from("saved_calculations").insert({
      user_id: user.id,
      kind: "ranta",
      label: `Ränta på ränta ${years} år`,
      input: { startAmount, monthlyDeposit, years, annualReturn, annualFee },
      result: { finalCapital: Math.round(result.finalCapital) },
    });
    if (error) toast.error("Kunde inte spara beräkningen.");
    else toast.success("Beräkningen är sparad på ditt konto.");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <h1 className="font-serif text-4xl font-semibold">Ränta på ränta</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Den mest kraftfulla effekten i allt sparande. Se hur stor del av slutkapitalet som
        kommer från dina egna pengar – och hur mycket som är avkastning.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[380px_1fr]">
        <div className="space-y-6 rounded-xl border border-border bg-card p-6">
          <NumberField label="Startbelopp" value={startAmount} onChange={setStartAmount} step={10000} suffix="kr" />
          <NumberField
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
            display={`${annualReturn.toFixed(1)} %`}
          />
          <SliderField
            label="Årlig avgift"
            value={annualFee}
            onChange={setAnnualFee}
            min={0}
            max={2.5}
            step={0.05}
            display={`${annualFee.toFixed(2)} %`}
          />
          {user ? (
            <Button onClick={save} className="w-full">
              Spara beräkningen
            </Button>
          ) : (
            <Button asChild variant="outline" className="w-full">
              <Link to="/auth">Logga in för att spara</Link>
            </Button>
          )}
        </div>

        <div className="space-y-6">
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
                    width={70}
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
    </div>
  );
}

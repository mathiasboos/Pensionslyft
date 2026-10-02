import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { calculatePension } from "@/lib/pension";
import { formatSek, num } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/pensionskalkylator")({
  head: () => ({
    meta: [
      { title: "Pensionskalkylator – räkna ut ditt pensionskapital" },
      {
        name: "description",
        content:
          "Räkna ut ditt framtida pensionskapital utifrån sparande, avkastning och avgifter – och se vad det blir per månad.",
      },
      { property: "og:title", content: "Pensionskalkylator – Pensionslyft" },
      {
        property: "og:description",
        content: "Se ditt framtida pensionskapital och månadsbelopp efter avgifter.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PensionCalculator,
});

function PensionCalculator() {
  const [currentCapital, setCurrentCapital] = useState(350000);
  const [monthlyDeposit, setMonthlyDeposit] = useState(2000);
  const [yearsToRetirement, setYearsToRetirement] = useState(25);
  const [annualReturn, setAnnualReturn] = useState(6.5);
  const [annualFee, setAnnualFee] = useState(0.6);
  const [payoutYears, setPayoutYears] = useState(20);
  const { user } = useAuth();

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

  const save = async () => {
    if (!user) return;
    const { error } = await supabase.from("saved_calculations").insert({
      user_id: user.id,
      kind: "pension",
      label: `Pension om ${yearsToRetirement} år`,
      input: { currentCapital, monthlyDeposit, yearsToRetirement, annualReturn, annualFee, payoutYears },
      result: {
        finalCapital: Math.round(result.finalCapital),
        monthlyPension: Math.round(result.monthlyPension),
      },
    });
    if (error) toast.error("Kunde inte spara beräkningen.");
    else toast.success("Beräkningen är sparad på ditt konto.");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <h1 className="font-serif text-4xl font-semibold">Pensionskalkylator</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Fyll i ditt nuvarande pensionskapital och ditt månadssparande. Kalkylatorn räknar fram
        kapitalet vid pension och en uppskattad månadsutbetalning.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[380px_1fr]">
        <div className="space-y-6 rounded-xl border border-border bg-card p-6">
          <NumberField
            label="Nuvarande pensionskapital"
            value={currentCapital}
            onChange={setCurrentCapital}
            step={10000}
            suffix="kr"
          />
          <NumberField
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
          <SliderField
            label="Uttagstid"
            value={payoutYears}
            onChange={setPayoutYears}
            min={5}
            max={30}
            step={1}
            display={`${payoutYears} år`}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Stat label="Kapital vid pension" value={formatSek(result.finalCapital)} highlight />
            <Stat label="Per månad i uttag" value={formatSek(result.monthlyPension)} highlight />
            <Stat label="Egna insättningar" value={formatSek(result.totalDeposits)} />
            <Stat label="Varav avkastning" value={formatSek(result.totalGrowth)} />
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-serif text-xl font-semibold">Kapitalets utveckling</h2>
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
                    width={70}
                  />
                  <Tooltip
                    formatter={(v: number) => formatSek(v)}
                    labelFormatter={(l) => `År ${l}`}
                  />
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
            Avgiften på {annualFee.toFixed(2)} % kostar dig ungefär{" "}
            <strong>{formatSek(result.feeCost)}</strong> fram till pension jämfört med ett
            avgiftsfritt sparande. Läs mer i vår artikel om{" "}
            <Link
              to="/artiklar/$slug"
              params={{ slug: "avgifter-som-ater-upp-din-pension" }}
              className="text-primary underline"
            >
              avgifter
            </Link>
            .
          </div>
        </div>
      </div>
    </div>
  );
}

export function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-border p-5 ${highlight ? "bg-primary text-primary-foreground" : "bg-card"}`}
    >
      <p className={`text-xs uppercase tracking-wider ${highlight ? "opacity-75" : "text-muted-foreground"}`}>
        {label}
      </p>
      <p className="mt-2 font-serif text-2xl font-semibold">{value}</p>
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  step,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  suffix: string;
}) {
  return (
    <div>
      <Label className="text-sm">{label}</Label>
      <div className="mt-2 flex items-center gap-2">
        <Input
          type="number"
          value={value}
          step={step}
          min={0}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        />
        <span className="text-sm text-muted-foreground">{suffix}</span>
      </div>
    </div>
  );
}

export function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  display,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  display: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <span className="text-sm font-medium">{display}</span>
      </div>
      <Slider
        className="mt-3"
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0]!)}
      />
    </div>
  );
}

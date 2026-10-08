// Löneväxlingskalkylatorn (/lonevaxlingskalkylator): the calculation and the texts of the supplied
// Salary_Exchange_Consumer.html (github.com/mathiasboos/Calculators, see src/lib/lonevaxling.ts), in the site's own
// components and in the layout of the Pensionskalkylatorn: the inputs in a frame to the left, the results and the chart to the right.
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AG_PCT,
  ALDER,
  AVKASTNING,
  BELOPP,
  calcLonevaxling,
  disclaimer,
  fmtInt,
  fmtKr,
  fmtOneDecimal,
  fmtRate,
  fmtText,
  fmtUplift,
  IBB,
  ITP1_GRENS1,
  ITP1_GRENS2,
  LIMIT_AVGIFTSTAK,
  LIMIT_BRYTPUNKT,
  limitBelopp,
  LON,
  MAX_SPARANDE_PBB,
  MAX_SPARANDE_PROCENT,
  maxVaxling,
  PBB,
  PENSIONSALDER,
  simSeries,
  SLP_PCT,
  YEAR,
} from "@/lib/lonevaxling";
import { formatSek, num } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AmountSliderField, SliderField, Stat } from "./fields";

const SOURCE_URL =
  "https://www.pensionsmyndigheten.se/forsta-din-pension/om-pensionssystemet/sa-beraknas-din-pension-basbelopp-berakningsfaktorer-och-varderegler";

// The three verdicts: the chart's teal, the gold and the red of the site, darkened to read as text.
const STATUS = {
  good: { icon: "✓", className: "bg-[#e8f3f0] text-[#1f5f55]" },
  amber: { icon: "!", className: "bg-[#f6eedb] text-[#6b5320]" },
  warn: { icon: "✕", className: "bg-[#fbe9e6] text-[#a82020]" },
} as const;

function Limit({ title, children }: { title: string; children: string }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="font-display text-xl font-semibold text-primary tabular-nums">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

export default function LonevaxlingCalculator() {
  const [lon, setLon] = useState<number>(LON.start);
  const [belopp, setBelopp] = useState<number>(BELOPP.start);
  const [alder, setAlder] = useState<number>(ALDER.start);
  const [pensionsalder, setPensionsalder] = useState<number>(PENSIONSALDER.start);
  const [avkastning, setAvkastning] = useState<number>(AVKASTNING.start);

  const tak = maxVaxling(lon);
  const result = calcLonevaxling({ lon, belopp, alder, pensionsalder, avkastning });
  const status = STATUS[result.suitability];
  const selected = fmtOneDecimal(avkastning);

  // The salary decides the cap, and the exchanged amount cannot be above it
  const applyLon = (value: number) => {
    setLon(value);
    setBelopp((b) => limitBelopp(value, b));
  };
  const applyBelopp = (value: number) => setBelopp(limitBelopp(lon, value));
  // The pension age is always after the age
  const applyAlder = (value: number) => {
    setAlder(value);
    if (pensionsalder <= value) setPensionsalder(value + 1);
  };
  const applyPensionsalder = (value: number) => setPensionsalder(value <= alder ? alder + 1 : value);

  const series = useMemo(
    () =>
      simSeries(result.premie, avkastning, result.years).map((capital, year) => ({
        year,
        deposits: result.premie * year * 12,
        capital,
      })),
    [result.premie, result.years, avkastning],
  );

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
        <div className="space-y-6 self-start rounded-xl border border-border bg-card p-6">
          <AmountSliderField
            id="lon"
            label="Månadslön före skatt"
            value={lon}
            onChange={applyLon}
            min={LON.min}
            max={LON.max}
            step={LON.step}
            typedMax={LON.typedMax}
            suffix="kr"
          />
          <AmountSliderField
            id="belopp"
            label="Hur mycket vill du löneväxla?"
            value={belopp}
            onChange={applyBelopp}
            min={BELOPP.min}
            max={Math.max(tak, BELOPP.min)}
            step={BELOPP.step}
            typedMax={BELOPP.typedMax}
            suffix="kr/mån"
            hint={
              <>
                Tak för löneväxling: <strong>{fmtInt(tak)} kr/mån</strong>. Pensionssparande får uppgå till max{" "}
                {MAX_SPARANDE_PROCENT} % av årslönen, dock högst 10 prisbasbelopp ({fmtText(MAX_SPARANDE_PBB)} kr/år). Det
                lägsta av gränserna avgör ditt tak.
              </>
            }
          />
          <SliderField
            label="Din ålder"
            value={alder}
            onChange={applyAlder}
            min={ALDER.min}
            max={ALDER.max}
            step={1}
            display={`${alder} år`}
          />
          <SliderField
            label="Planerad pensionsålder"
            value={pensionsalder}
            onChange={applyPensionsalder}
            min={PENSIONSALDER.min}
            max={PENSIONSALDER.max}
            step={1}
            display={`${pensionsalder} år`}
          />
          <SliderField
            label="Förväntad avkastning per år"
            value={avkastning}
            onChange={setAvkastning}
            min={AVKASTNING.min}
            max={AVKASTNING.max}
            step={AVKASTNING.step}
            display={`${selected} %`}
          />
        </div>

        <div className="min-w-0 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Stat
              label="Ditt månadssparande"
              value={fmtKr(result.premie)}
              note={`Inklusive ${fmtUplift(result.uplift)} som arbetsgivaren skjuter till`}
              highlight
            />
            <Stat label={`Extra pensionskapital om ${result.years} år`} value={fmtKr(result.kapital)} highlight />
            <Stat label="Inbetalt kapital" value={fmtKr(result.inbetalt)} />
            <Stat label="Varav avkastning" value={fmtKr(result.kapital - result.inbetalt)} />
          </div>

          <div className={cn("flex items-start gap-3 rounded-xl p-5 text-sm", status.className)} role="status">
            <span className="text-base leading-5 font-black" aria-hidden="true">
              {status.icon}
            </span>
            <p>
              <strong className="block font-semibold">{result.title}</strong>
              {result.text}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-xl font-semibold">Så växer ditt sparande</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Utveckling fram till pension vid <strong>{selected} %</strong> avkastning per år.
            </p>
            <div className="mt-4 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series}>
                  <defs>
                    <linearGradient id="lv-capital" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="year"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={(y: number) => (y === 0 ? "Idag" : `+${y} år`)}
                  />
                  <YAxis
                    tickFormatter={(v: number) => `${num.format(v / 1000)} tkr`}
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    width={80}
                  />
                  <Tooltip
                    formatter={(v: number) => formatSek(v)}
                    labelFormatter={(y) => (y === 0 ? "Idag" : `Om ${y} år`)}
                  />
                  <Area
                    type="monotone"
                    dataKey="deposits"
                    name="Inbetalt kapital"
                    stroke="var(--color-chart-2)"
                    strokeDasharray="6 4"
                    fill="var(--color-chart-2)"
                    fillOpacity={0.15}
                  />
                  <Area
                    type="monotone"
                    dataKey="capital"
                    name={`Värde vid ${selected} %`}
                    stroke="var(--color-chart-1)"
                    fill="url(#lv-capital)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-secondary/50 p-6 text-sm">
            Arbetsgivaren betalar lägre löneskatt på pensionspremier ({fmtRate(SLP_PCT)} %) än arbetsgivaravgift på lön (
            {fmtRate(AG_PCT)} %). Skillnaden läggs ovanpå din pensionspremie. {disclaimer(avkastning)}
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <h2 className="font-display text-2xl font-semibold">När är löneväxling lämpligt?</h2>
        <p className="mt-2 max-w-3xl text-sm">
          Löneväxling är som regel bara lämpligt om din månadslön <strong>efter växling</strong> överstiger båda
          gränserna nedan. Annars kan din pensionsgrundande inkomst och socialförsäkringsförmåner påverkas.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Limit title={`${fmtText(LIMIT_AVGIFTSTAK)} kr/mån`}>
            Avgiftstaket i allmän pension. Under denna nivå minskar din intjäning till allmän pension.
          </Limit>
          <Limit title={`${fmtText(LIMIT_BRYTPUNKT)} kr/mån`}>
            Brytpunkten för statlig inkomstskatt. Över denna nivå är marginalskatten ~20 % högre – löneväxling är extra
            förmånlig.
          </Limit>
          <Limit title={`Max ${MAX_SPARANDE_PROCENT} % av lön`}>
            {`Pensionssparande får uppgå till högst ${MAX_SPARANDE_PROCENT} % av din årslön från anställningen, dock aldrig mer än 10 prisbasbelopp (${fmtText(MAX_SPARANDE_PBB)} kr/år = ${fmtText(MAX_SPARANDE_PBB / 12)} kr/mån, PBB ${YEAR}: ${fmtText(PBB)} kr).`}
          </Limit>
        </div>
        <h3 className="mt-8 font-display text-lg font-semibold">Arbetsgivarens ITP1-avsättning på din lön</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Limit title="4,5 % upp till 7,5 IBB">
            {`På lönedelar upp till 7,5 inkomstbasbelopp (${fmtText(ITP1_GRENS1)} kr/mån, IBB ${YEAR}: ${fmtText(IBB)} kr) sätter arbetsgivaren in 4,5 %.`}
          </Limit>
          <Limit title="30 % mellan 7,5–30 IBB">
            {`På lönedelar mellan 7,5 och 30 IBB (${fmtText(ITP1_GRENS1)}–${fmtText(ITP1_GRENS2)} kr/mån) sätter arbetsgivaren in 30 %. Över 30 IBB görs ingen avsättning.`}
          </Limit>
        </div>
        <p className="mt-4 text-sm">
          Källa:{" "}
          <a href={SOURCE_URL} target="_blank" rel="noopener" className="font-medium text-primary underline">
            Pensionsmyndigheten
          </a>
          .
        </p>
      </section>

      <p className="text-xs text-muted-foreground">
        {`Kalkylatorn är ett förenklat beräkningsverktyg och utgör inte finansiell rådgivning. Beräkningarna bygger på arbetsgivaravgift ${fmtRate(AG_PCT)} % och särskild löneskatt ${fmtRate(SLP_PCT)} %. Historisk avkastning är inte en garanti för framtida avkastning.`}
      </p>
    </div>
  );
}

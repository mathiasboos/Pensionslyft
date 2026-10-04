import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronDown, Download } from "lucide-react";
import { FIRST_COHORT, LAST_COHORT, cohortValue, riktaldrar } from "@/lib/typfall/data";
import { type Avtal, DEFAULT_ADVANCED, runTypfall, type TypfallAdvanced, W_REF } from "@/lib/typfall/model";
import { pensionTable, type TableRow } from "@/lib/typfall/table";
import { formatPercent, formatSek, formatSekShort, num } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AdvancedSections, changedSections } from "./TypfallAdvanced";
import { CheckRow, Disclosure, NumberRow, SelectRow } from "./TypfallFields";

const AVTAL: { value: Avtal; label: string }[] = [
  { value: 1, label: "Ingen tjänstepension" },
  { value: 2, label: "ITP 1 – privatanställda tjänstemän, födda 1979 och senare" },
  { value: 3, label: "ITP 2 – privatanställda tjänstemän, födda före 1979" },
  { value: 4, label: "SAF-LO – privatanställda arbetare" },
  { value: 5, label: "KAP-KL – anställda i kommuner och regioner" },
  { value: 6, label: "AKAP-KR – anställda i kommuner och regioner, födda 1986 och senare" },
  { value: 7, label: "PA 16 avdelning 2 – statligt anställda, födda före 1988" },
  { value: 8, label: "PA 16 avdelning 1 – statligt anställda, födda 1988 och senare" },
];

const MAX_PAR = 72;
const AVERAGE_YEARS = 20; // "Genomsnittlig pension under pensionstiden": the pension age and 20 years on

// Fixed order, so a series keeps its colour.
const SERIES = [
  { key: "ip", label: "Inkomstpension", color: "var(--color-chart-1)" },
  { key: "pp", label: "Premiepension", color: "var(--color-chart-2)" },
  { key: "tjp", label: "Tjänstepension", color: "var(--color-chart-3)" },
  { key: "skydd", label: "Garantipension och tillägg", color: "var(--color-chart-5)" },
  // Contrast 3:1 against the card, and apart from its neighbours with colour vision deficiency.
  { key: "privat", label: "Privat sparande", color: "#5CA28B" },
] as const;
const WAGE_COLOR = "#C9C3B8";

type Mode = "normal" | "avancerat";

/** Saves rows as a CSV file that Excel opens with Swedish settings (semicolon, decimal comma). */
function downloadCsv(filename: string, rows: (string | number | null)[][]) {
  const cell = (v: string | number | null) =>
    v === null
      ? ""
      : typeof v === "number"
        ? String(Math.round(v * 1000) / 1000).replace(".", ",")
        : `"${v.replace(/"/g, '""')}"`;
  const csv = "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const csvButton =
  "flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-foreground/70 bg-card px-3 text-xs font-medium hover:bg-muted";

export default function TypfallCalculator() {
  const [mode, setMode] = useState<Mode>("normal");
  const [born, setBorn] = useState(1975);
  const [par, setPar] = useState(68);
  const [useRikt, setUseRikt] = useState(false);
  const [wStart, setWStart] = useState(23);
  const [monthlyWage, setMonthlyWage] = useState(33200);
  const [avtal, setAvtal] = useState<Avtal>(1);
  const [gift, setGift] = useState(false);
  const [inflation, setInflation] = useState(0);
  const [realGrowth, setRealGrowth] = useState(0);
  const [realReturn, setRealReturn] = useState(1.7);
  const [adv, setAdv] = useState<TypfallAdvanced>(DEFAULT_ADVANCED);
  const [tableOpen, setTableOpen] = useState(false);
  const changeAdv = (patch: Partial<TypfallAdvanced>) => setAdv((a) => ({ ...a, ...patch }));

  const { lowest, rikt } = riktaldrar(born);
  const parUsed = useRikt ? rikt : Math.min(Math.max(par, lowest), MAX_PAR);
  const wStartUsed = Math.min(wStart, parUsed - 1);
  // "Normalt" uses the model's normal settings; the advanced choices are kept for "Avancerat".
  const advUsed = useMemo(
    () => ({ ...(mode === "avancerat" ? adv : DEFAULT_ADVANCED), inflation: inflation / 100 }),
    [mode, adv, inflation],
  );

  const baseInput = useMemo(
    () => ({
      born,
      par: parUsed,
      wStart: wStartUsed,
      monthlyWage,
      avtal,
      gift,
      realGrowth: realGrowth / 100,
      realReturn: realReturn / 100,
    }),
    [born, parUsed, wStartUsed, monthlyWage, avtal, gift, realGrowth, realReturn],
  );
  const result = useMemo(() => runTypfall({ ...baseInput, advanced: advUsed }), [baseInput, advUsed]);
  // The wage path from the form, to fill in "egen löneutveckling".
  const computedWagePath = () =>
    runTypfall({ ...baseInput, advanced: { ...adv, inflation: inflation / 100, egenLon: null } }).wagePath;
  const table = pensionTable(result);

  const kgrad = result.slutlon > 0 ? (result.brutto / result.slutlon) * 100 : 0;
  const lastAverageAge = parUsed + AVERAGE_YEARS;
  const averageYears = result.years.filter((y) => y.age >= parUsed && y.age <= lastAverageAge);
  const averagePension = averageYears.reduce((sum, y) => sum + y.brutto, 0) / averageYears.length / 12;
  const hasPrivat = result.years.some((y) => y.ips > 0 || y.pps > 0);
  const series = SERIES.filter((s) => s.key !== "privat" || hasPrivat);
  const changed = changedSections(adv);

  const firstAge = Math.max(parUsed - 5, wStartUsed);
  const chartData = useMemo(
    () =>
      result.years
        .filter((y) => y.age >= firstAge && y.age <= 90)
        .map((y) => ({
          age: y.age,
          lon: y.lon / 12,
          ip: y.ip / 12,
          pp: y.pp / 12,
          tjp: y.tjp / 12,
          skydd: (y.gp + y.tillagg) / 12,
          privat: (y.ips + y.pps) / 12,
        })),
    [result, firstAge],
  );
  const tableYears = result.years.filter((y) => y.age >= firstAge && y.age <= 100);

  const tableCsv = () =>
    downloadCsv(`typfall-${born}-${parUsed}.csv`, [
      [table.title, "Löpande priser, kronor", `Fasta priser (${W_REF}), kronor`, "Per månad, kronor", "Som andel av slutlön, %"],
      ...[...table.wage, ...table.pension, ...table.afterTax].map((r) => [
        r.label,
        r.current,
        r.fixed,
        r.fixed === null ? null : r.fixed / 12,
        r.share === null ? null : r.share * 100,
      ]),
    ]);
  const yearsCsv = () =>
    downloadCsv(`typfall-${born}-${parUsed}-ar-for-ar.csv`, [
      [
        "År",
        "Ålder",
        "Lön",
        "Inkomstpension",
        "Premiepension",
        "Garantipension",
        "Inkomstpensionstillägg",
        "Tjänstepension",
        "Privat pensionssparande (IPS)",
        "Privat sparande (ISK / KF)",
        "Före skatt",
        "Efter skatt",
        "Bidrag",
        "Disponibel inkomst",
      ],
      ...result.years.map((y) => [
        y.year,
        y.age,
        y.lon,
        y.ip,
        y.pp,
        y.gp,
        y.tillagg,
        y.tjp,
        y.ips,
        y.pps,
        y.brutto,
        y.netto,
        y.bidrag,
        y.disp,
      ]),
    ]);

  const renderRow = (r: TableRow) => (
    <tr key={r.label} className={cn("border-b border-border/60", r.strong && "font-semibold")}>
      <th scope="row" className={cn("py-2 pr-3 text-left", r.strong ? "font-semibold" : "font-normal")}>
        {r.label}
      </th>
      <td className="hidden py-2 pr-3 text-right whitespace-nowrap md:table-cell">
        {r.current === null ? "–" : num.format(r.current)}
      </td>
      <td className="hidden py-2 pr-3 text-right whitespace-nowrap sm:table-cell">
        {r.fixed === null ? "–" : num.format(r.fixed)}
      </td>
      <td className="py-2 pr-3 text-right whitespace-nowrap">{r.fixed === null ? "–" : num.format(r.fixed / 12)}</td>
      <td className="py-2 text-right whitespace-nowrap">{r.share === null ? "–" : formatPercent(r.share * 100, 1)}</td>
    </tr>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
      <div className="self-start lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Inställningar">
          {(["normal", "avancerat"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "h-9 cursor-pointer rounded-full border text-sm font-semibold transition-colors",
                mode === m ? "border-primary bg-primary text-primary-foreground" : "border-foreground/70 bg-card hover:bg-muted",
              )}
            >
              {m === "normal" ? "Normalt" : "Avancerat"}
              {m === "avancerat" && changed > 0 && <span className="ml-1.5 font-normal opacity-75">({changed})</span>}
            </button>
          ))}
        </div>
        {mode === "normal" && changed > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Dina avancerade val används inte i läget Normalt men finns kvar under Avancerat.
          </p>
        )}

        <div className="mt-4 space-y-4 rounded-xl border border-border bg-card p-5">
          <NumberRow
            id="typfall-born"
            label="Födelseår"
            hint={`${FIRST_COHORT}–${LAST_COHORT}`}
            value={born}
            onChange={setBorn}
            min={FIRST_COHORT}
            max={LAST_COHORT}
          />
          <NumberRow
            id="typfall-par"
            label="Går i pension vid ålder"
            hint={useRikt ? `riktåldern för födda ${born}` : `${lowest}–${MAX_PAR}`}
            value={parUsed}
            onChange={setPar}
            min={lowest}
            max={MAX_PAR}
            disabled={useRikt}
          />
          <CheckRow
            checked={useRikt}
            onChange={(v) => {
              setUseRikt(v);
              if (!v) setPar(rikt);
            }}
            label={`Riktålder (${rikt} år)`}
            hint={`Allmän pension går att ta ut från ${lowest} år. Pensionen börjar ${result.pensionYear}.`}
          />
          <NumberRow
            id="typfall-wstart"
            label="Börjar arbeta vid ålder"
            hint="15–40"
            value={wStartUsed}
            onChange={setWStart}
            min={15}
            max={Math.min(40, parUsed - 1)}
          />
          <NumberRow
            id="typfall-wage"
            label="Månadslön"
            hint={`kronor per månad, ${W_REF} års lönenivå`}
            value={monthlyWage}
            onChange={setMonthlyWage}
            min={0}
            max={1000000}
          />
          <SelectRow id="typfall-avtal" label="Välj tjänstepension" value={avtal} onChange={setAvtal} options={AVTAL} />
          <CheckRow checked={gift} onChange={setGift} label="Gift" hint="Gifta får något lägre garantipension." />
          <NumberRow
            id="typfall-inflation"
            label="Årlig inflation"
            hint={`%, från ${W_REF + 1}`}
            value={inflation}
            onChange={setInflation}
            min={0}
            max={10}
            decimals={2}
          />
          <NumberRow
            id="typfall-growth"
            label="Real tillväxt"
            hint="%, löneutveckling utöver inflationen"
            value={realGrowth}
            onChange={setRealGrowth}
            min={-2}
            max={5}
            decimals={2}
          />
          <NumberRow
            id="typfall-return"
            label="Real avkastning"
            hint="%, efter avgifter"
            value={realReturn}
            onChange={setRealReturn}
            min={-2}
            max={10}
            decimals={2}
          />
          <div className="space-y-2 border-t border-border pt-4">
            <Disclosure title="Om pris- och avkastningsantaganden">
              <p>
                Åren fram till och med {W_REF} räknas med de faktiska indexen, avgifterna och fondavkastningen.
                Därefter följer lönerna inkomstindex, som växer med den reala tillväxten plus inflationen.
              </p>
              <p>
                Premiepension, tjänstepension och privat sparande växer med den reala avkastningen plus
                inflationen, efter avgifter. Belopp i fasta priser är omräknade till {W_REF} års priser med KPI.
              </p>
            </Disclosure>
            <Disclosure title="Ordlista">
              <p>
                <strong className="text-foreground">Inkomstpension</strong> – allmän pension från avgifter på 16
                procent av den pensionsgrundande inkomsten, upp till 7,5 inkomstbasbelopp.
              </p>
              <p>
                <strong className="text-foreground">Premiepension</strong> – allmän pension från avgifter på 2,5
                procent, placerade i fonder.
              </p>
              <p>
                <strong className="text-foreground">Garantipension</strong> – grundskydd för den som har låg eller
                ingen inkomstpension. Betalas från riktåldern.
              </p>
              <p>
                <strong className="text-foreground">Pensionstillägg (IPT)</strong> – inkomstpensionstillägg för den
                som har arbetat länge med låg lön.
              </p>
              <p>
                <strong className="text-foreground">Tilläggspension</strong> – ATP, finns bara för födda 1953 och
                tidigare.
              </p>
              <p>
                <strong className="text-foreground">Riktålder</strong> – åldern som pensionsåldrarna följer. Den
                höjs när medellivslängden ökar.
              </p>
              <p>
                <strong className="text-foreground">Delningstal</strong> – talet som pensionsbehållningen delas med
                för att få den årliga pensionen. Det beror på den återstående medellivslängden.
              </p>
              <p>
                <strong className="text-foreground">Slutlön</strong> – genomsnittlig lön de sista åren före
                pensionen.
              </p>
              <p>
                <strong className="text-foreground">Kompensationsgrad</strong> – pensionen som andel av slutlönen.
              </p>
              <p>
                <strong className="text-foreground">Löpande och fasta priser</strong> – löpande priser är kronor det
                år pengarna betalas ut. Fasta priser är omräknade till {W_REF} års penningvärde.
              </p>
            </Disclosure>
          </div>
        </div>

        {mode === "avancerat" && (
          <div className="mt-4">
            <AdvancedSections
              adv={adv}
              onChange={changeAdv}
              onReset={() => setAdv(DEFAULT_ADVANCED)}
              born={born}
              par={parUsed}
              wStart={wStartUsed}
              avtal={avtal}
              gift={gift}
              monthlyWage={monthlyWage}
              forsakringstid={result.forsakringstid}
              defAr={result.defAr}
              tjpPar={result.tjpPar}
              lifeExpectancy={cohortValue(born, "eLife", parUsed)}
              computedWagePath={computedWagePath}
            />
          </div>
        )}
      </div>

      <div className="min-w-0 space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "Pension vid pensionering",
              value: formatSek(result.brutto / 12),
              note: "Total pension brutto, per månad, före skatt",
            },
            {
              label: "Kompensationsgrad vid pensionering",
              value: formatPercent(kgrad, 1),
              note: "Total pension brutto, som andel av slutlön",
            },
            {
              label: "Genomsnittlig pension under pensionstiden",
              value: formatSek(averagePension),
              note: `Per månad, ${parUsed}–${lastAverageAge} års ålder, före skatt`,
            },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-border border-t-[3px] border-t-primary bg-card p-5">
              <p className="text-xs font-semibold tracking-wider text-primary uppercase">{k.label}</p>
              <p className="mt-2 font-serif text-3xl font-semibold">{k.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{k.note}</p>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-secondary px-4 py-3 sm:px-6">
            <h2 className="font-serif text-xl font-semibold">Pensionsinkomst</h2>
            <button type="button" onClick={tableCsv} className={csvButton}>
              <Download className="size-3.5" aria-hidden="true" />
              Ladda ner CSV
            </button>
          </div>
          <div className="overflow-x-auto px-4 pt-2 pb-5 sm:px-6">
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th scope="col" className="py-2 pr-3 text-left font-medium">
                    {table.title}
                  </th>
                  <th scope="col" className="hidden py-2 pr-3 text-right font-medium md:table-cell">
                    Löpande priser, kronor
                  </th>
                  <th scope="col" className="hidden py-2 pr-3 text-right font-medium sm:table-cell">
                    Fasta priser ({W_REF}), kronor
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">
                    Per månad, kronor
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    Som andel av slut&shy;lön
                  </th>
                </tr>
              </thead>
              <tbody>
                {table.wage.map(renderRow)}
                <tr aria-hidden="true">
                  <td colSpan={5} className="h-3" />
                </tr>
                {table.pension.map(renderRow)}
                <tr>
                  <td colSpan={5} className="pt-5 pb-2 text-right text-xs text-muted-foreground">
                    Efter skatt: som andel av lönen efter skatt, disponibel inkomst av den före pensionen
                  </td>
                </tr>
                {table.afterTax.map(renderRow)}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">
              Tabellen visar värden inklusive den sista pensionsrätten, som av taxeringsskäl räknas med först året
              efter.
              {avtal !== 1 &&
                (result.advanced.tempTjp > 0
                  ? ` Tjänstepensionen betalas ut under ${result.advanced.tempTjp} år`
                  : " Tjänstepensionen betalas ut livsvarigt")}
              {avtal !== 1 && (result.tjpPar === parUsed ? "." : ` från ${result.tjpPar} år.`)}
              {result.defAr > parUsed &&
                ` Allmän pension tas ut delvis från ${parUsed} år och helt från ${result.defAr} år.`}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-serif text-xl font-semibold">Inkomst per månad</h2>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="size-2.5 rounded-sm" style={{ background: WAGE_COLOR }} aria-hidden="true" />
                Lön
              </li>
              {series.map((s) => (
                <li key={s.key} className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm" style={{ background: s.color }} aria-hidden="true" />
                  {s.label}
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Före skatt, i {W_REF} års priser.
            {result.pps > 0 && " Uttagen från ISK och kapitalförsäkring är redan beskattade."}
          </p>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 8 }} barCategoryGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="age" tickLine={false} axisLine={false} fontSize={12} minTickGap={12} />
                <YAxis tickFormatter={formatSekShort} tickLine={false} axisLine={false} fontSize={12} width={72} />
                <Tooltip
                  formatter={(v: number) => formatSek(v)}
                  labelFormatter={(age) => `Vid ${age} år`}
                  separator=": "
                  itemStyle={{ color: "var(--color-foreground)" }}
                  cursor={{ fill: "var(--color-muted)" }}
                />
                <ReferenceLine
                  x={parUsed}
                  stroke="var(--color-foreground)"
                  strokeDasharray="3 3"
                  label={{ value: "Pension", position: "top", fontSize: 12, fill: "var(--color-foreground)" }}
                />
                <Bar dataKey="lon" name="Lön" stackId="a" fill={WAGE_COLOR} />
                {series.map((s) => (
                  <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.color} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-start justify-between gap-3 p-4 sm:px-6">
            <div>
              <button
                type="button"
                className="flex cursor-pointer items-center gap-2 font-serif text-lg font-semibold"
                aria-expanded={tableOpen}
                aria-controls="typfall-table"
                onClick={() => setTableOpen(!tableOpen)}
              >
                År för år
                <ChevronDown className={cn("size-5 transition-transform", tableOpen && "rotate-180")} aria-hidden="true" />
              </button>
              <p className="mt-1 text-sm text-muted-foreground">
                Kronor i månaden, i {W_REF} års priser. Bidrag är bostadstillägg, bostadsbidrag, barnbidrag och
                bistånd. Disponibel inkomst är efter skatt med bidrag och uttag från ISK och kapitalförsäkring.
              </p>
            </div>
            <button type="button" onClick={yearsCsv} className={csvButton}>
              <Download className="size-3.5" aria-hidden="true" />
              Ladda ner CSV
            </button>
          </div>
          {tableOpen && (
            <div id="typfall-table" className="max-h-96 overflow-auto border-t border-border">
              <table className="w-full text-right text-xs tabular-nums">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    {[
                      "År",
                      "Ålder",
                      "Lön",
                      "Inkomst­pension",
                      "Premie­pension",
                      "Garanti och tillägg",
                      "Tjänste­pension",
                      ...(hasPrivat ? ["Privat sparande"] : []),
                      "Före skatt",
                      "Efter skatt",
                      "Bidrag",
                      "Disponibel inkomst",
                    ].map((h) => (
                      <th key={h} scope="col" className="px-3 py-2 font-medium first:text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableYears.map((y) => (
                    <tr key={y.age} className={cn("border-t border-border", y.age === parUsed && "bg-secondary/50 font-semibold")}>
                      <td className="px-3 py-1.5 text-left">{y.year}</td>
                      <td className="px-3 py-1.5">{y.age}</td>
                      {[y.lon, y.ip, y.pp, y.gp + y.tillagg, y.tjp, ...(hasPrivat ? [y.ips + y.pps] : []), y.brutto].map((v, i) => (
                        <td key={i} className="px-3 py-1.5 whitespace-nowrap">
                          {num.format(v / 12)}
                        </td>
                      ))}
                      {[y.netto, y.bidrag, y.disp].map((v, i) => (
                        <td key={`n${i}`} className="px-3 py-1.5 whitespace-nowrap">
                          {v === null ? "–" : num.format(v / 12)}
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

import { useEffect, useMemo, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronDown, Download } from "lucide-react";
import { FIRST_COHORT, LAST_COHORT, cohortValue } from "@/lib/typfall/data";
import { type Avtal, DEFAULT_ADVANCED, type TypfallAdvanced, W_REF } from "@/lib/typfall/model";
import {
  DEFAULT_FORM,
  freeSlot,
  keyFigures,
  loadSaved,
  MAX_PAR,
  runScenario,
  type SavedScenario,
  type ScenarioForm,
  storeSaved,
  usedAges,
} from "@/lib/typfall/scenario";
import { pensionTable, type TableRow } from "@/lib/typfall/table";
import { formatPercent, formatSek, formatSekShort, num } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
import { type MikrosimRow, newRow } from "@/lib/typfall/mikrosim";
import { cn } from "@/lib/utils";
import { AdvancedSections, changedSections } from "./TypfallAdvanced";
import { DisposableChart, TaxChart, WageChart } from "./TypfallCharts";
import { ScenarioCompare } from "./TypfallCompare";
import { Mikrosim } from "./TypfallMikrosim";
import { CheckRow, Disclosure, NumberRow, Segmented, SelectRow } from "./TypfallFields";

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

type Year = ReturnType<typeof runScenario>["years"][number];

/** The columns of "År för år" with the explanations of the model's web version. */
const YEAR_COLUMNS: { key: string; head: string; info: string; get: (y: Year) => number | null }[] = [
  { key: "lon", head: "Lön", info: "Årets lön eller annan förvärvsinkomst.", get: (y) => y.lon },
  {
    key: "ip",
    head: "Inkomst- och tilläggspension",
    info: "Inkomstpension, den största delen av den allmänna pensionen, plus tilläggspension för den som är född 1953 eller tidigare.",
    get: (y) => y.ip,
  },
  {
    key: "pp",
    head: "Premiepension",
    info: "Premiepension: den del av den allmänna pensionen du själv väljer placering för.",
    get: (y) => y.pp,
  },
  {
    key: "tjp",
    head: "Tjänste\u00ADpension+IPS",
    info: "Tjänstepension från arbetsgivaren plus eventuellt individuellt pensionssparande (IPS), före skatt.",
    get: (y) => y.tjp + y.ips,
  },
  {
    key: "gp",
    head: "Garantipension",
    info: "Garantipension (lägstanivå för den som haft låg eller ingen inkomst) plus inkomstpensionstillägg och, för den som är född 1938–1953, garantitillägg.",
    get: (y) => y.gp + y.tillagg,
  },
  {
    key: "brutto",
    head: "Inkomst brutto",
    info: "Summan av lön, allmän pension, tjänstepension och privat pensionssparande, före skatt.",
    get: (y) => y.brutto,
  },
  {
    key: "kommunal",
    head: "Kommunal skatt",
    info: "Kommunal inkomstskatt och kyrko-/begravningsavgift, efter jobbskatteavdrag och andra skattereduktioner.",
    get: (y) => y.municipalTax,
  },
  {
    key: "statlig",
    head: "Statlig skatt",
    info: "Statlig inkomstskatt (20 % över brytpunkten), public service-avgiften, och eventuell skatt på kapital efter pensionering.",
    get: (y) => y.stateTax,
  },
  { key: "netto", head: "Inkomst efter skatt", info: "Bruttoinkomst minus kommunal och statlig skatt.", get: (y) => y.netto },
  {
    key: "bidrag",
    head: "Bidrag (BT, ÄFS, m.m.)",
    info: "Bostadstillägg, äldreförsörjningsstöd och andra behovsprövade tillägg.",
    get: (y) => y.bidrag,
  },
  {
    key: "pps",
    head: "Privat pensionssparande (ISK / KF)",
    info: "Utbetalning från privat pensionssparande (ISK eller kapitalförsäkring), som inte beskattas som inkomst.",
    get: (y) => y.pps,
  },
  {
    key: "disp",
    head: "Disponibel inkomst",
    info: "Inkomst efter skatt plus bidrag och privat pensionssparande efter skatt.",
    get: (y) => y.disp,
  },
];

type Mode = ScenarioForm["mode"];

const csvButton =
  "flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-foreground/70 bg-card px-3 text-xs font-medium hover:bg-muted";

export default function TypfallCalculator() {
  const [form, setForm] = useState<ScenarioForm>(DEFAULT_FORM);
  const [view, setView] = useState<"prognos" | "jamfor" | "mikrosim">("prognos");
  const [mikroRows, setMikroRows] = useState<MikrosimRow[]>(() => [newRow("1")]);
  const [saved, setSaved] = useState<SavedScenario[]>([]);
  const [tableOpen, setTableOpen] = useState(false);
  const { mode, born, par, useRikt, wStart, monthlyWage, avtal, gift, inflation, realGrowth, realReturn, adv } = form;
  const patch = (p: Partial<ScenarioForm>) => setForm((f) => ({ ...f, ...p }));
  const setMode = (v: Mode) => patch({ mode: v });
  const setBorn = (v: number) => patch({ born: v });
  const setPar = (v: number) => patch({ par: v });
  const setUseRikt = (v: boolean) => patch({ useRikt: v });
  const setWStart = (v: number) => patch({ wStart: v });
  const setMonthlyWage = (v: number) => patch({ monthlyWage: v });
  const setAvtal = (v: Avtal) => patch({ avtal: v });
  const setGift = (v: boolean) => patch({ gift: v });
  const setInflation = (v: number) => patch({ inflation: v });
  const setRealGrowth = (v: number) => patch({ realGrowth: v });
  const setRealReturn = (v: number) => patch({ realReturn: v });
  const setAdv = (v: TypfallAdvanced) => patch({ adv: v });
  const changeAdv = (p: Partial<TypfallAdvanced>) => setForm((f) => ({ ...f, adv: { ...f.adv, ...p } }));

  // Saved scenarios are read after the first render, so the server render and the page agree.
  useEffect(() => setSaved(loadSaved()), []);
  const updateSaved = (list: SavedScenario[]) => {
    setSaved(list);
    storeSaved(list);
  };

  const { par: parUsed, wStart: wStartUsed, lowest, rikt } = usedAges(form);
  const result = useMemo(() => runScenario(form), [form]);
  // The wage path from the form, to fill in "egen löneutveckling".
  const computedWagePath = () =>
    runScenario({ ...form, mode: "avancerat", adv: { ...form.adv, egenLon: null } }).wagePath;
  const table = pensionTable(result);

  const { kgrad, average: averagePension, lastAge: lastAverageAge } = keyFigures(result);
  const hasPrivat = result.years.some((y) => y.ips > 0 || y.pps > 0);
  const series = SERIES.filter((s) => s.key !== "privat" || hasPrivat);
  const changed = changedSections(adv);

  const firstAge = Math.max(parUsed - 5, wStartUsed);
  const chartData = useMemo(
    () =>
      result.years
        .filter((y) => y.age >= firstAge && y.age <= 100)
        .map((y) => ({
          age: y.age,
          lon: y.lon / 12,
          ip: y.ip / 12,
          pp: y.pp / 12,
          tjp: y.tjp / 12,
          skydd: (y.gp + y.tillagg) / 12,
          privat: (y.ips + y.pps) / 12,
          // After tax; the tax rules are only in the model from 2020, so earlier years have no line.
          netto: y.netto === null ? null : y.netto / 12,
        })),
    [result, firstAge],
  );
  // The table starts ten years before the pension, as in the web version, and only has the columns with something in them.
  const tableYears = result.years.filter((y) => y.age >= parUsed - 10 && y.age <= 100);
  const yearColumns = YEAR_COLUMNS.filter((c) => tableYears.some((y) => (c.get(y) ?? 0) > 0));

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
      <div className="min-w-0 self-start lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">
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
              forsakringstid={result.forsakringstid}
              defAr={result.defAr}
              lifeExpectancy={cohortValue(born, "eLife", parUsed)}
              pgbRows={result.pgbRows}
              computedWagePath={computedWagePath}
            />
          </div>
        )}
      </div>

      <div className="min-w-0 space-y-6">
        <div className="max-w-lg">
          <Segmented
            label="Visa"
            value={view}
            onChange={setView}
            options={[
              { value: "prognos", label: "Prognos" },
              {
                value: "jamfor",
                label: (
                  <>
                    Jämför scenarier
                    {saved.length > 0 && <span className="ml-1.5 font-normal opacity-75">({saved.length})</span>}
                  </>
                ),
              },
              { value: "mikrosim", label: "Mikrosim" },
            ]}
          />
        </div>
        {view === "mikrosim" ? (
          <Mikrosim form={form} saved={saved} rows={mikroRows} onRows={setMikroRows} />
        ) : view === "jamfor" ? (
          <ScenarioCompare
            current={form}
            currentResult={result}
            saved={saved}
            onSave={(name) =>
              updateSaved([...saved, { id: Date.now().toString(36), name, form, slot: freeSlot(saved) }])
            }
            onRemove={(id) => updateSaved(saved.filter((s) => s.id !== id))}
            onLoad={(s) => {
              setForm(s.form);
              setView("prognos");
            }}
          />
        ) : (
          <>
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

          <WageChart years={result.years} wStart={wStartUsed} par={parUsed} />

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
                <li className="flex items-center gap-2">
                  <span className="w-4 border-t-2 border-dashed border-foreground" aria-hidden="true" />
                  Inkomst efter skatt
                </li>
              </ul>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Fasta priser ({W_REF}). Staplarna är före skatt och den streckade linjen efter skatt.
              {result.pps > 0 && " Uttagen från ISK och kapitalförsäkring är redan beskattade."}
            </p>
            <div className="mt-4 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 8 }} barCategoryGap={2}>
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
                  <ReferenceArea x1={parUsed} x2={chartData.at(-1)?.age} fill="var(--color-muted)" fillOpacity={0.7} ifOverflow="visible" />
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
                  <Line
                    dataKey="netto"
                    name="Inkomst efter skatt"
                    type="linear"
                    stroke="var(--color-foreground)"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                    activeDot={{ r: 4, stroke: "var(--color-card)", strokeWidth: 2 }}
                    connectNulls={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <DisposableChart years={result.years} par={parUsed} />
          <TaxChart years={result.years} par={parUsed} />

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
                      <th scope="col" className="px-3 py-2 text-left align-bottom font-medium">
                        År
                      </th>
                      <th scope="col" className="px-3 py-2 align-bottom font-medium">
                        Ålder
                      </th>
                      {yearColumns.map((c) => (
                        <th key={c.key} scope="col" className="px-3 py-2 align-bottom font-medium">
                          <abbr title={c.info} className="cursor-help underline decoration-dotted underline-offset-2">
                            {c.head}
                          </abbr>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableYears.map((y) => (
                      <tr key={y.age} className={cn("border-t border-border", y.age === parUsed && "bg-secondary/50 font-semibold")}>
                        <td className="px-3 py-1.5 text-left">{y.year}</td>
                        <td className="px-3 py-1.5">{y.age}</td>
                        {yearColumns.map((c) => {
                          const v = c.get(y);
                          return (
                            <td key={c.key} className="px-3 py-1.5 whitespace-nowrap">
                              {v === null ? "–" : num.format(v / 12)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </>
        )}
      </div>
    </div>
  );
}

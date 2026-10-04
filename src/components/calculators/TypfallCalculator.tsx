import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { FIRST_COHORT, LAST_COHORT, cohortValue, riktaldrar } from "@/lib/typfall/data";
import { type Avtal, DEFAULT_ADVANCED, runTypfall, type TypfallAdvanced, W_REF } from "@/lib/typfall/model";
import { formatPercent, formatSek, formatSekShort, num } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NumberField, SliderField } from "./fields";
import { selectClass, TypfallAdvancedPanel } from "./TypfallAdvanced";

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

export default function TypfallCalculator() {
  const [born, setBorn] = useState(1975);
  const [par, setPar] = useState(68);
  const [wStart, setWStart] = useState(23);
  const [monthlyWage, setMonthlyWage] = useState(33200);
  const [avtal, setAvtal] = useState<Avtal>(1);
  const [gift, setGift] = useState(false);
  const [realGrowth, setRealGrowth] = useState(0);
  const [realReturn, setRealReturn] = useState(1.7);
  const [tableOpen, setTableOpen] = useState(false);
  const [adv, setAdv] = useState<TypfallAdvanced>(DEFAULT_ADVANCED);
  const changeAdv = (patch: Partial<TypfallAdvanced>) => setAdv((a) => ({ ...a, ...patch }));

  const { lowest, rikt } = riktaldrar(born);
  const parUsed = Math.min(Math.max(par, lowest), MAX_PAR);

  const result = useMemo(
    () =>
      runTypfall({
        born,
        par: parUsed,
        wStart,
        monthlyWage,
        avtal,
        gift,
        realGrowth: realGrowth / 100,
        realReturn: realReturn / 100,
        advanced: adv,
      }),
    [born, parUsed, wStart, monthlyWage, avtal, gift, realGrowth, realReturn, adv],
  );

  const kgrad = result.slutlon > 0 ? (result.brutto / result.slutlon) * 100 : 0;
  const ofSlutlonNetto = (v: number) => (result.slutlonNetto ? (v / result.slutlonNetto) * 100 : null);
  // Withdrawals from ISK or kapitalförsäkring are already taxed and come on top of the pension after tax.
  const totalNetto = result.netto + result.pps;
  const sparLabel = adv.sparform === 2 ? "Uttag från ISK" : "Uttag från kapital\u00adförsäkring";
  const hasPrivat = result.years.some((y) => y.ips > 0 || y.pps > 0);
  const series = SERIES.filter((s) => s.key !== "privat" || hasPrivat);
  const firstAge = Math.max(parUsed - 5, wStart);
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

  const rows: { label: string; value: number; strong?: boolean; netto?: boolean }[] = [
    { label: "Inkomstpension", value: result.ip },
    { label: "Premiepension", value: result.pp },
    { label: "Garanti\u00adpension", value: result.gp },
    { label: "Inkomst\u00adpensions\u00adtillägg", value: result.tillagg },
    { label: "Allmän pension", value: result.allman, strong: true },
    { label: "Tjänstepension", value: result.tjp },
    ...(result.ips > 0 ? [{ label: "Privat pensions\u00adsparande (IPS)", value: result.ips }] : []),
    { label: "Pension före skatt", value: result.brutto, strong: true },
    { label: "Pension efter skatt", value: result.netto, strong: true, netto: true },
    ...(result.pps > 0
      ? [
          { label: sparLabel, value: result.pps, netto: true },
          { label: "Totalt efter skatt", value: totalNetto, strong: true, netto: true },
        ]
      : []),
  ];
  const slutlonText =
    result.advanced.slutlonAr === 1 ? "året före pensionen" : `i snitt de ${result.advanced.slutlonAr} åren före pensionen`;

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
      <div className="space-y-6 self-start rounded-xl border border-border bg-card p-6">
        <SliderField
          label="Födelseår"
          value={born}
          onChange={setBorn}
          min={FIRST_COHORT}
          max={LAST_COHORT}
          step={1}
          display={String(born)}
        />
        <div>
          <SliderField
            label="Går i pension vid"
            value={parUsed}
            onChange={setPar}
            min={lowest}
            max={MAX_PAR}
            step={1}
            display={`${parUsed} år`}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            För födda {born} går allmän pension att ta ut från {lowest} år. Riktåldern är {rikt} år.
            Pension från {parUsed} år börjar betalas ut {result.pensionYear}.
          </p>
        </div>
        <SliderField
          label="Börjar arbeta vid"
          value={wStart}
          onChange={setWStart}
          min={16}
          max={40}
          step={1}
          display={`${wStart} år`}
        />
        <div>
          <NumberField
            id="typfall-wage"
            label="Månadslön före skatt"
            value={monthlyWage}
            onChange={setMonthlyWage}
            step={500}
            suffix="kr"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Lönen i {W_REF} års lönenivå. Den följer den allmänna löneutvecklingen hela arbetslivet.
          </p>
        </div>
        <div>
          <Label htmlFor="typfall-avtal" className="text-sm">
            Tjänstepension
          </Label>
          <select
            id="typfall-avtal"
            value={avtal}
            onChange={(e) => setAvtal(Number(e.target.value) as Avtal)}
            className={selectClass}
          >
            {AVTAL.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={gift}
            onChange={(e) => setGift(e.target.checked)}
            className="mt-0.5 size-4 accent-[var(--color-primary)]"
          />
          <span>
            Gift
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Gifta får något lägre garantipension.
            </span>
          </span>
        </label>

        <div className="h-px bg-border" />

        <SliderField
          label="Real löneutveckling per år"
          value={realGrowth}
          onChange={setRealGrowth}
          min={0}
          max={3}
          step={0.1}
          display={formatPercent(realGrowth, 1)}
        />
        <div>
          <SliderField
            label="Real avkastning per år"
            value={realReturn}
            onChange={setRealReturn}
            min={0}
            max={6}
            step={0.1}
            display={formatPercent(realReturn, 1)}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Efter avgifter, för premiepension och tjänstepension från {W_REF + 1}.
          </p>
        </div>

        <TypfallAdvancedPanel
          adv={adv}
          onChange={changeAdv}
          born={born}
          par={parUsed}
          wStart={wStart}
          avtal={avtal}
          forsakringstid={result.forsakringstid}
          lifeExpectancy={cohortValue(born, "eLife", parUsed)}
        />
      </div>

      <div className="min-w-0 space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-primary p-5 text-primary-foreground">
            <p className="text-xs tracking-wider uppercase opacity-75">Pension före skatt</p>
            <p className="mt-2 font-serif text-3xl font-semibold">{formatSek(result.brutto / 12)}</p>
            <p className="mt-1 text-sm opacity-75">i månaden</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs tracking-wider text-muted-foreground uppercase">Efter skatt</p>
            <p className="mt-2 font-serif text-2xl font-semibold">{formatSek(totalNetto / 12)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              i månaden{result.pps > 0 && `, med ${adv.sparform === 2 ? "ISK" : "kapitalförsäkring"}`}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs tracking-wider text-muted-foreground uppercase">Kompensationsgrad</p>
            <p className="mt-2 font-serif text-2xl font-semibold">{formatPercent(kgrad, 0)}</p>
            <p className="mt-1 text-sm text-muted-foreground">av slutlönen före skatt</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-serif text-xl font-semibold">Pensionen vid {parUsed} år</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Det första året som pensionär, i {W_REF} års priser.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Del
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">
                    Per månad
                  </th>
                  <th scope="col" className="hidden py-2 pr-3 text-right font-medium sm:table-cell">
                    Per år
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    Av slut&shy;lönen
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label} className={cn("border-b border-border/60", r.strong && "font-semibold")}>
                    <th scope="row" className="py-2 pr-3 text-left font-[inherit]">
                      {r.label}
                    </th>
                    <td className="py-2 pr-3 text-right whitespace-nowrap">{formatSek(r.value / 12)}</td>
                    <td className="hidden py-2 pr-3 text-right whitespace-nowrap sm:table-cell">{formatSek(r.value)}</td>
                    <td className="py-2 text-right whitespace-nowrap">
                      {r.netto
                        ? ofSlutlonNetto(r.value) === null
                          ? "–"
                          : formatPercent(ofSlutlonNetto(r.value)!, 0)
                        : formatPercent(result.slutlon > 0 ? (r.value / result.slutlon) * 100 : 0, 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Slutlön: {formatSek(result.slutlon / 12)} i månaden före skatt
            {result.slutlonNetto !== null && <> och {formatSek(result.slutlonNetto / 12)} efter skatt</>},{" "}
            {slutlonText}. Pensionen efter skatt jämförs med lönen efter skatt.
          </p>
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
            Före skatt, i {W_REF} års priser.{result.pps > 0 && " Uttagen från ISK och kapitalförsäkring är redan beskattade."}
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
          <div className="p-4 sm:px-6">
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
              Kronor i månaden, i {W_REF} års priser.
              {result.pps > 0 && " Efter skatt räknar med uttagen från ISK och kapitalförsäkring."}
            </p>
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
                      "Inkomst\u00adpension",
                      "Premie\u00adpension",
                      "Garanti och tillägg",
                      "Tjänste\u00adpension",
                      ...(hasPrivat ? ["Privat sparande"] : []),
                      "Före skatt",
                      "Efter skatt",
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
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        {y.netto === null ? "–" : num.format((y.netto + y.pps) / 12)}
                      </td>
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

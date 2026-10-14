import { useMemo, useState, type ReactNode } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import kommunalskatt from "@/data/kommunalskatt-2026.json";
import type { ExportColumn } from "@/lib/export";
import { formatPercent, formatSek, formatSekShort } from "@/lib/format";
import {
  AVTAL,
  BUDGETS,
  DEFAULT_INPUT,
  type KalkylInput,
  type KalkylYear,
  kalkylera,
  RETURNS,
  STATUS,
  type Status,
} from "@/lib/pensionskalkylator";
import type { Avtal } from "@/lib/typfall/model";
import { cn } from "@/lib/utils";
import { Collapsible } from "./Collapsible";
import { AmountField, SelectField, Stat } from "./fields";
import { YearTable } from "./YearTable";

const RATES = kommunalskatt as Record<string, number>;
const KOMMUNER = Object.keys(RATES).sort((a, b) => a.localeCompare(b, "sv"));
/** Begravningsavgiften där Svenska kyrkan inte sköter begravningsverksamheten; annars 0,292 %. */
const BEGR_BY_KOMMUN: Record<string, number> = { Stockholm: 0.07, Tranås: 0.285 };
const begrFor = (kommun: string) => BEGR_BY_KOMMUN[kommun] ?? 0.292;

const STATUS_COLOR: Record<Status, string> = {
  rattTill: "#2f6f73",
  nastanDar: "#a18142",
  paVag: "#795f28",
  forbattras: "#9c4438",
};

const COLUMNS: ExportColumn<KalkylYear>[] = [
  { label: "Ålder", value: (r) => r.age, plain: true },
  { label: "År", value: (r) => r.year, plain: true },
  { label: "Sparat vid årets början", value: (r) => r.opening },
  { label: "Insättningar", value: (r) => r.saving },
  { label: "Avkastning efter avgift och skatt", value: (r) => r.growth },
  { label: "Pension och inkomst efter skatt", value: (r) => r.pensionNet },
  { label: "Budget", value: (r) => r.need },
  { label: "Uttag ur sparandet", value: (r) => r.withdrawal },
  { label: "Saknas", value: (r) => r.shortfall },
  { label: "Sparat vid årets slut", value: (r) => r.closing },
];

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const kr = (v: number) => formatSek(v);
const krMonth = (v: number) => `${formatSek(v)}/mån`;

/** Two choices side by side, as the age choice of the net salary calculator. */
function Choice<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-1 rounded-lg border border-input bg-background p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "cursor-pointer rounded-md px-2 py-1.5 text-xs font-medium transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none",
            value === o.value ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-accent",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A question at the top: the field and a line that explains the answer. */
function Question({ children, note }: { children: ReactNode; note?: ReactNode }) {
  return (
    <div className="min-w-0">
      {children}
      {note && <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p>}
    </div>
  );
}

/** One of the public or occupational pensions: the model's amount, or one the user enters. */
function PensionSource({
  id,
  label,
  model,
  own,
  onOwn,
  available,
  children,
}: {
  id: string;
  label: string;
  model: number;
  own: number | null;
  onOwn: (v: number | null) => void;
  available: boolean;
  children?: ReactNode;
}) {
  const mode = own === null && available ? "model" : "own";
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {children}
      <Choice
        label={label}
        value={mode}
        onChange={(m) => onOwn(m === "model" ? null : Math.round(model))}
        options={[
          { value: "model", label: "Typfallsmodellen" },
          { value: "own", label: "Eget belopp" },
        ]}
      />
      {mode === "model" ? (
        <p className="text-xs text-muted-foreground">
          Enligt Typfallsmodellen: <strong className="text-foreground tabular-nums">{krMonth(model)}</strong> före skatt
        </p>
      ) : (
        <AmountField
          id={id}
          label={`${label}, före skatt`}
          hint={available ? `Typfallsmodellen ger ${krMonth(model)}. Ditt eget belopp finns på minPension.se.` : "Ditt belopp finns på minPension.se."}
          value={own ?? 0}
          onChange={(v) => onOwn(v)}
          suffix="kr/mån"
          stepBy={500}
          compact
        />
      )}
    </div>
  );
}

function Forecast({ result }: { result: ReturnType<typeof kalkylera> }) {
  const { status, shortfall, extraMonthlySaving, needAtRetirement, input, depletedAge } = result;
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[0_12px_32px_-16px_rgba(12,42,73,0.35)] lg:max-w-[18rem]">
      <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Vår prognos</p>
      <p className="mt-1 font-display text-2xl font-semibold" style={{ color: STATUS_COLOR[status] }}>
        {STATUS[status].title}
      </p>
      {status === "rattTill" ? (
        <p className="mt-2 text-sm leading-6">
          {needAtRetirement <= 0
            ? "Din pension efter skatt räcker till hela din budget, utan att du behöver ta av sparandet."
            : `Pension och sparande räcker till din budget ända till ${input.lifeAge} år.`}
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm leading-6">
            Det ser ut att saknas ungefär <strong>{kr(shortfall)}</strong> när du går i pension
            {depletedAge !== null && <>, och sparandet tar slut vid {depletedAge} år</>}.
          </p>
          {extraMonthlySaving > 0 && (
            <p className="mt-2 text-sm leading-6">
              Du kan komma i fas genom att spara minst <strong>{kr(extraMonthlySaving)}</strong> mer per månad.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default function PensionCalculator() {
  const [thisYear] = useState(() => new Date().getFullYear());
  const [input, setInput] = useState<Omit<KalkylInput, "thisYear">>(DEFAULT_INPUT);
  const [budgetChoice, setBudgetChoice] = useState<string>("medel");
  const [returnChoice, setReturnChoice] = useState<string>(String(DEFAULT_INPUT.returnPct));
  const [kommunName, setKommunName] = useState("Stockholm");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);

  const set = <K extends keyof KalkylInput>(key: K, value: KalkylInput[K]) => setInput((prev) => ({ ...prev, [key]: value }));

  // While a number is being typed it can be out of range for a moment ("4" on the way to "40"); the calculation
  // uses the nearest sensible value.
  const safe: KalkylInput = useMemo(() => {
    const age = clamp(Math.round(input.age), 18, 67);
    const retireAge = clamp(Math.round(input.retireAge), age + 1, 75);
    const lifeAge = clamp(Math.round(input.lifeAge), retireAge + 1, 105);
    return { ...input, thisYear, age, retireAge, lifeAge, wStart: clamp(Math.round(input.wStart), 16, retireAge - 1) };
  }, [input, thisYear]);
  const result = useMemo(() => kalkylera(safe), [safe]);
  const { pension, rows } = result;

  const chooseBudget = (key: string) => {
    setBudgetChoice(key);
    const b = BUDGETS.find((x) => x.key === key);
    if (b) set("budget", b.amount);
  };
  const changeBudget = (v: number) => {
    set("budget", v);
    setBudgetChoice(BUDGETS.find((b) => b.amount === v)?.key ?? "");
  };
  const chooseReturn = (value: string) => {
    setReturnChoice(value);
    if (value) set("returnPct", Number(value));
  };
  const changeReturn = (v: number) => {
    set("returnPct", v);
    setReturnChoice(RETURNS.some((r) => r.value === v) ? String(v) : "");
  };
  const chooseKommun = (name: string) => {
    setKommunName(name);
    if (name && RATES[name] !== undefined) setInput((prev) => ({ ...prev, kommunPct: RATES[name]!, begrPct: begrFor(name) }));
  };
  const changeKommunRate = (v: number) => {
    set("kommunPct", v);
    if (kommunName && Math.abs((RATES[kommunName] ?? 0) - v) > 0.001) setKommunName("");
  };

  const chartData = [
    ...rows.map((r) => ({ age: r.age, have: Math.max(r.opening, 0), need: r.needCapital })),
    { age: safe.lifeAge, have: rows.at(-1)?.closing ?? 0, need: 0 },
  ];
  const incomeData = rows
    .filter((r) => r.age >= safe.retireAge)
    .map((r) => ({
      age: r.age,
      allman: r.allmanNet / 12,
      tjp: r.tjpNet / 12,
      other: r.otherNet / 12,
      savings: r.withdrawal / 12,
      missing: r.shortfall / 12,
    }));

  const savingShare = safe.salary > 0 ? (safe.monthlySaving / safe.salary) * 100 : 0;
  const budgetShare = result.netSalary > 0 ? (safe.budget / result.netSalary) * 100 : 0;
  const fullAge = Math.max(safe.retireAge, pension.startAge);
  const pensionNote = pension.available ? (
    safe.retireAge < pension.lowestAge ? (
      <>
        Allmän pension kan tas ut tidigast vid {pension.lowestAge} år (riktålder {pension.riktalder}). Fram till dess
        betalar ditt sparande hela budgeten.
      </>
    ) : (
      <>
        Allmän pension kan tas ut från {pension.lowestAge} år. Din riktålder är {pension.riktalder} år.
      </>
    )
  ) : (
    <>Typfallsmodellen räknar på den som är född 1959–2005. Ange din pension själv under Fler detaljer.</>
  );

  return (
    <div className="space-y-8">
      {/* ── The questions ── */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Question>
            <AmountField id="pk-alder" label="Jag är" value={input.age} onChange={(v) => set("age", v)} suffix="år" stepBy={1} />
          </Question>
          <Question note="Månadslön före skatt.">
            <AmountField id="pk-lon" label="Jag tjänar" value={input.salary} onChange={(v) => set("salary", v)} suffix="kr/mån" stepBy={1000} />
          </Question>
          <Question note="Till exempel på ISK eller i fonder.">
            <AmountField id="pk-sparat" label="Jag har sparat" value={input.savings} onChange={(v) => set("savings", v)} suffix="kr" stepBy={10000} />
          </Question>
          <Question note={`Det är ${formatPercent(savingShare, 0)} av din lön. Sparandet följer lönen.`}>
            <AmountField
              id="pk-manad"
              label="Jag sparar"
              value={input.monthlySaving}
              onChange={(v) => set("monthlySaving", v)}
              suffix="kr/mån"
              stepBy={100}
            />
          </Question>
        </div>

        <div className="mt-8 grid gap-6 border-t border-border pt-6 md:grid-cols-3">
          <Question note={pensionNote}>
            <AmountField
              id="pk-pensionsalder"
              label="Jag vill gå i pension vid"
              value={input.retireAge}
              onChange={(v) => set("retireAge", v)}
              suffix="år"
              stepBy={1}
            />
          </Question>
          <Question
            note={
              <>
                Det är {formatPercent(budgetShare, 0)} av din nettolön i dag. Listan är minPensions exempel på vad en
                pensionär behöver efter skatt.
              </>
            }
          >
            <div className="space-y-2">
              <SelectField id="pk-budget-lista" label="Som pensionär behöver jag" value={budgetChoice} onChange={chooseBudget}>
                {BUDGETS.map((b) => (
                  <option key={b.key} value={b.key}>
                    {b.label} — {krMonth(b.amount)}
                  </option>
                ))}
                <option value="">Eget belopp</option>
              </SelectField>
              <AmountField id="pk-budget" label="Efter skatt i månaden" value={input.budget} onChange={changeBudget} suffix="kr/mån" stepBy={500} compact />
            </div>
          </Question>
          <Question note="Förväntad avkastning per år på ditt sparande, före avgift.">
            <div className="space-y-2">
              <SelectField id="pk-avkastning-lista" label="Avkastning" value={returnChoice} onChange={chooseReturn}>
                {RETURNS.map((r) => (
                  <option key={r.value} value={String(r.value)}>
                    {r.label}
                  </option>
                ))}
                <option value="">Egen avkastning</option>
              </SelectField>
              <AmountField id="pk-avkastning" label="Avkastning per år" value={input.returnPct} onChange={changeReturn} suffix="%" compact />
            </div>
          </Question>
        </div>
      </div>

      {/* ── The forecast ── */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-semibold">Ditt sparande fram till {safe.lifeAge} år</h2>
          <ul className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-4 rounded-sm bg-chart-2/70" aria-hidden="true" />
              Det du kommer att ha
            </li>
            <li className="flex items-center gap-2">
              <span className="w-4 border-t-2 border-dashed border-chart-1" aria-hidden="true" />
              Det du behöver
            </li>
          </ul>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">I dagens penningvärde.</p>
        <div className="relative mt-4 grid gap-4 lg:block">
          <div className="lg:absolute lg:top-2 lg:left-24 lg:z-10">
            <Forecast result={result} />
          </div>
          <div className="h-80 lg:h-[26rem]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 24, right: 8 }}>
                <defs>
                  <linearGradient id="pk-have" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.75} />
                    <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0.12} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="age" tickLine={false} axisLine={false} fontSize={12} minTickGap={16} />
                <YAxis tickFormatter={formatSekShort} tickLine={false} axisLine={false} fontSize={12} width={80} />
                <Tooltip
                  formatter={(v: number) => formatSek(v)}
                  labelFormatter={(age) => `Vid ${age} år`}
                  separator=": "
                  itemStyle={{ color: "var(--color-foreground)" }}
                />
                <Area type="linear" dataKey="have" name="Det du kommer att ha" stroke="var(--color-chart-2)" strokeWidth={2} fill="url(#pk-have)" />
                <Line type="linear" dataKey="need" name="Det du behöver" stroke="var(--color-chart-1)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
                <ReferenceLine
                  x={safe.retireAge}
                  stroke="var(--color-foreground)"
                  strokeDasharray="3 3"
                  label={{ value: `Pension vid ${safe.retireAge}`, position: "top", fontSize: 12, fill: "var(--color-foreground)" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={`Sparat vid ${safe.retireAge} år`} value={kr(result.haveAtRetirement)} note="det du kommer att ha" />
          <Stat label={`Behövs vid ${safe.retireAge} år`} value={kr(result.needAtRetirement)} note={`för att räcka till ${safe.lifeAge} år`} />
          <Stat label="Pension efter skatt" value={krMonth(result.netPension)} note={`första hela året, vid ${fullAge} år`} />
          <Stat label="Glapp mot budgeten" value={krMonth(result.gap)} note={result.gap > 0 ? "tas ur sparandet" : "pensionen täcker budgeten"} />
        </div>
      </div>

      {/* ── Income as a pensioner ── */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-semibold">Din inkomst som pensionär</h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {[
              { label: "Allmän pension", cls: "bg-chart-1" },
              { label: "Tjänstepension", cls: "bg-chart-3" },
              { label: "Annan inkomst", cls: "bg-chart-4" },
              { label: "Uttag ur sparandet", cls: "bg-chart-2" },
              { label: "Saknas", cls: "bg-chart-5" },
            ].map((l) => (
              <li key={l.label} className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-sm", l.cls)} aria-hidden="true" />
                {l.label}
              </li>
            ))}
            <li className="flex items-center gap-2">
              <span className="w-4 border-t-2 border-dashed border-foreground" aria-hidden="true" />
              Budget
            </li>
          </ul>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Per månad efter skatt, i dagens penningvärde.</p>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={incomeData} margin={{ top: 16, right: 8 }} barCategoryGap={1}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="age" tickLine={false} axisLine={false} fontSize={12} minTickGap={16} />
              <YAxis tickFormatter={formatSekShort} tickLine={false} axisLine={false} fontSize={12} width={80} />
              <Tooltip
                formatter={(v: number) => formatSek(v)}
                labelFormatter={(age) => `Vid ${age} år`}
                separator=": "
                itemStyle={{ color: "var(--color-foreground)" }}
              />
              <Bar dataKey="allman" name="Allmän pension" stackId="i" fill="var(--color-chart-1)" />
              <Bar dataKey="tjp" name="Tjänstepension" stackId="i" fill="var(--color-chart-3)" />
              <Bar dataKey="other" name="Annan inkomst" stackId="i" fill="var(--color-chart-4)" />
              <Bar dataKey="savings" name="Uttag ur sparandet" stackId="i" fill="var(--color-chart-2)" />
              <Bar dataKey="missing" name="Saknas" stackId="i" fill="var(--color-chart-5)" />
              <ReferenceLine y={safe.budget} stroke="var(--color-foreground)" strokeDasharray="5 4" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── More details ── */}
      <Collapsible id="pk-detaljer" title="Fler detaljer" aside="pension, skatt och livslängd" open={detailsOpen} onToggle={() => setDetailsOpen(!detailsOpen)}>
        <div className="grid gap-8 md:grid-cols-[14rem_1fr]">
          <p className="text-sm leading-6 text-muted-foreground">
            Pensionerna räknas med Pensionsmyndighetens Typfallsmodellen utifrån din lön, din ålder och när du började
            arbeta. Har du ditt eget besked från minPension kan du skriva in beloppen i stället.
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            <PensionSource id="pk-ip" label="Inkomstpension" model={pension.first.ip} own={input.ownIp} onOwn={(v) => set("ownIp", v)} available={pension.available} />
            <PensionSource id="pk-pp" label="Premiepension" model={pension.first.pp} own={input.ownPp} onOwn={(v) => set("ownPp", v)} available={pension.available} />
            <PensionSource id="pk-tjp" label="Tjänstepension" model={pension.first.tjp} own={input.ownTjp} onOwn={(v) => set("ownTjp", v)} available={pension.available}>
              <SelectField id="pk-avtal" label="Avtal" hideLabel value={String(input.avtal)} onChange={(v) => set("avtal", Number(v) as Avtal)}>
                {AVTAL.map((a) => (
                  <option key={a.value} value={String(a.value)}>
                    {a.label}
                  </option>
                ))}
              </SelectField>
            </PensionSource>
            <AmountField
              id="pk-annan"
              label="Annan inkomst som pensionär"
              hint="Före skatt, till exempel hyresintäkter, en privat pensionsförsäkring eller deltidsarbete."
              value={input.otherIncome}
              onChange={(v) => set("otherIncome", v)}
              suffix="kr/mån"
              stepBy={500}
            />
            {pension.first.gpTillagg > 0 && (
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Garantipension och inkomstpensionstillägg enligt Typfallsmodellen: {krMonth(pension.first.gpTillagg)} före skatt.
              </p>
            )}
            <div className="space-y-2">
              <SelectField id="pk-kommun-lista" label="Kommun" value={kommunName} onChange={chooseKommun}>
                <option value="">— Egen skattesats —</option>
                {KOMMUNER.map((k) => (
                  <option key={k} value={k}>
                    {k} — {RATES[k]!.toFixed(2).replace(".", ",")} %
                  </option>
                ))}
              </SelectField>
              <AmountField id="pk-kommun" label="Kommunalskatt 2026" value={input.kommunPct} onChange={changeKommunRate} suffix="%" compact />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <AmountField id="pk-livslangd" label="Livslängd" hint="Hur länge pengarna ska räcka." value={input.lifeAge} onChange={(v) => set("lifeAge", v)} suffix="år" stepBy={1} />
              <AmountField id="pk-borjade" label="Började arbeta vid" hint="För pensionsrätterna." value={input.wStart} onChange={(v) => set("wStart", v)} suffix="år" stepBy={1} />
            </div>
          </div>
        </div>
      </Collapsible>

      {/* ── Assumptions ── */}
      <Collapsible
        id="pk-antaganden"
        title="Våra antaganden"
        aside="inflation, lön och avgifter"
        open={assumptionsOpen}
        onToggle={() => setAssumptionsOpen(!assumptionsOpen)}
      >
        <div className="grid gap-8 md:grid-cols-[14rem_1fr]">
          <p className="text-sm leading-6 text-muted-foreground">
            Vi har gjort några antaganden om framtiden. Du kan ändra dem och se hur resultatet påverkas.
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            <AmountField id="pk-inflation" label="Inflation per år" value={input.inflationPct} onChange={(v) => set("inflationPct", v)} suffix="%" />
            <AmountField id="pk-lonetillvaxt" label="Löneökning per år" value={input.wageGrowthPct} onChange={(v) => set("wageGrowthPct", v)} suffix="%" />
            <AmountField id="pk-avgift" label="Årlig avgift" hint="Fond- och förvaltningsavgift på sparandet." value={input.feePct} onChange={(v) => set("feePct", v)} suffix="%" />
            <AmountField id="pk-isk" label="Skatt på ISK per år" hint="Schablonskatt på kapital över 300 000 kr." value={input.iskTaxPct} onChange={(v) => set("iskTaxPct", v)} suffix="%" />
          </div>
        </div>
      </Collapsible>

      <YearTable
        id="pk-tabell"
        title={`År för år (${rows.length} år)`}
        columns={COLUMNS}
        rows={rows}
        rowKey={(r) => r.age}
        fileName="pensionskalkyl"
        sheet="Pensionskalkyl"
        open={tableOpen}
        onToggle={() => setTableOpen(!tableOpen)}
        rowClassName={(r) => cn(r.age === safe.retireAge && "font-semibold", r.shortfall > 0 && "text-destructive")}
      />

      <div className="rounded-xl border border-border bg-secondary/50 p-6 text-sm leading-6">
        <h2 className="font-display text-lg font-semibold">Så räknar kalkylatorn</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            Allt visas i dagens penningvärde. Sparandet räknas i kronor för varje år, med avkastning och löneökning, och
            räknas sedan om med inflationen ({formatPercent(safe.inflationPct, 1)}).
          </li>
          <li>
            Allmän pension och tjänstepension kommer från Pensionsmyndighetens Typfallsmodellen, med modellens egen
            avkastning ({formatPercent(1.7, 1)} real) och din reala löneökning. Den allmänna pensionen börjar tidigast vid
            den lägsta pensionsåldern.
          </li>
          <li>Pensionen beskattas med 2026 års regler och din kommunalskatt, med förhöjt grundavdrag från den ålder lagen anger.</li>
          <li>
            Det som pensionen efter skatt inte täcker av budgeten tas ur sparandet, som antas ligga på ett ISK. Avgift och
            schablonskatt dras varje år.
          </li>
          <li>Resultatet är en uppskattning, inte ett besked om din pension. Ditt eget pensionsbesked finns på minPension.se.</li>
        </ul>
      </div>
    </div>
  );
}

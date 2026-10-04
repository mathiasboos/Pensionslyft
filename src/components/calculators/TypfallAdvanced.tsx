// The sections under "Avancerat": the settings from the sheets Adv_settings and PGB in the model.
import { type ReactNode, useState } from "react";
import { Plus, X } from "lucide-react";
import kommuner from "@/data/kommuner-2026.json";
import { data } from "@/lib/typfall/data";
import {
  type Avkastningsval,
  type Avtal,
  DEFAULT_ADVANCED,
  type Kyrka,
  type Loneprofil,
  type Sparform,
  type TypfallAdvanced,
  W_REF,
} from "@/lib/typfall/model";
import { formatPercent, num } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CheckRow, DateRow, ExternalLink, NumberRow, Section, Segmented, SelectRow } from "./TypfallFields";

type WagePath = { age: number; year: number; income: number; wage: number }[];

const LONEPROFIL: { value: Loneprofil; label: string }[] = [
  { value: 0, label: "Rak – följer den allmänna löneutvecklingen" },
  { value: 1, label: "Låg inkomst, kvinna" },
  { value: 2, label: "Låg inkomst, man" },
  { value: 3, label: "Normal inkomst, kvinna" },
  { value: 4, label: "Normal inkomst, man" },
];

const AVKASTNING: { value: Avkastningsval; label: string }[] = [
  { value: 1, label: "Angiven real avkastning" },
  { value: 2, label: "Historiskt PPM" },
  { value: 3, label: "Historiskt AP7 Såfa" },
];

const SPARFORM: { value: Sparform; label: string }[] = [
  { value: 0, label: "IPS / pensionsförsäkring" },
  { value: 1, label: "Kapitalförsäkring" },
  { value: 2, label: "ISK" },
];

const ANDEL = [1, 0.75, 0.5, 0.25].map((v) => ({ value: v, label: formatPercent(v * 100, 0) }));
const TEMP_YEARS = [5, 10, 15, 20];

// The fees in the last data year: the church fee with the burial fee (a member) and the burial
// fee alone (not a member). In Stockholms stad and Tranås kommun the burial fee is a municipal
// one, also for those who are not members.
const lastTax = data.lastHardYear - data.taxFirstYear;
const fraction = (percent: number) => Number((percent / 100).toFixed(6));
const AVG_MEMBER = fraction(data.kyrkoavgift[lastTax]!);
const AVG_NON_MEMBER = fraction(data.begravning[lastTax]!);
const FEE: Record<Exclude<Kyrka, "">, number> = {
  member: AVG_MEMBER,
  stockholm: 0.0007,
  tranas: 0.00285,
  rest: AVG_NON_MEMBER,
};
const percentText = (fee: number) =>
  (fee * 100).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 3 });

const SCB_KOMMUNALSKATT =
  "https://www.scb.se/hitta-statistik/statistik-efter-amne/offentlig-ekonomi/finanser-for-den-kommunala-sektorn/kommunalskatterna/pong/tabell-och-diagram/totala-kommunala-skattesatser-2026-kommunvis/";
const SVENSKA_KYRKAN_KYRKOAVGIFT = "https://www.svenskakyrkan.se/medlem/kyrkoavgiften";

const KOMMUNER = Object.keys(kommuner.rates).sort(new Intl.Collator("sv").compare);
const KOMMUN_OPTIONS = [
  { value: "", label: "— Välj kommun —" },
  ...KOMMUNER.map((name) => ({ value: name, label: name })),
];

const KYRKA: { value: Kyrka; label: string }[] = [
  { value: "member", label: "Medlem i Svenska kyrkan/annat trossamfund" },
  { value: "stockholm", label: "Inte medlem, Stockholms stad" },
  { value: "tranas", label: "Inte medlem, Tranås kommun" },
  { value: "rest", label: "Inte medlem, övriga Sverige" },
  { value: "", label: "— Egen sats —" },
];

type Key = keyof TypfallAdvanced;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const differs = (adv: TypfallAdvanced, keys: Key[]) =>
  keys.some((k) => (k === "barn" ? adv.barn.some((b) => b > 0) : !same(adv[k], DEFAULT_ADVANCED[k])));

// The settings in each section; inflation is in the main form.
const SECTIONS = {
  allman: ["defAr", "uttagIP", "uttagPP", "sysselsattning"],
  bostad: ["ansoker", "hyra", "makensInkomst", "formogenhet", "kapital"],
  garanti: ["forsakringstid"],
  skatt: ["kommunalskatt", "begravning", "kommun", "kyrka", "fack", "akassa"],
  kapital: ["pbhYear", "pbhIP", "pbhPP", "pbhTJP", "pbhPrivat", "avkastningsval", "efterFondavgifter"],
  lon: ["loneprofil", "andradLonAr", "andradLonFaktor", "slutlonAr", "egenLon"],
  pgb: ["barn", "pgb"],
  privat: ["sparManad"],
  tjp: ["tjpPar", "tempTjp", "arvsvinsterTjp", "flexpension"],
} satisfies Record<string, Key[]>;

/** Number of sections with a setting that differs from the model's defaults. */
export function changedSections(adv: TypfallAdvanced): number {
  return Object.values(SECTIONS).filter((keys) => differs(adv, keys)).length;
}

function Note({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

const smallButton =
  "flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-foreground/70 bg-card px-3 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50";

/** "Pensionsgrundande belopp": choose a type, fill in and add. */
function PgbSection({
  adv,
  onChange,
  born,
}: {
  adv: TypfallAdvanced;
  onChange: (patch: Partial<TypfallAdvanced>) => void;
  born: number;
}) {
  type Typ = "barn" | "vpl" | "sa" | "studier";
  const [typ, setTyp] = useState<Typ>("barn");
  const [barn, setBarn] = useState(born + 30);
  const [vplStart, setVplStart] = useState(`${Math.max(born + 19, 1995)}-01-15`);
  const [vplEnd, setVplEnd] = useState(`${Math.max(born + 20, 1996)}-01-14`);
  const [from, setFrom] = useState(Math.max(born + 20, 1995));
  const [to, setTo] = useState(Math.max(born + 22, 1997));
  const [belopp, setBelopp] = useState(150000);
  const [terminer, setTerminer] = useState(2);
  const pgb = adv.pgb;
  const children = adv.barn.filter((b) => b > 0);

  const add = () => {
    if (typ === "barn" && children.length < 4) onChange({ barn: [...children, barn].sort((a, b) => a - b) });
    if (typ === "vpl") onChange({ pgb: { ...pgb, vpl: { start: vplStart, end: vplEnd } } });
    const [a, b] = from <= to ? [from, to] : [to, from];
    if (typ === "sa") onChange({ pgb: { ...pgb, sa: [...pgb.sa, { from: a, to: b, belopp }] } });
    if (typ === "studier") onChange({ pgb: { ...pgb, studier: [...pgb.studier, { from: a, to: b, terminer }] } });
  };

  const entries: { key: string; text: string; remove: () => void }[] = [
    ...children.map((b, i) => ({
      key: `barn-${i}`,
      text: `Barn fött ${b}`,
      remove: () => onChange({ barn: children.filter((_, k) => k !== i) }),
    })),
    ...(pgb.vpl
      ? [{ key: "vpl", text: `Värnplikt ${pgb.vpl.start} – ${pgb.vpl.end}`, remove: () => onChange({ pgb: { ...pgb, vpl: null } }) }]
      : []),
    ...pgb.sa.map((e, i) => ({
      key: `sa-${i}`,
      text: `Sjuk-/aktivitetsersättning ${e.from}–${e.to}, ${num.format(e.belopp)} kr per år`,
      remove: () => onChange({ pgb: { ...pgb, sa: pgb.sa.filter((_, k) => k !== i) } }),
    })),
    ...pgb.studier.map((e, i) => ({
      key: `stud-${i}`,
      text: `Studier ${e.from}–${e.to}, ${e.terminer} ${e.terminer === 1 ? "termin" : "terminer"} per år`,
      remove: () => onChange({ pgb: { ...pgb, studier: pgb.studier.filter((_, k) => k !== i) } }),
    })),
  ];

  const yearRange = { min: born + 16, max: born + 70 };
  return (
    <>
      <Note>
        Barnår, sjuk- eller aktivitetsersättning, värnplikt och studier ger alla pensionsrätt utöver den vanliga
        inkomsten. Välj typ nedan, fyll i det som gäller och klicka Lägg till.
      </Note>
      <SelectRow
        id="typfall-pgb-typ"
        label="Typ"
        value={(["barn", "vpl", "sa", "studier"] as Typ[]).indexOf(typ)}
        onChange={(i) => setTyp((["barn", "vpl", "sa", "studier"] as Typ[])[i]!)}
        options={[
          { value: 0, label: "Barn" },
          { value: 1, label: "Värnplikt" },
          { value: 2, label: "Sjuk-/aktivitetsersättning" },
          { value: 3, label: "Studier" },
        ]}
      />
      {typ === "barn" && (
        <NumberRow
          id="typfall-pgb-barn"
          label="Barnets födelseår"
          hint="ger pensionsrätt de fyra första åren, högst fyra barn"
          value={barn}
          onChange={setBarn}
          min={yearRange.min}
          max={born + 60}
        />
      )}
      {typ === "vpl" && (
        <>
          <DateRow id="typfall-pgb-vpl-start" label="Inryckning" value={vplStart} onChange={setVplStart} />
          <DateRow id="typfall-pgb-vpl-end" label="Muck" value={vplEnd} onChange={setVplEnd} />
          <Note>
            Plikttjänst 1995–2010 och från 2018, minst 120 dagar. Ger pensionsrätt på halva den genomsnittliga
            pensionsgrundande inkomsten.
          </Note>
        </>
      )}
      {(typ === "sa" || typ === "studier") && (
        <>
          <NumberRow id="typfall-pgb-from" label="Från år" value={from} onChange={setFrom} {...yearRange} />
          <NumberRow id="typfall-pgb-to" label="Till och med år" value={to} onChange={setTo} {...yearRange} />
        </>
      )}
      {typ === "sa" && (
        <NumberRow
          id="typfall-pgb-sa"
          label="Pensionsgrundande belopp"
          hint="kronor per år"
          value={belopp}
          onChange={setBelopp}
          min={0}
          max={1000000}
        />
      )}
      {typ === "studier" && (
        <>
          <SelectRow
            id="typfall-pgb-terminer"
            label="Terminer per år"
            value={terminer}
            onChange={setTerminer}
            options={[
              { value: 1, label: "1 termin" },
              { value: 2, label: "2 terminer" },
            ]}
          />
          <Note>138 procent av studiebidraget. Modellen ger pensionsrätt för studier från 1997.</Note>
        </>
      )}
      <button
        type="button"
        className={cn(smallButton, "w-full")}
        disabled={typ === "barn" && children.length >= 4}
        onClick={add}
      >
        <Plus className="size-3.5" aria-hidden="true" />
        {typ === "vpl" && pgb.vpl ? "Ersätt" : "Lägg till"}
      </button>
      {entries.length > 0 && (
        <ul className="space-y-1.5 border-t border-border pt-3">
          {entries.map((e) => (
            <li key={e.key} className="flex items-center justify-between gap-2 text-sm">
              <span>{e.text}</span>
              <button
                type="button"
                className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`Ta bort ${e.text}`}
                onClick={e.remove}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** "Använd egen löneutveckling": income and wage by age, filled in from the computed path. */
function EgenLon({
  path,
  onChange,
  computed,
}: {
  path: WagePath;
  onChange: (p: WagePath) => void;
  computed: () => WagePath;
}) {
  const shown = path.filter((w) => w.age <= 75);
  const set = (age: number, key: "income" | "wage", text: string) => {
    const v = Number(text.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(v) || v < 0) return;
    onChange(path.map((w) => (w.age === age ? { ...w, [key]: Math.round(v) } : w)));
  };
  const cell = "h-8 w-full rounded-md border border-input bg-card px-2 text-right text-xs tabular-nums";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={smallButton} onClick={() => onChange(computed())}>
          Återställ till beräknad lönebana
        </button>
        <button type="button" className={smallButton} onClick={() => onChange(path.map((w) => ({ ...w, income: 0, wage: 0 })))}>
          Nollställ alla värden
        </button>
      </div>
      <Note>Kronor per år i löpande priser. Inkomsten ger pensionsrätt; lönen ger tjänstepension och jobbskatteavdrag.</Note>
      <div className="max-h-80 overflow-auto rounded-md border border-border">
        <table className="w-full text-xs tabular-nums">
          <thead className="sticky top-0 z-10 bg-secondary">
            <tr>
              <th scope="col" className="px-2 py-1.5 text-left font-medium">
                År
              </th>
              <th scope="col" className="px-2 py-1.5 text-right font-medium">
                Ålder
              </th>
              <th scope="col" className="px-2 py-1.5 text-right font-medium">
                Inkomst
              </th>
              <th scope="col" className="px-2 py-1.5 text-right font-medium">
                Varav lön
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((w) => (
              <tr key={w.age} className="border-t border-border">
                <td className="px-2 py-1">{w.year}</td>
                <td className="px-2 py-1 text-right">{w.age}</td>
                <td className="px-1 py-1">
                  <input
                    className={cell}
                    inputMode="numeric"
                    aria-label={`Inkomst ${w.year}`}
                    defaultValue={Math.round(w.income)}
                    key={`i-${w.age}-${Math.round(w.income)}`}
                    onBlur={(e) => set(w.age, "income", e.target.value)}
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    className={cell}
                    inputMode="numeric"
                    aria-label={`Varav lön ${w.year}`}
                    defaultValue={Math.round(w.wage)}
                    key={`w-${w.age}-${Math.round(w.wage)}`}
                    onBlur={(e) => set(w.age, "wage", e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdvancedSections({
  adv,
  onChange,
  onReset,
  born,
  par,
  wStart,
  avtal,
  gift,
  monthlyWage,
  forsakringstid,
  defAr,
  tjpPar,
  lifeExpectancy,
  computedWagePath,
}: {
  adv: TypfallAdvanced;
  onChange: (patch: Partial<TypfallAdvanced>) => void;
  onReset: () => void;
  born: number;
  par: number;
  wStart: number;
  avtal: Avtal;
  gift: boolean;
  monthlyWage: number;
  /** Values the model used, after its own checks. */
  forsakringstid: number;
  defAr: number;
  tjpPar: number;
  /** Remaining life expectancy at the pension age, the default payout time for private saving. */
  lifeExpectancy: number;
  /** The wage path computed from the main form, to fill in "egen löneutveckling". */
  computedWagePath: () => WagePath;
}) {
  const [sparMode, setSparMode] = useState<"belopp" | "andel">(adv.sparManad > 0 && adv.sparManad <= 1 ? "andel" : "belopp");
  const wageChange = adv.andradLonAr > 0;
  const firstWorkYear = born + wStart;
  const lastWorkYear = born + par - 1;
  const sparStartMin = Math.min(Math.max(firstWorkYear, 1990), lastWorkYear);
  const one = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 1 });
  const hyraDefault = 6300 + 1200 * (gift ? 1 : 0);
  const makeDefault = gift ? Math.round(0.8 * monthlyWage * 12) : 0;
  const partial = defAr > par;

  return (
    <div className="space-y-2">
      <Section title="Allmän pension" changed={differs(adv, SECTIONS.allman)}>
        <SelectRow
          id="typfall-uttag-ip"
          label="Andel uttag, inkomstpension"
          hint={`mellan pensionsåldern och "Definitivt vid" nedan`}
          value={adv.uttagIP}
          onChange={(v) => onChange({ uttagIP: v })}
          options={ANDEL}
        />
        <SelectRow
          id="typfall-uttag-pp"
          label="Andel uttag, premiepension"
          value={adv.uttagPP}
          onChange={(v) => onChange({ uttagPP: v })}
          options={ANDEL}
        />
        <NumberRow
          id="typfall-defar"
          label="Definitivt uttag vid ålder"
          hint="0 eller pensionsåldern = fullt uttag direkt, som idag"
          value={partial ? defAr : 0}
          onChange={(v) => onChange({ defAr: v > par ? v : 0 })}
          min={0}
          max={75}
        />
        {partial ? (
          <SelectRow
            id="typfall-syss"
            label={`Arbete under det partiella uttaget (${par}–${defAr - 1} år)`}
            value={adv.sysselsattning === "deltid" ? 2 : adv.sysselsattning}
            onChange={(v) => onChange({ sysselsattning: v === 2 ? "deltid" : (v as 0 | 1) })}
            options={[
              { value: 2, label: "Deltid, den andel som inte tas ut" },
              { value: 1, label: "Heltid" },
              { value: 0, label: "Arbetar inte" },
            ]}
          />
        ) : (
          (adv.uttagIP < 1 || adv.uttagPP < 1) && (
            <Note>Andelen gäller när du anger en ålder för definitivt uttag över pensionsåldern ({par} år).</Note>
          )
        )}
      </Section>

      <Section title="Bostadstillägg" changed={differs(adv, SECTIONS.bostad)}>
        <CheckRow
          checked={adv.ansoker}
          onChange={(v) => onChange({ ansoker: v })}
          label="Ansöker om bostadstillägg"
          hint="Bostadstillägg och äldreförsörjningsstöd räknas om pensionen är låg."
        />
        <NumberRow
          id="typfall-hyra"
          label="Boendekostnad per månad"
          hint={`kronor, ${W_REF} års priser`}
          value={adv.hyra ?? hyraDefault}
          onChange={(v) => onChange({ hyra: v === hyraDefault ? null : v })}
          min={0}
          max={50000}
        />
        {gift && (
          <NumberRow
            id="typfall-make"
            label="Makens/makans årsinkomst"
            hint="kronor per år, förvalt 80 % av din lön"
            value={adv.makensInkomst ?? makeDefault}
            onChange={(v) => onChange({ makensInkomst: v === makeDefault ? null : v })}
            min={0}
            max={10000000}
          />
        )}
        <NumberRow
          id="typfall-formogenhet"
          label="Förmögenhet utöver bostaden"
          hint="kronor, 15 % över 100 000 kr räknas som inkomst"
          value={adv.formogenhet}
          onChange={(v) => onChange({ formogenhet: v })}
          min={0}
          max={100000000}
        />
        <NumberRow
          id="typfall-kapital"
          label="Kapitalinkomster brutto per år"
          hint="kronor, från pensionen, beskattas med 30 %"
          value={adv.kapital}
          onChange={(v) => onChange({ kapital: v })}
          min={0}
          max={10000000}
        />
      </Section>

      <Section title="Garantipension" changed={differs(adv, SECTIONS.garanti)}>
        <NumberRow
          id="typfall-forsakringstid"
          label="Försäkringstid i Sverige"
          hint="år vid 65 års ålder, 3–40"
          value={adv.forsakringstid}
          onChange={(v) => onChange({ forsakringstid: v })}
          min={3}
          max={40}
        />
        <Note>
          Garantipensionen är full efter 40 år och minskar med en fyrtiondel för varje år som fattas.
          {forsakringstid !== adv.forsakringstid && <> Räknas som {forsakringstid} år, eftersom du arbetar fler år än så.</>}
        </Note>
      </Section>

      <Section title="Inkomstskatt" changed={differs(adv, SECTIONS.skatt)}>
        <SelectRow
          id="typfall-kommun"
          label="Kommun"
          hideLabel
          value={adv.kommun}
          onChange={(name) => {
            if (name === "") return onChange({ kommun: "" });
            const kommunalskatt = fraction(kommuner.rates[name as keyof typeof kommuner.rates]);
            // A burial fee that has not been chosen yet starts at the average for those who are not members.
            const chosen = adv.kyrka !== "member" || adv.begravning !== 0;
            onChange(
              chosen
                ? { kommun: name, kommunalskatt }
                : { kommun: name, kommunalskatt, kyrka: "rest", begravning: FEE.rest },
            );
          }}
          options={KOMMUN_OPTIONS}
          hint={<ExternalLink href={SCB_KOMMUNALSKATT}>SCB:s lista ({kommuner.year})</ExternalLink>}
        />
        <NumberRow
          id="typfall-kommunalskatt"
          label="Kommunalskatt"
          hint="0 använder det historiska genomsnittet"
          value={adv.kommunalskatt * 100}
          onChange={(v) => onChange({ kommunalskatt: fraction(v) })}
          min={0}
          max={100}
          decimals={3}
        />
        <SelectRow
          id="typfall-kyrka"
          label="Medlemskap i Svenska kyrkan eller annat trossamfund"
          hideLabel
          value={adv.kyrka}
          onChange={(k) => onChange(k === "" ? { kyrka: "" } : { kyrka: k, begravning: FEE[k] })}
          options={KYRKA}
          hint={<ExternalLink href={SVENSKA_KYRKAN_KYRKOAVGIFT}>Hitta din församling</ExternalLink>}
        />
        <NumberRow
          id="typfall-begravning"
          label="Begravningsavgift och samfundsavgift"
          hint={`medlem ~${percentText(AVG_MEMBER)} %, ej medlem ~${percentText(AVG_NON_MEMBER)} % (${data.lastHardYear})`}
          value={adv.begravning * 100}
          onChange={(v) => onChange({ begravning: fraction(v) })}
          min={0}
          max={100}
          decimals={3}
        />
        <NumberRow
          id="typfall-fack"
          label="Fackföreningsavgift"
          hint="kronor per månad"
          value={Math.round(adv.fack / 12)}
          onChange={(v) => onChange({ fack: v * 12 })}
          min={0}
          max={10000}
        />
        <NumberRow
          id="typfall-akassa"
          label="A-kasseavgift"
          hint="kronor per månad"
          value={Math.round(adv.akassa / 12)}
          onChange={(v) => onChange({ akassa: v * 12 })}
          min={0}
          max={10000}
        />
      </Section>

      <Section title="Kapital och avkastning" changed={differs(adv, SECTIONS.kapital)}>
        <NumberRow
          id="typfall-pbh-ar"
          label="Inkomstår som kapitalvärdet avser"
          hint="0 = inget känt kapital"
          value={adv.pbhYear}
          onChange={(v) => onChange({ pbhYear: v })}
          min={0}
          max={2100}
        />
        <NumberRow
          id="typfall-pbh-ip"
          label="Kapitalvärde inkomstpension"
          value={adv.pbhIP ?? 0}
          onChange={(v) => onChange({ pbhIP: v > 0 ? v : null })}
          min={0}
          max={100000000}
        />
        <NumberRow
          id="typfall-pbh-pp"
          label="Kapitalvärde premiepension"
          value={adv.pbhPP ?? 0}
          onChange={(v) => onChange({ pbhPP: v > 0 ? v : null })}
          min={0}
          max={100000000}
        />
        <NumberRow
          id="typfall-pbh-tjp"
          label="Kapitalvärde tjänstepension"
          value={adv.pbhTJP ?? 0}
          onChange={(v) => onChange({ pbhTJP: v > 0 ? v : null })}
          min={0}
          max={100000000}
        />
        <NumberRow
          id="typfall-pbh-privat"
          label="Kapitalvärde privat sparande"
          value={adv.pbhPrivat ?? 0}
          onChange={(v) => onChange({ pbhPrivat: v > 0 ? v : null })}
          min={0}
          max={100000000}
        />
        <SelectRow
          id="typfall-avkastningsval"
          label="Historisk avkastning"
          hint="framtiden följer alltid den reala avkastningen på startsidan"
          value={adv.avkastningsval}
          onChange={(v) => onChange({ avkastningsval: v })}
          options={AVKASTNING}
        />
        <CheckRow
          checked={adv.efterFondavgifter}
          onChange={(v) => onChange({ efterFondavgifter: v })}
          label="Avkastningen är efter fondavgifter"
        />
      </Section>

      <Section title="Lön" changed={differs(adv, SECTIONS.lon)}>
        <CheckRow
          checked={adv.egenLon !== null}
          onChange={(v) => onChange({ egenLon: v ? computedWagePath() : null })}
          label="Använd egen löneutveckling"
          hint="Fylls i från den beräknade lönebanan, som du sedan kan ändra"
        />
        {adv.egenLon !== null ? (
          <EgenLon path={adv.egenLon} onChange={(p) => onChange({ egenLon: p })} computed={computedWagePath} />
        ) : (
          <>
            <SelectRow
              id="typfall-loneprofil"
              label="Löneprofil"
              hint="Profilerna låter lönen stiga och plana ut med åldern. Månadslönen gäller din ålder i dag."
              value={adv.loneprofil}
              onChange={(v) => onChange({ loneprofil: v })}
              options={LONEPROFIL}
            />
            <CheckRow
              checked={wageChange}
              onChange={(v) =>
                onChange(
                  v
                    ? { andradLonAr: Math.min(Math.max(2030, firstWorkYear), lastWorkYear), andradLonFaktor: 0.8 }
                    : { andradLonAr: 0, andradLonFaktor: 1 },
                )
              }
              label="Lönen ändras från ett visst år"
              hint="Till exempel deltid eller ett nytt jobb."
            />
            {wageChange && (
              <>
                <NumberRow
                  id="typfall-andrad-ar"
                  label="Från år"
                  hint={`${firstWorkYear}–${lastWorkYear}`}
                  value={adv.andradLonAr}
                  onChange={(v) => onChange({ andradLonAr: v })}
                  min={firstWorkYear}
                  max={lastWorkYear}
                />
                <NumberRow
                  id="typfall-andrad-faktor"
                  label="Ny lön"
                  hint="% av lönen innan"
                  value={Math.round(adv.andradLonFaktor * 100)}
                  onChange={(v) => onChange({ andradLonFaktor: v / 100 })}
                  min={0}
                  max={300}
                />
              </>
            )}
          </>
        )}
        <NumberRow
          id="typfall-slutlon-ar"
          label="Slutlön, antal år"
          hint="år före pensionen som slutlönen räknas på, 1–10"
          value={adv.slutlonAr}
          onChange={(v) => onChange({ slutlonAr: v })}
          min={1}
          max={10}
        />
      </Section>

      <Section title="Pensionsgrundande belopp (PGB)" changed={differs(adv, SECTIONS.pgb)}>
        <PgbSection adv={adv} onChange={onChange} born={born} />
      </Section>

      <Section title="Privat sparande" changed={differs(adv, SECTIONS.privat)}>
        <div className="space-y-2">
          <p className="text-sm">Privat pensionssparande</p>
          <Segmented
            label="Privat pensionssparande"
            value={sparMode}
            onChange={(m) => {
              setSparMode(m);
              onChange({ sparManad: 0 });
            }}
            options={[
              { value: "belopp", label: "Belopp" },
              { value: "andel", label: "Andel av inkomst" },
            ]}
            size="sm"
          />
        </div>
        {sparMode === "belopp" ? (
          <NumberRow
            id="typfall-spar"
            label="Belopp"
            hint="kronor per månad"
            value={adv.sparManad}
            onChange={(v) => onChange({ sparManad: v === 1 ? 1.01 : v })} // at most 1 means a share
            min={0}
            max={100000}
          />
        ) : (
          <NumberRow
            id="typfall-spar-andel"
            label="Andel av inkomsten"
            hint="%, 0–100"
            value={Math.round(adv.sparManad * 1000) / 10}
            onChange={(v) => onChange({ sparManad: v / 100 })}
            min={0}
            max={100}
            decimals={1}
          />
        )}
        <NumberRow
          id="typfall-spar-start"
          label="Sparandet börjar år"
          hint={`${sparStartMin}–${lastWorkYear}, till tjänstepensionen börjar`}
          value={Math.min(Math.max(adv.sparStart, sparStartMin), lastWorkYear)}
          onChange={(v) => onChange({ sparStart: v })}
          min={sparStartMin}
          max={lastWorkYear}
        />
        <SelectRow
          id="typfall-sparform"
          label="Typ av sparande"
          hint={
            adv.sparform === 0
              ? "Uttagen beskattas som inkomst."
              : "Schablonskatt varje år, så uttagen är redan beskattade."
          }
          value={adv.sparform}
          onChange={(v) => onChange({ sparform: v })}
          options={SPARFORM}
        />
        <SelectRow
          id="typfall-temp-spar"
          label="Temporärt uttag av privat sparande"
          value={adv.tempSpar}
          onChange={(v) => onChange({ tempSpar: v })}
          options={[
            { value: 0, label: `Nej, under återstående livslängd (${one.format(lifeExpectancy)} år)` },
            ...TEMP_YEARS.map((y) => ({ value: y, label: `Under ${y} år` })),
          ]}
        />
      </Section>

      <Section title="Tjänstepension" changed={differs(adv, SECTIONS.tjp)}>
        {avtal === 1 && <Note>Välj en tjänstepension i formuläret ovan för att de här valen ska påverka.</Note>}
        <NumberRow
          id="typfall-tjp-par"
          label="Uttagsålder för tjänstepension"
          hint={adv.tjpPar > 0 ? "55–75" : "55–75, samma som det definitiva uttaget av allmän pension"}
          value={tjpPar}
          onChange={(v) => onChange({ tjpPar: v === defAr ? 0 : v })}
          min={55}
          max={75}
        />
        <SelectRow
          id="typfall-temp-tjp"
          label="Temporärt uttag av tjänstepension"
          value={adv.tempTjp}
          onChange={(v) => onChange({ tempTjp: v })}
          options={[{ value: 0, label: "Nej, livet ut" }, ...TEMP_YEARS.map((y) => ({ value: y, label: `Under ${y} år` }))]}
        />
        <CheckRow
          checked={adv.arvsvinsterTjp}
          onChange={(v) => onChange({ arvsvinsterTjp: v })}
          label="Arvsvinster på tjänstepensionen"
          hint="Utan återbetalningsskydd. Med skydd går kapitalet till efterlevande, men arvsvinsterna uteblir."
        />
        <NumberRow
          id="typfall-flex"
          label="Flexpension, ITP 1 och SAF-LO"
          hint="% av lönen från 2014"
          value={adv.flexpension * 100}
          onChange={(v) => onChange({ flexpension: v / 100 })}
          min={0}
          max={5}
          decimals={1}
        />
      </Section>

      <button
        type="button"
        className="mt-2 h-9 w-full cursor-pointer rounded-full border border-foreground/70 bg-card text-sm font-medium hover:bg-muted"
        onClick={onReset}
      >
        Använd normala inställningar
      </button>
    </div>
  );
}

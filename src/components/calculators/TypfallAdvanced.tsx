// The sections under "Avancerat": the settings from the sheet Adv_settings in the model.
import { Plus, X } from "lucide-react";
import { data } from "@/lib/typfall/data";
import {
  type Avkastningsval,
  type Avtal,
  DEFAULT_ADVANCED,
  type Loneprofil,
  type Sparform,
  type TypfallAdvanced,
} from "@/lib/typfall/model";
import { formatPercent } from "@/lib/format";
import { CheckRow, NumberRow, Section, SelectRow } from "./TypfallFields";

const LONEPROFIL: { value: Loneprofil; label: string }[] = [
  { value: 0, label: "Rak – följer den allmänna löneutvecklingen" },
  { value: 1, label: "Låg inkomst, kvinna" },
  { value: 2, label: "Låg inkomst, man" },
  { value: 3, label: "Normal inkomst, kvinna" },
  { value: 4, label: "Normal inkomst, man" },
];

const AVKASTNING: { value: Avkastningsval; label: string }[] = [
  { value: 2, label: "Premiepensionens faktiska avkastning" },
  { value: 3, label: "AP7 Såfas faktiska avkastning" },
  { value: 1, label: "Den valda reala avkastningen" },
];

const SPARFORM: { value: Sparform; label: string }[] = [
  { value: 2, label: "Investeringssparkonto (ISK)" },
  { value: 1, label: "Kapitalförsäkring (KF)" },
  { value: 0, label: "Individuellt pensionssparande (IPS)" },
];

const TEMP_YEARS = [5, 10, 15, 20];

// The average municipal tax and burial fee in the last data year, as a starting point for an own rate.
const lastTax = data.lastHardYear - data.taxFirstYear;
const AVG_KOMMUNALSKATT = data.komSkatt[lastTax]! / 100;
const AVG_BEGRAVNING = data.begravning[lastTax]! / 100;

type Key = keyof TypfallAdvanced;
const differs = (adv: TypfallAdvanced, keys: Key[]) =>
  keys.some((k) => (k === "barn" ? adv.barn.some((b) => b > 0) : adv[k] !== DEFAULT_ADVANCED[k]));

// The settings in each section; inflation is in the main form.
const SECTIONS = {
  garanti: ["forsakringstid"],
  skatt: ["kommunalskatt", "begravning"],
  kapital: ["avkastningsval"],
  lon: ["loneprofil", "andradLonAr", "andradLonFaktor", "slutlonAr"],
  pgb: ["barn"],
  privat: ["sparManad"],
  tjp: ["tempTjp", "arvsvinsterTjp", "flexpension"],
} satisfies Record<string, Key[]>;

/** Number of sections with a setting that differs from the model's defaults. */
export function changedSections(adv: TypfallAdvanced): number {
  return Object.values(SECTIONS).filter((keys) => differs(adv, keys)).length;
}

export function AdvancedSections({
  adv,
  onChange,
  onReset,
  born,
  par,
  wStart,
  avtal,
  forsakringstid,
  lifeExpectancy,
}: {
  adv: TypfallAdvanced;
  onChange: (patch: Partial<TypfallAdvanced>) => void;
  onReset: () => void;
  born: number;
  par: number;
  wStart: number;
  avtal: Avtal;
  /** The försäkringstid the model used, after the check against the working years. */
  forsakringstid: number;
  /** Remaining life expectancy at the pension age, the default payout time for private saving. */
  lifeExpectancy: number;
}) {
  const ownTax = adv.kommunalskatt >= 0.1;
  const wageChange = adv.andradLonAr > 0;
  const firstWorkYear = born + wStart;
  const lastWorkYear = born + par - 1;
  const children = adv.barn;
  const sparStartMin = Math.min(Math.max(firstWorkYear, 1990), lastWorkYear);
  const one = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 1 });

  return (
    <div className="space-y-2">
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
        <p className="text-xs text-muted-foreground">
          Garantipensionen är full efter 40 år och minskar med en fyrtiondel för varje år som fattas.
          {forsakringstid !== adv.forsakringstid && (
            <> Räknas som {forsakringstid} år, eftersom du arbetar fler år än så.</>
          )}
        </p>
      </Section>

      <Section title="Inkomstskatt" changed={differs(adv, SECTIONS.skatt)}>
        <CheckRow
          checked={ownTax}
          onChange={(v) =>
            onChange(v ? { kommunalskatt: AVG_KOMMUNALSKATT, begravning: AVG_BEGRAVNING } : { kommunalskatt: 0, begravning: 0 })
          }
          label="Egen kommunalskatt"
          hint={`Annars används genomsnittet för riket, ${formatPercent(AVG_KOMMUNALSKATT * 100, 2)} ${data.lastHardYear}.`}
        />
        {ownTax && (
          <>
            <NumberRow
              id="typfall-kommunalskatt"
              label="Kommunalskatt"
              hint="%, 25–40"
              value={adv.kommunalskatt * 100}
              onChange={(v) => onChange({ kommunalskatt: v / 100 })}
              min={25}
              max={40}
              decimals={2}
            />
            <NumberRow
              id="typfall-begravning"
              label="Begravnings- och kyrkoavgift"
              hint="%, 0–2"
              value={adv.begravning * 100}
              onChange={(v) => onChange({ begravning: v / 100 })}
              min={0}
              max={2}
              decimals={2}
            />
          </>
        )}
      </Section>

      <Section title="Kapital och avkastning" changed={differs(adv, SECTIONS.kapital)}>
        <SelectRow
          id="typfall-avkastningsval"
          label="Avkastning fram till i dag"
          hint="Gäller premiepension, tjänstepension och privat sparande. Framåt används den reala avkastningen du har angett."
          value={adv.avkastningsval}
          onChange={(v) => onChange({ avkastningsval: v })}
          options={AVKASTNING}
        />
      </Section>

      <Section title="Lön" changed={differs(adv, SECTIONS.lon)}>
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
        <p className="text-xs text-muted-foreground">
          Barnår ger pensionsrätt de fyra första åren efter ett barns födelse, mest för den som tjänar lite.
          Ett barn i taget räknas.
        </p>
        {children.map((b, i) => (
          <NumberRow
            key={i}
            id={`typfall-barn-${i}`}
            label={`Barn ${i + 1}, födelseår`}
            value={b}
            onChange={(v) => onChange({ barn: children.map((x, k) => (k === i ? v : x)) })}
            min={born + 16}
            max={born + 60}
          >
            <button
              type="button"
              className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={`Ta bort barn ${i + 1}`}
              onClick={() => onChange({ barn: children.filter((_, k) => k !== i) })}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </NumberRow>
        ))}
        {children.length < 4 && (
          <button
            type="button"
            className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-primary underline-offset-2 hover:underline"
            onClick={() => onChange({ barn: [...children, Math.min(born + 30 + children.length * 2, born + 60)] })}
          >
            <Plus className="size-4" aria-hidden="true" />
            Lägg till barn
          </button>
        )}
      </Section>

      <Section title="Privat sparande" changed={differs(adv, SECTIONS.privat)}>
        <NumberRow
          id="typfall-spar"
          label="Sparande per månad"
          hint="kronor"
          value={adv.sparManad}
          onChange={(v) => onChange({ sparManad: v })}
          min={0}
          max={100000}
        />
        {adv.sparManad > 0 && (
          <>
            <SelectRow
              id="typfall-sparform"
              label="Sparform"
              hint={
                adv.sparform === 0
                  ? "Uttagen beskattas som inkomst."
                  : "Schablonskatt varje år, så uttagen är redan beskattade."
              }
              value={adv.sparform}
              onChange={(v) => onChange({ sparform: v })}
              options={SPARFORM}
            />
            <NumberRow
              id="typfall-spar-start"
              label="Börjar spara år"
              hint={`${sparStartMin}–${lastWorkYear}, samma belopp varje år till pensionen`}
              value={Math.min(Math.max(adv.sparStart, sparStartMin), lastWorkYear)}
              onChange={(v) => onChange({ sparStart: v })}
              min={sparStartMin}
              max={lastWorkYear}
            />
            <SelectRow
              id="typfall-temp-spar"
              label="Uttag"
              value={adv.tempSpar}
              onChange={(v) => onChange({ tempSpar: v })}
              options={[
                { value: 0, label: `Under återstående livslängd (${one.format(lifeExpectancy)} år)` },
                ...TEMP_YEARS.map((y) => ({ value: y, label: `Under ${y} år` })),
              ]}
            />
          </>
        )}
      </Section>

      <Section title="Tjänstepension" changed={differs(adv, SECTIONS.tjp)}>
        {avtal === 1 ? (
          <p className="text-xs text-muted-foreground">Välj en tjänstepension ovan för att ändra de här valen.</p>
        ) : (
          <>
            <SelectRow
              id="typfall-temp-tjp"
              label="Utbetalningstid"
              value={adv.tempTjp}
              onChange={(v) => onChange({ tempTjp: v })}
              options={[{ value: 0, label: "Livet ut" }, ...TEMP_YEARS.map((y) => ({ value: y, label: `${y} år` }))]}
            />
            <CheckRow
              checked={!adv.arvsvinsterTjp}
              onChange={(v) => onChange({ arvsvinsterTjp: !v })}
              label="Med återbetalningsskydd"
              hint="Kapitalet går till efterlevande vid dödsfall, men du får inga arvsvinster."
            />
            {(avtal === 2 || avtal === 4) && (
              <NumberRow
                id="typfall-flex"
                label="Flexpension"
                hint={`% av lönen från 2014, extra premie i ${avtal === 2 ? "ITP 1" : "SAF-LO"}`}
                value={adv.flexpension * 100}
                onChange={(v) => onChange({ flexpension: v / 100 })}
                min={0}
                max={5}
                decimals={1}
              />
            )}
          </>
        )}
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

import { type ReactNode, useState } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { data } from "@/lib/typfall/data";
import {
  type Avkastningsval,
  type Avtal,
  DEFAULT_ADVANCED,
  type Loneprofil,
  type Sparform,
  type TypfallAdvanced,
  W_REF,
} from "@/lib/typfall/model";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NumberField, SliderField } from "./fields";

export const selectClass =
  "mt-2 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

const LONEPROFIL: { value: Loneprofil; label: string }[] = [
  { value: 0, label: "Rak – följer den allmänna löneutvecklingen" },
  { value: 1, label: "Låg inkomst, kvinna" },
  { value: 2, label: "Låg inkomst, man" },
  { value: 3, label: "Normal inkomst, kvinna" },
  { value: 4, label: "Normal inkomst, man" },
];

const AVKASTNING: { value: Avkastningsval; label: string }[] = [
  { value: 2, label: "Premiepensionens faktiska avkastning (PPM-index)" },
  { value: 3, label: "AP7 Såfas faktiska avkastning" },
  { value: 1, label: "Den valda avkastningen även bakåt i tiden" },
];

const SPARFORM: { value: Sparform; label: string }[] = [
  { value: 2, label: "Investeringssparkonto (ISK)" },
  { value: 1, label: "Kapitalförsäkring" },
  { value: 0, label: "Individuellt pensionssparande (IPS)" },
];

const TEMP_YEARS = [5, 10, 15, 20];

// The average municipal tax and burial fee in the last data year, as a starting point for an own rate.
const lastTax = data.lastHardYear - data.taxFirstYear;
const AVG_KOMMUNALSKATT = data.komSkatt[lastTax]! / 100;
const AVG_BEGRAVNING = data.begravning[lastTax]! / 100;

/** Number of settings that differ from the model's defaults. */
export function changedCount(adv: TypfallAdvanced): number {
  return (Object.keys(DEFAULT_ADVANCED) as (keyof TypfallAdvanced)[]).filter((k) => {
    if (k === "barn") return adv.barn.some((b) => b > 0);
    if (k === "begravning" || k === "andradLonFaktor") return false; // counted with kommunalskatt and andradLonAr
    if (k === "sparform" || k === "sparStart" || k === "tempSpar") return adv.sparManad > 0 && adv[k] !== DEFAULT_ADVANCED[k];
    return adv[k] !== DEFAULT_ADVANCED[k];
  }).length;
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0 space-y-5 border-t border-border pt-5">
      <legend className="pr-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">{title}</legend>
      {children}
    </fieldset>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-xs text-muted-foreground">{children}</p>;
}

function Check({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 accent-[var(--color-primary)]"
      />
      <span>
        {label}
        {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

function Select<T extends number>({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      <select id={id} value={value} onChange={(e) => onChange(Number(e.target.value) as T)} className={selectClass}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TypfallAdvancedPanel({
  adv,
  onChange,
  born,
  par,
  wStart,
  avtal,
  forsakringstid,
  lifeExpectancy,
}: {
  adv: TypfallAdvanced;
  onChange: (patch: Partial<TypfallAdvanced>) => void;
  born: number;
  par: number;
  wStart: number;
  avtal: Avtal;
  /** The försäkringstid the model used, after the check against the working years. */
  forsakringstid: number;
  /** Remaining life expectancy at the pension age, the default payout time for private saving. */
  lifeExpectancy: number;
}) {
  const [open, setOpen] = useState(false);
  const changed = changedCount(adv);
  const ownTax = adv.kommunalskatt >= 0.1;
  const wageChange = adv.andradLonAr > 0;
  const firstWorkYear = born + wStart;
  const lastWorkYear = born + par - 1;
  const children = adv.barn;
  const sparStartMin = Math.min(Math.max(firstWorkYear, 1990), lastWorkYear);
  const sparStart = Math.min(Math.max(adv.sparStart, sparStartMin), lastWorkYear);

  const setChild = (i: number, year: number) => onChange({ barn: children.map((b, k) => (k === i ? year : b)) });

  return (
    <div className="border-t border-border pt-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="flex cursor-pointer items-center gap-2 font-serif text-lg font-semibold"
          aria-expanded={open}
          aria-controls="typfall-advanced"
          onClick={() => setOpen(!open)}
        >
          Avancerat
          <ChevronDown className={cn("size-5 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
        {changed > 0 && (
          <span className="flex items-center gap-3 text-xs text-muted-foreground">
            {changed} {changed === 1 ? "ändring" : "ändringar"}
            <button
              type="button"
              className="cursor-pointer font-medium text-foreground underline underline-offset-2"
              onClick={() => onChange(DEFAULT_ADVANCED)}
            >
              Återställ
            </button>
          </span>
        )}
      </div>
      {!open && (
        <p className="mt-1 text-xs text-muted-foreground">
          Inflation, löneprofil, barnår, försäkringstid, tjänstepensionens uttag, privat sparande och skatt.
        </p>
      )}

      {open && (
        <div id="typfall-advanced" className="mt-5 space-y-6">
          <Group title="Ekonomi">
            <div>
              <SliderField
                label="Inflation per år"
                value={adv.inflation * 100}
                onChange={(v) => onChange({ inflation: v / 100 })}
                min={0}
                max={5}
                step={0.1}
                display={formatPercent(adv.inflation * 100, 1)}
              />
              <Hint>Från {W_REF + 1}. Beloppen visas ändå i {W_REF} års priser.</Hint>
            </div>
            <div>
              <Select
                id="typfall-avkastningsval"
                label="Avkastning fram till i dag"
                value={adv.avkastningsval}
                onChange={(v) => onChange({ avkastningsval: v })}
                options={AVKASTNING}
              />
              <Hint>Gäller premiepension, tjänstepension och privat sparande. Framåt används den reala avkastningen du valt.</Hint>
            </div>
          </Group>

          <Group title="Lön">
            <div>
              <Select
                id="typfall-loneprofil"
                label="Löneprofil"
                value={adv.loneprofil}
                onChange={(v) => onChange({ loneprofil: v })}
                options={LONEPROFIL}
              />
              <Hint>
                Profilerna låter lönen stiga och plana ut med åldern. Månadslönen gäller vid din ålder {W_REF}.
              </Hint>
            </div>
            <div className="space-y-3">
              <Check
                checked={wageChange}
                onChange={(v) =>
                  onChange(
                    v
                      ? { andradLonAr: Math.min(Math.max(W_REF + 5, firstWorkYear), lastWorkYear), andradLonFaktor: 0.8 }
                      : { andradLonAr: 0, andradLonFaktor: 1 },
                  )
                }
                label="Lönen ändras från ett visst år"
                hint="Till exempel deltid eller ett nytt jobb."
              />
              {wageChange && (
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    id="typfall-andrad-ar"
                    label="Från år"
                    value={adv.andradLonAr}
                    onChange={(v) => onChange({ andradLonAr: Math.round(v) })}
                    step={1}
                    suffix=""
                  />
                  <NumberField
                    id="typfall-andrad-faktor"
                    label="Ny lön"
                    value={Math.round(adv.andradLonFaktor * 100)}
                    onChange={(v) => onChange({ andradLonFaktor: v / 100 })}
                    step={5}
                    suffix="%"
                  />
                </div>
              )}
            </div>
            <SliderField
              label="Slutlön, snitt av antal år"
              value={adv.slutlonAr}
              onChange={(v) => onChange({ slutlonAr: v })}
              min={1}
              max={10}
              step={1}
              display={`${adv.slutlonAr} år`}
            />
          </Group>

          <Group title="Barn">
            <div>
              <p className="text-sm">Barnens födelseår</p>
              <Hint>Barnår ger pensionsrätt de fyra första åren, mest för den som tjänar lite.</Hint>
              <ul className="mt-3 space-y-2">
                {children.map((b, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Label htmlFor={`typfall-barn-${i}`} className="w-14 shrink-0 text-sm font-normal">
                      Barn {i + 1}
                    </Label>
                    <Input
                      id={`typfall-barn-${i}`}
                      type="number"
                      inputMode="numeric"
                      value={b || ""}
                      min={born + 16}
                      max={born + 60}
                      step={1}
                      onChange={(e) => setChild(i, Math.round(Number(e.target.value)))}
                    />
                    <button
                      type="button"
                      className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Ta bort barn ${i + 1}`}
                      onClick={() => onChange({ barn: children.filter((_, k) => k !== i) })}
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
              {children.length < 4 && (
                <button
                  type="button"
                  className="mt-3 flex cursor-pointer items-center gap-1.5 text-sm font-medium underline-offset-2 hover:underline"
                  onClick={() =>
                    onChange({ barn: [...children, Math.min(Math.max(born + 30, firstWorkYear), born + 45) + children.length * 2] })
                  }
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Lägg till barn
                </button>
              )}
            </div>
          </Group>

          <Group title="Allmän pension">
            <div>
              <SliderField
                label="Försäkringstid i Sverige"
                value={adv.forsakringstid}
                onChange={(v) => onChange({ forsakringstid: v })}
                min={3}
                max={40}
                step={1}
                display={`${adv.forsakringstid} år`}
              />
              <Hint>
                Påverkar garantipensionen, som är full efter 40 år.
                {forsakringstid !== adv.forsakringstid && (
                  <> Räknas som {forsakringstid} år, eftersom du arbetar fler år än så i Sverige.</>
                )}
              </Hint>
            </div>
          </Group>

          <Group title="Tjänstepension">
            {avtal === 1 ? (
              <p className="text-xs text-muted-foreground">Välj ett avtal ovan för att ändra tjänstepensionen.</p>
            ) : (
              <>
                <Select
                  id="typfall-temp-tjp"
                  label="Utbetalningstid"
                  value={adv.tempTjp}
                  onChange={(v) => onChange({ tempTjp: v })}
                  options={[
                    { value: 0, label: "Livet ut" },
                    ...TEMP_YEARS.map((y) => ({ value: y, label: `${y} år` })),
                  ]}
                />
                <Check
                  checked={!adv.arvsvinsterTjp}
                  onChange={(v) => onChange({ arvsvinsterTjp: !v })}
                  label="Med återbetalningsskydd"
                  hint="Kapitalet går till efterlevande vid dödsfall, men du får inga arvsvinster."
                />
                {(avtal === 2 || avtal === 4) && (
                  <div>
                    <SliderField
                      label="Flexpension"
                      value={adv.flexpension * 100}
                      onChange={(v) => onChange({ flexpension: v / 100 })}
                      min={0}
                      max={3}
                      step={0.1}
                      display={formatPercent(adv.flexpension * 100, 1)}
                    />
                    <Hint>Extra premie av lönen från 2014, i {avtal === 2 ? "ITP 1" : "SAF-LO"}.</Hint>
                  </div>
                )}
              </>
            )}
          </Group>

          <Group title="Privat sparande">
            <NumberField
              id="typfall-spar"
              label="Sparande per månad"
              value={adv.sparManad}
              onChange={(v) => onChange({ sparManad: Math.round(v) })}
              step={500}
              suffix="kr"
            />
            {adv.sparManad > 0 && (
              <>
                <Select
                  id="typfall-sparform"
                  label="Sparform"
                  value={adv.sparform}
                  onChange={(v) => onChange({ sparform: v })}
                  options={SPARFORM}
                />
                <div>
                  <SliderField
                    label="Börjar spara"
                    value={sparStart}
                    onChange={(v) => onChange({ sparStart: v })}
                    min={sparStartMin}
                    max={lastWorkYear}
                    step={1}
                    display={String(sparStart)}
                  />
                  <Hint>
                    Samma belopp i kronor varje år tills du går i pension.
                    {adv.sparform === 0 ? " Uttagen beskattas som inkomst." : " Uttagen är redan beskattade."}
                  </Hint>
                </div>
                <Select
                  id="typfall-temp-spar"
                  label="Uttag"
                  value={adv.tempSpar}
                  onChange={(v) => onChange({ tempSpar: v })}
                  options={[
                    {
                      value: 0,
                      label: `Under återstående livslängd (${new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 1 }).format(lifeExpectancy)} år)`,
                    },
                    ...TEMP_YEARS.map((y) => ({ value: y, label: `Under ${y} år` })),
                  ]}
                />
              </>
            )}
          </Group>

          <Group title="Skatt">
            <Check
              checked={ownTax}
              onChange={(v) =>
                onChange(v ? { kommunalskatt: AVG_KOMMUNALSKATT, begravning: AVG_BEGRAVNING } : { kommunalskatt: 0, begravning: 0 })
              }
              label="Egen kommunalskatt"
              hint={`Annars används genomsnittet för riket, ${formatPercent(AVG_KOMMUNALSKATT * 100, 2)} ${data.lastHardYear}.`}
            />
            {ownTax && (
              <>
                <SliderField
                  label="Kommunalskatt"
                  value={adv.kommunalskatt * 100}
                  onChange={(v) => onChange({ kommunalskatt: v / 100 })}
                  min={28}
                  max={36}
                  step={0.05}
                  display={formatPercent(adv.kommunalskatt * 100, 2)}
                />
                <SliderField
                  label="Begravnings- och kyrkoavgift"
                  value={adv.begravning * 100}
                  onChange={(v) => onChange({ begravning: v / 100 })}
                  min={0}
                  max={1.5}
                  step={0.01}
                  display={formatPercent(adv.begravning * 100, 2)}
                />
              </>
            )}
          </Group>
        </div>
      )}
    </div>
  );
}

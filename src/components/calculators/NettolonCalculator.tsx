import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import kommunalskatt from "@/data/kommunalskatt-2026.json";
import { BEGRAVNING, DEFAULTS, fmt, nettolonView, rowCells, type NettolonInput } from "@/lib/nettolon";
import { cn } from "@/lib/utils";
import { AmountField, SelectField, SwitchRow } from "./fields";

const RATES = kommunalskatt as Record<string, number>;
const KOMMUNER = Object.keys(RATES).sort((a, b) => a.localeCompare(b, "sv"));
const BEGR_PRESETS = BEGRAVNING.map((b) => String(b.value));

const SCB_URL =
  "https://www.scb.se/hitta-statistik/statistik-efter-amne/offentlig-ekonomi/finanser-for-den-kommunala-sektorn/kommunalskatterna/pong/tabell-och-diagram/totala-kommunala-skattesatser-2026-kommunvis/";

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="text-xs font-normal whitespace-nowrap text-primary-soft underline-offset-2 hover:underline"
    >
      {children}
    </a>
  );
}

function Collapsible({
  id,
  title,
  aside,
  open,
  onToggle,
  children,
  className,
  small,
}: {
  id: string;
  title: string;
  aside?: string;
  /** the title of a part of the form, not of a card */
  small?: boolean;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between gap-3 text-left"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
      >
        <span className={small ? "text-sm font-medium" : "font-serif text-lg font-semibold"}>{title}</span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {aside}
          <ChevronDown className={cn("size-5 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </span>
      </button>
      {open && <div id={id}>{children}</div>}
    </div>
  );
}

const code = "rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-primary";
const h3 = "mt-6 mb-2 font-serif text-base font-semibold text-foreground";

function Notes() {
  return (
    <div className="space-y-2 pt-4 text-sm leading-6 text-muted-foreground">
      <p>
        Modellen replikerar Skatteverkets tekniska beskrivning för inkomstår 2026 (skattetabell, kolumn&nbsp;1 för
        anställda under 66&nbsp;år). Allt beräknas på årsbasis och divideras med 12.
      </p>

      <h3 className={h3}>1–5 · Underlag</h3>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>
          Årsinkomst = bruttolön × 12. Bruttolöneavdrag (löneväxling till pension, förmånsbil, cykel m.m.) dras av{" "}
          <em>före</em> skatt och sänker även underlaget för jobbskatteavdrag och allmän pensionsavgift.
        </li>
        <li>
          Pensionsinkomst beskattas som förvärvsinkomst men ger inget jobbskatteavdrag och bär ingen allmän
          pensionsavgift.
        </li>
        <li>Fastställd förvärvsinkomst (FFI) = årslön − bruttolöneavdrag + pensionsinkomst.</li>
        <li>
          Grundavdrag (under 66, baserat på FFI), avrundas <em>uppåt</em> till hela 100&nbsp;kr:
          <ul className="mt-1 space-y-1">
            <li>
              <code className={code}>≤58 608: 25 041,60</code>
            </li>
            <li>
              <code className={code}>≤161 024: 25 041,60 + 20% × (FFI−58 608)</code>
            </li>
            <li>
              <code className={code}>≤184 112: 45 584</code>
            </li>
            <li>
              <code className={code}>≤466 496: 45 584 − 10% × (FFI−184 112)</code>
            </li>
            <li>
              <code className={code}>&gt;466 496: 17 345,60</code>
            </li>
          </ul>
        </li>
        <li>För 66+ används förhöjt grundavdrag enligt Skatteverkets 11-stegstabell.</li>
        <li>Beskattningsbar förvärvsinkomst (BFI) = FFI − grundavdrag.</li>
      </ul>

      <h3 className={h3}>6–7 · Inkomstskatt</h3>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>Kommunalskatt = BFI × kommunalskattesats.</li>
        <li>
          Statlig skatt = 20 % × (BFI − 643&nbsp;000). <b className="text-foreground">Skiktgränsen</b> 643&nbsp;000&nbsp;kr
          gäller den <em>beskattningsbara</em> inkomsten (efter grundavdrag). Eftersom bruttolönen är <em>före</em>{" "}
          grundavdrag kommuniceras i stället <b className="text-foreground">brytpunkten</b> = skiktgräns + grundavdrag,
          dvs. den bruttolön där statlig skatt börjar:
        </li>
        <li>
          Under 66 år: 643&nbsp;000 + 17&nbsp;400 = <code className={code}>660 400 kr/år</code> (≈ 55&nbsp;033 kr/mån).
        </li>
        <li>
          66 år + : 643&nbsp;000 + 117&nbsp;500 = <code className={code}>760 500 kr/år</code> (≈ 63&nbsp;375 kr/mån) —
          högre grundavdrag ger högre brytpunkt.
        </li>
      </ul>

      <h3 className={h3}>8 · Jobbskatteavdrag</h3>
      <p>
        Skattereduktion för arbetsinkomst, under 66 år. <code className={code}>AI</code> = arbetsinkomst (≈ FFI,
        avrundad nedåt till 100), <code className={code}>GA</code> = grundavdrag, <code className={code}>KI</code> =
        kommunalskattesats. Reduktionen kan endast räknas av mot kommunalskatten.
      </p>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>
          <code className={code}>AI ≤ 53 872</code>: (AI − GA) × KI
        </li>
        <li>
          <code className={code}>≤ 191 808</code>: (53 872 + 38,74% × (AI − 53 872) − GA) × KI
        </li>
        <li>
          <code className={code}>≤ 478 336</code>: (107 329,60 + 25,10% × (AI − 191 808) − GA) × KI
        </li>
        <li>
          <code className={code}>&gt; 478 336</code>: (179 198,40 − GA) × KI
        </li>
      </ul>
      <p>För 66+: 22% av AI upp till 103&nbsp;600, därefter 0,2635&nbsp;PBB + 7% av AI, max 37&nbsp;254,56&nbsp;kr.</p>

      <h3 className={h3}>9–11 · Avgifter &amp; övriga reduktioner</h3>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>Kyrkoavgift = BFI × avgift (endast medlemmar). Begravningsavgift = BFI × avgift (alla).</li>
        <li>
          Allmän pensionsavgift = 7% × min(arbetsinkomst, 673&nbsp;038). Pensionsinkomst bär ingen avgift. Motsvaras av en{" "}
          <em>skattereduktion på 100%</em>, så nettoeffekten är 0&nbsp;kr för normala löner.
        </li>
        <li>Skattereduktion för förvärvsinkomst: 0,75% × (BFI − 40&nbsp;000), max 1&nbsp;500&nbsp;kr/år.</li>
        <li>Public service-avgift = 1% × BFI, max 1&nbsp;184&nbsp;kr/år.</li>
      </ul>

      <h3 className={h3}>Kapital, ISK/KF, aktieförluster &amp; ROT/RUT</h3>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>
          ISK/Kapitalförsäkring: schablonintäkt = (kapitalunderlag − fribelopp 300&nbsp;000&nbsp;kr) × schablonräntan{" "}
          <code className={code}>3,55 %</code> (statslåneräntan 30 nov 2025, 2,55 % + 1 procentenhet; golv 1,25 %).
          Fribeloppet gäller per person, samlat för alla ISK och kapitalförsäkringar. Schablonintäkten räknas som vanlig
          kapitalinkomst och kan kvittas mot ränteutgifter och kvoterade aktieförluster.
        </li>
        <li>
          Aktievinster och -förluster kvittas först fullt mot varandra i aktiefållan. En <em>okvittad</em> aktieförlust
          kvoteras till <code className={code}>70 %</code> innan den förs in i kapital.
        </li>
        <li>
          Överskott av kapital (ränta + utdelning + ISK/KF-schablonintäkt + nettad aktievinst − ränteutgifter) beskattas
          med <code className={code}>30 %</code>.
        </li>
        <li>
          Underskott av kapital ger skattereduktion: <code className={code}>30 %</code> upp till 100&nbsp;000&nbsp;kr,{" "}
          <code className={code}>21 %</code> på den del som överstiger 100&nbsp;000&nbsp;kr.
        </li>
        <li>
          ROT = 30 % av arbetskostnad (max 50&nbsp;000&nbsp;kr). RUT = 50 % (max 75&nbsp;000&nbsp;kr). Gemensamt tak
          75&nbsp;000&nbsp;kr/år, varav högst 50&nbsp;000&nbsp;kr ROT.
        </li>
      </ul>

      <h3 className={h3}>Kommunal fastighetsavgift</h3>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>
          Småhus: <code className={code}>0,75 %</code> av taxeringsvärdet, max takbelopp{" "}
          <code className={code}>10&nbsp;425&nbsp;kr</code> (inkomstår 2026). Taket slår in vid taxeringsvärde
          1&nbsp;390&nbsp;000&nbsp;kr.
        </li>
        <li>Nybyggt med värdeår 2012 eller senare: ingen avgift de första 15 åren.</li>
        <li>
          Pensionärsbegränsning (66 år +): avgiften begränsas till <code className={code}>4 %</code> av (BFI +
          kapitalöverskott), dock lägst spärrbeloppet <code className={code}>4&nbsp;042&nbsp;kr</code>. Reduktionen
          beräknas före övriga skattereduktioner.
        </li>
        <li>
          Avräkningsordning: fastighetsavgiftsred. (pensionär) → pensionsavgift → jobbskatteavdrag → förvärvsinkomst →
          underskott av kapital → ROT/RUT. Fastighetsavgiften ingår i potten som de två sista får kvittas mot;
          begravnings-/kyrkoavgift och allmän pensionsavgift gör det inte. Aldrig mer än kvarvarande skatt.
        </li>
        <li>
          Modellen visar <em>skatteeffekten</em>. Räntekostnaden (kassautflödet) dras inte från nettot — som i
          Skatteverkets tjänst.
        </li>
      </ul>

      <h3 className={h3}>2026 års parametrar</h3>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>Prisbasbelopp 59&nbsp;200&nbsp;kr · Inkomstbasbelopp 83&nbsp;400&nbsp;kr</li>
        <li>Skiktgräns statlig skatt 643&nbsp;000&nbsp;kr (brytpunkt 660&nbsp;400&nbsp;kr / 760&nbsp;500&nbsp;kr för 66+)</li>
        <li>Genomsnittlig kommunalskatt ≈ 32,41% (kan variera 28–35% beroende på kommun)</li>
      </ul>

      <p className="pt-4 text-xs">
        Källa: Skatteverket, <em>Teknisk beskrivning … inkomstår 2026</em> (SKV 433, 2025-12-10),{" "}
        <a
          href="https://www.skatteverket.se/privat/skatter/beloppochprocent/2026"
          target="_blank"
          rel="noopener"
          className="text-primary underline underline-offset-2"
        >
          Belopp och procent 2026
        </a>{" "}
        samt reglerna för rot-/rutavdrag och kommunal fastighetsavgift. Förenklingar: onoterade aktieförluster
        (5/6-kvotering) hanteras ej, fastighetsavgift endast för helägt småhus hela året (ej ofri grund/halvt takbelopp),
        ingen sjöinkomst eller regional reduktion, jämn inkomst hela året. Resultatet motsvarar slutlig skatt;
        preliminärskatten på lönebeskedet kan avvika något. Beräkningsstöd, inte skatterådgivning.
      </p>
    </div>
  );
}

export default function NettolonCalculator() {
  const [input, setInput] = useState<NettolonInput>(DEFAULTS);
  const [kommunName, setKommunName] = useState("");
  const [begrChoice, setBegrChoice] = useState(String(DEFAULTS.begrPct));
  const [advOpen, setAdvOpen] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const view = useMemo(() => nettolonView(input), [input]);
  const set = <K extends keyof NettolonInput>(key: K, value: NettolonInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }));

  const chooseKommun = (name: string) => {
    setKommunName(name);
    if (name && RATES[name] !== undefined) set("kommun", RATES[name]);
  };
  const changeKommunRate = (v: number) => {
    set("kommun", v);
    // a rate that is not the one of the chosen municipality unchooses it
    if (kommunName && Math.abs((RATES[kommunName] ?? 0) - v) > 0.001) setKommunName("");
  };
  const chooseBegr = (value: string) => {
    setBegrChoice(value);
    if (value !== "") set("begrPct", Number(value));
  };
  const changeBegrRate = (v: number) => {
    set("begrPct", v);
    setBegrChoice(BEGR_PRESETS.includes(String(v)) ? String(v) : "");
  };
  const reset = () => {
    setInput(DEFAULTS);
    setKommunName("");
    setBegrChoice(String(DEFAULTS.begrPct));
  };

  const { bar, bryt } = view;

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
      {/* ── Inputs ── */}
      <div className="min-w-0 space-y-6 self-start rounded-xl border border-border bg-card p-6">
        <div>
          <h2 className="font-serif text-lg font-semibold">Indata</h2>
          <p className="mt-1 text-xs text-muted-foreground">Justera värdena — allt räknas om direkt.</p>
        </div>

        <AmountField id="nl-lon" label="Bruttolön per månad" value={input.lon} onChange={(v) => set("lon", v)} suffix="kr/mån" />

        <div className="space-y-2">
          <SelectField
            id="nl-kommun-lista"
            label="Kommunal skattesats"
            value={kommunName}
            onChange={chooseKommun}
            action={<ExternalLink href={SCB_URL}>SCB:s lista ↗</ExternalLink>}
          >
            <option value="">— Välj kommun (fyller i 2026 års sats) —</option>
            {KOMMUNER.map((k) => (
              <option key={k} value={k}>
                {k} — {RATES[k]!.toFixed(2).replace(".", ",")} %
              </option>
            ))}
          </SelectField>
          <AmountField
            id="nl-kommun"
            label="Skattesats i procent"
            value={input.kommun}
            onChange={changeKommunRate}
            suffix="%"
            compact
          />
        </div>

        <AmountField
          id="nl-vaxling"
          label="Bruttolöneavdrag"
          hint="löneväxling, bil, cykel etc."
          value={input.vaxling}
          onChange={(v) => set("vaxling", v)}
          suffix="kr/mån"
        />
        <AmountField
          id="nl-pension"
          label="Pensionsinkomst"
          value={input.pension}
          onChange={(v) => set("pension", v)}
          suffix="kr/mån"
        />

        <div role="radiogroup" aria-labelledby="nl-alder" className="space-y-2">
          <p id="nl-alder" className="text-sm leading-none font-medium">
            Ålder vid årets ingång
          </p>
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-input bg-background p-1">
            {[
              { over: false, label: "Under 66 år" },
              { over: true, label: "66 år +" },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                role="radio"
                aria-checked={input.over66 === o.over}
                onClick={() => set("over66", o.over)}
                className={cn(
                  "cursor-pointer rounded-md px-2 py-2 text-sm font-medium transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none",
                  input.over66 === o.over ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-accent",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <SwitchRow
            id="nl-kyrka"
            label="Kyrkoavgift"
            hint="Medlem i Svenska kyrkan / trossamfund"
            checked={input.kyrkaOn}
            onChange={(v) => set("kyrkaOn", v)}
          />
          {input.kyrkaOn && (
            <AmountField
              id="nl-kyrka-pct"
              label="Avgift"
              value={input.kyrkaPct}
              onChange={(v) => set("kyrkaPct", v)}
              suffix="%"
              compact
              action={<ExternalLink href="https://www.svenskakyrkan.se/medlem/kyrkoavgiften">Hitta din församling ↗</ExternalLink>}
            />
          )}
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <SwitchRow
            id="nl-begr"
            label="Begravningsavgift"
            hint="tre regimer i Sverige – välj nedan"
            checked={input.begrOn}
            onChange={(v) => set("begrOn", v)}
          />
          {input.begrOn && (
            <>
              <SelectField id="nl-begr-lista" label="Regim för begravningsavgift" value={begrChoice} onChange={chooseBegr} hideLabel>
                {BEGRAVNING.map((b) => (
                  <option key={b.value} value={String(b.value)}>
                    {b.label}
                  </option>
                ))}
                <option value="">— Egen sats —</option>
              </SelectField>
              <AmountField
                id="nl-begr-pct"
                label="Avgift"
                value={input.begrPct}
                onChange={changeBegrRate}
                suffix="%"
                compact
                action={<ExternalLink href="https://www.svenskakyrkan.se/begravning/begravningsavgiften">Om avgiften ↗</ExternalLink>}
              />
            </>
          )}
        </div>

        <Collapsible
          id="nl-avancerat"
          title="Kapital, ränteavdrag & ROT/RUT"
          small
          open={advOpen}
          onToggle={() => setAdvOpen(!advOpen)}
          className="border-t border-border pt-4"
        >
          <div className="mt-4 space-y-5">
            <AmountField id="nl-kapink" label="Ränta & utdelning" hint="ränteinkomst, aktieutdelning" value={input.kapInk} onChange={(v) => set("kapInk", v)} suffix="kr/år" />
            <AmountField
              id="nl-isk"
              label="Kapitalunderlag ISK / Kapitalförsäkring"
              hint="fribelopp 300 000 kr, schablonränta 3,55 %"
              value={input.iskUnderlag}
              onChange={(v) => set("iskUnderlag", v)}
              suffix="kr"
            />
            <AmountField id="nl-aktievinst" label="Aktievinst (marknadsnoterad)" hint="realiserad vinst, aktier/fonder" value={input.aktievinst} onChange={(v) => set("aktievinst", v)} suffix="kr/år" />
            <AmountField
              id="nl-aktieforlust"
              label="Aktieförlust (marknadsnoterad)"
              hint="kvittas mot vinst, rest kvoteras 70 %"
              value={input.aktieforlust}
              onChange={(v) => set("aktieforlust", v)}
              suffix="kr/år"
            />
            <AmountField id="nl-rantutg" label="Ränteutgifter / övriga avdrag" hint="avdragsgill ränta (100 %)" value={input.rantUtg} onChange={(v) => set("rantUtg", v)} suffix="kr/år" />
            <AmountField id="nl-rot" label="ROT-arbete (arbetskostnad)" hint="30 %, max 50 000 kr reduktion" value={input.rotArb} onChange={(v) => set("rotArb", v)} suffix="kr/år" />
            <AmountField id="nl-rut" label="RUT-arbete (arbetskostnad)" hint="50 %, gemensamt tak 75 000 kr" value={input.rutArb} onChange={(v) => set("rutArb", v)} suffix="kr/år" />
            <AmountField id="nl-taxvarde" label="Taxeringsvärde (småhus)" hint="0,75 %, takbelopp 10 425 kr" value={input.taxvarde} onChange={(v) => set("taxvarde", v)} suffix="kr" />
            <SwitchRow
              id="nl-nybyggt"
              label="Nybyggt hus"
              hint="värdeår 2012+, avgiftsfritt i 15 år"
              checked={input.nybyggt}
              onChange={(v) => set("nybyggt", v)}
            />
          </div>
        </Collapsible>

        <Button variant="outline" className="w-full" onClick={reset}>
          Återställ till exempel
        </Button>
      </div>

      {/* ── Result ── */}
      <div className="min-w-0 space-y-6">
        <div className="rounded-xl border border-border bg-primary p-6 text-primary-foreground sm:p-8">
          <p className="text-xs tracking-wider uppercase opacity-70">Netto i handen efter skatt</p>
          <p className="mt-2 font-serif text-5xl leading-none font-semibold sm:text-6xl" aria-live="polite">
            {view.netMonth}
            <span className="ml-2 font-sans text-xl font-medium opacity-60">kr/mån</span>
          </p>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm opacity-75">
            <span className="whitespace-nowrap">
              ≈ <b className="font-semibold tabular-nums">{view.netYear}</b> kr/år
            </span>
            <span className="whitespace-nowrap">
              bruttolöneavdrag: <b className="font-semibold tabular-nums">{view.vaxYear}</b> kr/år
            </span>
          </p>
          <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-primary-foreground/15 pt-5">
            <div>
              <dd className="font-serif text-lg font-semibold sm:text-2xl">{view.effRate}</dd>
              <dt className="mt-1 text-[11px] tracking-wide uppercase opacity-60">Effektiv skatt</dt>
            </div>
            <div>
              <dd className="font-serif text-lg font-semibold sm:text-2xl">{view.margRate}</dd>
              <dt className="mt-1 text-[11px] tracking-wide uppercase opacity-60">Marginalskatt</dt>
            </div>
            <div>
              <dd className="font-serif text-lg font-semibold sm:text-2xl">{view.totTax}</dd>
              <dt className="mt-1 text-[11px] tracking-wide uppercase opacity-60">Skatt &amp; avgift / mån</dt>
            </div>
          </dl>
        </div>

        <div>
          <div
            className="flex h-3 overflow-hidden rounded-full bg-border"
            role="img"
            aria-label={`Av inkomsten är ${Math.round(bar.net)} % netto, ${Math.round(bar.tax)} % skatt och avgifter och ${Math.round(bar.vax)} % bruttolöneavdrag.`}
          >
            <span className="block h-full bg-chart-1 transition-[width]" style={{ width: `${bar.net}%` }} />
            <span className="block h-full bg-chart-5 transition-[width]" style={{ width: `${bar.tax}%` }} />
            <span className="block h-full bg-chart-2 transition-[width]" style={{ width: `${bar.vax}%` }} />
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="size-2.5 rounded-sm bg-chart-1" aria-hidden="true" /> Netto
            </li>
            <li className="flex items-center gap-2">
              <span className="size-2.5 rounded-sm bg-chart-5" aria-hidden="true" /> Skatt &amp; avgifter
            </li>
            <li className="flex items-center gap-2">
              <span className="size-2.5 rounded-sm bg-chart-2" aria-hidden="true" /> Bruttolöneavdrag
            </li>
          </ul>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <span
            className={cn("mt-1.5 size-2 shrink-0 rounded-full", bryt.over ? "bg-destructive" : "bg-chart-4")}
            aria-hidden="true"
          />
          <p>
            Brytpunkt statlig skatt: <b className="font-semibold text-foreground">{fmt(bryt.bryt)} kr/år</b> (≈ {fmt(bryt.brytM)} kr/mån).{" "}
            {bryt.over ? (
              <>
                Din förvärvsinkomst ligger <b className="font-semibold text-foreground">{fmt(bryt.diffM)} kr/mån</b> över — 20 % statlig skatt på den delen.
              </>
            ) : (
              <>
                Du ligger <b className="font-semibold text-foreground">{fmt(bryt.diffM)} kr/mån</b> under — ingen statlig skatt.
              </>
            )}
          </p>
        </div>

        <Collapsible
          id="nl-steg"
          title="Beräkning steg för steg"
          aside="Belopp i kr"
          open={stepsOpen}
          onToggle={() => setStepsOpen(!stepsOpen)}
          className="rounded-xl border border-border bg-card p-4 sm:px-6"
        >
          <div className="-mx-4 mt-4 overflow-x-auto sm:-mx-6">
            <table className="w-full text-[13px] tabular-nums sm:text-sm">
              <thead className="bg-muted text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="hidden w-8 px-3 py-2 text-left font-medium sm:table-cell sm:pl-6">
                    <span className="sr-only">Nummer</span>
                  </th>
                  <th scope="col" className="py-2 pr-2 pl-4 text-left font-medium sm:pl-2">
                    Post
                  </th>
                  <th scope="col" className="px-2 py-2 text-right font-medium whitespace-nowrap">
                    Per månad
                  </th>
                  <th scope="col" className="py-2 pr-4 pl-2 text-right font-medium whitespace-nowrap sm:pr-6">
                    Per år
                  </th>
                </tr>
              </thead>
              <tbody>
                {view.rows.map((x) => {
                  const cells = rowCells(x);
                  const net = x.cls === "netrow";
                  const sum = x.cls === "sumrow";
                  return (
                    <tr
                      key={x.name}
                      className={cn(
                        "border-t border-border",
                        x.cls === "gross" && "bg-muted/50",
                        sum && "bg-muted font-semibold",
                        net && "bg-primary text-primary-foreground",
                      )}
                    >
                      <td className={cn("hidden px-3 py-2.5 align-top text-xs sm:table-cell sm:pl-6", net ? "" : "text-muted-foreground")}>
                        {x.n}
                      </td>
                      <td className="py-2.5 pr-2 pl-4 sm:pl-2">
                        <span className={cn("block font-medium", (sum || net) && "font-serif")}>{x.name}</span>
                        <span className={cn("block text-xs font-normal", net ? "text-primary-foreground/70" : "text-muted-foreground")}>
                          {x.sub}
                        </span>
                      </td>
                      <td className={cn("px-2 py-2.5 text-right align-top whitespace-nowrap", x.cls === "minus" && "text-destructive")}>
                        {cells.m}
                      </td>
                      <td className={cn("py-2.5 pr-4 pl-2 text-right align-top whitespace-nowrap sm:pr-6", x.cls === "minus" && "text-destructive")}>
                        {cells.y}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Collapsible>

        <Collapsible
          id="nl-noter"
          title="Formler, antaganden och 2026 års parametrar"
          open={notesOpen}
          onToggle={() => setNotesOpen(!notesOpen)}
          className="rounded-xl border border-border bg-card p-4 sm:px-6"
        >
          <Notes />
        </Collapsible>
      </div>
    </div>
  );
}

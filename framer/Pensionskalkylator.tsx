// Pensionskalkylator – Framer code component for pensionslyft.se
//
// Paste this whole file into a Framer code file (Assets → Code → New code file).
// It only depends on "react" and "framer", so it works on its own.
// Ported from the Lovable app: lovable-app/src/routes/pensionskalkylator.tsx
// and lovable-app/src/lib/pension.ts.

import { addPropertyControls, ControlType } from "framer";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

// ---------------------------------------------------------------------------
// Math (same as lovable-app/src/lib/pension.ts)
// ---------------------------------------------------------------------------

export type PensionInput = {
  currentCapital: number;
  monthlyDeposit: number;
  yearsToRetirement: number;
  annualReturn: number; // percent
  annualFee: number; // percent
  payoutYears: number;
};

export type YearPoint = {
  year: number;
  capital: number;
  deposits: number;
  growth: number;
};

export type PensionResult = {
  series: YearPoint[];
  finalCapital: number;
  totalDeposits: number;
  totalGrowth: number;
  monthlyPension: number;
  feeCost: number;
};

function project(input: {
  currentCapital: number;
  monthlyDeposit: number;
  years: number;
  netReturn: number;
}): YearPoint[] {
  const monthlyRate = Math.pow(1 + input.netReturn / 100, 1 / 12) - 1;
  let capital = input.currentCapital;
  let deposits = input.currentCapital;
  const series: YearPoint[] = [{ year: 0, capital, deposits, growth: 0 }];
  for (let year = 1; year <= input.years; year++) {
    for (let month = 0; month < 12; month++) {
      capital = capital * (1 + monthlyRate) + input.monthlyDeposit;
      deposits += input.monthlyDeposit;
    }
    series.push({ year, capital, deposits, growth: Math.max(capital - deposits, 0) });
  }
  return series;
}

export function calculatePension(input: PensionInput): PensionResult {
  const netReturn = input.annualReturn - input.annualFee;
  const series = project({
    currentCapital: input.currentCapital,
    monthlyDeposit: input.monthlyDeposit,
    years: input.yearsToRetirement,
    netReturn,
  });
  const last = series[series.length - 1]!;
  const grossSeries = project({
    currentCapital: input.currentCapital,
    monthlyDeposit: input.monthlyDeposit,
    years: input.yearsToRetirement,
    netReturn: input.annualReturn,
  });
  const gross = grossSeries[grossSeries.length - 1]!.capital;

  // Payout phase: capital keeps growing at half the return during withdrawal.
  const payoutRate = Math.pow(1 + Math.max(netReturn, 0) / 200, 1 / 12) - 1;
  const months = Math.max(input.payoutYears, 1) * 12;
  const monthlyPension =
    payoutRate === 0
      ? last.capital / months
      : (last.capital * payoutRate) / (1 - Math.pow(1 + payoutRate, -months));

  return {
    series,
    finalCapital: last.capital,
    totalDeposits: last.deposits,
    totalGrowth: Math.max(last.capital - last.deposits, 0),
    monthlyPension,
    feeCost: Math.max(gross - last.capital, 0),
  };
}

// ---------------------------------------------------------------------------
// Swedish formatting (same as lovable-app/src/lib/format.ts)
// ---------------------------------------------------------------------------

const sek = new Intl.NumberFormat("sv-SE", {
  style: "currency",
  currency: "SEK",
  maximumFractionDigits: 0,
});
const num = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 });
const dec1 = new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dec2 = new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatSek(value: number): string {
  return sek.format(Math.round(value));
}

function formatTkr(value: number): string {
  return `${num.format(value / 1000)} tkr`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SERIF = '"Source Serif 4", Georgia, serif';
const SANS = 'Inter, ui-sans-serif, system-ui, sans-serif';

type Props = {
  showHeader: boolean;
  title: string;
  intro: string;
  currentCapital: number;
  monthlyDeposit: number;
  yearsToRetirement: number;
  annualReturn: number;
  annualFee: number;
  payoutYears: number;
  feeArticleLink: string;
  primaryColor: string;
  depositsColor: string;
  highlightBackground: string;
  cardColor: string;
  textColor: string;
  mutedTextColor: string;
  borderColor: string;
  headingFont?: CSSProperties;
  bodyFont?: CSSProperties;
  style?: CSSProperties;
};

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 1100
 */
export default function Pensionskalkylator(props: Props) {
  const p = { ...defaultProps, ...props };
  const [currentCapital, setCurrentCapital] = usePropState(p.currentCapital);
  const [monthlyDeposit, setMonthlyDeposit] = usePropState(p.monthlyDeposit);
  const [yearsToRetirement, setYearsToRetirement] = usePropState(p.yearsToRetirement);
  const [annualReturn, setAnnualReturn] = usePropState(p.annualReturn);
  const [annualFee, setAnnualFee] = usePropState(p.annualFee);
  const [payoutYears, setPayoutYears] = usePropState(p.payoutYears);

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

  const theme: Theme = {
    primary: p.primaryColor,
    deposits: p.depositsColor,
    card: p.cardColor,
    text: p.textColor,
    muted: p.mutedTextColor,
    border: p.borderColor,
    heading: { fontFamily: SERIF, fontWeight: 600, ...p.headingFont },
    body: { fontFamily: SANS, ...p.bodyFont },
  };

  const card: CSSProperties = {
    background: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
    padding: 24,
    boxSizing: "border-box",
  };

  return (
    <div style={{ ...theme.body, color: theme.text, width: "100%", ...p.style }}>
      {p.showHeader && (
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ ...theme.heading, fontSize: 36, lineHeight: 1.2, margin: 0 }}>{p.title}</h1>
          <p style={{ marginTop: 12, marginBottom: 0, maxWidth: 672, color: theme.muted, lineHeight: 1.6 }}>
            {p.intro}
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 32, alignItems: "flex-start" }}>
        <div style={{ ...card, flexGrow: 1, flexBasis: 340, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 24 }}>
          <NumberField
            theme={theme}
            label="Nuvarande pensionskapital"
            value={currentCapital}
            onChange={setCurrentCapital}
            step={10000}
            suffix="kr"
          />
          <NumberField
            theme={theme}
            label="Månadssparande"
            value={monthlyDeposit}
            onChange={setMonthlyDeposit}
            step={500}
            suffix="kr"
          />
          <SliderField
            theme={theme}
            label="År till pension"
            value={yearsToRetirement}
            onChange={setYearsToRetirement}
            min={1}
            max={45}
            step={1}
            display={`${yearsToRetirement} år`}
          />
          <SliderField
            theme={theme}
            label="Förväntad avkastning"
            value={annualReturn}
            onChange={setAnnualReturn}
            min={0}
            max={12}
            step={0.1}
            display={`${dec1.format(annualReturn)} %`}
          />
          <SliderField
            theme={theme}
            label="Årlig avgift"
            value={annualFee}
            onChange={setAnnualFee}
            min={0}
            max={2.5}
            step={0.05}
            display={`${dec2.format(annualFee)} %`}
          />
          <SliderField
            theme={theme}
            label="Uttagstid"
            value={payoutYears}
            onChange={setPayoutYears}
            min={5}
            max={30}
            step={1}
            display={`${payoutYears} år`}
          />
        </div>

        <div style={{ flexGrow: 999, flexBasis: 0, minWidth: "55%", display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 24 }}>
          <div
            style={{
              display: "grid",
              gap: 16,
              // At most 2 columns; 1 column when narrow.
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, max(220px, calc((100% - 16px) / 2))), 1fr))",
            }}
          >
            <Stat theme={theme} label="Kapital vid pension" value={formatSek(result.finalCapital)} highlight />
            <Stat theme={theme} label="Per månad i uttag" value={formatSek(result.monthlyPension)} highlight />
            <Stat theme={theme} label="Egna insättningar" value={formatSek(result.totalDeposits)} />
            <Stat theme={theme} label="Varav avkastning" value={formatSek(result.totalGrowth)} />
          </div>

          <div style={card}>
            <h2 style={{ ...theme.heading, fontSize: 20, margin: 0 }}>Kapitalets utveckling</h2>
            <AreaChart theme={theme} series={result.series} />
          </div>

          <div
            style={{
              ...card,
              background: p.highlightBackground,
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            Avgiften på {dec2.format(annualFee)} % kostar dig ungefär{" "}
            <strong>{formatSek(result.feeCost)}</strong> fram till pension jämfört med ett
            avgiftsfritt sparande. Läs mer i vår artikel om{" "}
            <a href={p.feeArticleLink} style={{ color: theme.primary, textDecoration: "underline" }}>
              avgifter
            </a>
            .
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

type Theme = {
  primary: string;
  deposits: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  heading: CSSProperties;
  body: CSSProperties;
};

// Local state that starts from a Framer prop and follows it when the prop is
// changed on the canvas.
function usePropState(value: number) {
  const [state, setState] = useState(value);
  useEffect(() => setState(value), [value]);
  return [state, setState] as const;
}

function Stat({
  theme,
  label,
  value,
  highlight,
}: {
  theme: Theme;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${highlight ? theme.primary : theme.border}`,
        padding: 20,
        background: highlight ? theme.primary : theme.card,
        color: highlight ? theme.card : theme.text,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: highlight ? undefined : theme.muted,
          opacity: highlight ? 0.75 : 1,
        }}
      >
        {label}
      </p>
      <p style={{ ...theme.heading, margin: "8px 0 0", fontSize: 24, whiteSpace: "nowrap" }}>{value}</p>
    </div>
  );
}

function NumberField({
  theme,
  label,
  value,
  onChange,
  step,
  suffix,
}: {
  theme: Theme;
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  suffix: string;
}) {
  return (
    <label style={{ display: "block", fontSize: 14, fontWeight: 500 }}>
      {label}
      <span style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="number"
          inputMode="numeric"
          value={value}
          step={step}
          min={0}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
          style={{
            flex: 1,
            minWidth: 0,
            height: 40,
            padding: "0 12px",
            fontSize: 16,
            fontFamily: "inherit",
            color: theme.text,
            background: theme.card,
            border: `1px solid ${theme.border}`,
            borderRadius: 8,
            boxSizing: "border-box",
          }}
        />
        <span style={{ fontWeight: 400, color: theme.muted }}>{suffix}</span>
      </span>
    </label>
  );
}

function SliderField({
  theme,
  label,
  value,
  onChange,
  min,
  max,
  step,
  display,
}: {
  theme: Theme;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  display: string;
}) {
  return (
    <label style={{ display: "block", fontSize: 14 }}>
      <span style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <span style={{ fontWeight: 500 }}>{label}</span>
        <span style={{ fontWeight: 600 }}>{display}</span>
      </span>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", marginTop: 12, accentColor: theme.primary, cursor: "pointer" }}
      />
    </label>
  );
}

// ---------------------------------------------------------------------------
// Chart (plain SVG, no chart library)
// ---------------------------------------------------------------------------

const CHART_HEIGHT = 320;
const PAD = { top: 12, right: 12, bottom: 28, left: 72 };

function niceMax(value: number, ticks: number) {
  if (value <= 0) return { max: 1000, step: 250 };
  const raw = value / ticks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw)!;
  return { max: Math.ceil(value / step) * step, step };
}

function yearStep(years: number) {
  return [1, 2, 5, 10].find((s) => years / s <= 10) ?? 10;
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

function AreaChart({ theme, series }: { theme: Theme; series: YearPoint[] }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<number | null>(null);

  const years = series.length - 1;
  const { max, step } = niceMax(Math.max(...series.map((s) => s.capital)), 4);
  const plotW = Math.max(width - PAD.left - PAD.right, 10);
  const plotH = CHART_HEIGHT - PAD.top - PAD.bottom;
  const x = (year: number) => PAD.left + (years === 0 ? 0 : (year / years) * plotW);
  const y = (value: number) => PAD.top + plotH - (value / max) * plotH;

  const line = (key: "capital" | "deposits") =>
    series.map((s, i) => `${i === 0 ? "M" : "L"}${x(s.year)},${y(s[key])}`).join(" ");
  const area = (key: "capital" | "deposits") =>
    `${line(key)} L${x(years)},${y(0)} L${x(0)},${y(0)} Z`;

  const yTicks: number[] = [];
  for (let v = 0; v <= max + step / 2; v += step) yTicks.push(v);
  const xStep = yearStep(years);
  const xTicks = series.filter((s) => s.year % xStep === 0).map((s) => s.year);

  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left - PAD.left) / plotW;
    setHover(Math.min(years, Math.max(0, Math.round(rel * years))));
  };

  const point = hover === null ? null : series[hover]!;
  const gradientId = "pensionslyft-capital-gradient";

  return (
    <div ref={ref} style={{ position: "relative", width: "100%", overflow: "hidden", marginTop: 16 }}>
      <svg
        width={width}
        height={CHART_HEIGHT}
        style={{ display: "block", touchAction: "pan-y" }}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label="Diagram över kapitalets utveckling år för år"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.primary} stopOpacity={0.45} />
            <stop offset="100%" stopColor={theme.primary} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={PAD.left + plotW}
              y1={y(v)}
              y2={y(v)}
              stroke={theme.border}
              strokeDasharray="3 3"
            />
            <text x={PAD.left - 8} y={y(v)} dy="0.32em" textAnchor="end" fontSize={12} fill={theme.muted}>
              {formatTkr(v)}
            </text>
          </g>
        ))}
        {xTicks.map((year) => (
          <text key={year} x={x(year)} y={CHART_HEIGHT - 8} textAnchor="middle" fontSize={12} fill={theme.muted}>
            {year}
          </text>
        ))}
        <path d={area("capital")} fill={`url(#${gradientId})`} />
        <path d={line("capital")} fill="none" stroke={theme.primary} strokeWidth={2} />
        <path d={area("deposits")} fill={theme.deposits} fillOpacity={0.15} />
        <path d={line("deposits")} fill="none" stroke={theme.deposits} strokeWidth={2} />
        {point && (
          <g>
            <line
              x1={x(point.year)}
              x2={x(point.year)}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke={theme.muted}
              strokeOpacity={0.5}
            />
            <circle cx={x(point.year)} cy={y(point.capital)} r={4} fill={theme.primary} />
            <circle cx={x(point.year)} cy={y(point.deposits)} r={4} fill={theme.deposits} />
          </g>
        )}
      </svg>
      {point && (
        <Tooltip
          theme={theme}
          left={x(point.year)}
          width={width}
          title={`År ${point.year}`}
          rows={[
            { label: "Kapital", value: formatSek(point.capital), color: theme.primary },
            { label: "Insättningar", value: formatSek(point.deposits), color: theme.deposits },
          ]}
        />
      )}
      <Legend
        theme={theme}
        items={[
          { label: "Kapital", color: theme.primary },
          { label: "Insättningar", color: theme.deposits },
        ]}
      />
    </div>
  );
}

function Tooltip({
  theme,
  left,
  width,
  title,
  rows,
}: {
  theme: Theme;
  left: number;
  width: number;
  title: string;
  rows: { label: string; value: string; color: string }[];
}) {
  const boxWidth = 200;
  const placeLeft = left + 12 + boxWidth > width;
  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        left: placeLeft ? Math.max(0, left - 12 - boxWidth) : left + 12,
        width: boxWidth,
        boxSizing: "border-box",
        padding: "8px 12px",
        background: theme.card,
        border: `1px solid ${theme.border}`,
        borderRadius: 8,
        boxShadow: "0 8px 24px -12px rgba(12, 42, 73, 0.35)",
        fontSize: 13,
        pointerEvents: "none",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>
      {rows.map((row) => (
        <div key={row.label} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span style={{ color: row.color }}>{row.label}</span>
          <span style={{ whiteSpace: "nowrap" }}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function Legend({ theme, items }: { theme: Theme; items: { label: string; color: string }[] }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 8, fontSize: 13 }}>
      {items.map((item) => (
        <span key={item.label} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: theme.muted }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Framer settings panel
// ---------------------------------------------------------------------------

const defaultProps = {
  showHeader: true,
  title: "Pensionskalkylator",
  intro:
    "Fyll i ditt nuvarande pensionskapital och ditt månadssparande. Kalkylatorn räknar fram kapitalet vid pension och en uppskattad månadsutbetalning.",
  currentCapital: 350000,
  monthlyDeposit: 2000,
  yearsToRetirement: 25,
  annualReturn: 6.5,
  annualFee: 0.6,
  payoutYears: 20,
  feeArticleLink: "/artiklar/avgifter-som-ater-upp-din-pension",
  primaryColor: "#0C2A49",
  depositsColor: "#A18142",
  highlightBackground: "#F4ECDE",
  cardColor: "#FFFFFF",
  textColor: "#0F2034",
  mutedTextColor: "#545F6C",
  borderColor: "#DFDAD0",
};

addPropertyControls(Pensionskalkylator, {
  showHeader: { type: ControlType.Boolean, title: "Rubrik", defaultValue: defaultProps.showHeader },
  title: {
    type: ControlType.String,
    title: "Titel",
    defaultValue: defaultProps.title,
    hidden: (props: Props) => !props.showHeader,
  },
  intro: {
    type: ControlType.String,
    title: "Ingress",
    displayTextArea: true,
    defaultValue: defaultProps.intro,
    hidden: (props: Props) => !props.showHeader,
  },
  currentCapital: {
    type: ControlType.Number,
    title: "Startkapital",
    defaultValue: defaultProps.currentCapital,
    min: 0,
    max: 20000000,
    step: 10000,
    unit: " kr",
  },
  monthlyDeposit: {
    type: ControlType.Number,
    title: "Månadsspar",
    defaultValue: defaultProps.monthlyDeposit,
    min: 0,
    max: 100000,
    step: 500,
    unit: " kr",
  },
  yearsToRetirement: {
    type: ControlType.Number,
    title: "År till pension",
    defaultValue: defaultProps.yearsToRetirement,
    min: 1,
    max: 45,
    step: 1,
  },
  annualReturn: {
    type: ControlType.Number,
    title: "Avkastning %",
    defaultValue: defaultProps.annualReturn,
    min: 0,
    max: 12,
    step: 0.1,
  },
  annualFee: {
    type: ControlType.Number,
    title: "Avgift %",
    defaultValue: defaultProps.annualFee,
    min: 0,
    max: 2.5,
    step: 0.05,
  },
  payoutYears: {
    type: ControlType.Number,
    title: "Uttagstid (år)",
    defaultValue: defaultProps.payoutYears,
    min: 5,
    max: 30,
    step: 1,
  },
  feeArticleLink: {
    type: ControlType.Link,
    title: "Länk avgifter",
    defaultValue: defaultProps.feeArticleLink,
  },
  primaryColor: { type: ControlType.Color, title: "Primär", defaultValue: defaultProps.primaryColor },
  depositsColor: { type: ControlType.Color, title: "Insättningar", defaultValue: defaultProps.depositsColor },
  highlightBackground: {
    type: ControlType.Color,
    title: "Avgiftsruta",
    defaultValue: defaultProps.highlightBackground,
  },
  cardColor: { type: ControlType.Color, title: "Kort", defaultValue: defaultProps.cardColor },
  textColor: { type: ControlType.Color, title: "Text", defaultValue: defaultProps.textColor },
  mutedTextColor: { type: ControlType.Color, title: "Dämpad text", defaultValue: defaultProps.mutedTextColor },
  borderColor: { type: ControlType.Color, title: "Kantlinje", defaultValue: defaultProps.borderColor },
  headingFont: {
    type: ControlType.Font,
    title: "Rubrikfont",
    controls: "basic",
    defaultFontType: "serif",
  },
  bodyFont: {
    type: ControlType.Font,
    title: "Brödtext",
    controls: "basic",
    defaultFontType: "sans-serif",
  },
});

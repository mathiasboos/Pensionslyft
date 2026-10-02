// RantaPaRanta – Framer code component for pensionslyft.se
//
// Paste this whole file into a Framer code file (Assets → Code → New code file).
// It only depends on "react" and "framer", so it works on its own.
// Ported from the Lovable app: lovable-app/src/routes/ranta-pa-ranta.tsx
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

export type CompoundInput = {
  startAmount: number;
  monthlyDeposit: number;
  years: number;
  annualReturn: number; // percent
  annualFee: number; // percent
};

export type YearPoint = {
  year: number;
  capital: number;
  deposits: number;
  growth: number;
};

export type CompoundResult = {
  series: YearPoint[];
  finalCapital: number;
  totalDeposits: number;
  totalGrowth: number;
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

export function calculateCompound(input: CompoundInput): CompoundResult {
  const series = project({
    currentCapital: input.startAmount,
    monthlyDeposit: input.monthlyDeposit,
    years: input.years,
    netReturn: input.annualReturn - input.annualFee,
  });
  const last = series[series.length - 1]!;
  return {
    series,
    finalCapital: last.capital,
    totalDeposits: last.deposits,
    totalGrowth: Math.max(last.capital - last.deposits, 0),
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
  startAmount: number;
  monthlyDeposit: number;
  years: number;
  annualReturn: number;
  annualFee: number;
  primaryColor: string;
  depositsColor: string;
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
export default function RantaPaRanta(props: Props) {
  const p = { ...defaultProps, ...props };
  const [startAmount, setStartAmount] = usePropState(p.startAmount);
  const [monthlyDeposit, setMonthlyDeposit] = usePropState(p.monthlyDeposit);
  const [years, setYears] = usePropState(p.years);
  const [annualReturn, setAnnualReturn] = usePropState(p.annualReturn);
  const [annualFee, setAnnualFee] = usePropState(p.annualFee);

  const result = useMemo(
    () => calculateCompound({ startAmount, monthlyDeposit, years, annualReturn, annualFee }),
    [startAmount, monthlyDeposit, years, annualReturn, annualFee],
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
            label="Startbelopp"
            value={startAmount}
            onChange={setStartAmount}
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
            label="Sparhorisont"
            value={years}
            onChange={setYears}
            min={1}
            max={50}
            step={1}
            display={`${years} år`}
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
        </div>

        <div style={{ flexGrow: 999, flexBasis: 0, minWidth: "55%", display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 24 }}>
          <div
            style={{
              display: "grid",
              gap: 16,
              // At most 3 columns; 1 column when narrow.
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, max(180px, calc((100% - 32px) / 3))), 1fr))",
            }}
          >
            <Stat theme={theme} label="Slutkapital" value={formatSek(result.finalCapital)} highlight />
            <Stat theme={theme} label="Egna insättningar" value={formatSek(result.totalDeposits)} />
            <Stat theme={theme} label="Avkastning" value={formatSek(result.totalGrowth)} />
          </div>

          <div style={card}>
            <h2 style={{ ...theme.heading, fontSize: 20, margin: 0 }}>Insättningar och avkastning</h2>
            <BarChart theme={theme} series={result.series} />
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

function BarChart({ theme, series }: { theme: Theme; series: YearPoint[] }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<number | null>(null);

  const { max, step } = niceMax(Math.max(...series.map((s) => s.deposits + s.growth)), 4);
  const plotW = Math.max(width - PAD.left - PAD.right, 10);
  const plotH = CHART_HEIGHT - PAD.top - PAD.bottom;
  const band = plotW / series.length;
  const barW = Math.max(band * 0.7, 1);
  const center = (index: number) => PAD.left + band * index + band / 2;
  const y = (value: number) => PAD.top + plotH - (value / max) * plotH;

  const yTicks: number[] = [];
  for (let v = 0; v <= max + step / 2; v += step) yTicks.push(v);
  const xStep = yearStep(series.length - 1);

  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const index = Math.floor((e.clientX - rect.left - PAD.left) / band);
    setHover(Math.min(series.length - 1, Math.max(0, index)));
  };

  const point = hover === null ? null : series[hover]!;

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
        aria-label="Diagram över insättningar och avkastning år för år"
      >
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
        {series.map((s, i) => (
          <g key={s.year} opacity={hover === null || hover === i ? 1 : 0.55}>
            <rect
              x={center(i) - barW / 2}
              y={y(s.deposits)}
              width={barW}
              height={y(0) - y(s.deposits)}
              fill={theme.deposits}
            />
            <rect
              x={center(i) - barW / 2}
              y={y(s.deposits + s.growth)}
              width={barW}
              height={y(s.deposits) - y(s.deposits + s.growth)}
              fill={theme.primary}
            />
            {s.year % xStep === 0 && (
              <text x={center(i)} y={CHART_HEIGHT - 8} textAnchor="middle" fontSize={12} fill={theme.muted}>
                {s.year}
              </text>
            )}
          </g>
        ))}
      </svg>
      {point && (
        <Tooltip
          theme={theme}
          left={center(hover!)}
          width={width}
          title={`År ${point.year}`}
          rows={[
            { label: "Insättningar", value: formatSek(point.deposits), color: theme.deposits },
            { label: "Avkastning", value: formatSek(point.growth), color: theme.primary },
            { label: "Totalt", value: formatSek(point.deposits + point.growth), color: theme.text },
          ]}
        />
      )}
      <Legend
        theme={theme}
        items={[
          { label: "Insättningar", color: theme.deposits },
          { label: "Avkastning", color: theme.primary },
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
  title: "Ränta på ränta",
  intro:
    "Den mest kraftfulla effekten i allt sparande. Se hur stor del av slutkapitalet som kommer från dina egna pengar – och hur mycket som är avkastning.",
  startAmount: 50000,
  monthlyDeposit: 2500,
  years: 20,
  annualReturn: 7,
  annualFee: 0.3,
  primaryColor: "#0C2A49",
  depositsColor: "#A18142",
  cardColor: "#FFFFFF",
  textColor: "#0F2034",
  mutedTextColor: "#545F6C",
  borderColor: "#DFDAD0",
};

addPropertyControls(RantaPaRanta, {
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
  startAmount: {
    type: ControlType.Number,
    title: "Startbelopp",
    defaultValue: defaultProps.startAmount,
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
  years: {
    type: ControlType.Number,
    title: "Sparhorisont",
    defaultValue: defaultProps.years,
    min: 1,
    max: 50,
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
  primaryColor: { type: ControlType.Color, title: "Primär", defaultValue: defaultProps.primaryColor },
  depositsColor: { type: ControlType.Color, title: "Insättningar", defaultValue: defaultProps.depositsColor },
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

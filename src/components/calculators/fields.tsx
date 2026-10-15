import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { groupDigits, num, parseAmount, stepValue } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Two choices side by side, as the age choice of the net salary calculator. */
export function Choice<T extends string>({
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

export function Stat({
  label,
  value,
  highlight,
  note,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  /** a line under the value */
  note?: ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border border-border p-5 ${highlight ? "bg-primary text-primary-foreground" : "bg-card"}`}
    >
      <p className={`text-xs tracking-wider uppercase ${highlight ? "opacity-75" : "text-muted-foreground"}`}>
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
      {note && <p className={`mt-1 text-xs ${highlight ? "opacity-75" : "text-muted-foreground"}`}>{note}</p>}
    </div>
  );
}

/**
 * The − and + of an amount field. A tap or a click is one step, made on the click itself, which every browser on a
 * phone sends. Holding the button repeats the step (after 400 ms, then about every 90 ms) until the pointer is
 * released, leaves the button or is cancelled; that is the only part that needs pointer events, so a phone that
 * does not send them still steps on a tap.
 */
function StepButton({
  direction,
  label,
  onStep,
  disabled,
  compact,
}: {
  direction: 1 | -1;
  label: string;
  onStep: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const latest = useRef(onStep);
  latest.current = onStep;
  const delay = useRef<number | undefined>(undefined);
  const repeat = useRef<number | undefined>(undefined);
  // Set when a hold has begun to repeat, so that the click that may follow the release does not step once more.
  const held = useRef(false);
  const stop = () => {
    window.clearTimeout(delay.current);
    window.clearInterval(repeat.current);
  };
  useEffect(() => stop, []);

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onPointerDown={(e) => {
        if (e.button !== 0 || disabled) return;
        stop();
        held.current = false;
        delay.current = window.setTimeout(() => {
          held.current = true;
          latest.current();
          repeat.current = window.setInterval(() => latest.current(), 90);
        }, 400);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onClick={() => {
        if (held.current) held.current = false;
        else latest.current();
      }}
      // Keeps the focus where it is, so that a number being typed is not left by a click on a button, and keeps a
      // long press on a phone from opening a menu.
      onMouseDown={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        "grid shrink-0 cursor-pointer touch-manipulation place-items-center rounded-md border border-input bg-card text-foreground select-none transition-colors [-webkit-touch-callout:none] hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-input disabled:hover:bg-card disabled:hover:text-foreground",
        compact ? "size-8" : "size-9",
      )}
    >
      {direction > 0 ? <Plus className="size-4" aria-hidden="true" /> : <Minus className="size-4" aria-hidden="true" />}
    </button>
  );
}

/** A whole amount of kronor; the text is written with thousands separators like every amount field. */
export function NumberField(props: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix: string;
  stepBy?: number;
}) {
  return <AmountField {...props} />;
}

export function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  display,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  display: string;
}) {
  const id = useId();
  const fill = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm">
          {label}
        </Label>
        <span className="text-sm font-medium">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        className="range mt-1"
        value={value}
        min={min}
        max={max}
        step={step}
        aria-valuetext={display}
        style={{ "--fill": `${fill}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

/** A number as it is written in a field: 1234567.5 -> "1 234 567,5" */
const toText = (v: number) => groupDigits(String(v).replace(".", ","));

/** Where the caret goes in the grouped text: after the same number of digits and commas as before. */
function caretAfter(text: string, count: number): number {
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (seen === count) return i;
    if (/[\d,]/.test(text[i]!)) seen++;
  }
  return text.length;
}

/**
 * A number field that can be empty while the user types and takes a decimal comma. The amount is written with
 * thousands separators ("100 000") as it is typed, with the caret kept where it was. Empty counts as 0 for the
 * calculation, and the text is written out again when the value is changed from outside (a list, a reset).
 */
export function AmountField({
  id,
  label,
  hint,
  value,
  onChange,
  suffix,
  action,
  compact,
  disabled,
  stepBy,
}: {
  id: string;
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  suffix: string;
  /** a link beside the label */
  action?: ReactNode;
  compact?: boolean;
  disabled?: boolean;
  /** the size of a step of the − and + buttons (and the arrow keys); without it the field has no buttons */
  stepBy?: number;
}) {
  const [text, setText] = useState(toText(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);
  useEffect(() => {
    // Only when the value is not what the text says, so that "32," stays as it is typed.
    if ((parseAmount(text) || 0) !== value) setText(toText(value));
  }, [value]);
  // Grouping changes the length of the text, so the caret is put back after the same digit.
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (caret.current !== null && input && document.activeElement === input) {
      input.setSelectionRange(caret.current, caret.current);
    }
    caret.current = null;
  }, [text]);

  const step = (direction: 1 | -1) => stepBy && onChange(stepValue(value, stepBy, direction));
  const stepButtons = stepBy
    ? ([-1, 1] as const).map((direction) => (
        <StepButton
          key={direction}
          direction={direction}
          label={`${direction > 0 ? "Öka" : "Minska"} ${label} med ${num.format(stepBy)} kr`}
          onStep={() => step(direction)}
          disabled={disabled || (direction < 0 && value <= 0)}
          compact={compact}
        />
      ))
    : null;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id} className={compact ? "text-xs" : "text-sm"}>
          {label}
        </Label>
        {action}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      <div className={cn("flex items-center gap-2", compact ? "mt-1" : "mt-2")}>
        {stepButtons?.[0]}
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          ref={inputRef}
          value={text}
          onChange={(e) => {
            const raw = e.target.value;
            const before = raw.slice(0, e.target.selectionStart ?? raw.length).replace(/[^\d,.]/g, "").length;
            const grouped = groupDigits(raw);
            caret.current = caretAfter(grouped, before);
            setText(grouped);
            const v = parseAmount(grouped);
            onChange(Number.isFinite(v) ? Math.max(0, v) : 0);
          }}
          onKeyDown={(e) => {
            if (!stepBy || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
            e.preventDefault();
            step(e.key === "ArrowUp" ? 1 : -1);
          }}
          onBlur={() => setText(toText(value))}
          disabled={disabled}
          className={cn("min-w-0 tabular-nums", compact && "h-8", stepBy && "text-center")}
        />
        {stepButtons?.[1]}
        <span className="w-14 shrink-0 text-sm text-muted-foreground">{suffix}</span>
      </div>
    </div>
  );
}

/** A native list, in the look of the other fields. */
export function SelectField({
  id,
  label,
  value,
  onChange,
  children,
  action,
  hideLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  action?: ReactNode;
  hideLabel?: boolean;
}) {
  return (
    <div>
      <div className={cn("flex items-baseline justify-between gap-2", hideLabel && "sr-only")}>
        <Label htmlFor={id} className="text-sm">
          {label}
        </Label>
        {action}
      </div>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "flex h-9 w-full cursor-pointer rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none md:text-sm",
          !hideLabel && "mt-2",
        )}
      >
        {children}
      </select>
    </div>
  );
}

/** An on-off switch with a label and a line of explanation. */
export function SwitchRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <Label htmlFor={id} className="text-sm">
          {label}
        </Label>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none",
          checked ? "bg-primary" : "bg-primary/20",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-5 rounded-full bg-background shadow transition-transform",
            checked && "translate-x-5",
          )}
        />
      </button>
    </div>
  );
}

const grouped = (v: number) => num.format(Math.round(v));

/**
 * An amount that is typed and dragged: a text field with a unit and a slider under it. What is typed counts when
 * the field is left or Enter is pressed (not at every key, so that "6" on the way to "60 000" is not acted on), and
 * is kept between 0 and typedMax. The slider only covers min to max; the parent decides what the value may be.
 */
export function AmountSliderField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step,
  typedMax,
  suffix,
  hint,
  stepBy,
  stepMax,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  typedMax: number;
  suffix: string;
  hint?: ReactNode;
  /** the size of a step of the − and + buttons (and the arrow keys) */
  stepBy?: number;
  /** the highest value the buttons go to (the field itself takes up to typedMax) */
  stepMax?: number;
}) {
  const [text, setText] = useState(grouped(value));
  // Counts the times the field was left, so that the text is written out again even if the value did not change.
  const [commits, setCommits] = useState(0);
  useEffect(() => setText(grouped(value)), [value, commits]);

  const commit = () => {
    const typed = parseFloat(text.replace(/\s/g, "").replace(",", "."));
    if (Number.isFinite(typed)) onChange(Math.min(typedMax, Math.max(0, typed)));
    setCommits((c) => c + 1);
  };

  // A step starts from what is typed in the field, if it has not been entered yet.
  const step1 = (direction: 1 | -1) => {
    if (!stepBy) return;
    const typed = parseAmount(text);
    const from = Number.isFinite(typed) ? Math.min(typedMax, Math.max(0, typed)) : value;
    onChange(stepValue(from, stepBy, direction, 0, stepMax ?? typedMax));
    setCommits((c) => c + 1);
  };
  const stepButtons = stepBy
    ? ([-1, 1] as const).map((direction) => (
        <StepButton
          key={direction}
          direction={direction}
          label={`${direction > 0 ? "Öka" : "Minska"} ${label} med ${num.format(stepBy)} kr`}
          onStep={() => step1(direction)}
          disabled={direction < 0 ? value <= 0 : value >= (stepMax ?? typedMax)}
        />
      ))
    : null;

  const shown = Math.min(max, Math.max(min, value));
  const fill = max > min ? ((shown - min) / (max - min)) * 100 : 0;
  return (
    <div>
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      <div className="mt-2 flex items-center gap-2">
        {stepButtons?.[0]}
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            else if (stepBy && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
              e.preventDefault();
              step1(e.key === "ArrowUp" ? 1 : -1);
            }
          }}
          className={cn("min-w-0 tabular-nums", stepBy && "text-center")}
        />
        {stepButtons?.[1]}
        <span className="w-14 shrink-0 text-sm text-muted-foreground">{suffix}</span>
      </div>
      <input
        type="range"
        className="range mt-1"
        value={shown}
        min={min}
        max={max}
        step={step}
        aria-label={label}
        aria-valuetext={`${grouped(shown)} ${suffix}`}
        style={{ "--fill": `${fill}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

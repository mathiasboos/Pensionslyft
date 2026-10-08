import { useEffect, useId, useState, type CSSProperties, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-border p-5 ${highlight ? "bg-primary text-primary-foreground" : "bg-card"}`}
    >
      <p className={`text-xs tracking-wider uppercase ${highlight ? "opacity-75" : "text-muted-foreground"}`}>
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  step,
  suffix,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  suffix: string;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      <div className="mt-2 flex items-center gap-2">
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          value={value}
          step={step}
          min={0}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        />
        <span className="text-sm text-muted-foreground">{suffix}</span>
      </div>
    </div>
  );
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

/** A number as it is written in a field: 32.4 -> "32,4" */
const toText = (v: number) => String(v).replace(".", ",");

/** A number typed by the user: spaces are ignored and a comma is a decimal point. NaN when it is not a number. */
const fromText = (t: string) => parseFloat(t.replace(/\s/g, "").replace(",", "."));

/**
 * A number field that can be empty while the user types and takes a decimal comma. Empty counts as 0 for the
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
}) {
  const [text, setText] = useState(toText(value));
  useEffect(() => {
    // Only when the value is not what the text says, so that "32," stays as it is typed.
    if ((fromText(text) || 0) !== value) setText(toText(value));
  }, [value]);

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
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const v = fromText(e.target.value);
            onChange(Number.isFinite(v) ? Math.max(0, v) : 0);
          }}
          onBlur={() => setText(toText(value))}
          className={cn("tabular-nums", compact && "h-8")}
        />
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

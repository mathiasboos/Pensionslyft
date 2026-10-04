// Form rows for the Typfallsmodellen calculator: a label with a hint on the left and a typed
// value on the right, as in the model's own web version.
import { type ReactNode, useEffect, useState } from "react";
import { ChevronRight, ExternalLink as ExternalLinkIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const parse = (text: string): number | null => {
  const t = text.replace(/\s/g, "").replace(",", ".").replace("−", "-");
  if (t === "" || t === "-") return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
};

/**
 * A number typed in a text field. The value is used as soon as it is within min-max; on blur a
 * value outside is moved to the nearest limit, and an empty or unreadable value is restored.
 */
export function NumberRow({
  id,
  label,
  hint,
  value,
  onChange,
  min,
  max,
  decimals = 0,
  disabled,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  decimals?: number;
  disabled?: boolean;
  /** Extra control after the field, e.g. a remove button. */
  children?: ReactNode;
}) {
  const format = (v: number) =>
    new Intl.NumberFormat("sv-SE", { maximumFractionDigits: decimals, useGrouping: false }).format(v);
  const round = (v: number) => Math.round(v * 10 ** decimals) / 10 ** decimals;
  const [text, setText] = useState(format(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(format(value));
  }, [value, focused]);

  const typed = parse(text);
  // Flag a value above max at once, and one below min only when it has as many digits as max.
  const digits = text.replace(/\D/g, "").length;
  const invalid =
    focused &&
    (typed === null
      ? text.trim() !== ""
      : typed > max || (typed < min && digits >= String(Math.trunc(Math.abs(max))).length));

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 pt-1">
        <label htmlFor={id} className={cn("text-sm", disabled && "text-muted-foreground")}>
          {label}
        </label>
        {hint && (
          <p id={`${id}-hint`} className="mt-0.5 text-xs text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Input
          id={id}
          type="text"
          inputMode={decimals > 0 || min < 0 ? "decimal" : "numeric"}
          autoComplete="off"
          value={text}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={cn(
            "w-24 bg-card text-right tabular-nums",
            invalid && "border-destructive focus-visible:ring-destructive",
          )}
          onFocus={(e) => {
            setFocused(true);
            e.target.select();
          }}
          onChange={(e) => {
            setText(e.target.value);
            const v = parse(e.target.value);
            if (v !== null && v >= min && v <= max) onChange(round(v));
          }}
          onBlur={() => {
            setFocused(false);
            const v = parse(text);
            if (v === null) setText(format(value));
            else {
              const clamped = round(Math.min(max, Math.max(min, v)));
              onChange(clamped);
              setText(format(clamped));
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
        {children}
      </div>
    </div>
  );
}

export function CheckRow({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary)]"
      />
      <span>
        {label}
        {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

export const selectClass =
  "mt-1.5 h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

export function SelectRow<T extends number | string>({
  id,
  label,
  hint,
  value,
  onChange,
  options,
  hideLabel,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  /** The label is read by screen readers only, when the choices explain themselves. */
  hideLabel?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "text-sm"}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(options.find((o) => String(o.value) === e.target.value)!.value)}
        className={cn(selectClass, hideLabel && "mt-0")}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** A link to another site, opened in a new tab. */
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary underline underline-offset-2 hover:no-underline"
    >
      {children}
      <ExternalLinkIcon className="size-3" aria-hidden="true" />
      <span className="sr-only">(öppnas i ny flik)</span>
    </a>
  );
}

/** A section that opens and closes, like the groups of settings in the model's web version. */
export function Section({ title, changed, children }: { title: string; changed?: boolean; children: ReactNode }) {
  return (
    <details className="group rounded-lg border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-3.5 py-3 text-sm font-semibold hover:bg-muted/60 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 shrink-0 text-primary transition-transform group-open:rotate-90" aria-hidden="true" />
        {title}
        {changed && (
          <span className="ml-auto flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
            <span className="size-2 rounded-full bg-[var(--color-chart-2)]" aria-hidden="true" />
            Ändrad
          </span>
        )}
      </summary>
      <div className="space-y-4 border-t border-border px-3.5 py-4">{children}</div>
    </details>
  );
}

/** A short text that opens and closes, for explanations under the form. */
export function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 font-medium text-primary [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 shrink-0 transition-transform group-open:rotate-90" aria-hidden="true" />
        {title}
      </summary>
      <div className="mt-2 space-y-2 pl-5.5 text-xs leading-5 text-muted-foreground">{children}</div>
    </details>
  );
}

/** A date, åååå-mm-dd. */
export function DateRow({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
      <Input
        id={id}
        type="date"
        value={value}
        min="1960-01-01"
        max="2100-12-31"
        className="w-40 shrink-0 bg-card"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/** Two buttons where one is chosen, as "Normalt / Avancerat". */
export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  size = "md",
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  size?: "sm" | "md";
}) {
  return (
    <div className="flex gap-2" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 cursor-pointer rounded-full border font-semibold transition-colors",
            size === "sm" ? "h-8 text-xs" : "h-9 text-sm",
            value === o.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-foreground/70 bg-card hover:bg-muted",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

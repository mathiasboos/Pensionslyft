import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A part of a page that folds out: a button with an arrow at the far left and then the name, and what is behind it
 * below. This is the one look of every fold-out in the calculators (the tables, the notes and the extra fields), so
 * they are all opened the same way. It is closed from the start. Pass open and onToggle to control it from outside.
 */
export function Collapsible({
  id,
  title,
  aside,
  actions,
  open,
  onToggle,
  defaultOpen = false,
  small,
  className,
  headerClassName,
  children,
}: {
  /** the id of the part that folds out, which the button points to (aria-controls) */
  id: string;
  title: string;
  /** a short text at the right of the name */
  aside?: string;
  /** buttons at the right of the name; they stay when the part is folded in */
  actions?: ReactNode;
  open?: boolean;
  onToggle?: () => void;
  defaultOpen?: boolean;
  /** the name of a part of a form, not of a card */
  small?: boolean;
  className?: string;
  headerClassName?: string;
  children: ReactNode;
}) {
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const isOpen = open ?? innerOpen;
  const toggle = onToggle ?? (() => setInnerOpen(!innerOpen));

  return (
    <div className={className}>
      <div className={cn("flex flex-wrap items-center justify-between gap-x-3 gap-y-2", headerClassName)}>
        <button
          type="button"
          className="-ml-1 flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md py-1 pr-2 pl-1 text-left focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
          aria-expanded={isOpen}
          aria-controls={id}
          onClick={toggle}
        >
          <ChevronRight
            className={cn("size-5 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-90")}
            aria-hidden="true"
          />
          <span className={small ? "text-sm font-medium" : "font-display text-lg font-semibold"}>{title}</span>
        </button>
        {(aside || actions) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {aside}
            {actions}
          </div>
        )}
      </div>
      {isOpen && <div id={id}>{children}</div>}
    </div>
  );
}

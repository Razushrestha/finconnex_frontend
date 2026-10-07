"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
} from "react";
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton as RdpDayButton,
} from "react-day-picker";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const BRAND = "var(--brand-primary)";

/* -------------------------------------------------------------------------- */
/* Slot limit values                                                           */
/* -------------------------------------------------------------------------- */
/*
 * The stored value stays a plain string so existing data keeps working:
 *   "No limit"                → no cap
 *   "5" (any positive number) → "Per day" with a cap of 5
 *   "Per day"                 → "Per day" chosen, number not typed yet
 *   "One active appointment"  → customer may hold one open booking at a time
 */

export const NO_LIMIT = "No limit";
export const ONE_ACTIVE = "One active appointment";
export const PER_DAY = "Per day";

export type SlotLimitKind = "event" | "customer";
type SlotMode = "none" | "perDay" | "oneActive";

const MODE_NONE = "none";
const MODE_PER_DAY = "perDay";
const MODE_ONE_ACTIVE = "oneActive";

/** The typed daily cap, or null when "Per day" has no valid number yet. */
export function slotLimitCount(value: string): number | null {
  const count = Number(value);
  return value && Number.isFinite(count) && count >= 1 ? Math.floor(count) : null;
}

export function slotLimitMode(value: string): SlotMode {
  if (value === ONE_ACTIVE) return MODE_ONE_ACTIVE;
  if (value === PER_DAY || slotLimitCount(value) !== null) return MODE_PER_DAY;
  return MODE_NONE;
}

/** True while "Per day" is picked but the number box is still empty. */
export function slotLimitNeedsNumber(value: string): boolean {
  return slotLimitMode(value) === MODE_PER_DAY && slotLimitCount(value) === null;
}

/** Short human label for a stored limit, e.g. "5 per day". */
export function describeSlotLimit(value: string): string {
  const mode = slotLimitMode(value);
  if (mode === MODE_ONE_ACTIVE) return ONE_ACTIVE;
  if (mode === MODE_PER_DAY) {
    const count = slotLimitCount(value);
    return count === null ? NO_LIMIT : `${count} per day`;
  }
  return NO_LIMIT;
}

/** What gets saved: a half-filled "Per day" counts as no limit. */
export function normalizeSlotLimit(value: string): string {
  return slotLimitNeedsNumber(value) ? NO_LIMIT : value;
}

const EVENT_OPTIONS: ListboxOption[] = [
  { value: MODE_NONE, label: "No limit" },
  { value: MODE_PER_DAY, label: "Per day" },
];

const CUSTOMER_OPTIONS: ListboxOption[] = [
  { value: MODE_NONE, label: "No limit" },
  { value: MODE_PER_DAY, label: "Per day" },
  { value: MODE_ONE_ACTIVE, label: "One active appointment" },
];

/* -------------------------------------------------------------------------- */
/* Dropdown                                                                    */
/* -------------------------------------------------------------------------- */

export type ListboxOption = {
  value: string;
  label: string;
  /** A "nothing selected" row, e.g. "Select Reply To". Shown muted, never as a chosen value. */
  placeholder?: boolean;
};

/** Tallest the open menu gets (about five and a half rows) before it scrolls. */
const MENU_MAX_HEIGHT = 240;

/**
 * Custom dropdown: thin purple outline while open, chevron flips up, a white
 * rounded menu with a soft shadow, and a lavender highlight on the selected row.
 */
export function ListboxSelect({
  label,
  value,
  options,
  onChange,
  className,
  variant = "field",
  autoFocus = false,
  compact = false,
}: {
  label: string;
  value: string;
  options: ListboxOption[];
  onChange: (value: string) => void;
  className?: string;
  /** 40px tall, to sit beside regular text inputs; the default is 44px. */
  compact?: boolean;
  /**
   * `field` is a standalone dropdown. `segment` is the right-hand half of a
   * combined control (number box + dropdown) and joins to the box on its left.
   */
  variant?: "field" | "segment";
  /** Focus the dropdown as soon as it appears (after the control swapped layouts). */
  autoFocus?: boolean;
}) {
  const segment = variant === "segment";
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Only keyboard moves (and opening) scroll the list; hovering must not make it jump.
  const scrollToActive = useRef(false);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const [active, setActive] = useState(selectedIndex);
  const selected = options[selectedIndex];

  useEffect(() => {
    if (autoFocus) triggerRef.current?.focus();
    // Only when the dropdown first appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // Keep the highlighted row inside the (scrollable) menu without moving the page.
  useEffect(() => {
    if (!open || !scrollToActive.current) return;
    scrollToActive.current = false;
    const list = listRef.current;
    const item = list?.children[active] as HTMLElement | undefined;
    if (!list || !item) return;
    const pad = 6;
    if (item.offsetTop - pad < list.scrollTop) {
      list.scrollTop = Math.max(0, item.offsetTop - pad);
    } else if (
      item.offsetTop + item.offsetHeight + pad >
      list.scrollTop + list.clientHeight
    ) {
      list.scrollTop = item.offsetTop + item.offsetHeight + pad - list.clientHeight;
    }
  }, [open, active]);

  function openMenu() {
    // Open upward when the menu would run off the bottom of the screen.
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const wanted = Math.min(options.length * 40 + 12, MENU_MAX_HEIGHT) + 12;
      const below = window.innerHeight - rect.bottom;
      setDropUp(below < wanted && rect.top > below);
    }
    scrollToActive.current = true;
    setActive(selectedIndex);
    setOpen(true);
  }

  function choose(index: number) {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openMenu();
      }
      return;
    }
    switch (event.key) {
      case "Escape":
        event.preventDefault();
        setOpen(false);
        break;
      case "ArrowDown":
        event.preventDefault();
        scrollToActive.current = true;
        setActive((index) => (index + 1) % options.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        scrollToActive.current = true;
        setActive((index) => (index - 1 + options.length) % options.length);
        break;
      case "Home":
        event.preventDefault();
        scrollToActive.current = true;
        setActive(0);
        break;
      case "End":
        event.preventDefault();
        scrollToActive.current = true;
        setActive(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(active);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
    }
  }

  return (
    <div
      ref={rootRef}
      className={cn("relative", segment ? "w-[150px] shrink-0" : "w-full", className)}
    >
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        className={cn(
          "flex w-full items-center justify-between gap-2 border bg-white px-3.5 text-left text-[13px] font-medium text-slate-800 outline-none transition-colors",
          compact ? "h-10" : "h-11",
          segment ? "rounded-r-lg" : "rounded-lg",
          open
            ? segment
              ? // Joined "Per day" half: purple outline on all four sides, a touch heavier.
                "relative z-10 border-[var(--brand-primary)] shadow-[0_0_0_1px_var(--brand-primary)]"
              : // Standalone: thin purple outline.
                "relative z-10 border-[var(--brand-primary)]"
            : segment
              ? "border-[#E5E7EB] hover:border-[var(--brand-primary-border)] focus:relative focus:z-10 focus:border-[var(--brand-primary)] focus:shadow-[0_0_0_1px_var(--brand-primary)]"
              : selectedIndex > 0 && !selected?.placeholder
                ? // A chosen option (e.g. "One active appointment"): dark slate outline.
                  "border-[#475569] hover:border-[#334155]"
                : // Default "No limit": light outline, darkens once picked/focused.
                  "border-[#E5E7EB] hover:border-[var(--brand-primary-border)] focus:border-[#475569]",
        )}
      >
        <span
          title={selected?.label}
          className={cn(
            "min-w-0 flex-1 truncate",
            selected?.placeholder && "font-normal text-slate-400",
          )}
        >
          {selected?.label}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-600 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          className={cn(
            // Long lists (hours, minutes) scroll inside the menu instead of running down the page.
            "absolute z-30 max-h-[240px] overflow-y-auto overscroll-contain rounded-xl border border-slate-100 bg-white p-1.5 shadow-[0_8px_28px_rgba(15,23,42,0.14)] [scrollbar-color:#94A3B8_transparent] [scrollbar-width:thin]",
            dropUp ? "bottom-full mb-1.5" : "top-full mt-1.5",
            segment
              ? "right-0 w-max min-w-full max-w-[260px]"
              : "left-0 right-0",
          )}
        >
          {options.map((option, index) => {
            const isSelected = index === selectedIndex;
            return (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
                className={cn(
                  "cursor-pointer rounded-lg px-3 py-2.5 text-[13px] font-medium text-slate-800",
                  option.placeholder && "font-normal text-slate-500",
                  isSelected
                    ? "bg-[var(--brand-primary-soft)]"
                    : index === active
                      ? "bg-slate-50"
                      : "",
                )}
              >
                {option.label}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Compact width for the slot-limit controls. Wide enough for the longest option
 * ("One active appointment") and for the joined number box + "Per day" half, and
 * the same in every layout so the field never jumps size when the mode changes.
 * It still shrinks on narrow screens (full width up to the cap).
 */
const SLOT_LIMIT_WIDTH = "w-full max-w-[280px]";

/**
 * "Slots per Event Type" / "Slots per Customer" control.
 *
 * Closed on "No limit" it is a single dropdown. Picking "Per day" turns it into
 * one joined control: a number box on the left, a divider, and the dropdown
 * (now reading "Per day") on the right.
 */
export function SlotLimitField({
  kind,
  label,
  value,
  onChange,
}: {
  kind: SlotLimitKind;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const mode = slotLimitMode(value);
  const options = kind === "event" ? EVENT_OPTIONS : CUSTOMER_OPTIONS;
  const [touched, setTouched] = useState(false);
  // Set once the user has switched layouts, so the swapped-in dropdown keeps focus.
  const [refocus, setRefocus] = useState(false);
  const [text, setText] = useState(() => {
    const count = slotLimitCount(value);
    return count === null ? "" : String(count);
  });

  // Keep the box in step when the value changes from outside (load, reset).
  useEffect(() => {
    const count = slotLimitCount(value);
    if (count !== null) {
      setText((prev) => (Number(prev) === count ? prev : String(count)));
    } else if (mode !== MODE_PER_DAY) {
      setText("");
    }
  }, [mode, value]);

  function onModeChange(next: string) {
    setRefocus(true);
    if (next === MODE_PER_DAY) {
      setTouched(false);
      setText("");
      onChange(PER_DAY);
    } else if (next === MODE_ONE_ACTIVE) {
      onChange(ONE_ACTIVE);
    } else {
      onChange(NO_LIMIT);
    }
  }

  function onCountChange(raw: string) {
    const digits = raw.replace(/[^\d]/g, "").slice(0, 4);
    setText(digits);
    const count = Number(digits);
    onChange(digits && count >= 1 ? String(count) : PER_DAY);
  }

  if (mode !== MODE_PER_DAY) {
    // "No limit" and "One active appointment": just the single dropdown.
    return (
      <ListboxSelect
        label={label}
        value={mode}
        options={options}
        onChange={onModeChange}
        autoFocus={refocus}
        className={SLOT_LIMIT_WIDTH}
      />
    );
  }

  const missing = touched && slotLimitNeedsNumber(value);

  return (
    <div className={SLOT_LIMIT_WIDTH}>
      <div className="flex items-stretch">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label={`${label}: number of bookings per day`}
          aria-invalid={missing || undefined}
          placeholder="Enter number"
          value={text}
          onChange={(event) => onCountChange(event.target.value)}
          onBlur={() => setTouched(true)}
          className={cn(
            "h-11 min-w-0 flex-1 rounded-l-lg border border-r-0 bg-white px-3.5 text-[13px] font-medium text-slate-800 outline-none transition-colors placeholder:font-normal placeholder:text-slate-400",
            "focus:relative focus:z-10 focus:border-[var(--brand-primary)] focus:shadow-[1px_0_0_0_var(--brand-primary)]",
            missing
              ? "border-rose-300"
              : "border-[#E5E7EB] hover:border-[var(--brand-primary-border)]",
          )}
        />
        <ListboxSelect
          variant="segment"
          label={label}
          value={mode}
          options={options}
          onChange={onModeChange}
          autoFocus={refocus}
        />
      </div>
      {missing ? (
        <p className="mt-1.5 text-[12px] font-medium text-rose-600">
          Enter how many bookings are allowed per day.
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Date range picker                                                           */
/* -------------------------------------------------------------------------- */

const MAX_RANGE_DAYS = 62;

export function isoToDate(iso: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return undefined;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function dateToIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatLimitDate(iso: string): string {
  const date = isoToDate(iso);
  return date
    ? date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : iso;
}

export function formatLimitRange(start: string, end: string): string {
  if (!start) return "";
  if (!end || end === start) return formatLimitDate(start);
  return `${formatLimitDate(start)} – ${formatLimitDate(end)}`;
}

export function rangeDayCount(start: string, end: string): number {
  const from = isoToDate(start);
  const to = isoToDate(end);
  if (!from || !to || to < from) return 0;
  return Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
}

export { MAX_RANGE_DAYS };

type DayButtonProps = ComponentProps<typeof RdpDayButton>;

/** A day cell. Today gets the purple outline with a small triangle marker. */
function LimitDayButton({
  day,
  modifiers,
  className,
  ...props
}: DayButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  const endpoint = modifiers.range_start || modifiers.range_end;
  const inRange = modifiers.range_middle && !endpoint;
  const showToday = modifiers.today;

  return (
    <button
      ref={ref}
      type="button"
      {...props}
      className={cn(
        "relative mx-auto flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-[13px] font-medium text-slate-700 transition-colors",
        "hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/40",
        inRange && "text-[#3F2480] hover:bg-[#E7DAF7]",
        showToday && !endpoint && "border-[var(--brand-primary)] font-semibold text-[var(--brand-primary)]",
        endpoint &&
          "border-[var(--brand-primary)] bg-[var(--brand-primary)] font-semibold text-white hover:bg-[#4a2788]",
        className,
      )}
    >
      {day.date.getDate()}
      {showToday ? (
        <span
          aria-hidden
          className="absolute bottom-[3px] left-1/2 -translate-x-1/2"
          style={{
            width: 0,
            height: 0,
            borderLeft: "3px solid transparent",
            borderRight: "3px solid transparent",
            borderBottom: `4px solid ${endpoint ? "#FFFFFF" : BRAND}`,
          }}
        />
      ) : null}
    </button>
  );
}

const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

function RangeCalendar({
  start,
  end,
  anchor,
  onPick,
}: {
  start: string;
  end: string;
  /** The first date of a range still waiting for its end date. */
  anchor: string | null;
  onPick: (iso: string) => void;
}) {
  const defaults = getDefaultClassNames();
  const [hover, setHover] = useState<string | null>(null);
  const from = isoToDate(start);
  const to = isoToDate(end);

  // While the second date is still being chosen, preview the span under the cursor.
  const previewFrom = anchor && hover ? (hover < anchor ? hover : anchor) : null;
  const previewTo = anchor && hover ? (hover < anchor ? anchor : hover) : null;
  const selected =
    previewFrom && previewTo
      ? { from: isoToDate(previewFrom), to: isoToDate(previewTo) }
      : from
        ? { from, to: to ?? from }
        : undefined;

  return (
    <DayPicker
      mode="range"
      numberOfMonths={2}
      weekStartsOn={1}
      showOutsideDays={false}
      navLayout="around"
      defaultMonth={from ?? new Date()}
      selected={selected}
      onDayClick={(date) => {
        setHover(null);
        onPick(dateToIso(date));
      }}
      onDayMouseEnter={(date) => setHover(dateToIso(date))}
      onDayMouseLeave={() => setHover(null)}
      formatters={{
        formatWeekdayName: (date) => WEEKDAY_LETTERS[date.getDay()],
        formatCaption: (date) =>
          date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      }}
      components={{
        DayButton: LimitDayButton,
        Chevron: ({ orientation, className }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("h-4 w-4", className)} />
          ) : (
            <ChevronRight className={cn("h-4 w-4", className)} />
          ),
      }}
      classNames={{
        root: cn("w-fit", defaults.root),
        months: cn("relative flex flex-col gap-6 sm:flex-row sm:gap-8", defaults.months),
        month: cn("relative w-[252px]", defaults.month),
        month_caption: cn("flex h-8 items-center justify-center", defaults.month_caption),
        caption_label: cn(
          "text-[13px] font-semibold text-slate-900 select-none",
          defaults.caption_label,
        ),
        button_previous: cn(
          "absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-slate-400 transition-colors hover:border-[var(--brand-primary-border)] hover:text-[var(--brand-primary)] aria-disabled:opacity-40",
          defaults.button_previous,
        ),
        button_next: cn(
          "absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-slate-400 transition-colors hover:border-[var(--brand-primary-border)] hover:text-[var(--brand-primary)] aria-disabled:opacity-40",
          defaults.button_next,
        ),
        month_grid: cn("mt-2 w-full border-collapse", defaults.month_grid),
        weekdays: cn("mb-1 grid grid-cols-7", defaults.weekdays),
        weekday: cn(
          "flex h-8 items-center justify-center text-[12px] font-medium text-slate-500 select-none",
          defaults.weekday,
        ),
        week: cn("mb-1 grid w-full grid-cols-7", defaults.week),
        day: cn("flex h-9 items-center justify-center p-0 text-center", defaults.day),
        range_start: cn("rounded-l-lg bg-[var(--brand-primary-soft)]", defaults.range_start),
        range_middle: cn("bg-[var(--brand-primary-soft)]", defaults.range_middle),
        range_end: cn("rounded-r-lg bg-[var(--brand-primary-soft)]", defaults.range_end),
        hidden: cn("invisible", defaults.hidden),
        disabled: cn("opacity-40", defaults.disabled),
      }}
    />
  );
}

/**
 * "Select Date Range" field. Opens a two-month popover; the first click sets the
 * start, the second click sets the end and closes it.
 */
export function DateRangeField({
  start,
  end,
  open,
  onOpenChange,
  onChange,
}: {
  start: string;
  end: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (start: string, end: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [dropUp, setDropUp] = useState(false);
  const [anchor, setAnchor] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setAnchor(null);
      return;
    }
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) {
      const below = window.innerHeight - rect.bottom;
      setDropUp(below < 380 && rect.top > below);
    }
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) onOpenChange(false);
    }
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  function pick(iso: string) {
    if (!anchor) {
      setAnchor(iso);
      onChange(iso, iso);
      return;
    }
    const [from, to] = iso < anchor ? [iso, anchor] : [anchor, iso];
    setAnchor(null);
    onChange(from, to);
    onOpenChange(false);
  }

  const text = formatLimitRange(start, end);

  return (
    <div ref={rootRef} className="relative w-full max-w-md">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Select date range"
        onClick={() => onOpenChange(!open)}
        className={cn(
          "flex h-11 w-full items-center gap-2 rounded-lg border bg-white px-3.5 text-left outline-none transition-colors",
          open
            ? "border-[var(--brand-primary)]"
            : "border-[#E5E7EB] hover:border-[var(--brand-primary-border)] focus-visible:border-[var(--brand-primary)]",
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[13px]",
            text ? "font-medium text-slate-800" : "text-slate-400",
          )}
        >
          {text || "Select Date Range"}
        </span>
        <Calendar className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Choose a date range"
          className={cn(
            "absolute left-0 z-40 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_12px_40px_rgba(15,23,42,0.16)]",
            dropUp ? "bottom-full mb-2" : "top-full mt-2",
          )}
        >
          <RangeCalendar
            start={start}
            end={end}
            anchor={anchor}
            onPick={pick}
          />
        </div>
      ) : null}
    </div>
  );
}

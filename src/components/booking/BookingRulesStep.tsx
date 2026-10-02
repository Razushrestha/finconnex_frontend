"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import {
  ListboxSelect,
  type ListboxOption,
} from "@/components/booking/LimitsControls";
import type { BookingPage } from "@/lib/booking/types";
import { cn } from "@/lib/utils";

const BRAND = "#5A32A3";

/* -------------------------------------------------------------------------- */
/* Values                                                                      */
/* -------------------------------------------------------------------------- */

/** A length of time as the Days / Hours / Minutes controls show it. */
export type RuleTime = { days: number; hours: number; minutes: number };
export type SlotType = "adjusted" | "fixed";

export type BookingRulesValues = {
  /** Extra time held before an appointment (hours and minutes only). */
  preBuffer: RuleTime;
  /** Extra time held after an appointment (hours and minutes only). */
  postBuffer: RuleTime;
  /** Shortest notice a guest must give. */
  minNotice: RuleTime;
  /** How far ahead a guest can book; zero keeps the default horizon. */
  maxNotice: RuleTime;
  slotType: SlotType;
  /** Gap between appointment start times (hours and minutes only). */
  interval: RuleTime;
  /** Whether guests are limited to cancelling/rescheduling inside a window. */
  cancelEnabled: boolean;
  cancelWindow: RuleTime;
  /** Group consultations only: guests that can share one slot. */
  maxAttendees: number;
};

const NO_TIME: RuleTime = { days: 0, hours: 0, minutes: 0 };

export const DEFAULT_RULES: BookingRulesValues = {
  preBuffer: NO_TIME,
  postBuffer: NO_TIME,
  minNotice: NO_TIME,
  maxNotice: NO_TIME,
  slotType: "adjusted",
  interval: { days: 0, hours: 0, minutes: 15 },
  cancelEnabled: true,
  cancelWindow: NO_TIME,
  maxAttendees: 10,
};

/** What the booking API accepts. */
const MAX_BUFFER_MINUTES = 480;
const MAX_MIN_NOTICE_DAYS = 14;
const MAX_ADVANCE_DAYS = 365;
const MAX_CANCEL_DAYS = 365;
const DEFAULT_ADVANCE_DAYS = 60;
const MIN_INTERVAL_MINUTES = 5;
const MAX_GROUP_SIZE = 500;

export function ruleMinutes(time: RuleTime): number {
  return time.days * 1440 + time.hours * 60 + time.minutes;
}

export function timeFromMinutes(total: number, withDays = true): RuleTime {
  const safe = Math.max(0, Math.round(Number.isFinite(total) ? total : 0));
  if (!withDays) {
    return { days: 0, hours: Math.floor(safe / 60), minutes: safe % 60 };
  }
  return {
    days: Math.floor(safe / 1440),
    hours: Math.floor((safe % 1440) / 60),
    minutes: safe % 60,
  };
}

/** Pull a time back to `maxMinutes` when the controls add up to more. */
function capTime(time: RuleTime, maxMinutes: number): RuleTime {
  return ruleMinutes(time) > maxMinutes ? timeFromMinutes(maxMinutes) : time;
}

/**
 * The booking page fields these rules fill in. Pre-buffer, minimum notice and
 * the booking horizon go on the page's own fields (which the booking API also
 * takes); the rest rides along in `schedulingRules`.
 */
export function rulesToPageFields(
  rules: BookingRulesValues,
  opts: { durationMinutes: number; group?: boolean },
) {
  const maxNotice = ruleMinutes(rules.maxNotice);
  return {
    durationMinutes: Math.max(5, Math.round(opts.durationMinutes) || 30),
    bufferMinutes: Math.min(MAX_BUFFER_MINUTES, ruleMinutes(rules.preBuffer)),
    minNoticeHours:
      Math.min(MAX_MIN_NOTICE_DAYS * 1440, ruleMinutes(rules.minNotice)) / 60,
    // The API stores whole days: round a partial day up, never down to nothing.
    maxAdvanceDays:
      maxNotice > 0
        ? Math.min(MAX_ADVANCE_DAYS, Math.max(1, Math.ceil(maxNotice / 1440)))
        : DEFAULT_ADVANCE_DAYS,
    maxAttendees: opts.group
      ? Math.max(2, Math.round(rules.maxAttendees) || 2)
      : 1,
    schedulingRules: {
      postBufferMinutes: Math.min(
        MAX_BUFFER_MINUTES,
        ruleMinutes(rules.postBuffer),
      ),
      slotType: rules.slotType,
      intervalMinutes: Math.max(
        MIN_INTERVAL_MINUTES,
        ruleMinutes(rules.interval),
      ),
      cancelWindowEnabled: rules.cancelEnabled,
      cancelWindowMinutes: ruleMinutes(rules.cancelWindow),
    } satisfies NonNullable<BookingPage["schedulingRules"]>,
  };
}

/** The reverse of `rulesToPageFields`, for editing a saved consultation. */
export function rulesFromPage(page: BookingPage): BookingRulesValues {
  const extra = page.schedulingRules;
  return {
    preBuffer: timeFromMinutes(page.bufferMinutes ?? 0, false),
    postBuffer: timeFromMinutes(extra?.postBufferMinutes ?? 0, false),
    minNotice: timeFromMinutes(Math.round((page.minNoticeHours ?? 2) * 60)),
    maxNotice: {
      days: page.maxAdvanceDays ?? DEFAULT_ADVANCE_DAYS,
      hours: 0,
      minutes: 0,
    },
    slotType: extra?.slotType ?? "adjusted",
    interval: timeFromMinutes(extra?.intervalMinutes ?? 15, false),
    cancelEnabled: extra?.cancelWindowEnabled ?? true,
    cancelWindow: timeFromMinutes(extra?.cancelWindowMinutes ?? 0),
    maxAttendees:
      page.maxAttendees && page.maxAttendees >= 2
        ? page.maxAttendees
        : DEFAULT_RULES.maxAttendees,
  };
}

export type RulesErrors = {
  notice?: string;
  interval?: string;
  attendees?: string;
};

export function rulesErrors(
  rules: BookingRulesValues,
  group = false,
): RulesErrors {
  const errors: RulesErrors = {};
  const min = ruleMinutes(rules.minNotice);
  const max = ruleMinutes(rules.maxNotice);
  if (max > 0 && max <= min) {
    errors.notice =
      "Maximum booking notice must be longer than the minimum booking notice.";
  }
  if (ruleMinutes(rules.interval) < MIN_INTERVAL_MINUTES) {
    errors.interval = `The interval must be at least ${MIN_INTERVAL_MINUTES} minutes.`;
  }
  if (group && rules.maxAttendees < 2) {
    errors.attendees = "A group consultation needs at least 2 attendees.";
  }
  return errors;
}

/* -------------------------------------------------------------------------- */
/* Option lists                                                                */
/* -------------------------------------------------------------------------- */

function range(from: number, to: number, step = 1): number[] {
  return Array.from(
    { length: Math.floor((to - from) / step) + 1 },
    (_, index) => from + index * step,
  );
}

const HOURS_OF_DAY = range(0, 23);
const HOURS_BUFFER = range(0, 3);
const HOURS_INTERVAL = range(0, 8);
const MINUTES_ALL = range(0, 55, 5);
const MINUTES_FROM_FIVE = range(5, 55, 5);

const SLOT_TYPE_OPTIONS: ListboxOption[] = [
  { value: "adjusted", label: "Adjusted Slots" },
  { value: "fixed", label: "Fixed Slots" },
];

/** "0 Hours", "1 Hour", "2 Hours": the unit agrees with the number. */
function unitLabel(count: number, word: "Hour" | "Minute"): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** Keep an older saved value (say 7 minutes) selectable even if it isn't in the list. */
function withCurrent(values: number[], current: number): number[] {
  return values.includes(current)
    ? values
    : [...values, current].sort((a, b) => a - b);
}

/* -------------------------------------------------------------------------- */
/* Small pieces                                                                */
/* -------------------------------------------------------------------------- */

function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <span className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-slate-400">
        <Info className="h-2.5 w-2.5" />
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-64 -translate-x-1/2 group-hover:block">
        <span className="block rounded-md bg-slate-900 px-3 py-2 text-[11px] leading-relaxed text-white shadow-lg">
          {text}
        </span>
      </span>
    </span>
  );
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[22px] w-10 shrink-0 rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#5A32A3]/40 focus-visible:ring-offset-2",
        checked ? "bg-[#5A32A3]" : "bg-slate-300",
      )}
    >
      <span
        className={cn(
          "absolute top-[3px] left-[3px] h-4 w-4 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-[18px]",
        )}
      />
    </button>
  );
}

/** A small whole-number box with its unit written next to it, e.g. "[ 0 ] Days". */
function NumberField({
  label,
  unit,
  value,
  onChange,
  min = 0,
  max,
  invalid = false,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max: number;
  invalid?: boolean;
}) {
  const [text, setText] = useState(String(value));

  // Follow the value when it changes from outside (reset, loading a saved page).
  useEffect(() => {
    setText((prev) => (Number(prev || 0) === value ? prev : String(value)));
  }, [value]);

  function onType(raw: string) {
    const digits = raw.replace(/[^\d]/g, "").slice(0, String(max).length);
    if (digits === "") {
      setText("");
      onChange(min);
      return;
    }
    const next = Math.min(max, Number(digits));
    setText(String(next));
    onChange(next);
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={label}
        aria-invalid={invalid || undefined}
        value={text}
        onChange={(event) => onType(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={() => setText(String(value))}
        className={cn(
          // Small and nearly square: room for up to three digits.
          "h-11 w-14 rounded-lg border bg-white px-3.5 text-[13px] font-medium text-slate-800 outline-none transition-colors",
          invalid
            ? "border-rose-300 focus:border-rose-400"
            : "border-[#E5E7EB] hover:border-[#CBB8EA] focus:border-[#5A32A3]",
        )}
      />
      <span className="text-[13px] text-slate-600">{unit}</span>
    </div>
  );
}

/**
 * One row of time controls: an optional Days box, then Hours and Minutes
 * dropdowns. `lead` puts something in front (the slot-type dropdown).
 */
function TimeRow({
  name,
  value,
  onChange,
  hours,
  minutes,
  days,
  lead,
  invalid = false,
}: {
  name: string;
  value: RuleTime;
  onChange: (next: RuleTime) => void;
  hours: number[];
  minutes: number[];
  days?: { max: number };
  lead?: ReactNode;
  invalid?: boolean;
}) {
  const hourOptions: ListboxOption[] = withCurrent(hours, value.hours).map(
    (n) => ({ value: String(n), label: unitLabel(n, "Hour") }),
  );
  const minuteOptions: ListboxOption[] = withCurrent(
    minutes,
    value.minutes,
  ).map((n) => ({ value: String(n), label: unitLabel(n, "Minute") }));

  return (
    // Days box + two dropdowns stay on one line. They only wrap on a phone-sized
    // card, and the cards below only sit side by side when each is wide enough.
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-3">
      {lead}
      {days ? (
        <NumberField
          label={`${name} days`}
          unit="Days"
          value={value.days}
          max={days.max}
          invalid={invalid}
          onChange={(next) => onChange({ ...value, days: next })}
        />
      ) : null}
      <ListboxSelect
        label={`${name} hours`}
        value={String(value.hours)}
        options={hourOptions}
        onChange={(next) => onChange({ ...value, hours: Number(next) })}
        className="w-auto min-w-[108px] max-w-[116px] flex-1 basis-0"
      />
      <ListboxSelect
        label={`${name} minutes`}
        value={String(value.minutes)}
        options={minuteOptions}
        onChange={(next) => onChange({ ...value, minutes: Number(next) })}
        className="w-auto min-w-[124px] max-w-[132px] flex-1 basis-0"
      />
    </div>
  );
}

function RuleCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
      <p className="text-[13px] font-semibold text-slate-900">{title}</p>
      <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">
        {hint}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-[14px] font-bold text-slate-900">{children}</h2>;
}

const FIELD_ERROR = "mt-2.5 text-[12px] font-medium text-rose-600";

/**
 * Two cards side by side only when each is wide enough (about 380px) to hold
 * "[0] Days  [0 Hours]  [0 Minutes]" on one line; otherwise they stack.
 */
const CARD_GRID = "mt-3 grid grid-cols-1 gap-4 @[820px]:grid-cols-2";

/* -------------------------------------------------------------------------- */
/* Step                                                                        */
/* -------------------------------------------------------------------------- */

const ADJUSTED_NOTE =
  "Time slots adjust to accommodate other appointments and external events (e.g., for 30 minute intervals, if there's an event scheduled from 10:00 to 10:15, the slots will be 9:00, 9:30, 10:15, 10:45,...).";
const FIXED_NOTE =
  "Time slots always start on the interval you set, whatever else is booked (e.g., for 30 minute intervals, the slots will be 9:00, 9:30, 10:00, 10:30,...).";

export function BookingRulesStep({
  initial,
  group = false,
  embedded = false,
  onBack,
  onSave,
  onChange,
}: {
  initial?: BookingRulesValues | null;
  /** Group consultations also set how many guests share a slot. */
  group?: boolean;
  /** Inside a consultation's overview: no Back/Next, every valid change is saved. */
  embedded?: boolean;
  onBack?: () => void;
  onSave?: (rules: BookingRulesValues) => void;
  onChange?: (rules: BookingRulesValues) => void;
}) {
  const [rules, setRules] = useState<BookingRulesValues>(
    initial ?? DEFAULT_RULES,
  );
  const [tried, setTried] = useState(false);
  const errors = rulesErrors(rules, group);
  const hasErrors = Object.keys(errors).length > 0;

  function patch(partial: Partial<BookingRulesValues>) {
    const next = { ...rules, ...partial };
    setRules(next);
    // Never save a half-valid combination from the overview.
    if (embedded && Object.keys(rulesErrors(next, group)).length === 0) {
      onChange?.(next);
    }
  }

  function changeInterval(next: RuleTime) {
    // "0 Hours 0 Minutes" is not an interval: fall back to the shortest one.
    patch({
      interval:
        ruleMinutes(next) < MIN_INTERVAL_MINUTES
          ? { ...next, minutes: MIN_INTERVAL_MINUTES }
          : next,
    });
  }

  function submit() {
    if (hasErrors) {
      setTried(true);
      return;
    }
    onSave?.(rules);
  }

  return (
    <div
      className={cn(
        // `@container`: the card columns below follow this panel's width, not the
        // screen's, because the wizard sidebar takes a big slice of the screen.
        "@container flex w-full flex-col",
        embedded ? "pb-2" : "mx-auto max-w-[920px] pb-8",
      )}
    >
      <div
        className={cn(
          !embedded &&
            "rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]",
        )}
      >
        <div className="px-5 py-5 sm:px-6">
          {/* The event type Overview already titles this section above the form. */}
          {embedded ? null : (
            <div className="-mx-5 mb-6 flex items-center gap-2.5 border-b border-[#E5E7EB] px-5 pb-4 sm:-mx-6 sm:px-6">
              <span
                className="h-5 w-[3px] rounded-full"
                style={{ backgroundColor: BRAND }}
              />
              <h1 className="text-[16px] font-bold text-slate-900">
                Scheduling Rules
              </h1>
            </div>
          )}

          <div className="space-y-7">
            <section aria-label="Buffer Time">
              <SectionTitle>Buffer Time</SectionTitle>
              <div className={CARD_GRID}>
                <RuleCard
                  title="Pre-buffer"
                  hint="Extra time added before an appointment"
                >
                  <TimeRow
                    name="Pre-buffer"
                    value={rules.preBuffer}
                    onChange={(preBuffer) => patch({ preBuffer })}
                    hours={HOURS_BUFFER}
                    minutes={MINUTES_ALL}
                  />
                </RuleCard>
                <RuleCard
                  title="Post-buffer"
                  hint="Extra time added after an appointment"
                >
                  <TimeRow
                    name="Post-buffer"
                    value={rules.postBuffer}
                    onChange={(postBuffer) => patch({ postBuffer })}
                    hours={HOURS_BUFFER}
                    minutes={MINUTES_ALL}
                  />
                </RuleCard>
              </div>
            </section>

            <section aria-label="Booking Notice">
              <SectionTitle>Booking Notice</SectionTitle>
              <div className={CARD_GRID}>
                <RuleCard
                  title="Minimum Booking Notice"
                  hint="Shortest notice required to avoid last-minute bookings"
                >
                  <TimeRow
                    name="Minimum booking notice"
                    value={rules.minNotice}
                    onChange={(minNotice) =>
                      patch({
                        minNotice: capTime(minNotice, MAX_MIN_NOTICE_DAYS * 1440),
                      })
                    }
                    days={{ max: MAX_MIN_NOTICE_DAYS }}
                    hours={HOURS_OF_DAY}
                    minutes={MINUTES_ALL}
                    invalid={Boolean(errors.notice)}
                  />
                </RuleCard>
                <RuleCard
                  title="Maximum Booking Notice"
                  hint="How far in advance an appointment can be booked"
                >
                  <TimeRow
                    name="Maximum booking notice"
                    value={rules.maxNotice}
                    onChange={(maxNotice) =>
                      patch({
                        maxNotice: capTime(maxNotice, MAX_ADVANCE_DAYS * 1440),
                      })
                    }
                    days={{ max: MAX_ADVANCE_DAYS }}
                    hours={HOURS_OF_DAY}
                    minutes={MINUTES_ALL}
                    invalid={Boolean(errors.notice)}
                  />
                </RuleCard>
              </div>
              {errors.notice ? (
                <p className={FIELD_ERROR} role="alert">
                  {errors.notice}
                </p>
              ) : null}
            </section>

            <section aria-label="Scheduling Interval">
              <SectionTitle>Scheduling Interval</SectionTitle>
              <p className="mt-1 flex items-center gap-1.5 text-[12px] leading-relaxed text-slate-500">
                The interval between each appointment&apos;s start time
                <InfoTip text="How far apart guests' start times are, for example every 15 or 30 minutes." />
              </p>
              <div className="mt-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <TimeRow
                  name="Scheduling interval"
                  value={rules.interval}
                  onChange={changeInterval}
                  hours={HOURS_INTERVAL}
                  minutes={rules.interval.hours === 0 ? MINUTES_FROM_FIVE : MINUTES_ALL}
                  lead={
                    <ListboxSelect
                      label="Slot type"
                      value={rules.slotType}
                      options={SLOT_TYPE_OPTIONS}
                      onChange={(next) => patch({ slotType: next as SlotType })}
                      className="w-[150px] shrink-0"
                    />
                  }
                />
                <p className="mt-3 max-w-[560px] text-[12px] leading-relaxed text-slate-500">
                  {rules.slotType === "adjusted" ? ADJUSTED_NOTE : FIXED_NOTE}
                </p>
              </div>
            </section>

            <section aria-label="Cancellation and Rescheduling Window">
              <div className="flex items-center gap-3">
                <SectionTitle>Cancellation and Rescheduling Window</SectionTitle>
                <Switch
                  checked={rules.cancelEnabled}
                  onChange={(cancelEnabled) => patch({ cancelEnabled })}
                  label="Limit when guests can cancel or reschedule"
                />
              </div>
              <div className="mt-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                <p className="text-[12px] leading-relaxed text-slate-500">
                  How much time before an appointment it can be rescheduled or
                  canceled
                </p>
                <div
                  inert={!rules.cancelEnabled}
                  className={cn(
                    "mt-3 transition-opacity",
                    !rules.cancelEnabled && "opacity-50",
                  )}
                >
                  <TimeRow
                    name="Cancellation window"
                    value={rules.cancelWindow}
                    onChange={(cancelWindow) =>
                      patch({
                        cancelWindow: capTime(
                          cancelWindow,
                          MAX_CANCEL_DAYS * 1440,
                        ),
                      })
                    }
                    days={{ max: MAX_CANCEL_DAYS }}
                    hours={HOURS_OF_DAY}
                    minutes={MINUTES_ALL}
                  />
                </div>
              </div>
            </section>

            {group ? (
              <section aria-label="Group Capacity">
                <SectionTitle>Group Capacity</SectionTitle>
                <div className="mt-3 max-w-[428px]">
                  <RuleCard
                    title="Maximum Attendees"
                    hint="How many guests can book the same time slot"
                  >
                    <NumberField
                      label="Maximum attendees per slot"
                      unit="Guests"
                      value={rules.maxAttendees}
                      min={0}
                      max={MAX_GROUP_SIZE}
                      invalid={Boolean(errors.attendees)}
                      onChange={(maxAttendees) => patch({ maxAttendees })}
                    />
                    {errors.attendees ? (
                      <p className={FIELD_ERROR} role="alert">
                        {errors.attendees}
                      </p>
                    ) : null}
                  </RuleCard>
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>

      {embedded ? null : (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="h-10 min-w-[96px] rounded-lg border border-[#E5E7EB] bg-white px-6 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={submit}
              className="h-10 min-w-[96px] rounded-lg px-6 text-[13px] font-semibold text-white hover:brightness-110"
              style={{ backgroundColor: BRAND }}
            >
              Next
            </button>
          </div>
          {tried && hasErrors ? (
            <p className="mt-3 text-center text-[12px] font-medium text-rose-600">
              Fix the highlighted settings to continue.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

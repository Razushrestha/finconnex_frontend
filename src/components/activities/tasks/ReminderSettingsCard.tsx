"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { RepeatReminderFields } from "@/components/activities/tasks/RepeatReminderFields";
import { ReminderCustomFrequencyFields } from "@/components/activities/tasks/ReminderCustomFrequencyFields";
import {
  ReminderWhenPicker,
  parseDatetimeLocal,
  relativeFromDue,
  toDatePart,
  toDatetimeLocal,
  toTimePart,
} from "@/components/activities/tasks/ReminderWhenPicker";
import {
  reminderFrequencyLabel,
  type ReminderRelativeWhen,
  type ReminderRepeatType,
  type ReminderScheduleMode,
} from "@/lib/tasks/types";
import {
  availableReminderFrequencies,
  calendarDaysBetween,
  defaultReminderRepeatRule,
  formatReminderOccurrence,
  formatTaskRepeatSummary,
  listReminderOccurrences,
  reminderUntilChoice,
  ruleFromLegacyRepeatType,
  toLegacyRepeatType,
  type ReminderRepeatRule,
} from "@/lib/tasks/repeat-reminder";
import type { NotificationMethod } from "@/lib/reminders/types";
import { cn } from "@/lib/utils";

const NOTIFY_BY_OPTIONS: {
  id: NotificationMethod;
  label: string;
}[] = [
  { id: "Email", label: "Email" },
  { id: "SMS", label: "SMS" },
  { id: "In-app", label: "In App" },
  { id: "Web Push", label: "Web push" },
];

function BrandSwitch({
  checked,
  onChange,
  label,
  size = "md",
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  label: string;
  size?: "sm" | "md";
}) {
  const small = size === "sm";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        "relative shrink-0 rounded-full transition-colors",
        small ? "h-4 w-7" : "h-6 w-11",
        checked ? "bg-[#5A32A3]" : "bg-slate-300",
      )}
    >
      <span
        className={cn(
          "absolute rounded-full bg-white shadow-md transition-transform",
          small
            ? "top-0.5 left-0.5 h-3 w-3"
            : "top-0.5 left-0.5 h-5 w-5",
          checked ? (small ? "translate-x-3" : "translate-x-5") : "translate-x-0",
        )}
      />
    </button>
  );
}

function SettingsPopup({
  title,
  subtitle,
  onCancel,
  onDone,
  children,
}: {
  title: string;
  subtitle?: string;
  onCancel: () => void;
  onDone: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/25 px-4 pt-20 backdrop-blur-[2px]"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.16)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div>
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            {subtitle ? (
              <p className="text-[11px] text-slate-400">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700"
            aria-label={`Close ${title}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          {children}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-[#F3ECFB]/40 px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDone}
            className="h-9 rounded-lg bg-[#5A32A3] px-4 text-sm font-semibold text-white shadow-sm shadow-[#5A32A3]/20 hover:opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function CompactSettingRow({
  label,
  enabled,
  summary,
  error,
  onToggle,
  onEdit,
  size = "md",
  compact = false,
}: {
  label: string;
  enabled: boolean;
  summary: string;
  error?: string;
  onToggle: (on: boolean) => void;
  onEdit: () => void;
  size?: "sm" | "md";
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        compact
          ? "py-0"
          : "border-t border-slate-100 py-3 first:border-t-0 first:pt-0",
      )}
    >
      <div className="flex items-center gap-2.5">
        <p
          className={cn(
            "shrink-0 font-medium text-slate-700",
            compact ? "text-[13px]" : "w-[88px] text-sm",
          )}
        >
          {label}
        </p>
        <BrandSwitch
          checked={enabled}
          onChange={onToggle}
          label={label}
          size={size}
        />
        {enabled && summary ? (
          <button
            type="button"
            onClick={onEdit}
            className="min-w-0 flex-1 text-left text-[13px] text-slate-600 hover:text-[#5A32A3]"
          >
            {summary}
          </button>
        ) : null}
      </div>
      {error ? (
        <p className={cn("mt-1.5 text-xs text-rose-600", !compact && "pl-[88px]")}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function notifySummary(notifyBy: NotificationMethod[]) {
  const labels = NOTIFY_BY_OPTIONS.filter((option) =>
    notifyBy.includes(option.id),
  ).map((option) => option.label);
  if (labels.length === 0) return "";
  if (labels.length === 1) return ` by ${labels[0]}`;
  if (labels.length === 2) return ` by ${labels[0]} and ${labels[1]}`;
  return ` by ${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

function reminderWhenSummary(
  reminderDate: string,
  due: Date | null,
  anchorLabel: string,
) {
  const first = parseDatetimeLocal(reminderDate);
  if (!first) return "";
  const time = first.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  if (due) {
    const days = calendarDaysBetween(first, due);
    if (days === 0) return `On ${anchorLabel} at ${time}`;
    if (days > 0) {
      return `${days} day${days === 1 ? "" : "s"} before ${anchorLabel} at ${time}`;
    }
    const after = Math.abs(days);
    return `${after} day${after === 1 ? "" : "s"} after ${anchorLabel} at ${time}`;
  }
  return `On ${first.toLocaleDateString("en-AU", { day: "numeric", month: "short" })} at ${time}`;
}

function reminderFrequencySummary(rule: ReminderRepeatRule) {
  if (rule.preset === "none") return "";
  if (rule.preset === "custom") {
    const until = reminderUntilChoice(rule);
    const custom = formatTaskRepeatSummary({
      ...rule,
      ends: until === "never" ? "never" : until === "on" ? "on" : "due",
    });
    return custom ? ` · ${custom}` : "";
  }
  return ` · ${reminderFrequencyLabel(toLegacyRepeatType(rule))}`;
}

export function formatReminderSettingsSummary({
  reminderDate,
  due,
  notifyBy,
  repeat,
  anchorLabel = "due date",
}: {
  reminderDate: string;
  due: Date | null;
  notifyBy: NotificationMethod[];
  repeat: ReminderRepeatRule;
  anchorLabel?: string;
}) {
  const when = reminderWhenSummary(reminderDate, due, anchorLabel);
  if (!when) return "";
  return `${when}${notifySummary(notifyBy)}${reminderFrequencySummary(repeat)}`;
}

export function TaskRepeatBlock({
  enabled,
  onEnabledChange,
  value,
  onChange,
  due,
  label = "Repeat",
  subtitle = "Repeat this task on a schedule",
  fieldDescription = "How often this task repeats.",
  allowAfterCompletion = true,
  compact = false,
}: {
  enabled: boolean;
  onEnabledChange: (on: boolean) => void;
  value: ReminderRepeatRule;
  onChange: (next: ReminderRepeatRule) => void;
  due: Date | null;
  label?: string;
  subtitle?: string;
  fieldDescription?: string;
  allowAfterCompletion?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ReminderRepeatRule>(value);
  const configured = value.preset !== "none";
  const summary = configured ? formatTaskRepeatSummary(value) : "";

  function openEditor(next = value) {
    setDraft(
      next.preset === "none"
        ? { ...defaultReminderRepeatRule, preset: "daily", ends: "never" }
        : { ...next, weekdays: [...next.weekdays] },
    );
    setOpen(true);
  }

  function handleToggle(on: boolean) {
    if (!on) {
      onEnabledChange(false);
      setOpen(false);
      return;
    }
    onEnabledChange(true);
    openEditor(value);
  }

  function handleCancel() {
    setOpen(false);
    if (!configured) onEnabledChange(false);
  }

  function handleDone() {
    onChange(draft.preset === "none" ? { ...draft, preset: "daily" } : draft);
    onEnabledChange(true);
    setOpen(false);
  }

  return (
    <>
      <CompactSettingRow
        label={label}
        enabled={enabled}
        summary={summary}
        onToggle={handleToggle}
        onEdit={() => openEditor(value)}
        size={compact ? "sm" : "md"}
        compact={compact}
      />
      {open ? (
        <SettingsPopup
          title={label}
          subtitle={subtitle}
          onCancel={handleCancel}
          onDone={handleDone}
        >
          <RepeatReminderFields
            value={draft}
            start={new Date()}
            due={due}
            allowAfterCompletion={allowAfterCompletion}
            heading="Repeat type"
            description={fieldDescription}
            ignoreDueWindow
            onChange={setDraft}
          />
        </SettingsPopup>
      ) : null}
    </>
  );
}

export function ReminderSettingsCard({
  enabled,
  onEnabledChange,
  reminderDate,
  onReminderDateChange,
  min,
  max,
  error,
  helper = "Choose a time after now and no later than the due date.",
  notifyBy,
  onToggleNotify,
  repeat,
  onRepeatChange,
  due,
  anchorLabel = "due date",
}: {
  enabled: boolean;
  onEnabledChange: (on: boolean) => void;
  reminderDate: string;
  onReminderDateChange: (value: string) => void;
  min?: string;
  max?: string;
  error?: string;
  helper?: string;
  notifyBy: NotificationMethod[];
  onToggleNotify: (method: NotificationMethod) => void;
  repeat: ReminderRepeatRule;
  onRepeatChange: (next: ReminderRepeatRule) => void;
  due: Date | null;
  anchorLabel?: string;
}) {
  const configured = Boolean(reminderDate.trim());
  const summary = configured
    ? formatReminderSettingsSummary({
        reminderDate,
        due,
        notifyBy,
        repeat,
        anchorLabel,
      })
    : "";

  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(reminderDate);
  const [draftNotify, setDraftNotify] = useState<NotificationMethod[]>(notifyBy);
  const [draftRepeat, setDraftRepeat] = useState(repeat);
  const [mode, setMode] = useState<ReminderScheduleMode>("relative");
  const [relativeCount, setRelativeCount] = useState(1);
  const [relativeWhen, setRelativeWhen] =
    useState<ReminderRelativeWhen>("Before");

  const parsed = parseDatetimeLocal(draftDate);
  const frequencyOptions = useMemo(
    () => availableReminderFrequencies(parsed, due),
    [parsed, due],
  );
  const upcoming = useMemo(() => {
    if (!parsed || draftRepeat.preset === "none") return [];
    return listReminderOccurrences(parsed, due, draftRepeat);
  }, [parsed, due, draftRepeat]);
  const repeatType = toLegacyRepeatType(draftRepeat);
  const datePart = parsed ? toDatePart(parsed) : due ? toDatePart(due) : "";
  const timePart = parsed
    ? toTimePart(parsed)
    : due
      ? toTimePart(due)
      : "09:00";

  function defaultReminderDate() {
    if (reminderDate.trim()) return reminderDate;
    if (!due) return "";
    return toDatetimeLocal(relativeFromDue(due, 1, "Before", toTimePart(due)));
  }

  function openEditor() {
    const nextDate = defaultReminderDate();
    setDraftDate(nextDate);
    setDraftNotify(notifyBy.length ? notifyBy : ["Email"]);
    setDraftRepeat(repeat);
    const nextParsed = parseDatetimeLocal(nextDate);
    if (due && nextParsed) {
      const days = calendarDaysBetween(nextParsed, due);
      if (days >= 0 && toTimePart(nextParsed) === toTimePart(due)) {
        setMode("relative");
        setRelativeCount(days);
        setRelativeWhen("Before");
      } else if (days < 0 && toTimePart(nextParsed) === toTimePart(due)) {
        setMode("relative");
        setRelativeCount(Math.abs(days));
        setRelativeWhen("After");
      } else {
        setMode("onDate");
      }
    } else {
      setMode(nextDate ? "onDate" : "relative");
    }
    setOpen(true);
  }

  function handleToggle(on: boolean) {
    if (!on) {
      onEnabledChange(false);
      setOpen(false);
      return;
    }
    onEnabledChange(true);
    openEditor();
  }

  function handleCancel() {
    setOpen(false);
    if (!configured) onEnabledChange(false);
  }

  function emitDate(
    nextMode: ReminderScheduleMode,
    next: {
      date?: string;
      time?: string;
      count?: number;
      when?: ReminderRelativeWhen;
    },
  ) {
    const nextDate = next.date ?? datePart;
    const nextTime = next.time ?? timePart;
    const nextCount = next.count ?? relativeCount;
    const nextWhen = next.when ?? relativeWhen;
    if (nextMode === "relative" && due) {
      setDraftDate(
        toDatetimeLocal(relativeFromDue(due, nextCount, nextWhen, nextTime)),
      );
      return;
    }
    if (nextDate && nextTime) setDraftDate(`${nextDate}T${nextTime}`);
  }

  useEffect(() => {
    if (!open) return;
    if (frequencyOptions.includes(repeatType)) return;
    setDraftRepeat(ruleFromLegacyRepeatType("None"));
  }, [frequencyOptions, open, repeatType]);

  function handleDone() {
    const nextDate = draftDate.trim() || defaultReminderDate();
    if (!nextDate) {
      handleCancel();
      return;
    }
    onReminderDateChange(nextDate);
    onRepeatChange(draftRepeat);
    NOTIFY_BY_OPTIONS.forEach((option) => {
      const was = notifyBy.includes(option.id);
      const now = draftNotify.includes(option.id);
      if (was !== now) onToggleNotify(option.id);
    });
    onEnabledChange(true);
    setOpen(false);
  }

  return (
    <>
      <CompactSettingRow
        label="Reminder"
        enabled={enabled}
        summary={summary}
        error={error}
        onToggle={handleToggle}
        onEdit={openEditor}
      />
      {open ? (
        <SettingsPopup
          title="Reminder"
          subtitle="Choose when and how to notify the owner"
          onCancel={handleCancel}
          onDone={handleDone}
        >
          <ReminderWhenPicker
            mode={mode}
            onModeChange={(next) => {
              setMode(next);
              emitDate(next, {});
            }}
            date={datePart}
            time={timePart}
            onDateChange={(value) => emitDate("onDate", { date: value })}
            onTimeChange={(value) => emitDate(mode, { time: value })}
            relativeCount={relativeCount}
            relativeWhen={relativeWhen}
            onRelativeCountChange={(value) => {
              setRelativeCount(value);
              emitDate("relative", { count: value });
            }}
            onRelativeWhenChange={(value) => {
              setRelativeWhen(value);
              emitDate("relative", { when: value });
            }}
            due={due}
            anchorLabel={anchorLabel}
            minDate={min?.slice(0, 10)}
            maxDate={max?.slice(0, 10)}
          />
          <p className="-mt-2 text-xs text-slate-500">{helper}</p>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Remind via
            </p>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {NOTIFY_BY_OPTIONS.map((option) => {
                const active = draftNotify.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      setDraftNotify((prev) =>
                        prev.includes(option.id)
                          ? prev.filter((id) => id !== option.id)
                          : [...prev, option.id],
                      )
                    }
                    aria-pressed={active}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors",
                      active
                        ? "border-[#5A32A3] bg-white text-[#5A32A3]"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Reminder frequency
              </p>
              <select
                value={repeatType}
                onChange={(e) =>
                  setDraftRepeat(
                    ruleFromLegacyRepeatType(
                      e.target.value as ReminderRepeatType,
                      draftRepeat,
                    ),
                  )
                }
                className="h-10 min-w-[148px] rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-800 outline-none focus:border-[#5A32A3] focus:ring-2 focus:ring-[#5A32A3]/20"
              >
                {frequencyOptions.map((option) => (
                  <option key={option} value={option}>
                    {reminderFrequencyLabel(option)}
                  </option>
                ))}
              </select>
            </div>
            {repeatType === "Custom" ? (
              <div className="mt-3 rounded-lg border border-[#5A32A3]/15 bg-[#F8F3FC] p-3">
                <ReminderCustomFrequencyFields
                  value={draftRepeat}
                  start={parsed}
                  due={due}
                  onChange={setDraftRepeat}
                />
              </div>
            ) : null}
            {upcoming.length > 1 ? (
              <ul className="mt-3 space-y-1 rounded-lg border border-[#5A32A3]/10 bg-[#F8F3FC] px-3 py-2">
                {upcoming.slice(0, 8).map((date, index) => {
                  const isFinal =
                    index === Math.min(upcoming.length, 8) - 1 &&
                    upcoming.length <= 8 &&
                    draftRepeat.preset === "custom" &&
                    draftRepeat.ends !== "never";
                  return (
                    <li
                      key={date.toISOString()}
                      className="text-[12px] text-slate-600"
                    >
                      {formatReminderOccurrence(date)}
                      {isFinal ? " · final reminder" : ""}
                    </li>
                  );
                })}
                {upcoming.length > 8 ? (
                  <li className="text-[11px] text-slate-400">
                    and {upcoming.length - 8} more, then stop
                  </li>
                ) : (
                  <li className="text-[11px] text-slate-400">
                    {draftRepeat.preset === "custom" &&
                    draftRepeat.ends === "never"
                      ? "Continues until the task is completed"
                      : "Then stop, or sooner if the task is completed"}
                  </li>
                )}
              </ul>
            ) : null}
          </div>
        </SettingsPopup>
      ) : null}
    </>
  );
}

export function turnOffReminderRepeat(): ReminderRepeatRule {
  return { ...defaultReminderRepeatRule };
}

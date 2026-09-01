"use client";

import { useEffect } from "react";
import {
  availableReminderCustomUnits,
  reminderUntilChoice,
  toIsoDate,
  type ReminderRepeatRule,
  type ReminderRepeatUnit,
  type ReminderUntilChoice,
} from "@/lib/tasks/repeat-reminder";
import { cn } from "@/lib/utils";

const labelClass =
  "text-[11px] font-medium uppercase tracking-wide text-slate-500";

const fieldClass =
  "h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-800 outline-none focus:border-[#5A32A3] focus:ring-2 focus:ring-[#5A32A3]/20";

interface ReminderCustomFrequencyFieldsProps {
  value: ReminderRepeatRule;
  start?: Date | null;
  due: Date | null;
  onChange: (next: ReminderRepeatRule) => void;
}

export function ReminderCustomFrequencyFields({
  value,
  start = null,
  due,
  onChange,
}: ReminderCustomFrequencyFieldsProps) {
  const until = reminderUntilChoice(value);
  const untilDate =
    until === "never"
      ? null
      : until === "on" && value.endDate
        ? new Date(`${value.endDate}T00:00:00`)
        : due;
  const unitChoices = availableReminderCustomUnits(start, untilDate);
  const unitChoiceKey = unitChoices.map((unit) => unit.id).join(",");

  useEffect(() => {
    if (unitChoices.some((unit) => unit.id === value.unit)) return;
    onChange({ ...value, preset: "custom", unit: "days", weekdays: [] });
    // Reset only when the until-window no longer fits Weeks/Months.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitChoiceKey, value.unit]);

  function patch(partial: Partial<ReminderRepeatRule>) {
    onChange({ ...value, preset: "custom", ...partial });
  }

  function setUntil(next: ReminderUntilChoice) {
    patch({
      ends: next,
      endDate:
        next === "on"
          ? value.endDate || (due ? toIsoDate(due) : "")
          : value.endDate,
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <p className={labelClass}>Repeat every</p>
        <div className="mt-1.5 flex gap-2">
          <input
            type="number"
            min={1}
            max={99}
            value={value.interval}
            onChange={(e) =>
              patch({ interval: Math.max(1, Number(e.target.value) || 1) })
            }
            className={cn(fieldClass, "w-16 text-center")}
          />
          <select
            className={cn(fieldClass, "min-w-[120px] flex-1")}
            value={
              value.unit === "years" ? "days" : value.unit
            }
            onChange={(e) =>
              patch({
                unit: e.target.value as ReminderRepeatUnit,
                weekdays: [],
              })
            }
          >
            {unitChoices.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <p className={labelClass}>Until</p>
        <div className="mt-1.5 space-y-2">
          {(
            [
              { id: "due", label: "Task due date" },
              { id: "on", label: "Custom date" },
              { id: "never", label: "Never" },
            ] as const
          ).map((option) => (
            <label
              key={option.id}
              className="flex cursor-pointer items-center gap-2 text-sm text-slate-800"
            >
              <input
                type="radio"
                name="reminder-until"
                className="h-4 w-4 accent-[#5A32A3]"
                checked={until === option.id}
                onChange={() => setUntil(option.id)}
              />
              {option.label}
            </label>
          ))}
          {until === "on" ? (
            <input
              type="date"
              value={value.endDate}
              onChange={(e) => patch({ ends: "on", endDate: e.target.value })}
              className={cn(fieldClass, "mt-1 w-full")}
            />
          ) : null}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          {until === "never"
            ? "Keeps reminding until the task is completed."
            : until === "on"
              ? "Last reminder is on this date, unless the task is completed sooner."
              : "Last reminder is on the due date, unless the task is completed sooner."}
        </p>
      </div>
    </div>
  );
}

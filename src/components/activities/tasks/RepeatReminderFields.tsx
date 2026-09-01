"use client";

import { useEffect, useId } from "react";
import {
  MONTH_DAY_OPTIONS,
  MONTH_WEEK_OPTIONS,
  YEAR_MONTH_OPTIONS,
  REPEAT_PRESET_OPTIONS,
  REPEAT_UNIT_OPTIONS,
  REPEAT_WEEKDAYS,
  availableRepeatUnits,
  availableTaskRepeatPresets,
  toIsoDate,
  usesWeekdays,
  type MonthlyRepeatMode,
  type MonthlyWeekIndex,
  type ReminderRepeatPreset,
  type ReminderRepeatRule,
  type ReminderRepeatUnit,
} from "@/lib/tasks/repeat-reminder";
import { cn } from "@/lib/utils";

const labelClass =
  "text-[11px] font-medium uppercase tracking-wide text-gray-500";

const selectClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground/90 focus:border-[#5A32A3] focus:outline-none focus:ring-2 focus:ring-[#5A32A3]/20";

const inputClass =
  "rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground/90 focus:border-[#5A32A3] focus:outline-none focus:ring-2 focus:ring-[#5A32A3]/20";

interface RepeatReminderFieldsProps {
  value: ReminderRepeatRule;
  start: Date | null;
  due?: Date | null;
  allowAfterCompletion?: boolean;
  heading?: string;
  description?: string;
  hidePreset?: boolean;
  /** Hide Ends — reminder frequency always stops at the due date or completion. */
  hideEnds?: boolean;
  /** Custom interval and end date are not limited by the due / start date. */
  ignoreDueWindow?: boolean;
  onChange: (next: ReminderRepeatRule) => void;
}

export function RepeatReminderFields({
  value,
  start,
  due = null,
  allowAfterCompletion = false,
  heading = "Repeat",
  description = "Recurring task — repeats from today, and not after the due date.",
  hidePreset = false,
  hideEnds = false,
  ignoreDueWindow = false,
  onChange,
}: RepeatReminderFieldsProps) {
  const allowedPresets = availableTaskRepeatPresets(
    start,
    due,
    allowAfterCompletion,
    ignoreDueWindow,
  );
  const customUnlocked = value.preset === "custom" && ignoreDueWindow;
  const allowedUnits = customUnlocked
    ? REPEAT_UNIT_OPTIONS
    : availableRepeatUnits(start, due);
  const unitChoices =
    allowedUnits.length > 0 ? allowedUnits : REPEAT_UNIT_OPTIONS;
  const dueIso = due ? toIsoDate(due) : "";
  const endDateMax = customUnlocked ? undefined : dueIso || undefined;
  const showCustom = value.preset === "custom";
  const showMonthlyCustom = showCustom && value.unit === "months";
  const showYearlyCustom = showCustom && value.unit === "years";
  const showAfterCompletion = value.preset === "afterCompletion";
  const showWeekdays = usesWeekdays(value);
  const monthlyMode = value.monthlyMode ?? "day";
  const monthDay = value.monthDay ?? (start ? start.getDate() : 1);
  const monthWeek = value.monthWeek ?? 1;
  const monthWeekday = value.weekdays[0] ?? (start ? start.getDay() : 1);
  const yearMonth = value.yearMonth ?? (start ? start.getMonth() : 0);
  const monthlyName = useId();
  const yearlyName = useId();
  const showEnds = value.preset !== "none" && !hideEnds;
  const allowedKey = allowedPresets.join(",");
  const endsName = useId();

  useEffect(() => {
    if (value.preset === "none" || value.preset === "custom") return;
    if (allowedPresets.includes(value.preset)) return;
    onChange({
      ...value,
      preset: ignoreDueWindow ? "daily" : "none",
      weekdays: ignoreDueWindow ? value.weekdays : [],
      ends: ignoreDueWindow && value.ends === "due" ? "never" : value.ends,
    });
    // Reset only when a fixed preset no longer fits the due window.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedKey, value.preset, ignoreDueWindow]);

  function patch(partial: Partial<ReminderRepeatRule>) {
    onChange({ ...value, ...partial });
  }

  function handlePreset(preset: ReminderRepeatPreset) {
    const weekday = start ? start.getDay() : 1;
    if (preset === "none") {
      patch({ preset, weekdays: [] });
      return;
    }
    if (preset === "daily" || preset === "monthly" || preset === "yearly") {
      patch({
        preset,
        weekdays: [],
        endDate: dueIso || value.endDate,
      });
      return;
    }
    if (preset === "weekly" || preset === "biweekly") {
      patch({
        preset,
        unit: "weeks",
        interval: preset === "biweekly" ? 2 : 1,
        weekdays: [weekday],
        endDate: dueIso || value.endDate,
      });
      return;
    }
    if (preset === "afterCompletion") {
      const clock = start
        ? `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`
        : "10:00";
      patch({
        preset,
        interval: 7,
        unit: "days",
        time: value.time || clock,
        weekdays: [],
      });
      return;
    }
    if (preset === "custom") {
      const unit = REPEAT_UNIT_OPTIONS.some((item) => item.id === value.unit)
        ? value.unit
        : "days";
      patch({
        preset,
        interval: Math.max(1, value.interval || 2),
        unit,
        weekdays:
          unit === "weeks" || unit === "months" || unit === "years"
            ? value.weekdays.length
              ? value.weekdays
              : [weekday]
            : [],
        monthlyMode: value.monthlyMode ?? "day",
        monthDay: value.monthDay ?? (start ? start.getDate() : 1),
        monthWeek: value.monthWeek ?? 1,
        yearMonth: value.yearMonth ?? (start ? start.getMonth() : 0),
        endDate: value.endDate,
      });
      return;
    }
    patch({ preset });
  }

  function toggleWeekday(id: number) {
    const selected = value.weekdays.includes(id);
    const next = selected
      ? value.weekdays.filter((day) => day !== id)
      : [...value.weekdays, id];
    patch({ weekdays: next.length ? next : start ? [start.getDay()] : [1] });
  }

  return (
    <div className="space-y-3">
      {hidePreset ? null : (
        <div>
          <p className="text-sm font-medium text-slate-800">{heading}</p>
          {description ? (
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          ) : null}
          <select
            className={cn(selectClass, "mt-1")}
            value={value.preset}
            onChange={(e) =>
              handlePreset(e.target.value as ReminderRepeatPreset)
            }
          >
            {REPEAT_PRESET_OPTIONS.filter((option) =>
              allowedPresets.includes(option.id),
            ).map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {showCustom ? (
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
              className={cn(inputClass, "w-16 text-center")}
            />
            <select
              className={cn(selectClass, "flex-1")}
              value={value.unit}
              onChange={(e) => {
                const unit = e.target.value as ReminderRepeatUnit;
                const weekday = start ? start.getDay() : 1;
                patch({
                  unit,
                  weekdays:
                    unit === "weeks" || unit === "months" || unit === "years"
                      ? value.weekdays.length
                        ? value.weekdays
                        : [weekday]
                      : [],
                  monthlyMode:
                    unit === "months" || unit === "years"
                      ? value.monthlyMode ?? "day"
                      : value.monthlyMode,
                  monthDay:
                    unit === "months" || unit === "years"
                      ? value.monthDay ?? (start ? start.getDate() : 1)
                      : value.monthDay,
                  yearMonth:
                    unit === "years"
                      ? value.yearMonth ?? (start ? start.getMonth() : 0)
                      : value.yearMonth,
                });
              }}
            >
              {unitChoices.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {showMonthlyCustom ? (
        <div className="space-y-2">
          <label className="flex cursor-pointer flex-wrap items-center gap-2 text-sm text-slate-800">
            <input
              type="radio"
              name={monthlyName}
              className="h-4 w-4 accent-[#5A32A3]"
              checked={monthlyMode === "day"}
              onChange={() => patch({ monthlyMode: "day" as MonthlyRepeatMode })}
            />
            On day
            <select
              disabled={monthlyMode !== "day"}
              value={monthDay}
              onChange={(e) =>
                patch({
                  monthlyMode: "day",
                  monthDay: Number(e.target.value),
                })
              }
              className={cn(selectClass, "w-20")}
            >
              {MONTH_DAY_OPTIONS.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
            of the month
          </label>
          <label className="flex cursor-pointer flex-wrap items-center gap-2 text-sm text-slate-800">
            <input
              type="radio"
              name={monthlyName}
              className="h-4 w-4 accent-[#5A32A3]"
              checked={monthlyMode === "weekday"}
              onChange={() =>
                patch({
                  monthlyMode: "weekday" as MonthlyRepeatMode,
                  weekdays: [monthWeekday],
                })
              }
            />
            On
            <select
              disabled={monthlyMode !== "weekday"}
              value={monthWeek}
              onChange={(e) =>
                patch({
                  monthlyMode: "weekday",
                  monthWeek: Number(e.target.value) as MonthlyWeekIndex,
                })
              }
              className={cn(selectClass, "w-[7.5rem]")}
            >
              {MONTH_WEEK_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              disabled={monthlyMode !== "weekday"}
              value={monthWeekday}
              onChange={(e) =>
                patch({
                  monthlyMode: "weekday",
                  weekdays: [Number(e.target.value)],
                })
              }
              className={cn(selectClass, "w-[8.5rem]")}
            >
              {REPEAT_WEEKDAYS.map((day) => (
                <option key={day.id} value={day.id}>
                  {day.longLabel}
                </option>
              ))}
            </select>
            of the month
          </label>
        </div>
      ) : null}

      {showYearlyCustom ? (
        <div className="space-y-2">
          <label className="flex cursor-pointer flex-wrap items-center gap-2 text-sm text-slate-800">
            <input
              type="radio"
              name={yearlyName}
              className="h-4 w-4 accent-[#5A32A3]"
              checked={monthlyMode === "day"}
              onChange={() => patch({ monthlyMode: "day" as MonthlyRepeatMode })}
            />
            On
            <select
              disabled={monthlyMode !== "day"}
              value={monthDay}
              onChange={(e) =>
                patch({
                  monthlyMode: "day",
                  monthDay: Number(e.target.value),
                })
              }
              className={cn(selectClass, "w-20")}
            >
              {MONTH_DAY_OPTIONS.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
            of
            <select
              disabled={monthlyMode !== "day"}
              value={yearMonth}
              onChange={(e) =>
                patch({
                  monthlyMode: "day",
                  yearMonth: Number(e.target.value),
                })
              }
              className={cn(selectClass, "w-[8.5rem]")}
            >
              {YEAR_MONTH_OPTIONS.map((month) => (
                <option key={month.id} value={month.id}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex cursor-pointer flex-wrap items-center gap-2 text-sm text-slate-800">
            <input
              type="radio"
              name={yearlyName}
              className="h-4 w-4 accent-[#5A32A3]"
              checked={monthlyMode === "weekday"}
              onChange={() =>
                patch({
                  monthlyMode: "weekday" as MonthlyRepeatMode,
                  weekdays: [monthWeekday],
                })
              }
            />
            On
            <select
              disabled={monthlyMode !== "weekday"}
              value={monthWeek}
              onChange={(e) =>
                patch({
                  monthlyMode: "weekday",
                  monthWeek: Number(e.target.value) as MonthlyWeekIndex,
                })
              }
              className={cn(selectClass, "w-[7.5rem]")}
            >
              {MONTH_WEEK_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              disabled={monthlyMode !== "weekday"}
              value={monthWeekday}
              onChange={(e) =>
                patch({
                  monthlyMode: "weekday",
                  weekdays: [Number(e.target.value)],
                })
              }
              className={cn(selectClass, "w-[8.5rem]")}
            >
              {REPEAT_WEEKDAYS.map((day) => (
                <option key={day.id} value={day.id}>
                  {day.longLabel}
                </option>
              ))}
            </select>
            of
            <select
              disabled={monthlyMode !== "weekday"}
              value={yearMonth}
              onChange={(e) =>
                patch({
                  monthlyMode: "weekday",
                  yearMonth: Number(e.target.value),
                })
              }
              className={cn(selectClass, "w-[8.5rem]")}
            >
              {YEAR_MONTH_OPTIONS.map((month) => (
                <option key={month.id} value={month.id}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {showWeekdays ? (
        <div>
          <p className={labelClass}>Repeat on</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {REPEAT_WEEKDAYS.map((day) => {
              const checked = value.weekdays.includes(day.id);
              return (
                <label
                  key={day.id}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium",
                    checked
                      ? "border-[#5A32A3] bg-[#F3ECFB] text-[#5A32A3]"
                      : "border-slate-200 bg-white text-slate-600",
                  )}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => toggleWeekday(day.id)}
                  />
                  {day.label}
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

      {showAfterCompletion ? (
        <>
          <div>
            <p className={labelClass}>Repeat after</p>
            <div className="mt-1.5 flex gap-2">
              <input
                type="number"
                min={1}
                max={99}
                value={value.interval}
                onChange={(e) =>
                  patch({ interval: Math.max(1, Number(e.target.value) || 1) })
                }
                className={cn(inputClass, "w-16 text-center")}
              />
              <select
                className={cn(selectClass, "flex-1")}
                value={value.unit}
                onChange={(e) =>
                  patch({ unit: e.target.value as ReminderRepeatUnit })
                }
              >
                {REPEAT_UNIT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <p className={labelClass}>Time</p>
            <input
              type="time"
              value={value.time || "10:00"}
              onChange={(e) => patch({ time: e.target.value || "10:00" })}
              className={cn(inputClass, "mt-1.5 w-full")}
            />
          </div>
        </>
      ) : null}

      {value.preset !== "none" ? (
        <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-800">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#5A32A3]"
            checked={Boolean(value.exceptWeekendsAndHolidays)}
            onChange={(e) =>
              patch({ exceptWeekendsAndHolidays: e.target.checked })
            }
          />
          <span>
            Except weekends and holidays
            <span className="mt-0.5 block text-[11px] text-slate-500">
              If it falls on a weekend or holiday, it runs on the next business
              day.
            </span>
          </span>
        </label>
      ) : null}

      {hideEnds && value.preset !== "none" ? (
        <p className="text-[11px] text-slate-500">
          Continues until the due date, or until the task is completed.
        </p>
      ) : null}

      {showEnds ? (
        <div>
          <p className={labelClass}>Ends</p>
          <div className="mt-1.5 space-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
              <input
                type="radio"
                name={endsName}
                className="h-4 w-4 accent-[#5A32A3]"
                checked={value.ends === "never"}
                onChange={() => patch({ ends: "never" })}
              />
              Never
            </label>
            <label className="flex cursor-pointer flex-wrap items-center gap-2 text-sm text-slate-800">
              <input
                type="radio"
                name={endsName}
                className="h-4 w-4 accent-[#5A32A3]"
                checked={value.ends === "after"}
                onChange={() => patch({ ends: "after" })}
              />
              After
              <input
                type="number"
                min={1}
                max={99}
                disabled={value.ends !== "after"}
                value={value.afterCount}
                onChange={(e) =>
                  patch({
                    ends: "after",
                    afterCount: Math.max(1, Number(e.target.value) || 1),
                  })
                }
                className={cn(
                  inputClass,
                  "w-16 text-center disabled:bg-slate-50 disabled:text-slate-400",
                )}
              />
              occurrences
            </label>
            <label className="flex cursor-pointer flex-wrap items-center gap-2 text-sm text-slate-800">
              <input
                type="radio"
                name={endsName}
                className="h-4 w-4 accent-[#5A32A3]"
                checked={value.ends === "on"}
                onChange={() =>
                  patch({
                    ends: "on",
                    endDate: value.endDate || endDateMax || "",
                  })
                }
              />
              On
              <input
                type="date"
                max={endDateMax}
                disabled={value.ends !== "on"}
                value={value.endDate}
                onChange={(e) => {
                  const next = e.target.value;
                  patch({
                    ends: "on",
                    endDate:
                      endDateMax && next > endDateMax ? endDateMax : next,
                  });
                }}
                className={cn(
                  inputClass,
                  "disabled:bg-slate-50 disabled:text-slate-400",
                )}
              />
            </label>
          </div>
        </div>
      ) : null}

      {showAfterCompletion ? (
        <p className="text-[13px] leading-5 text-slate-500">
          The next reminder will only be created after this reminder is
          completed.
        </p>
      ) : null}
    </div>
  );
}

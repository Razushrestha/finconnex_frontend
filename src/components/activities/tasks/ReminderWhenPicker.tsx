"use client";

import { useId } from "react";
import {
  REMINDER_RELATIVE_WHEN,
  type ReminderRelativeWhen,
  type ReminderScheduleMode,
} from "@/lib/tasks/types";
import { cn } from "@/lib/utils";

const RELATIVE_COUNTS = Array.from({ length: 31 }, (_, i) => i);

const fieldClass =
  "h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-[#5A32A3] focus:ring-2 focus:ring-[#5A32A3]/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toDatePart(value: Date) {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export function toTimePart(value: Date) {
  return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function toDatetimeLocal(value: Date) {
  return `${toDatePart(value)}T${toTimePart(value)}`;
}

export function parseDatetimeLocal(value?: string): Date | null {
  if (!value?.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function applyTime(date: Date, time: string) {
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  const next = new Date(date.getTime());
  next.setHours(
    match ? Number(match[1]) : 9,
    match ? Number(match[2]) : 0,
    0,
    0,
  );
  return next;
}

export function relativeFromDue(
  due: Date,
  count: number,
  when: ReminderRelativeWhen,
  time: string,
) {
  const next = new Date(due.getTime());
  next.setDate(next.getDate() + (when === "After" ? count : -count));
  return applyTime(next, time);
}

export function formatFriendlyWhen(date: Date | null) {
  if (!date) return "";
  return date.toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function ReminderWhenPicker({
  mode,
  onModeChange,
  date,
  time,
  onDateChange,
  onTimeChange,
  relativeCount,
  relativeWhen,
  onRelativeCountChange,
  onRelativeWhenChange,
  due,
  anchorLabel = "due date",
  minDate,
  maxDate,
}: {
  mode: ReminderScheduleMode;
  onModeChange: (mode: ReminderScheduleMode) => void;
  date: string;
  time: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  relativeCount: number;
  relativeWhen: ReminderRelativeWhen;
  onRelativeCountChange: (value: number) => void;
  onRelativeWhenChange: (value: ReminderRelativeWhen) => void;
  due: Date | null;
  anchorLabel?: string;
  minDate?: string;
  maxDate?: string;
}) {
  const name = useId();
  const preview = due
    ? formatFriendlyWhen(
        relativeFromDue(due, relativeCount, relativeWhen, time),
      )
    : "";

  return (
    <div className="space-y-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        When to remind
      </p>

      <div
        role="button"
        tabIndex={0}
        onClick={() => onModeChange("onDate")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onModeChange("onDate");
          }
        }}
        className={cn(
          "w-full rounded-xl border p-3 text-left transition-colors",
          mode === "onDate"
            ? "border-[#5A32A3] bg-white shadow-sm"
            : "border-slate-200 bg-white/70 hover:border-slate-300",
        )}
      >
        <div className="flex items-start gap-2.5">
          <input
            type="radio"
            name={name}
            className="mt-0.5 h-4 w-4 accent-[#5A32A3]"
            checked={mode === "onDate"}
            onChange={() => onModeChange("onDate")}
          />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900">
              On a specific date
            </span>
            <span className="mt-0.5 block text-[11px] text-slate-500">
              Choose the exact date and time
            </span>
            <span className="mt-2 flex min-w-0 items-center gap-2">
              <input
                type="date"
                disabled={mode !== "onDate"}
                min={minDate}
                max={maxDate}
                value={date}
                onChange={(e) => {
                  onModeChange("onDate");
                  onDateChange(e.target.value);
                }}
                className={cn(fieldClass, "min-w-0 flex-1")}
              />
              <span className="shrink-0 text-xs text-slate-400">at</span>
              <input
                type="time"
                disabled={mode !== "onDate"}
                value={time}
                onChange={(e) => {
                  onModeChange("onDate");
                  onTimeChange(e.target.value);
                }}
                className={cn(fieldClass, "w-[7.75rem] shrink-0")}
              />
            </span>
          </span>
        </div>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => onModeChange("relative")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onModeChange("relative");
          }
        }}
        className={cn(
          "w-full rounded-xl border p-3 text-left transition-colors",
          mode === "relative"
            ? "border-[#5A32A3] bg-white shadow-sm"
            : "border-slate-200 bg-white/70 hover:border-slate-300",
        )}
      >
        <div className="flex items-start gap-2.5">
          <input
            type="radio"
            name={name}
            className="mt-0.5 h-4 w-4 accent-[#5A32A3]"
            checked={mode === "relative"}
            onChange={() => onModeChange("relative")}
          />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-900">
              Relative to {anchorLabel}
            </span>
            <span className="mt-0.5 block text-[11px] text-slate-500">
              e.g. 1 day before the {anchorLabel}
            </span>
            <span className="mt-2 flex flex-wrap items-center gap-2">
              <select
                disabled={mode !== "relative"}
                value={relativeCount}
                onChange={(e) => {
                  onModeChange("relative");
                  onRelativeCountChange(Number(e.target.value));
                }}
                className={cn(fieldClass, "w-16")}
              >
                {RELATIVE_COUNTS.map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-500">day(s)</span>
              <select
                disabled={mode !== "relative"}
                value={relativeWhen}
                onChange={(e) => {
                  onModeChange("relative");
                  onRelativeWhenChange(e.target.value as ReminderRelativeWhen);
                }}
                className={fieldClass}
              >
                {REMINDER_RELATIVE_WHEN.map((option) => (
                  <option key={option} value={option}>
                    {option.toLowerCase()}
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-500">{anchorLabel}</span>
              <span className="text-xs text-slate-400">at</span>
              <input
                type="time"
                disabled={mode !== "relative"}
                value={time}
                onChange={(e) => {
                  onModeChange("relative");
                  onTimeChange(e.target.value);
                }}
                className={fieldClass}
              />
            </span>
            {mode === "relative" && preview ? (
              <span className="mt-2 block text-[11px] font-medium text-[#5A32A3]">
                Reminds {preview}
              </span>
            ) : null}
          </span>
        </div>
      </div>
    </div>
  );
}

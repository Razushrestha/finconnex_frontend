"use client";

import type { ReactNode } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { TimezoneSelect } from "@/components/booking/TimezoneSelect";
import { parseStartHHmm } from "@/components/booking/CustomTimePicker";
import { prettyAppointmentDate } from "@/lib/booking/types";
import { cn } from "@/lib/utils";

const fieldLabelClass = "mb-1 block text-[13px] font-medium text-slate-600";
const fieldClass =
  "h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100";
const fieldErrorClass =
  "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20";

function RequiredStar() {
  return <span className="text-rose-500"> *</span>;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function parseLocalDateTime(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return null;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function toLocalDateTimeValue(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function toDateIso(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function toHHmm(date: Date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function startDateTimeValue(date: string, slot: string) {
  const time = parseStartHHmm(slot) || "09:00";
  return `${date}T${time}`;
}

function addMinutes(value: string, minutes: number) {
  const date = parseLocalDateTime(value);
  if (!date) return value;
  date.setMinutes(date.getMinutes() + minutes);
  return toLocalDateTimeValue(date);
}

function prettyDateTime(value: string) {
  const date = parseLocalDateTime(value);
  if (!date) return "Choose date and time";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AppointmentDateField({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}) {
  return (
    <div className="relative">
      <div
        className={cn(
          fieldClass,
          "pointer-events-none flex items-center",
          invalid && fieldErrorClass,
        )}
      >
        {prettyAppointmentDate(value)}
      </div>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
        aria-label="Date"
        aria-required
        aria-invalid={invalid || undefined}
      />
    </div>
  );
}

function CustomDateTimeField({
  label,
  value,
  min,
  onChange,
  required,
  invalid,
}: {
  label: string;
  value: string;
  min?: string;
  onChange: (value: string) => void;
  required?: boolean;
  invalid?: boolean;
}) {
  return (
    <div className="min-w-0">
      <label className={fieldLabelClass}>
        {label}
        {required ? <RequiredStar /> : null}
      </label>
      <div className="group relative">
        <div
          className={cn(
            fieldClass,
            "pointer-events-none flex items-center pr-9 group-focus-within:border-blue-300 group-focus-within:ring-2 group-focus-within:ring-blue-100",
            invalid && fieldErrorClass,
          )}
        >
          {prettyDateTime(value)}
        </div>
        <Calendar className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="datetime-local"
          value={value}
          min={min}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
          aria-label={label}
          aria-required={required || undefined}
          aria-invalid={invalid || undefined}
        />
      </div>
    </div>
  );
}

export function DateTimeSection({
  timezone,
  onTimezoneChange,
  whenMode,
  onWhenModeChange,
  date,
  onDateChange,
  slot,
  onSlotChange,
  slots,
  emptySlotLabel,
  duration,
  durationMinutes = 30,
  onDurationMinutesChange,
  fieldsLayout = "row",
  required = false,
  error,
}: {
  timezone?: string;
  onTimezoneChange?: (value: string) => void;
  whenMode: "default" | "custom";
  onWhenModeChange?: (mode: "default" | "custom") => void;
  date: string;
  onDateChange: (value: string) => void;
  slot: string;
  onSlotChange: (value: string) => void;
  slots: { value: string; label: string }[];
  emptySlotLabel?: string;
  duration?: ReactNode;
  durationMinutes?: number;
  onDurationMinutesChange?: (minutes: number) => void;
  fieldsLayout?: "row" | "stacked";
  required?: boolean;
  error?: string;
}) {
  const showDuration = whenMode !== "custom" && Boolean(duration);
  const stacked = fieldsLayout === "stacked";
  const startValue = startDateTimeValue(date, slot);
  const minutes = Math.max(1, durationMinutes || 30);
  const endValue = addMinutes(startValue, minutes);

  function handleStartChange(next: string) {
    const parsed = parseLocalDateTime(next);
    if (!parsed) return;
    onDateChange(toDateIso(parsed));
    onSlotChange(toHHmm(parsed));
  }

  function handleEndChange(next: string) {
    const start = parseLocalDateTime(startValue);
    const end = parseLocalDateTime(next);
    if (!start || !end || !onDurationMinutesChange) return;
    const nextMinutes = Math.round(
      (end.getTime() - start.getTime()) / 60000,
    );
    onDurationMinutesChange(Math.max(1, nextMinutes));
  }

  const invalid = Boolean(error);

  return (
    <div>
      <p className="mb-2 text-[15px] font-medium text-slate-800">
        Date & time
        {required ? <RequiredStar /> : null}
      </p>
      <div
        className={cn(
          "space-y-4 rounded-xl bg-[#F8F9FB] p-5",
          invalid && "ring-1 ring-rose-300",
        )}
      >
        {onTimezoneChange ? (
          <div>
            <p className="mb-1.5 text-[13px] text-slate-500">
              Showing slots in this timezone: (Account timezone)
            </p>
            <TimezoneSelect value={timezone ?? ""} onChange={onTimezoneChange} />
          </div>
        ) : null}

        {onWhenModeChange ? (
          <div className="inline-flex overflow-hidden rounded-md border border-gray-200 bg-white">
            {(["default", "custom"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onWhenModeChange(mode)}
                className={cn(
                  "h-8 px-3.5 text-[13px] font-medium capitalize",
                  whenMode === mode
                    ? "bg-blue-50 text-blue-600"
                    : "bg-white text-slate-800 hover:text-slate-900",
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        ) : null}

        {whenMode === "custom" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CustomDateTimeField
              label="Start time"
              value={startValue}
              onChange={handleStartChange}
              required={required}
              invalid={invalid}
            />
            <CustomDateTimeField
              label="End time"
              value={endValue}
              min={startValue}
              onChange={handleEndChange}
              required={required}
              invalid={invalid}
            />
          </div>
        ) : (
          <div
            className={cn(
              "grid grid-cols-1 gap-4",
              stacked
                ? showDuration
                  ? "sm:grid-cols-2"
                  : ""
                : showDuration
                  ? "sm:grid-cols-3"
                  : "sm:grid-cols-2",
            )}
          >
            <div className={cn(stacked && showDuration && "sm:col-span-2")}>
              <label className={fieldLabelClass}>
                Date
                {required ? <RequiredStar /> : null}
              </label>
              <AppointmentDateField
                value={date}
                onChange={onDateChange}
                invalid={invalid}
              />
            </div>
            <div className="min-w-0">
              <label className={fieldLabelClass}>
                Slot
                {required ? <RequiredStar /> : null}
              </label>
              <div className="relative">
                <select
                  value={slot}
                  onChange={(event) => onSlotChange(event.target.value)}
                  className={cn(
                    fieldClass,
                    "appearance-none pr-8",
                    invalid && fieldErrorClass,
                  )}
                  aria-required={required || undefined}
                  aria-invalid={invalid || undefined}
                >
                  {slots.length === 0 ? (
                    <option value="">
                      {emptySlotLabel ?? "No slots this day"}
                    </option>
                  ) : (
                    slots.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            {showDuration ? duration : null}
          </div>
        )}
      </div>
      {error ? (
        <p className="mt-1.5 text-[12px] font-medium text-rose-500">{error}</p>
      ) : null}
    </div>
  );
}

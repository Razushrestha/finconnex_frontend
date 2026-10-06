"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const MAX_DAYS = 31;

function clampDays(raw: string, fallback: number): number {
  if (raw.trim() === "") return fallback;
  const n = Number(raw.replace(/[^\d]/g, ""));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_DAYS, Math.max(0, Math.floor(n)));
}

type DaysToCompleteInputProps = {
  value: number;
  onChange: (days: number) => void;
  className?: string;
};

export function DaysToCompleteInput({
  value,
  onChange,
  className,
}: DaysToCompleteInputProps) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(clampDays(String(value), 0)));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      onChange={(event) => {
        const digits = event.target.value.replace(/[^\d]/g, "");
        if (digits === "") {
          setText("");
          return;
        }
        const n = Math.floor(Number(digits));
        if (n > MAX_DAYS) {
          setText(String(MAX_DAYS));
          onChange(MAX_DAYS);
          return;
        }
        setText(digits);
      }}
      onBlur={() => {
        const next = clampDays(text, value);
        onChange(next);
        setText(String(next));
      }}
      className={cn(className)}
      aria-label="Days to complete"
    />
  );
}

const MAX_REMINDER_DAYS = 90;

/** Lets the box be cleared while typing. 1 is only applied after the field is left empty. */
export function ReminderEveryDaysInput({
  value,
  onChange,
  className,
}: DaysToCompleteInputProps) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      onChange={(event) => {
        setText(event.target.value.replace(/[^\d]/g, ""));
      }}
      onBlur={() => {
        if (!text.trim()) {
          setText(String(value));
          return;
        }
        const n = Math.floor(Number(text));
        const next = Number.isFinite(n)
          ? Math.min(MAX_REMINDER_DAYS, Math.max(1, n))
          : value;
        onChange(next);
        setText(String(next));
      }}
      className={cn(className)}
      aria-label="Reminder interval in days"
    />
  );
}

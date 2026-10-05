"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const MAX_DAYS = 365;

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
        const next = clampDays(text, value);
        onChange(next);
        setText(String(next));
      }}
      className={cn(className)}
      aria-label="Days to complete"
    />
  );
}

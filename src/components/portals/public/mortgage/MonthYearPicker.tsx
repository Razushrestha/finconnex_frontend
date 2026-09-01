"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parseValue(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) };
}

function toValue(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function displayValue(value: string) {
  const parsed = parseValue(value);
  if (!parsed) return "";
  return `${MONTH_NAMES[parsed.month - 1]} ${parsed.year}`;
}

function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function isFuture(year: number, month: number) {
  const now = currentYearMonth();
  return year > now.year || (year === now.year && month > now.month);
}

export function MonthYearPicker({
  label,
  value,
  disabled,
  required,
  invalid,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const now = currentYearMonth();
  const selected = parseValue(value);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"month" | "year">("month");
  const [viewYear, setViewYear] = useState(selected?.year ?? now.year);

  useEffect(() => {
    if (open) {
      setViewYear(selected?.year ?? now.year);
      setMode("month");
    }
  }, [open, selected?.year, now.year]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const years = useMemo(() => {
    const start = now.year - 39;
    return Array.from({ length: 40 }, (_, i) => start + i).reverse();
  }, [now.year]);

  function pick(year: number, month: number) {
    if (isFuture(year, month)) return;
    onChange(toValue(year, month));
    setOpen(false);
  }

  const threeYearsAgo = () => {
    let year = now.year - 3;
    let month = now.month;
    onChange(toValue(year, month));
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative" data-invalid={invalid || undefined}>
      {label ? (
        <span className={cn("mb-2 block text-[13px] font-semibold", invalid ? "text-rose-700" : "text-slate-900")}>
          {label}
          {required ? <span className="text-rose-500"> *</span> : null}
        </span>
      ) : null}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-12 w-full items-center justify-between rounded-lg bg-white px-3.5 text-left text-[14px] shadow-[0_2px_10px_rgba(15,23,42,0.07)] outline-none ring-1 ring-black/5",
          open && "ring-2 ring-[#5A32A3]",
          disabled && "bg-slate-50",
          invalid && "ring-2 ring-rose-400",
        )}
      >
        <span className={selected ? "text-slate-900" : "text-slate-400"}>
          {selected ? displayValue(value) : "Select month and year"}
        </span>
        <Calendar className="h-4 w-4 text-slate-400" />
      </button>

      {open ? (
        <div className="absolute top-[calc(100%+8px)] left-0 z-30 w-[280px] rounded-2xl bg-white p-3 shadow-[0_16px_40px_rgba(15,23,42,0.14)] ring-1 ring-black/5">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                mode === "year"
                  ? setViewYear((y) => y - 12)
                  : setViewYear((y) => y - 1)
              }
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setMode((m) => (m === "month" ? "year" : "month"))}
              className="rounded-lg px-2 py-1 text-[13px] font-bold text-slate-900 hover:bg-violet-50"
            >
              {mode === "month" ? viewYear : "Pick a year"}
            </button>
            <button
              type="button"
              disabled={mode === "month" && viewYear >= now.year}
              onClick={() =>
                mode === "year"
                  ? setViewYear((y) => Math.min(now.year, y + 12))
                  : setViewYear((y) => Math.min(now.year, y + 1))
              }
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {mode === "year" ? (
            <div className="grid max-h-[220px] grid-cols-3 gap-1.5 overflow-auto">
              {years.map((year) => {
                const active = selected?.year === year;
                return (
                  <button
                    key={year}
                    type="button"
                    onClick={() => {
                      setViewYear(year);
                      setMode("month");
                    }}
                    className={cn(
                      "h-9 rounded-lg text-[13px] font-semibold",
                      active
                        ? "bg-[#5A32A3] text-white"
                        : "text-slate-700 hover:bg-violet-50",
                    )}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS.map((name, i) => {
                const month = i + 1;
                const future = isFuture(viewYear, month);
                const active = selected?.year === viewYear && selected.month === month;
                return (
                  <button
                    key={name}
                    type="button"
                    disabled={future}
                    onClick={() => pick(viewYear, month)}
                    className={cn(
                      "h-9 rounded-lg text-[13px] font-semibold",
                      active && "bg-[#5A32A3] text-white",
                      !active && !future && "text-slate-700 hover:bg-violet-50",
                      future && "cursor-not-allowed text-slate-300",
                    )}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="text-[12px] font-semibold text-slate-500 hover:text-slate-800"
            >
              Clear
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={threeYearsAgo}
                className="text-[12px] font-semibold text-[#5A32A3] hover:underline"
              >
                3 years ago
              </button>
              <button
                type="button"
                onClick={() => pick(now.year, now.month)}
                className="text-[12px] font-semibold text-[#5A32A3] hover:underline"
              >
                This month
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {invalid ? <p className="mt-1.5 text-[12px] font-medium text-rose-600">Required</p> : null}
    </div>
  );
}

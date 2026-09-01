"use client";

import { formatGroupedAmount, rawAmount } from "@/lib/portals/mortgage";
import { cn } from "@/lib/utils";

export function CurrencyInput({
  value,
  disabled,
  invalid,
  placeholder = "0",
  className,
  prefix = "$",
  onChange,
}: {
  value: string;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
  className?: string;
  prefix?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      {prefix ? (
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px] font-semibold text-slate-500">
          {prefix}
        </span>
      ) : null}
      <input
        type="text"
        inputMode="numeric"
        value={formatGroupedAmount(value)}
        disabled={disabled}
        onChange={(e) => onChange(rawAmount(e.target.value))}
        className={cn(
          "h-11 w-full rounded-lg bg-white pr-3 text-[13px] text-slate-800 outline-none ring-1 ring-black/5 placeholder:text-slate-400 focus:ring-2 focus:ring-[#5A32A3] disabled:bg-slate-50",
          prefix && "pl-7",
          invalid && "ring-2 ring-rose-400",
          className,
        )}
        placeholder={placeholder}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { CurrencyInput } from "@/components/portals/public/mortgage/CurrencyInput";
import {
  LIVING_EXPENSE_GROUPS,
  OTHER_LIVING_EXPENSE,
} from "@/lib/portals/living-expenses";
import { formatMoney, moneyNumber } from "@/lib/portals/mortgage";
import { cn } from "@/lib/utils";

export function PortalFactFindExpenses({
  valueOf,
  disabled,
  onChange,
}: {
  valueOf: (id: string) => string;
  disabled: boolean;
  onChange: (id: string, value: string) => void;
}) {
  const [openId, setOpenId] = useState<string>("everyday");

  const rows = LIVING_EXPENSE_GROUPS.map((category) => {
    const total = category.items.reduce((sum, item) => sum + moneyNumber(valueOf(item.key)), 0);
    return { ...category, total };
  });
  const other = moneyNumber(valueOf(OTHER_LIVING_EXPENSE.key));
  const monthly = rows.reduce((sum, row) => sum + row.total, 0) + other;

  return (
    <div className="mt-6 rounded-2xl bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.05)] ring-1 ring-black/5 sm:p-5">
      <h2 className="text-[15px] font-bold text-slate-900">Add your predicted expenses</h2>
      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-1">
          {rows.map((category) => {
            const open = openId === category.id;
            return (
              <div key={category.id} className="border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? "" : category.id)}
                  className="flex w-full items-center gap-3 py-3 text-left"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-[3px]"
                    style={{ background: category.color }}
                  />
                  <span className="min-w-0 flex-1 text-[13px] font-semibold text-slate-800">
                    {category.label}
                  </span>
                  <span className="text-[13px] font-bold text-slate-800">
                    {formatMoney(category.total)}{" "}
                    <span className="font-medium text-slate-400">/month</span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-slate-400 transition-transform",
                      open && "rotate-180",
                    )}
                  />
                </button>
                {open ? (
                  <div className="space-y-2.5 pb-3 pl-6">
                    {category.items.map((item) => (
                      <ExpenseInput
                        key={item.key}
                        label={item.label}
                        value={valueOf(item.key)}
                        disabled={disabled}
                        onChange={(next) => onChange(item.key, next)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}

          <div className="flex items-center gap-3 py-3">
            <span className="h-3 w-3 shrink-0 rounded-[3px] bg-yellow-400" />
            <span className="min-w-0 flex-1 text-[13px] font-semibold text-slate-800">
              {OTHER_LIVING_EXPENSE.label}
            </span>
            <div className="w-[120px]">
              <MoneyBox
                value={valueOf(OTHER_LIVING_EXPENSE.key)}
                disabled={disabled}
                onChange={(next) => onChange(OTHER_LIVING_EXPENSE.key, next)}
              />
            </div>
          </div>
        </div>

        <ExpenseDonut
          slices={[
            ...rows.map((row) => ({
              id: row.id,
              label: row.label,
              value: row.total,
              color: row.color,
            })),
            {
              id: "other",
              label: OTHER_LIVING_EXPENSE.label,
              value: other,
              color: OTHER_LIVING_EXPENSE.color,
            },
          ]}
          total={monthly}
        />
      </div>
    </div>
  );
}

function ExpenseInput({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-3">
      <span className="pt-2 text-[12px] leading-snug text-slate-700">{label}</span>
      <div className="w-[120px] shrink-0">
        <MoneyBox value={value} disabled={disabled} onChange={onChange} />
      </div>
    </label>
  );
}

function MoneyBox({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <CurrencyInput
      value={value}
      disabled={disabled}
      onChange={onChange}
      className="h-9"
    />
  );
}

function pointOnCircle(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSlicePath(
  cx: number,
  cy: number,
  inner: number,
  outer: number,
  start: number,
  end: number,
) {
  const sweep = Math.max(0, Math.min(359.999, end - start));
  const large = sweep > 180 ? 1 : 0;
  const outerStart = pointOnCircle(cx, cy, outer, start);
  const outerEnd = pointOnCircle(cx, cy, outer, start + sweep);
  const innerStart = pointOnCircle(cx, cy, inner, start);
  const innerEnd = pointOnCircle(cx, cy, inner, start + sweep);
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outer} ${outer} 0 ${large} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${inner} ${inner} 0 ${large} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function ExpenseDonut({
  slices,
  total,
}: {
  slices: { id: string; label: string; value: number; color: string }[];
  total: number;
}) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const size = 196;
  const cx = size / 2;
  const cy = size / 2;
  const outer = 86;
  const inner = 62;
  const visible = slices.filter((slice) => slice.value > 0);
  const hovered = visible.find((slice) => slice.id === hoverId) ?? null;
  const segments: {
    id: string;
    label: string;
    value: number;
    color: string;
    start: number;
    end: number;
  }[] = [];
  let angle = 0;
  for (const slice of visible) {
    const sweep = total > 0 ? (slice.value / total) * 360 : 0;
    segments.push({ ...slice, start: angle, end: angle + sweep });
    angle += sweep;
  }

  return (
    <div className="flex flex-col items-center pt-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          shapeRendering="geometricPrecision"
        >
          <circle cx={cx} cy={cy} r={(outer + inner) / 2} fill="none" stroke="#eef2f7" strokeWidth={outer - inner} />
          {segments.map((slice) => (
            <path
              key={slice.id}
              d={donutSlicePath(cx, cy, inner, outer, slice.start, slice.end)}
              fill={slice.color}
              className="cursor-pointer"
              style={{ opacity: hoverId && hoverId !== slice.id ? 0.55 : 1 }}
              onMouseEnter={() => setHoverId(slice.id)}
              onMouseLeave={() => setHoverId(null)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
          <p className="text-[20px] font-bold text-slate-900">
            {formatMoney(hovered ? hovered.value : total)}
          </p>
          <p className="text-[11px] leading-snug text-slate-500">
            {hovered ? hovered.label : "On average / month"}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-slate-500">
        <span
          className="h-2.5 w-2.5 rounded-[3px]"
          style={{ background: hovered?.color ?? "#f472b6" }}
        />
        {hovered ? formatMoney(hovered.value) : "Your expenses"}
      </div>
    </div>
  );
}

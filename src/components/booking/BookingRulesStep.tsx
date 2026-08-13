"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

const BRAND = "#5A32A3";

type TimeUnit = "Minutes" | "Hours" | "Days";

export type BookingRulesValues = {
  interval: number;
  intervalUnit: TimeUnit;
  duration: number;
  durationUnit: TimeUnit;
  notice: number;
  noticeUnit: TimeUnit;
  dateRange: number;
  dateRangeUnit: TimeUnit;
  preBuffer: number;
  preBufferUnit: TimeUnit;
  postBuffer: number;
  postBufferUnit: TimeUnit;
  maxPerDay: number;
  maxPerSlot: number;
  lookBusy: boolean;
  lookBusyPercent: number;
};

const DEFAULT_RULES: BookingRulesValues = {
  interval: 30,
  intervalUnit: "Minutes",
  duration: 30,
  durationUnit: "Minutes",
  notice: 0,
  noticeUnit: "Days",
  dateRange: 0,
  dateRangeUnit: "Days",
  preBuffer: 0,
  preBufferUnit: "Minutes",
  postBuffer: 0,
  postBufferUnit: "Minutes",
  maxPerDay: 0,
  maxPerSlot: 1,
  lookBusy: false,
  lookBusyPercent: 0,
};

function toMinutes(value: number, unit: TimeUnit) {
  if (unit === "Hours") return value * 60;
  if (unit === "Days") return value * 60 * 24;
  return value;
}

function toHours(value: number, unit: TimeUnit) {
  if (unit === "Minutes") return Math.max(0, Math.round(value / 60));
  if (unit === "Days") return value * 24;
  return value;
}

function toDays(value: number, unit: TimeUnit) {
  if (unit === "Minutes") return Math.max(0, Math.round(value / 1440));
  if (unit === "Hours") return Math.max(0, Math.round(value / 24));
  return value;
}

export function rulesToPageFields(rules: BookingRulesValues) {
  return {
    durationMinutes: Math.max(5, toMinutes(rules.duration, rules.durationUnit)),
    bufferMinutes: toMinutes(rules.preBuffer, rules.preBufferUnit),
    minNoticeHours: toHours(rules.notice, rules.noticeUnit),
    maxAdvanceDays: Math.max(1, toDays(rules.dateRange, rules.dateRangeUnit) || 60),
    maxAttendees: Math.max(1, rules.maxPerSlot || 1),
  };
}

function Label({
  text,
  tip,
}: {
  text: string;
  tip: string;
}) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5">
      <span className="text-[13px] font-semibold text-slate-700">{text}</span>
      <span className="group relative inline-flex">
        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-slate-400">
          <Info className="h-2.5 w-2.5" />
        </span>
        <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-56 -translate-x-1/2 flex-col items-center group-hover:flex">
          <span className="rounded-md bg-slate-900 px-3 py-2 text-[11px] leading-relaxed text-white shadow-lg">
            {tip}
          </span>
          <span className="h-0 w-0 border-x-[6px] border-t-[6px] border-x-transparent border-t-slate-900" />
        </span>
      </span>
    </div>
  );
}

function UnitField({
  value,
  unit,
  units,
  onValue,
  onUnit,
}: {
  value: number;
  unit: TimeUnit;
  units: TimeUnit[];
  onValue: (n: number) => void;
  onUnit: (u: TimeUnit) => void;
}) {
  return (
    <div className="flex h-11 overflow-hidden rounded-lg border border-[#E5E7EB] bg-white focus-within:border-[#5A32A3]/45">
      <input
        type="number"
        min={0}
        value={value || ""}
        onChange={(e) => onValue(Number(e.target.value) || 0)}
        className="min-w-0 flex-1 bg-transparent px-3 text-[13px] text-slate-800 outline-none"
      />
      <select
        value={unit}
        onChange={(e) => onUnit(e.target.value as TimeUnit)}
        className="border-l border-[#E5E7EB] bg-white px-2 text-[12px] font-medium text-slate-600 outline-none"
      >
        {units.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
    </div>
  );
}

function StepperField({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex h-11 overflow-hidden rounded-lg border border-[#E5E7EB] bg-white focus-within:border-[#5A32A3]/45">
      <input
        type="number"
        min={0}
        value={value || ""}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="min-w-0 flex-1 bg-transparent px-3 text-[13px] text-slate-800 outline-none"
      />
      <div className="flex border-l border-[#E5E7EB]">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="flex w-9 items-center justify-center text-slate-500 hover:bg-[#F3ECFB] hover:text-[#5A32A3]"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="flex w-9 items-center justify-center border-l border-[#E5E7EB] text-slate-500 hover:bg-[#F3ECFB] hover:text-[#5A32A3]"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function BookingRulesStep({
  durationMinutes,
  initial,
  onBack,
  onSave,
}: {
  durationMinutes: number;
  initial?: BookingRulesValues | null;
  onBack: () => void;
  onSave: (rules: BookingRulesValues) => void;
}) {
  const [rules, setRules] = useState<BookingRulesValues>(
    initial ?? {
      ...DEFAULT_RULES,
      duration: durationMinutes || 30,
    },
  );

  function patch(partial: Partial<BookingRulesValues>) {
    setRules((prev) => ({ ...prev, ...partial }));
  }

  return (
    <div className="mx-auto w-full max-w-[920px] pb-8">
      <div className="rounded-xl border border-[#E5E7EB] bg-white px-5 py-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:px-8 sm:py-7">
        <h1 className="text-[18px] font-bold text-slate-900">Booking rules</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Control how and when meetings can be booked.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
          <div>
            <Label
              text="Meeting interval"
              tip="The gap between the start of one meeting and the next."
            />
            <UnitField
              value={rules.interval}
              unit={rules.intervalUnit}
              units={["Minutes", "Hours"]}
              onValue={(interval) => patch({ interval })}
              onUnit={(intervalUnit) => patch({ intervalUnit })}
            />
          </div>
          <div>
            <Label
              text="Meeting duration"
              tip="This sets the length of your meeting, determining how long it will last."
            />
            <UnitField
              value={rules.duration}
              unit={rules.durationUnit}
              units={["Minutes", "Hours"]}
              onValue={(duration) => patch({ duration })}
              onUnit={(durationUnit) => patch({ durationUnit })}
            />
          </div>

          <div>
            <Label
              text="Minimum scheduling notice"
              tip="How far in advance a guest must book."
            />
            <UnitField
              value={rules.notice}
              unit={rules.noticeUnit}
              units={["Minutes", "Hours", "Days"]}
              onValue={(notice) => patch({ notice })}
              onUnit={(noticeUnit) => patch({ noticeUnit })}
            />
          </div>
          <div>
            <Label
              text="Date range"
              tip="How far into the future guests can book."
            />
            <UnitField
              value={rules.dateRange}
              unit={rules.dateRangeUnit}
              units={["Days", "Hours"]}
              onValue={(dateRange) => patch({ dateRange })}
              onUnit={(dateRangeUnit) => patch({ dateRangeUnit })}
            />
          </div>

          <div>
            <Label
              text="Pre buffer time"
              tip="Blocked time before each meeting."
            />
            <UnitField
              value={rules.preBuffer}
              unit={rules.preBufferUnit}
              units={["Minutes", "Hours"]}
              onValue={(preBuffer) => patch({ preBuffer })}
              onUnit={(preBufferUnit) => patch({ preBufferUnit })}
            />
          </div>
          <div>
            <Label
              text="Post buffer time"
              tip="Blocked time after each meeting."
            />
            <UnitField
              value={rules.postBuffer}
              unit={rules.postBufferUnit}
              units={["Minutes", "Hours"]}
              onValue={(postBuffer) => patch({ postBuffer })}
              onUnit={(postBufferUnit) => patch({ postBufferUnit })}
            />
          </div>

          <div>
            <Label
              text="Maximum bookings per day"
              tip="Limit how many bookings can be taken in one day."
            />
            <StepperField
              value={rules.maxPerDay}
              onChange={(maxPerDay) => patch({ maxPerDay })}
            />
          </div>
          <div>
            <Label
              text="Maximum bookings per slot (per user)"
              tip="How many people can book the same time slot."
            />
            <StepperField
              value={rules.maxPerSlot}
              onChange={(maxPerSlot) => patch({ maxPerSlot })}
            />
          </div>
        </div>

        <div className="mt-6">
          <Label
            text="Look busy"
            tip="Hide a percentage of open slots so your calendar looks fuller."
          />
          <button
            type="button"
            role="switch"
            aria-checked={rules.lookBusy}
            onClick={() => patch({ lookBusy: !rules.lookBusy })}
            className={cn(
              "relative mb-3 h-6 w-11 rounded-full transition-colors",
              rules.lookBusy ? "bg-[#5A32A3]" : "bg-slate-300",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                rules.lookBusy && "translate-x-5",
              )}
            />
          </button>
          <div className="flex h-11 w-full items-center overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
            <input
              type="number"
              min={0}
              max={100}
              disabled={!rules.lookBusy}
              value={rules.lookBusyPercent}
              onChange={(e) =>
                patch({
                  lookBusyPercent: Math.min(
                    100,
                    Math.max(0, Number(e.target.value) || 0),
                  ),
                })
              }
              className="min-w-0 flex-1 bg-transparent px-3 text-[13px] outline-none disabled:text-slate-400"
            />
            <span className="border-l border-[#E5E7EB] px-3 text-[12px] font-medium text-slate-500">
              %
            </span>
          </div>
          <p className="mt-1.5 text-[12px] text-slate-400">
            Hide the number of available slots by x%.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="h-10 min-w-[96px] rounded-lg border border-[#E5E7EB] bg-white px-6 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => onSave(rules)}
          className="h-10 rounded-lg px-5 text-[13px] font-semibold text-white hover:brightness-110"
          style={{ backgroundColor: BRAND }}
        >
          Next
        </button>
      </div>
    </div>
  );
}

"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { DateTimeSection } from "@/components/booking/DateTimeSection";
import { DEFAULT_TIMEZONE } from "@/lib/booking/timezones";
import { formatSlotRange } from "@/lib/booking/types";

interface AdvancedOptionsProps {
  enableExpiry: boolean;
  setEnableExpiry: (val: boolean) => void;
  expiryDate: string;
  setExpiryDate: (val: string) => void;
  expiryTime: string;
  setExpiryTime: (val: string) => void;
}

const DURATIONS = [15, 30, 45, 60, 90];

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function todayIso() {
  const date = new Date();
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function reminderSlots(durationMinutes: number): { value: string; label: string }[] {
  const step = Math.max(1, durationMinutes);
  const slots: { value: string; label: string }[] = [];
  for (let mins = 6 * 60; mins + step <= 22 * 60; mins += step) {
    const value = `${pad2(Math.floor(mins / 60))}:${pad2(mins % 60)}`;
    slots.push({ value, label: formatSlotRange(value, step) });
  }
  return slots;
}

export const AdvancedOptionsSection: React.FC<AdvancedOptionsProps> = ({
  enableExpiry,
  setEnableExpiry,
  expiryDate,
  setExpiryDate,
  expiryTime,
  setExpiryTime,
}) => {
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [whenMode, setWhenMode] = useState<"default" | "custom">("default");
  const [date, setDate] = useState(todayIso);
  const [slot, setSlot] = useState("06:00");
  const [durationMinutes, setDurationMinutes] = useState(30);

  const slots = useMemo(
    () => reminderSlots(durationMinutes),
    [durationMinutes],
  );

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-6">
      <h3 className="text-slate-800 font-semibold text-sm">Advanced Options</h3>

      <DateTimeSection
        timezone={timezone}
        onTimezoneChange={setTimezone}
        whenMode={whenMode}
        onWhenModeChange={setWhenMode}
        date={date}
        onDateChange={setDate}
        slot={slot}
        onSlotChange={setSlot}
        slots={slots}
        emptySlotLabel="No slots this day"
        durationMinutes={durationMinutes}
        onDurationMinutesChange={(minutes) => {
          setDurationMinutes(minutes);
          const nextSlots = reminderSlots(minutes);
          if (!nextSlots.some((item) => item.value === slot)) {
            setSlot(nextSlots[0]?.value ?? "");
          }
        }}
        duration={
          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-600">
              Duration
            </label>
            <div className="relative">
              <select
                value={String(durationMinutes)}
                onChange={(event) => {
                  const minutes = Number(event.target.value);
                  setDurationMinutes(minutes);
                  const nextSlots = reminderSlots(minutes);
                  if (!nextSlots.some((item) => item.value === slot)) {
                    setSlot(nextSlots[0]?.value ?? "");
                  }
                }}
                className="h-10 w-full appearance-none rounded-md border border-gray-200 bg-white px-3 pr-8 text-sm text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              >
                {DURATIONS.includes(durationMinutes) ? null : (
                  <option value={durationMinutes}>{durationMinutes} min</option>
                )}
                {DURATIONS.map((item) => (
                  <option key={item} value={item}>
                    {item} min
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        }
      />

      <div className="pt-2 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <label className="flex shrink-0 items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enableExpiry}
              onChange={(e) => setEnableExpiry(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Document expiry{" "}
              <span className="text-slate-400 font-normal">(optional)</span>
            </span>
          </label>

          {enableExpiry && (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800"
              />
              <input
                type="time"
                value={expiryTime}
                onChange={(e) => setExpiryTime(e.target.value)}
                className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

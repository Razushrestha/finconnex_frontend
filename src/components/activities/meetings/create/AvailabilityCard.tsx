"use client";

import React from "react";
import type { AvailabilityRule } from "@/lib/booking/types";
import { MentionNotesTextarea } from "@/components/shared/MentionNotesTextarea";

export const AvailabilityCard: React.FC<{
  date?: string;
  time?: string;
  duration?: string;
  hours?: AvailabilityRule;
  slots?: string[];
  notes?: string;
  onNotesChange?: (val: string) => void;
}> = ({
  date,
  time = "",
  duration = "30 min",
  hours,
  slots = [],
  notes = "",
  onNotesChange,
}) => {
  const startTime = time.split(" - ")[0]?.trim() || time;
  const selected = date && startTime ? new Date(`${date}T${startTime}`) : date
    ? new Date(`${date}T12:00:00`)
    : new Date();
  const dayLabel = selected.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const minutes = Number.parseInt(duration, 10) || 30;
  const end = startTime
    ? new Date(selected.getTime() + minutes * 60 * 1000)
    : null;
  const endLabel = end
    ? end.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
  const startLabel = startTime
    ? selected.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="space-y-4 rounded-xl border border-border bg-white p-6 shadow-sm">
      <h3 className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
        Availability
      </h3>

      <div className="border-b border-gray-100 pb-2 text-center">
        <p className="text-sm font-semibold text-slate-900">{dayLabel}</p>
      </div>

      <div className="space-y-2 text-xs">
        {hours?.enabled ? (
          <div className="flex items-center space-x-2 rounded-md border border-gray-100 bg-slate-50 p-2 text-gray-600">
            <span className="w-12 font-mono text-[10px]">{hours.start}</span>
            <span className="font-medium">
              Calendar hours {hours.start} – {hours.end}
            </span>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-gray-200 px-3 py-2.5 text-xs text-gray-400">
            This calendar is closed on this day.
          </div>
        )}

        {startTime ? (
          <div className="flex items-center space-x-2 rounded-md border border-violet-200 bg-violet-50 p-2.5 text-violet-700">
            <span className="w-12 font-mono text-[10px] text-violet-500">
              {startTime}
            </span>
            <div>
              <p className="font-semibold">Selected Slot</p>
              <p className="text-[10px] text-violet-500">
                {startLabel} - {endLabel}
              </p>
            </div>
          </div>
        ) : null}

        {hours?.enabled && slots.length > 0 ? (
          <p className="text-[11px] text-gray-500">
            {slots.length} open slot{slots.length === 1 ? "" : "s"} on this
            calendar
          </p>
        ) : null}
      </div>

      {onNotesChange ? (
        <div>
          <label className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
            Internal note
          </label>
          <div className="mt-1">
            <MentionNotesTextarea
              rows={4}
              value={notes}
              onChange={onNotesChange}
              placeholder="Internal notes… Type @ to mention someone."
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

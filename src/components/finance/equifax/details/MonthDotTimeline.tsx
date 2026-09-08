import React from "react";

export type MonthStatus = "onTime" | "late30" | "late60Plus" | string;

export interface MonthItem {
  label?: string;
  month?: string;
  status: MonthStatus;
}

interface MonthDotTimelineProps {
  months: MonthItem[];
}

const STATUS_COLOR: Record<string, string> = {
  onTime: "bg-emerald-500",
  "0": "bg-emerald-500", // Maps standard CCR Code 0 to on-time green
  late30: "bg-amber-400",
  "1": "bg-amber-400",
  late60Plus: "bg-rose-500",
  "2": "bg-rose-500",
  "3": "bg-rose-500",
};

export default function MonthDotTimeline({
  months = [],
}: MonthDotTimelineProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {months.map((m, i) => {
        const displayText = m.label || m.month || "";
        const statusKey = String(m.status);
        return (
          <div
            key={`${displayText}-${i}`}
            className="flex flex-col items-center gap-1"
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white ${
                STATUS_COLOR[statusKey] || "bg-slate-300"
              }`}
            >
              ✓
            </span>
            <span className="text-[9px] text-slate-400">{displayText}</span>
          </div>
        );
      })}
    </div>
  );
}

export function RepaymentLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Paid on time
        (Code 0)
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-amber-400" /> 1–30 days late
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-rose-500" /> 31–60+ days late
      </span>
    </div>
  );
}

export const MONTHS_CLEAN: MonthItem[] = [
  { month: "Nov 24", status: "0" },
  { month: "Dec 24", status: "0" },
  { month: "Jan 25", status: "0" },
  { month: "Feb 25", status: "0" },
  { month: "Mar 25", status: "0" },
  { month: "Apr 25", status: "0" },
  { month: "May 25", status: "0" },
  { month: "Jun 25", status: "0" },
  { month: "Jul 25", status: "0" },
  { month: "Aug 25", status: "0" },
  { month: "Sep 25", status: "0" },
  { month: "Oct 25", status: "0" },
  { month: "Nov 25", status: "0" },
  { month: "Dec 25", status: "0" },
  { month: "Jan 26", status: "0" },
  { month: "Feb 26", status: "0" },
  { month: "Mar 26", status: "0" },
  { month: "Apr 26", status: "0" },
  { month: "May 26", status: "0" },
  { month: "Jun 26", status: "0" },
  { month: "Jul 26", status: "0" },
  { month: "Aug 26", status: "0" },
  { month: "Sep 26", status: "0" },
  { month: "Oct 26", status: "0" },
];

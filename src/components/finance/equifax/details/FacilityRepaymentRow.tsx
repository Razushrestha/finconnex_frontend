import React from "react";
import { Badge } from "@/components/ui/badge";
import MonthDotTimeline, { MonthItem } from "./MonthDotTimeline";

interface FacilityRepaymentRowProps {
  provider: string;
  facilityType?: string;
  termsLine?: string;
  statusText?: string;
  months: MonthItem[];
}

export default function FacilityRepaymentRow({
  provider,
  facilityType,
  termsLine,
  statusText,
  months = [],
}: FacilityRepaymentRowProps) {
  return (
    <div className="rounded-xl border border-slate-100 p-4">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">
            {provider}
            {facilityType && (
              <span className="text-slate-400"> — {facilityType}</span>
            )}
          </p>
          {termsLine && <p className="text-xs text-slate-400">{termsLine}</p>}
        </div>
        {statusText && (
          <Badge
            variant="outline"
            className="border-emerald-200 bg-emerald-50 text-emerald-700"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5" />
            {statusText}
          </Badge>
        )}
      </div>
      <MonthDotTimeline months={months} />
    </div>
  );
}

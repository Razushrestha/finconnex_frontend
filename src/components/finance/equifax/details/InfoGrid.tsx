import React from "react";

export interface InfoItem {
  label: string;
  value: string;
  subValue?: string;
  status?: "active" | "inactive";
}

interface InfoGridProps {
  items: InfoItem[];
}

export default function InfoGrid({ items = [] }: InfoGridProps) {
  return (
    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-slate-100 bg-slate-50 p-3"
        >
          <p className="text-[10px] font-medium tracking-wide text-slate-400">
            {item.label}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-900">
            {item.status === "active" && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            )}
            {item.value}
          </p>
          {item.subValue && (
            <p className="mt-0.5 text-xs text-slate-400">{item.subValue}</p>
          )}
        </div>
      ))}
    </div>
  );
}

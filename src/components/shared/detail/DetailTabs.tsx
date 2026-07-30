"use client";

import { cn } from "@/lib/utils";

interface DetailTabsProps {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
  trailing?: React.ReactNode;
}

export function DetailTabs({
  tabs,
  active,
  onChange,
  trailing,
}: DetailTabsProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
              active === tab
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:text-slate-800",
            )}
          >
            {tab}
          </button>
        ))}
      </div>
      {trailing && (
        <div className="text-xs font-medium text-slate-400">{trailing}</div>
      )}
    </div>
  );
}

"use client";

import type { ActivityTabsProps } from "./types";
import { cn } from "./shared";

export function ActivityTabs({ tabs, activeKey, onChange }: ActivityTabsProps) {
  return (
    <div className="flex items-center gap-1 border-b border-slate-200 px-1">
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={cn(
              "relative flex items-center gap-1.5 rounded-t-lg px-3 pb-2.5 pt-2 text-[13px] font-medium transition-colors",
              active
                ? "font-semibold text-violet-700"
                : "text-slate-500 hover:text-slate-800",
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
            {typeof tab.count === "number" && tab.count > 0 && (
              <span
                className={cn(
                  "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums",
                  active
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 text-slate-500",
                )}
              >
                {tab.count}
              </span>
            )}
            {active && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-violet-600" />
            )}
          </button>
        );
      })}
    </div>
  );
}

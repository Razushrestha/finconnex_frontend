import React from "react";

export interface TabItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface ReportTabNavProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (key: string) => void;
}

export default function ReportTabNav({
  tabs = [],
  activeTab,
  onChange,
}: ReportTabNavProps) {
  return (
    <div className="mb-6 flex flex-wrap gap-6 border-b border-slate-200">
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-1.5 border-b-2 pb-3 text-sm font-medium transition-colors ${
              isActive
                ? "border-violet-600 text-violet-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.icon}
            {tab.label}
            {typeof tab.count === "number" && (
              <span className="text-xs text-slate-400">({tab.count})</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

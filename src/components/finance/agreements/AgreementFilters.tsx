"use client";

import React from "react";

interface AgreementFiltersProps {
  data: Array<{ status: string; [key: string]: any }>;
  activeTab: string;
  onTabChange: (tab: string) => void;
  selectedYear: string;
  onYearChange: (year: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function AgreementFilters({
  data,
  activeTab,
  onTabChange,
  selectedYear,
  onYearChange,
  searchQuery,
  onSearchChange,
}: AgreementFiltersProps) {
  // Dynamically calculate counts from the dataset instead of hardcoding them
  const totalCount = data.length;
  const activeCount = data.filter((item) => item.status === "Active").length;
  const pendingCount = data.filter(
    (item) =>
      item.status === "Under Review" || item.status === "Pending Review",
  ).length;
  const expiringCount = data.filter(
    (item) => item.status === "Expiring",
  ).length;
  const terminatedCount = data.filter(
    (item) => item.status === "Terminated",
  ).length;

  const tabs = [
    { label: "All", count: totalCount },
    { label: "Active", count: activeCount },
    { label: "Pending Review", count: pendingCount },
    { label: "Expiring", count: expiringCount },
    { label: "Terminated", count: terminatedCount },
  ];

  return (
    <div className="space-y-4">
      {/* Status Badges Filter (Dynamically populated from table data counts) */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((tab) => {
          const tabIdentifier = tab.label;
          const isSelected = activeTab === tabIdentifier;

          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => onTabChange(tabIdentifier)}
              className={`px-4 py-1.5 text-xs font-medium rounded-full border transition-all ${
                isSelected
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {tab.label} {tab.count}
            </button>
          );
        })}
      </div>

      {/* Search and Dropdowns Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-4 border border-border rounded-xl shadow-sm">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search agreements, clients, or SLA tiers..."
          className="w-full sm:w-80 px-3 py-2 text-sm bg-background text-foreground border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary"
        />

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <select className="px-3 py-2 text-xs bg-background text-foreground border border-border rounded-lg outline-none">
            <option>Billing Cycle: All</option>
          </select>

          <select className="px-3 py-2 text-xs bg-background text-foreground border border-border rounded-lg outline-none">
            <option>SLA Tier: All</option>
          </select>

          {/* Flexible Year Search/Input Option */}
          <div className="relative flex items-center">
            <span className="absolute left-3 text-[10px] text-muted-foreground uppercase font-semibold">
              FY
            </span>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => onYearChange(e.target.value)}
              placeholder="Year"
              className="w-28 pl-9 pr-3 py-2 text-xs bg-background text-foreground border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

interface AuditLogItem {
  id: string;
  category: "Contract Changes" | "Billing" | "Signatures" | "SLA";
  title: string;
  description: string;
  timestamp: string;
  systemId: string;
  dotColorClass?: string;
}

interface AuditHistoryProps {
  auditLogs?: AuditLogItem[];
}

export function AuditHistoryView({ auditLogs = [] }: AuditHistoryProps) {
  const [selectedFilter, setSelectedFilter] = useState("All Events");

  const filterOptions = [
    "All Events",
    "Contract Changes",
    "Billing",
    "Signatures",
    "SLA",
  ];

  // Filter logic for log items
  const filteredLogs = auditLogs.filter((log) => {
    if (selectedFilter === "All Events") return true;
    return log.category === selectedFilter;
  });

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-6 shadow-sm">
      {/* Header & Dropdown Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Comprehensive Audit Trail
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable ledger log of all contract executions, SLA changes, and
            automated billings.
          </p>
        </div>

        {/* Dropdown Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
            Filter by:
          </span>
          <div className="relative">
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="appearance-none bg-muted/50 border border-border rounded-xl px-3 py-1.5 pr-8 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-colors hover:bg-muted"
            >
              {filterOptions.map((option) => (
                <option
                  key={option}
                  value={option}
                  className="bg-card text-foreground"
                >
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log) => (
            <div key={log.id} className="relative space-y-1">
              {/* Timeline Dot */}
              <div
                className={`absolute -left-6 top-1.5 w-3 h-3 rounded-full ring-4 ring-card ${
                  log.dotColorClass || "bg-primary"
                }`}
              />

              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-foreground">
                  {log.title}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {log.description}
                </p>
                <p className="text-[11px] text-muted-foreground/80 font-mono pt-0.5">
                  {log.timestamp} • {log.systemId}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-muted-foreground text-xs italic">
            No audit history logs found for{" "}
            <span className="font-semibold text-foreground">
              &quot;{selectedFilter}&quot;
            </span>
            .
          </div>
        )}
      </div>
    </div>
  );
}

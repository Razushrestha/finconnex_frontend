"use client";

import React, { useState } from "react";
import { Calendar as CalendarIcon, Check } from "lucide-react";

export function RenewalTermsSection() {
  const [selectedDuration, setSelectedDuration] = useState("12 Months");
  const [indexationEnabled, setIndexationEnabled] = useState(true);

  const durations = [
    { label: "12 Months", badge: "Standard Term" },
    { label: "24 Months", badge: "3% Retainer Disc." },
    { label: "6 Months", badge: "Short Extension" },
    { label: "Custom End Date", badge: "Specify calendar" },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground font-semibold text-[11px] flex items-center justify-center">
            2
          </span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Renewal Terms & Proposed Adjustments
          </h3>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          Current Expiry: 31 Dec 2026
        </span>
      </div>

      {/* Duration selector */}
      <div className="space-y-2">
        <label className="text-[11px] font-medium text-muted-foreground block">
          Term Extension Duration
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {durations.map((item) => {
            const isSelected = selectedDuration === item.label;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setSelectedDuration(item.label)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "bg-primary/5 border-primary ring-1 ring-primary"
                    : "bg-muted/30 border-border hover:bg-muted/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    {item.label}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                </div>
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  {item.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Two columns: Proposed New Effective Period & Annual Indexation (CPI) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Effective Period */}
        <div className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-2">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground block">
            Proposed New Effective Period
          </span>
          <div className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2">
            <span className="text-xs font-semibold text-foreground inline-flex items-center gap-2">
              <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
              01 Jan 2027 – 31 Dec 2027
            </span>
            <span className="text-[10px] text-muted-foreground font-medium px-2 py-0.5 bg-muted rounded">
              (365 Days)
            </span>
          </div>
          <p className="text-[11px] text-emerald-500 font-medium">
            ✓ Auto-renews seamlessly with continuous SLA retention
          </p>
        </div>

        {/* Annual Indexation */}
        <div className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
              Annual Indexation (CPI)
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
              4.5% Standard
            </span>
          </div>
          <div className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2">
            <div>
              <span className="text-[10px] text-muted-foreground block">
                Current Retainer: $3,500.00/mo
              </span>
              <span className="text-xs font-bold text-foreground">
                $3,622.50{" "}
                <span className="text-[10px] font-normal text-muted-foreground">
                  / mo ($43,470/yr)
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIndexationEnabled(!indexationEnabled)}
              className={`w-9 h-5 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                indexationEnabled ? "bg-primary" : "bg-muted"
              }`}
            >
              <div
                className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform transition-transform ${
                  indexationEnabled ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">
              Tier:{" "}
              <strong className="text-foreground">
                Tier 1 Priority (24/7 SLA)
              </strong>
            </span>
            <button
              type="button"
              className="text-primary font-medium hover:underline cursor-pointer"
            >
              Modify SLA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

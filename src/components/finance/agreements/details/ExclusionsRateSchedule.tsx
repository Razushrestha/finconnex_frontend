"use client";

import React from "react";
import { AlertCircle } from "lucide-react";

export function ExclusionsRateSchedule() {
  const rates = [
    {
      title: "Senior Brokerage Advisory Overage",
      rate: "$180.00 / hr",
      notes: "Billed in 15-minute increments",
    },
    {
      title: "Bespoke Lending Counsel & Drafting",
      rate: "$290.00 / hr",
      notes: "Requires written pre-authorisation",
    },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          Exclusions & Out-of-Scope Rate Schedule
        </h3>
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-muted text-muted-foreground">
          Rate Card 2026
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        Services exceeding the monthly 40-hour advisory threshold or requesting
        out-of-policy legal drafting will incur additional charges billed at
        standard agreement rates.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        {rates.map((item, index) => (
          <div
            key={index}
            className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-1"
          >
            <span className="text-[11px] font-semibold text-foreground block">
              {item.title}
            </span>
            <div className="text-base font-bold text-foreground">
              {item.rate}
            </div>
            <span className="text-[10px] text-muted-foreground block">
              {item.notes}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

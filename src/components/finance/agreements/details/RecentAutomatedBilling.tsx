"use client";

import React from "react";
import { Download } from "lucide-react";

export function RecentAutomatedBilling() {
  const invoices = [
    {
      id: "#INV-3201",
      date: "01 Apr 2026",
      desc: "April Retainer • Cycle",
      amount: "$3,500.00",
      status: "Paid",
    },
    {
      id: "#INV-3140",
      date: "01 Mar 2026",
      desc: "March Retainer • Cycle",
      amount: "$3,500.00",
      status: "Paid",
    },
    {
      id: "#INV-3088",
      date: "01 Feb 2026",
      desc: "February Retainer • Cycle",
      amount: "$3,500.00",
      status: "Paid",
    },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Recent Automated Billing
        </h3>
        <button className="text-xs font-medium text-violet-500 hover:underline cursor-pointer">
          View all (4)
        </button>
      </div>

      <div className="space-y-2.5">
        {invoices.map((inv, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60"
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">
                  {inv.id}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {inv.date}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">{inv.desc}</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-xs font-bold text-foreground block">
                  {inv.amount}
                </span>
                <span className="text-[10px] font-semibold text-emerald-500">
                  {inv.status}
                </span>
              </div>
              <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

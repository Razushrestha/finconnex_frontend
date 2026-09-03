"use client";

import React from "react";

export function ContractTerms() {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
      <h3 className="text-sm font-semibold text-foreground">
        Contract Terms & Conditions
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
            Effective Term
          </span>
          <p className="font-semibold text-foreground">
            01/01/2026 – 31/12/2026
          </p>
          <span className="text-[11px] text-muted-foreground">
            12 Months Duration
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
            Auto-Renewal Clause
          </span>
          <p className="font-semibold text-emerald-500 inline-flex items-center gap-1">
            <span>🟢</span> Enabled
          </p>
          <span className="text-[11px] text-muted-foreground block">
            30-days cancellation notice
          </span>
        </div>

        <div className="space-y-1 pt-2">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
            Payment Terms
          </span>
          <p className="font-semibold text-foreground">Net 7 Days</p>
          <span className="text-[11px] text-muted-foreground">
            Autopay on 1st of month
          </span>
        </div>

        <div className="space-y-1 pt-2">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
            SLA Incident Response
          </span>
          <p className="font-semibold text-violet-500">Tier 1, Under 2 Hours</p>
          <span className="text-[11px] text-muted-foreground">
            24/7 emergency hotline
          </span>
        </div>
      </div>
    </div>
  );
}

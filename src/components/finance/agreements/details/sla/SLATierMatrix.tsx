"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";

export function SLATierMatrix() {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            SLA Tier Definitions & Target Matrix (Tier 1 Priority)
          </h3>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
          24/7 Dedicated Support
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Critical Severity */}
        <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-500">
              Critical Severity
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-500">
              P1
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Response: &lt; 1 hour
          </p>
          <p className="text-[11px] text-muted-foreground">
            Resolution: &lt; 4 hours
          </p>
          <span className="text-[10px] text-muted-foreground block pt-1">
            System outage or full cutoff
          </span>
        </div>

        {/* High Severity */}
        <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-500">
              High Severity
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-500">
              P2
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Response: &lt; 2 hours
          </p>
          <p className="text-[11px] text-muted-foreground">
            Resolution: Same business day
          </p>
          <span className="text-[10px] text-muted-foreground block pt-1">
            Major core workflow blocks
          </span>
        </div>

        {/* Standard Requests */}
        <div className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              Standard Requests
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground">
              P3
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Response: &lt; 8 business hours
          </p>
          <p className="text-[11px] text-muted-foreground">
            Resolution: 24-48 hours
          </p>
          <span className="text-[10px] text-muted-foreground block pt-1">
            Queries, clarification, minor changes
          </span>
        </div>

        {/* Tier 1 Escalation Hotline */}
        <div className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              Tier 1 Escalation Hotline
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary">
              VIP
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Phone: 1300 000 000
          </p>
          <p className="text-[11px] text-muted-foreground">Direct PIN: •••••</p>
          <span className="text-[10px] text-muted-foreground block pt-1">
            Direct senior analyst bridge
          </span>
        </div>
      </div>
    </div>
  );
}

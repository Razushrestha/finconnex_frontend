"use client";

import React from "react";
import { DollarSign, Calendar, CreditCard, RefreshCw } from "lucide-react";

interface BillingMetricsProps {
  metrics?: {
    totalBilled?: string;
    totalCycles?: string;
    nextDueDate?: string;
    nextAmount?: string;
  };
}

export function BillingMetricsGrid({ metrics }: BillingMetricsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Billed */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-2 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Total Billed to Date
          </span>
          <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div>
          <h4 className="text-xl font-bold text-foreground">
            {metrics?.totalBilled || "$0.00"}
          </h4>
          <span className="text-[11px] text-muted-foreground">
            {metrics?.totalCycles || "0 of 0 billing cycles"}
          </span>
        </div>
      </div>

      {/* 2. Next Due Date */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-2 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Next Due Date
          </span>
          <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
        </div>
        <div>
          <h4 className="text-xl font-bold text-foreground">
            {metrics?.nextDueDate || "Not Scheduled"}
          </h4>
          <span className="text-[11px] text-amber-500 font-medium">
            {metrics?.nextAmount || "$0.00 • Pending"}
          </span>
        </div>
      </div>

      {/* 3. Payment Method */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-2 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Payment Method
          </span>
          <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <CreditCard className="w-4 h-4" />
          </div>
        </div>
        <div>
          <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            No Method Linked
          </h4>
          <span className="text-[11px] text-muted-foreground truncate block">
            Configure autopay or manual terms
          </span>
        </div>
      </div>

      {/* 4. Invoicing Frequency */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-2 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Invoicing Frequency
          </span>
          <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <RefreshCw className="w-4 h-4" />
          </div>
        </div>
        <div>
          <h4 className="text-xl font-bold text-foreground">Not Set</h4>
          <span className="text-[11px] text-muted-foreground">Define frequency cycle</span>
        </div>
      </div>
    </div>
  );
}
"use client";

import React from "react";
import { Activity, Clock, CheckCircle2, Ticket } from "lucide-react";

interface SLAMetricsProps {
  metrics?: {
    responseCompliance?: string;
    avgFirstResponse?: string;
    resolutionCompliance?: string;
    activeTickets?: string;
  };
}

export function SLAMetricsGrid({ metrics }: SLAMetricsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Response SLA Compliance */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-2 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Response SLA Compliance
          </span>
          <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
        </div>
        <div>
          <h4 className="text-xl font-bold text-foreground">
            {metrics?.responseCompliance || "0.0%"}
          </h4>
          <span className="text-[11px] text-muted-foreground">
            Awaiting threshold data
          </span>
        </div>
      </div>

      {/* 2. Avg First Response Time */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-2 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Avg First Response Time
          </span>
          <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div>
          <h4 className="text-xl font-bold text-foreground">
            {metrics?.avgFirstResponse || "0 min"}
          </h4>
          <span className="text-[11px] text-muted-foreground">
            No logs recorded
          </span>
        </div>
      </div>

      {/* 3. Resolution Compliance */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-2 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Resolution Compliance
          </span>
          <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div>
          <h4 className="text-xl font-bold text-foreground">
            {metrics?.resolutionCompliance || "0.0%"}
          </h4>
          <span className="text-[11px] text-muted-foreground">
            Within statutory windows
          </span>
        </div>
      </div>

      {/* 4. Open SLA Tickets */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-2 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Open SLA Tickets
          </span>
          <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Ticket className="w-4 h-4" />
          </div>
        </div>
        <div>
          <h4 className="text-xl font-bold text-foreground">
            {metrics?.activeTickets || "0 Active"}
          </h4>
          <span className="text-[11px] text-muted-foreground">
            0 total resolves YTD
          </span>
        </div>
      </div>
    </div>
  );
}

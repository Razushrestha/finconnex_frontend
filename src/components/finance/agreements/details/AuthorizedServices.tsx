"use client";

import React from "react";
import { CheckCircle2, Shield } from "lucide-react";

export function AuthorizedServices() {
  const services = [
    {
      title: "Brokerage Advisory & Underwriting Review",
      badge: "Up to 40 hrs / month",
      desc: "Full credit file review, application structuring, debt service coverage analysis, and deal scoping prior to lender submission.",
    },
    {
      title: "Priority Equifax CCR & PSSR Validation Reports",
      badge: "Unlimited API queries",
      desc: "Automated commercial bureau queries, 24-month repayment track verification, cross-guarantor checks, and PSSR security registration checks.",
    },
    {
      title: "Dedicated Key Account Manager & Weekly Pipeline Standup",
      badge: "Tier 1 Dedicated",
      desc: "Assigned Senior Credit Analyst (Zylo Finance Lead) with weekly 30-min tactical deal triage via Zoom or FinConnect voice hub.",
    },
    {
      title: "Escalated ASIC Filings & Compliance Checks",
      badge: "Included",
      desc: "Real-time alerts on directorial changes, corporate restructuring, gazette publication notices, and annual review certifications.",
    },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Shield className="w-4 h-4 text-violet-500" />
          Authorized Services & Inclusions
        </h3>
        <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-500">
          Covered Under Retainer
        </span>
      </div>

      <div className="space-y-3">
        {services.map((item, index) => (
          <div
            key={index}
            className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                {item.title}
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                {item.badge}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground pl-5">
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

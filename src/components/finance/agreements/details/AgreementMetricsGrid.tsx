"use client";

import React from "react";
import { DollarSign, ShieldCheck, FileText, Calendar } from "lucide-react";

export function AgreementMetricsGrid() {
  const metrics = [
    {
      title: "Monthly Retainer Value",
      value: "$3,500.00",
      subtext: "/ mo",
      footerLeft: "$42,000.00 Annual Value",
      footerRight: "Direct Debit",
      icon: <DollarSign className="w-4 h-4 text-violet-500" />,
      bgIcon: "bg-violet-500/10",
    },
    {
      title: "SLA Response Compliance",
      value: "99.4%",
      subtext: "",
      footerLeft: "Avg resp 42m (target 2h)",
      footerRight: "0 breaches",
      footerRightColor: "text-emerald-500",
      icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />,
      bgIcon: "bg-emerald-500/10",
    },
    {
      title: "Invoiced to Date",
      value: "$14,000.00",
      subtext: "",
      footerLeft: "4 of 12 cycles billed",
      footerRight: "100% paid on time",
      icon: <FileText className="w-4 h-4 text-blue-500" />,
      bgIcon: "bg-blue-500/10",
    },
    {
      title: "Next Billing Date",
      value: "01 May 2026",
      subtext: "",
      footerLeft: "Auto-Invoice #INV-3420",
      footerRight: "In 16 days",
      footerRightColor: "text-amber-500",
      icon: <Calendar className="w-4 h-4 text-amber-500" />,
      bgIcon: "bg-amber-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((item, index) => (
        <div
          key={index}
          className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {item.title}
            </span>
            <div
              className={`w-8 h-8 rounded-xl ${item.bgIcon} flex items-center justify-center`}
            >
              {item.icon}
            </div>
          </div>

          <div className="flex items-baseline gap-1">
            <h3 className="text-xl font-bold text-foreground">{item.value}</h3>
            {item.subtext && (
              <span className="text-xs text-muted-foreground">
                {item.subtext}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border text-[11px] text-muted-foreground">
            <span>{item.footerLeft}</span>
            <span
              className={`font-semibold ${item.footerRightColor || "text-foreground"}`}
            >
              {item.footerRight}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

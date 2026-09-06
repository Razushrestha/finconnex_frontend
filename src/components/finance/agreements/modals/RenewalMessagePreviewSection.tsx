"use client";

import React from "react";
import { FileText, Eye } from "lucide-react";

export function RenewalMessagePreviewSection() {
  const attachments = [
    {
      title: "Agreement_Renewal_Addendum_2027_Draft.pdf",
      size: "1.4 MB • Auto-compiled with new rate table",
    },
    {
      title: "SLA_Performance_Scorecard_2026_YTD.pdf",
      size: "820 KB • 99.4% SLA adherence certificate",
    },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground font-semibold text-[11px] flex items-center justify-center">
            4
          </span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Message Preview & Attached Documentation
          </h3>
        </div>
        <button
          type="button"
          className="text-xs font-medium text-primary hover:underline cursor-pointer"
        >
          Resello Default Template
        </button>
      </div>

      {/* Notice Letter Body Box */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-medium text-muted-foreground block">
          Notice Letter Body
        </span>
        <div className="p-3.5 rounded-xl bg-muted/30 border border-border text-xs text-muted-foreground space-y-2 leading-relaxed">
          <p className="font-semibold text-foreground">
            Dear David and Marcus,
          </p>
          <p>
            Please find attached the renewal schedule and addendum for Service
            Agreement AGR-2026-01 for the upcoming 2027 calendar term. As
            discussed, this includes continuity of our Tier 1 Priority SLA
            coverage, dedicated Key Account Manager support, and updated rate...
          </p>
        </div>
      </div>

      {/* Automated Attachments */}
      <div className="space-y-2">
        <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground block">
          Automated Attachments (2 Files Included)
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {attachments.map((file, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {file.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {file.size}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { ShieldCheck, Download } from "lucide-react";

interface ExecutionBannerProps {
  statusData?: {
    statusTitle?: string;
    badgeText?: string;
    checksum?: string;
    onDownloadBundle?: () => void;
  };
}

export function ExecutionStatusBanner({ statusData }: ExecutionBannerProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
      <div className="flex items-start sm:items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              {statusData?.statusTitle || "Pending Execution"}
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              {statusData?.badgeText || "Awaiting Verification"}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground font-mono truncate max-w-md">
            SHA-256 Checksum: {statusData?.checksum || "---"}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={statusData?.onDownloadBundle}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-primary-foreground bg-primary hover:opacity-90 transition-colors cursor-pointer self-start sm:self-auto shrink-0"
      >
        <Download className="w-4 h-4" />
        Download Executed Bundle (ZIP)
      </button>
    </div>
  );
}

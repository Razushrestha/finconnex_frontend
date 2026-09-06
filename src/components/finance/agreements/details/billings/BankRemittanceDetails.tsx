"use client";

import React from "react";
import { Building2, Pencil } from "lucide-react";

interface BankDetails {
  bankName?: string;
  bsb?: string;
  account?: string;
  remittanceEmail?: string;
  abn?: string;
}

interface BankRemittanceProps {
  bankDetails?: BankDetails;
  onEditDetails?: () => void;
}

export function BankRemittanceDetails({
  bankDetails,
  onEditDetails,
}: BankRemittanceProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Building2 className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Bank Account & Remittance Advice Details
          </h3>
        </div>
        <button
          type="button"
          onClick={onEditDetails}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
        >
          <Pencil className="w-3 h-3 text-muted-foreground" />
          Edit Details
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Box 1: Bank Details */}
        <div className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-1.5">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground block">
            Direct Debit Institution
          </span>
          <p className="text-xs font-bold text-foreground">
            {bankDetails?.bankName || "No bank specified"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            BSB: {bankDetails?.bsb || "---"} • Acc:{" "}
            {bankDetails?.account || "---"}
          </p>
          <span className="text-[10px] text-muted-foreground block pt-1">
            Pending authorization
          </span>
        </div>

        {/* Box 2: Remittance Notification */}
        <div className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-1.5">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground block">
            Remittance Notification
          </span>
          <p className="text-xs font-bold text-foreground">
            {bankDetails?.remittanceEmail || "No email assigned"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            CC: Not configured
          </p>
          <span className="text-[10px] text-muted-foreground block pt-1">
            Configure auto-notifications
          </span>
        </div>

        {/* Box 3: Tax & GST Compliant */}
        <div className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-1.5">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground block">
            Tax & GST Compliant
          </span>
          <p className="text-xs font-bold text-foreground">
            {bankDetails?.abn ? `ABN ${bankDetails.abn}` : "ABN Not Provided"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            GST Status: Unspecified
          </p>
          <span className="text-[10px] text-muted-foreground block pt-1">
            Tax invoice settings required
          </span>
        </div>
      </div>
    </div>
  );
}

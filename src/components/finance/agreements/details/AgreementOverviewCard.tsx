"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";

interface AgreementOverviewCardProps {
  clientName: string;
  entityType: string;
  acn: string;
  agreementRef: string;
  msaRef: string;
  description: string;
  executedDate: string;
  signerName: string;
  billingCycle: string;
  paymentMethod: string;
}

export function AgreementOverviewCard({
  clientName,
  entityType,
  acn,
  agreementRef,
  msaRef,
  description,
  executedDate,
  signerName,
  billingCycle,
  paymentMethod,
}: AgreementOverviewCardProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row justify-between gap-6">
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl font-bold text-foreground">{clientName}</h2>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border">
            {entityType} • ACN {acn}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
          <span>
            Ref: <strong className="text-foreground">{agreementRef}</strong>
          </span>
          <span>•</span>
          <span>
            MSA Ref: <strong className="text-foreground">{msaRef}</strong>
          </span>
        </div>

        <p className="text-xs text-muted-foreground">{description}</p>

        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>
            Signed & Executed, {executedDate} by{" "}
            <strong className="text-foreground">{signerName}</strong> via
            FinConnect E-Sign
          </span>
        </div>
      </div>

      {/* Right side billing/payment badges */}
      <div className="flex lg:flex-col items-center lg:items-end justify-between gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 border-border">
        <div className="bg-muted/50 border border-border/60 rounded-xl p-3 text-left lg:text-right min-w-[160px]">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground block">
            Billing Cycle
          </span>
          <span className="text-xs font-bold text-foreground">
            {billingCycle}
          </span>
        </div>

        <div className="bg-muted/50 border border-border/60 rounded-xl p-3 text-left lg:text-right min-w-[160px]">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground block">
            Payment Method
          </span>
          <span className="text-xs font-bold text-foreground inline-flex items-center gap-1.5">
            💳 {paymentMethod}
          </span>
        </div>
      </div>
    </div>
  );
}

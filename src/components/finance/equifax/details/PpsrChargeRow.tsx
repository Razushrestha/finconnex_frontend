import React from "react";
import { Badge } from "@/components/ui/badge";

interface PpsrChargeRowProps {
  securedParty: string;
  registrationNo?: string;
  collateral?: string;
  registeredDate: string;
  expiryDate?: string;
  chargeClass?: string;
  chargeClassVariant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "ghost"
    | "link";
}

export default function PpsrChargeRow({
  securedParty,
  registrationNo,
  collateral,
  registeredDate,
  expiryDate,
  chargeClass,
  chargeClassVariant = "outline",
}: PpsrChargeRowProps) {
  return (
    <div className="rounded-xl border border-slate-100 p-3">
      <p className="text-sm font-medium text-slate-900">{securedParty}</p>
      {registrationNo && (
        <p className="text-xs text-slate-400">{registrationNo}</p>
      )}
      {collateral && (
        <p className="mt-1 text-xs text-slate-500">{collateral}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-slate-400">
          {registeredDate}
          {expiryDate ? ` · ${expiryDate}` : ""}
        </span>
        {chargeClass && (
          <Badge variant={chargeClassVariant}>{chargeClass}</Badge>
        )}
      </div>
    </div>
  );
}

import React from "react";
import { ShieldCheck } from "lucide-react";

interface VerificationFooterProps {
  title: string;
  detailLine?: string;
  auditRef?: string;
  onViewCertificate?: () => void;
}

export default function VerificationFooter({
  title,
  detailLine,
  auditRef,
  onViewCertificate,
}: VerificationFooterProps) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
        <div>
          <p className="text-sm font-medium text-emerald-800">{title}</p>
          {detailLine && (
            <p className="mt-0.5 text-xs text-emerald-700/80">{detailLine}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 pl-6 sm:pl-0">
        {auditRef && (
          <span className="text-[11px] text-emerald-700/70">{auditRef}</span>
        )}
        <button
          onClick={onViewCertificate}
          className="text-xs font-medium text-violet-600 hover:underline"
        >
          View Certificate
        </button>
      </div>
    </div>
  );
}

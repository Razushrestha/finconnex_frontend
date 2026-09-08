import React from "react";
import { CalendarCheck2 } from "lucide-react";
import SectionCard from "@/components/finance/equifax/details/SectionCard";
import FacilityRepaymentRow from "@/components/finance/equifax/details/FacilityRepaymentRow";
import { RepaymentLegend } from "@/components/finance/equifax/details/MonthDotTimeline";

interface CcrHistoryTabProps {
  facilities: any[];
}

export default function CcrHistoryTab({ facilities }: CcrHistoryTabProps) {
  return (
    <SectionCard
      icon={<CalendarCheck2 className="h-4 w-4" />}
      title="Comprehensive Credit Reporting (CCR) — 24-Month Repayment History Matrix"
    >
      <p className="mb-4 text-xs text-slate-500">
        Mandatory data reported under the National Consumer Credit Protection
        Act &amp; Australian Privacy Act (CCR Regime). Bureau data synchronized
        live.
      </p>
      <div className="flex flex-col gap-4">
        {facilities.map((f) => (
          <FacilityRepaymentRow key={f.provider} {...f} />
        ))}
      </div>
      <div className="mt-4">
        <RepaymentLegend />
      </div>
    </SectionCard>
  );
}

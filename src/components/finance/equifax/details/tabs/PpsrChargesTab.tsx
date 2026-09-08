import React from "react";
import { ShieldQuestion } from "lucide-react";
import SectionCard from "@/components/finance/equifax/details/SectionCard";
import PpsrChargeRow from "@/components/finance/equifax/details/PpsrChargeRow";

interface PpsrChargesTabProps {
  ppsrCharges: any[];
}

export default function PpsrChargesTab({ ppsrCharges }: PpsrChargesTabProps) {
  return (
    <SectionCard
      icon={<ShieldQuestion className="h-4 w-4" />}
      title="Personal Property Securities Register (PPSR) Detailed Charges"
      rightLabel="2 Active Registrations"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-slate-400">
          Search Certificate verified under Australian PPSR Section 174
        </span>
        <button
          onClick={() => window.print()}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 shadow-sm"
        >
          Download PPSR Cert
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {ppsrCharges.map((c) => (
          <PpsrChargeRow key={c.registrationNo} {...c} />
        ))}
      </div>
    </SectionCard>
  );
}

"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { LeadCardData } from "@/lib/leads/types";
import { cn } from "@/lib/utils";
import { PortalFactFindLoanPrefs } from "@/components/portals/public/mortgage/PortalFactFindLoanPrefs";
import { PortalFactFindProperty } from "@/components/portals/public/mortgage/PortalFactFindProperty";
import {
  useLeadFactFind,
  type LeadFactFindPatch,
} from "@/components/sales/leads/detail/useLeadFactFind";

type StrategySection = "property" | "loan";

const SECTIONS: { id: StrategySection; label: string }[] = [
  { id: "property", label: "Property details" },
  { id: "loan", label: "Loan preferences" },
];

export function LeadStrategyPanel({
  card,
  onLeadPatch,
}: {
  card: LeadCardData;
  onLeadPatch?: (patch: LeadFactFindPatch) => void;
}) {
  const [open, setOpen] = useState(true);
  const [section, setSection] = useState<StrategySection>("property");
  const { valueOf, onChange, disabled } = useLeadFactFind(card, onLeadPatch);

  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <aside className="w-[230px] shrink-0 border-r border-slate-100 bg-[#FAF9FC] px-3 py-4">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-2 px-1"
        >
          <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#5A32A3]">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5A32A3] text-[11px] font-bold text-white">
              3
            </span>
            Property & Loan
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-[#5A32A3] transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
        {open ? (
          <div className="relative mt-3 pl-4">
            <span className="absolute top-1 bottom-1 left-[15px] border-l border-dashed border-slate-200" />
            <nav className="relative space-y-1.5">
              {SECTIONS.map((item) => {
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSection(item.id)}
                    className={cn(
                      "relative z-10 block w-full rounded-xl px-3 py-2 text-left text-[13px] font-medium",
                      active
                        ? "border border-[#5A32A3]/30 bg-white text-[#5A32A3] shadow-[0_1px_2px_rgba(90,50,163,0.08)]"
                        : "text-slate-600 hover:bg-white/70",
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        ) : null}
      </aside>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-5">
        <div className="max-w-[720px] [&_.mt-6]:mt-0 [&_.mt-7]:mt-0">
          {section === "property" ? (
            <PortalFactFindProperty
              valueOf={valueOf}
              disabled={disabled}
              onChange={onChange}
            />
          ) : (
            <PortalFactFindLoanPrefs
              valueOf={valueOf}
              disabled={disabled}
              onChange={onChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}

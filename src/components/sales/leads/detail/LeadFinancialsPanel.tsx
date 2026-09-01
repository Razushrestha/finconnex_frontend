"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { LeadCardData } from "@/lib/leads/types";
import { leadApplicants } from "@/lib/leads/detail-snapshot";
import { cn } from "@/lib/utils";
import { ApplicantCreditCard } from "@/components/sales/leads/detail/ApplicantCreditCard";
import {
  buildCreditReport,
  CreditReportBody,
} from "@/components/sales/leads/detail/CreditReportDrawer";
import { PortalFactFindAssets } from "@/components/portals/public/mortgage/PortalFactFindAssets";
import { PortalFactFindEmployment } from "@/components/portals/public/mortgage/PortalFactFindEmployment";
import { PortalFactFindExpenses } from "@/components/portals/public/mortgage/PortalFactFindExpenses";
import { PortalFactFindIncome } from "@/components/portals/public/mortgage/PortalFactFindIncome";
import { PortalFactFindLiabilities } from "@/components/portals/public/mortgage/PortalFactFindLiabilities";
import {
  useLeadFactFind,
  type ApplicantRole,
} from "@/components/sales/leads/detail/useLeadFactFind";

type FinanceSection =
  | "income"
  | "employment"
  | "assets"
  | "liabilities"
  | "expenses"
  | "credit";

const SECTIONS: { id: FinanceSection; label: string }[] = [
  { id: "income", label: "Income" },
  { id: "employment", label: "Your 3 year employment history" },
  { id: "assets", label: "Assets" },
  { id: "liabilities", label: "Liabilities" },
  { id: "expenses", label: "Expenses" },
  { id: "credit", label: "Credit Score" },
];

export function LeadFinancialsPanel({
  card,
  onLeadPatch,
}: {
  card: LeadCardData;
  onLeadPatch?: (patch: {
    custom?: Record<string, string>;
    estimatedValue?: string;
  }) => void;
}) {
  const [open, setOpen] = useState(true);
  const [section, setSection] = useState<FinanceSection>("income");
  const applicants = leadApplicants(card);
  const hasSecondary = card.custom?.secondaryApplicant === "Yes";

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
              2
            </span>
            Your finances
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
        <div
          className={cn(
            hasSecondary
              ? "grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-0"
              : "max-w-[720px]",
          )}
        >
          <ApplicantFinanceColumn
            role="primary"
            label={hasSecondary ? "Primary applicant" : undefined}
            name={applicants[0]?.name ?? card.name}
            card={card}
            section={section}
            onLeadPatch={onLeadPatch}
          />
          {hasSecondary ? (
            <div className="border-t border-slate-200 pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
              <ApplicantFinanceColumn
                role="secondary"
                label="Secondary applicant"
                name={applicants[1]?.name ?? "Secondary applicant"}
                card={card}
                section={section}
                onLeadPatch={onLeadPatch}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ApplicantFinanceColumn({
  role,
  label,
  name,
  card,
  section,
  onLeadPatch,
}: {
  role: ApplicantRole;
  label?: string;
  name: string;
  card: LeadCardData;
  section: FinanceSection;
  onLeadPatch?: (patch: {
    custom?: Record<string, string>;
    estimatedValue?: string;
  }) => void;
}) {
  const { valueOf, onChange, disabled } = useLeadFactFind(
    card,
    onLeadPatch,
    role,
  );
  const report = buildCreditReport(`${card.id}:${role}:${name}`, name, true);

  return (
    <div className="min-w-0 [&_.mt-6]:mt-0 [&_.mt-7]:mt-0">
      {label ? (
        <p className="mb-3 text-[11px] font-semibold tracking-[0.07em] text-[#5A32A3] uppercase">
          {label}
        </p>
      ) : null}

      {section === "income" ? (
        <PortalFactFindIncome
          valueOf={valueOf}
          disabled={disabled}
          onChange={onChange}
          paygLabel="PAYG"
          showPeriodHint={false}
          showCombinedTotal={false}
          showTopTotal
        />
      ) : null}

      {section === "employment" ? (
        <PortalFactFindEmployment
          valueOf={valueOf}
          disabled={disabled}
          onChange={onChange}
        />
      ) : null}

      {section === "assets" ? (
        <PortalFactFindAssets
          valueOf={valueOf}
          disabled={disabled}
          onChange={onChange}
        />
      ) : null}

      {section === "liabilities" ? (
        <PortalFactFindLiabilities
          valueOf={valueOf}
          disabled={disabled}
          onChange={onChange}
        />
      ) : null}

      {section === "expenses" ? (
        <PortalFactFindExpenses
          valueOf={valueOf}
          disabled={disabled}
          onChange={onChange}
        />
      ) : null}

      {section === "credit" ? (
        <div>
          <h2 className="text-[16px] font-semibold text-slate-900">
            Credit Score
          </h2>
          <p className="mt-1 mb-4 text-[13px] text-slate-500">
            Equifax Apply Score and file summary.
          </p>
          <ApplicantCreditCard
            role={role}
            roleLabel={
              role === "primary" ? "Primary applicant" : "Secondary applicant"
            }
            name={name}
            card={card}
            onLeadPatch={onLeadPatch}
          />
          <div className="mt-6 rounded-2xl border border-slate-200 px-4 py-3">
            <CreditReportBody report={report} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

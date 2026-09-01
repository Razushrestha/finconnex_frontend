"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LoanJourneyStepper } from "@/components/portals/public/mortgage/LoanJourneyStepper";
import { useMortgagePortal } from "@/components/portals/public/mortgage/useMortgagePortal";
import {
  JOURNEY_COPY,
  JOURNEY_STAGES,
  stageStatus,
} from "@/lib/portals/mortgage";
import { cn } from "@/lib/utils";

export function PortalJourneyClient({ slug }: { slug: string }) {
  const { mortgage } = useMortgagePortal(slug);
  if (!mortgage) return null;

  return (
    <div className="space-y-5 pb-10">
      <div>
        <h1 className="text-[24px] font-bold tracking-tight text-slate-900">Loan Journey</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Follow each stage from fact find through to settlement.
        </p>
      </div>

      <LoanJourneyStepper slug={slug} current={mortgage.currentStage} />

      <div className="space-y-3">
        {JOURNEY_STAGES.map((stage) => {
          const status = stageStatus(stage.id, mortgage.currentStage);
          const copy = JOURNEY_COPY[stage.id];
          return (
            <section
              key={stage.id}
              id={stage.id}
              className={cn(
                "scroll-mt-6 rounded-2xl border bg-white p-5",
                status === "current"
                  ? "border-[#5A32A3] shadow-[0_0_0_3px_rgba(90,50,163,0.08)]"
                  : "border-slate-100",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[15px] font-bold text-slate-900">{copy.title}</h2>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                    status === "done" && "bg-emerald-50 text-emerald-700",
                    status === "current" && "bg-violet-50 text-[#5A32A3]",
                    status === "upcoming" && "bg-slate-100 text-slate-500",
                  )}
                >
                  {status === "done" ? "Done" : status === "current" ? "Current" : "Upcoming"}
                </span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{copy.body}</p>
              {stage.id === "fact-find" ? (
                <Link
                  href={`/p/${slug}/fact-find`}
                  className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-[#5A32A3]"
                >
                  Open fact find <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
              {stage.id === "documents" ? (
                <Link
                  href={`/p/${slug}/documents`}
                  className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-[#5A32A3]"
                >
                  Open documents <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
              {stage.id === "recommendation" || stage.id === "assessment" ? (
                <Link
                  href={`/p/${slug}/loan`}
                  className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-[#5A32A3]"
                >
                  View proposed loan <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}

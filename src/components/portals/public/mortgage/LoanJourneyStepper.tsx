import Link from "next/link";
import {
  BadgeCheck,
  Check,
  ClipboardList,
  FileSearch,
  FileText,
  Home,
  Lightbulb,
  Send,
} from "lucide-react";
import {
  JOURNEY_STAGES,
  journeyPercent,
  stageStatus,
  type JourneyStageId,
} from "@/lib/portals/mortgage";
import { cn } from "@/lib/utils";

const ICONS: Record<JourneyStageId, typeof Home> = {
  "fact-find": ClipboardList,
  documents: FileText,
  assessment: FileSearch,
  recommendation: Lightbulb,
  application: Send,
  approval: BadgeCheck,
  settlement: Home,
};

export function LoanJourneyStepper({
  slug,
  current,
  compact = false,
}: {
  slug: string;
  current: JourneyStageId;
  compact?: boolean;
}) {
  const percent = journeyPercent(current);

  return (
    <section
      className={cn(
        "rounded-xl border border-slate-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]",
        compact ? "px-3 py-2.5" : "p-5",
      )}
    >
      <div className={cn("flex items-start justify-between gap-3", compact ? "mb-2" : "mb-5")}>
        <div>
          <h2
            className={cn(
              "font-bold tracking-tight text-slate-900",
              compact ? "text-[13px]" : "text-[16px]",
            )}
          >
            Your Loan Journey
          </h2>
          {!compact ? (
            <p className="mt-0.5 text-[12px] text-slate-500">
              We’ll keep this updated as your application moves forward.
            </p>
          ) : null}
        </div>
        <div className="text-right">
          <div className={cn("font-bold text-[#5A32A3]", compact ? "text-[11px]" : "text-[13px]")}>
            {percent}% Complete
          </div>
        </div>
      </div>

      <div className="relative px-1">
        <div className={cn("absolute right-[8%] left-[8%] h-0.5 bg-slate-200", compact ? "top-3.5" : "top-4")} />
        <div
          className={cn("absolute left-[8%] h-0.5 bg-emerald-400", compact ? "top-3.5" : "top-4")}
          style={{ width: `calc(${(percent / 100) * 84}%)` }}
        />
        <div className="relative flex justify-between">
          {JOURNEY_STAGES.map((stage) => {
            const status = stageStatus(stage.id, current);
            const Icon = ICONS[stage.id];
            return (
              <Link
                key={stage.id}
                href={`/p/${slug}/journey#${stage.id}`}
                className={cn(
                  "flex flex-col items-center text-center",
                  compact ? "w-14 sm:w-16" : "w-16 sm:w-20",
                )}
              >
                <span
                  className={cn(
                    "flex items-center justify-center rounded-full ring-4 ring-white",
                    status === "done" && "bg-emerald-500 text-white",
                    status === "current" && "bg-[#5A32A3] text-white",
                    status === "upcoming" && "bg-slate-100 text-slate-400",
                    compact ? "h-7 w-7" : "h-9 w-9",
                  )}
                >
                  {status === "done" ? (
                    <Check className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} strokeWidth={2.5} />
                  ) : (
                    <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
                  )}
                </span>
                <span
                  className={cn(
                    "leading-tight font-semibold",
                    compact ? "mt-1 text-[9px]" : "mt-2 text-[10px]",
                    status === "current" && "text-[#5A32A3]",
                    status === "done" && "text-slate-700",
                    status === "upcoming" && "text-slate-400",
                  )}
                >
                  {stage.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

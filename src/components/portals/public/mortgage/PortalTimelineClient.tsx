"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useMortgagePortal } from "@/components/portals/public/mortgage/useMortgagePortal";
import { cn } from "@/lib/utils";

export function PortalTimelineClient({ slug }: { slug: string }) {
  const { mortgage } = useMortgagePortal(slug);
  if (!mortgage) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10">
      <Link
        href={`/p/${slug}`}
        className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to home
      </Link>
      <div>
        <h1 className="text-[24px] font-bold tracking-tight text-slate-900">Timeline</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Everything that has happened on your application so far.
        </p>
      </div>
      <ol className="rounded-2xl border border-slate-100 bg-white p-5">
        {mortgage.timeline.map((ev, i) => (
          <li key={ev.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full",
                  ev.done ? "bg-[#5A32A3] text-white" : "border-2 border-[#5A32A3] bg-white",
                )}
              >
                {ev.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
              </span>
              {i < mortgage.timeline.length - 1 ? (
                <span className="w-px flex-1 bg-slate-200" />
              ) : null}
            </div>
            <div className="pb-5">
              <div className="text-[13px] font-semibold text-slate-900">{ev.title}</div>
              <div className="text-[11px] text-slate-400">{ev.at}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

"use client";

import { ExternalLink, Sparkles } from "lucide-react";

export function TaskSidebarContext() {
  return (
    <section className="border-b border-slate-100 pb-6">
      <h2 className="mb-3 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
        Context
      </h2>
      <div className="mb-4 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-800">
          Acme Corp - Q4 Renewal
        </span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </div>

      <div className="flex items-start gap-1.5">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5A32A3]" />
        <div>
          <p className="text-xs font-semibold text-[#5A32A3]">AI Suggestion</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            Best time to contact Acme Corp stakeholders is tomorrow between
            10:00 AM - 11:30 AM EST.
          </p>
        </div>
      </div>
    </section>
  );
}

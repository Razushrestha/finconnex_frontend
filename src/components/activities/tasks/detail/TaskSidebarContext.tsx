"use client";

import { useState } from "react";
import { ExternalLink, Sparkles } from "lucide-react";
import { useTaskSectionEdit } from "./TaskEditContext";

export function TaskSidebarContext() {
  const [context, setContext] = useState("Acme Corp - Q4 Renewal");
  const [draft, setDraft] = useState(context);

  const editing = useTaskSectionEdit({
    start() {
      setDraft(context);
    },
    save() {
      setContext(draft.trim() || context);
    },
    cancel() {
      setDraft(context);
    },
  });

  return (
    <section className="border-b border-slate-100 pb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
          Context
        </h2>
      </div>
      <div className="mb-4 flex items-center justify-between gap-2">
        {editing ? (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-w-0 flex-1 border-b border-slate-200 bg-transparent text-sm font-medium text-slate-800 outline-none focus:border-violet-400"
          />
        ) : (
          <span className="text-sm font-medium text-slate-800">{context}</span>
        )}
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

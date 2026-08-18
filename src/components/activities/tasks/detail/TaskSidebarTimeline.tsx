"use client";

import { useState } from "react";
import { Clock, Send } from "lucide-react";
import { MentionInput } from "@/components/shared/MentionInput";

export function TaskSidebarTimeline() {
  const [comment, setComment] = useState("");

  return (
    <section className="py-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
          Timeline
        </h2>
      </div>

      <div className="relative space-y-5 before:absolute before:top-2 before:bottom-2 before:left-3.5 before:w-px before:bg-slate-100">
        <div className="relative flex gap-3">
          <span className="z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F3ECFB] text-[10px] font-bold text-[#5A32A3]">
            AS
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-slate-800">
              Alex Sterling{" "}
              <span className="text-[10px] font-normal text-slate-400">
                2h ago
              </span>
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              I&apos;ve attached the initial draft of the metrics. Still waiting
              on the APAC numbers from Sarah.
            </p>
          </div>
        </div>

        <div className="relative flex gap-3">
          <span className="z-10 flex h-7 w-7 shrink-0 items-center justify-center bg-slate-100 text-[10px] text-slate-500">
            <Clock className="h-3 w-3" />
          </span>
          <div className="min-w-0 flex-1 pt-1">
            <p className="text-[11px] text-slate-500">
              <span className="font-medium text-slate-800">Status changed</span>{" "}
              to In Progress
            </p>
          </div>
        </div>
      </div>

      <div className="relative mt-5 pt-4">
        <MentionInput
          value={comment}
          onChange={setComment}
          placeholder="Type @ to mention..."
          data-task-timeline-input
          className="w-full border-0 border-b border-slate-200 bg-transparent py-1.5 pr-7 text-xs text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-0"
        />
        <button
          type="button"
          className="absolute top-6 right-0 text-slate-400 hover:text-slate-700"
        >
          <Send className="h-3 w-3" />
        </button>
      </div>
    </section>
  );
}

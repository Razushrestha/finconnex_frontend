"use client";

import { useState } from "react";
import { Send } from "lucide-react";
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

      <div className="relative space-y-5">
        <p className="text-xs text-slate-400">No timeline activity yet.</p>
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

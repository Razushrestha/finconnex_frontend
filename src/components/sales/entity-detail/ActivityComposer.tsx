"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import type { ActivityComposerProps } from "./types";
import { Panel } from "./shared";

export function ActivityComposer({
  placeholder = "Share a quick update, note or a log",
  onSubmit,
  submitLabel = "Post",
}: ActivityComposerProps) {
  const [value, setValue] = useState("");

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue("");
  }

  return (
    <Panel className="p-3">
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-800 placeholder:text-slate-400 outline-none transition-colors focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!value.trim()}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-violet-600 px-4 text-[13px] font-semibold text-white shadow-sm shadow-violet-600/15 transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitLabel}
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </Panel>
  );
}

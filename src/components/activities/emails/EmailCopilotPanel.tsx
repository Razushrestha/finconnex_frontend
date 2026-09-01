"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Sparkles } from "lucide-react";
import type { Email } from "@/lib/emails/types";
import {
  COPILOT_PROMPTS,
  runMailCopilot,
  type CopilotAnswer,
} from "@/lib/emails/outlook";

interface EmailCopilotPanelProps {
  emails: Email[];
  onClose?: () => void;
}

export function EmailCopilotPanel({ emails, onClose }: EmailCopilotPanelProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState<CopilotAnswer | null>(null);

  function run(next: string) {
    const text = next.trim();
    if (!text) return;
    setPrompt(text);
    setAnswer(runMailCopilot(text, emails));
  }

  return (
    <div className="flex h-full w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#5A32A3]">
          <Sparkles className="h-3.5 w-3.5" />
          Copilot
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {!answer ? (
          <>
            <p className="mb-2 text-[11px] text-slate-500">
              Ask about this mailbox, or pick a ready prompt.
            </p>
            <div className="space-y-1.5">
              {COPILOT_PROMPTS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => run(item)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-[12px] font-medium text-slate-700 hover:border-violet-200 hover:bg-[#F8F4FC]"
                >
                  {item}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div>
            <p className="text-[11px] font-semibold text-[#5A32A3]">{answer.prompt}</p>
            <p className="mt-1 text-[12px] text-slate-600">{answer.summary}</p>
            <div className="mt-2 space-y-1.5">
              {answer.hits.map((hit) => (
                <button
                  key={hit.id}
                  type="button"
                  onClick={() => router.push(`/activities/emails/detail/${hit.id}`)}
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-left hover:bg-[#F8F4FC]"
                >
                  <p className="truncate text-[12px] font-semibold text-slate-800">
                    {hit.title}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">{hit.detail}</p>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setAnswer(null)}
              className="mt-3 text-[11px] font-semibold text-[#5A32A3]"
            >
              New prompt
            </button>
          </div>
        )}
      </div>

      <form
        className="border-t border-slate-100 p-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(prompt);
        }}
      >
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 pr-1">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask Copilot..."
            className="h-9 min-w-0 flex-1 bg-transparent px-3 text-[12px] outline-none"
          />
          <button
            type="submit"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
            style={{ backgroundColor: "#5A32A3" }}
            aria-label="Send prompt"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}

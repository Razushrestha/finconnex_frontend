"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubjectSuggestion } from "@/lib/emails/ai-compose";
import { requestEmailSubjects } from "@/lib/emails/request-email-ai";

interface SubjectImproveButtonProps {
  current: string;
  body?: string;
  recipientName?: string;
  onPick: (subject: string) => void;
}

export function SubjectImproveButton({
  current,
  body,
  recipientName,
  onPick,
}: SubjectImproveButtonProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SubjectSuggestion[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  async function load() {
    setOpen(true);
    setBusy(true);
    setError(null);
    try {
      const rows = await requestEmailSubjects({
        subject: current,
        html: body,
        recipientName,
      });
      setSuggestions(rows);
    } catch (err) {
      setSuggestions([]);
      setError(err instanceof Error ? err.message : "Could not suggest subjects.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : void load())}
        className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[12px] font-semibold text-[#5A32A3] hover:bg-violet-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        Improve subject
      </button>
      {open ? (
        <div className="absolute top-9 right-0 z-30 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <p className="border-b border-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-500">
            AI subject suggestions
          </p>
          {busy ? (
            <p className="px-3 py-3 text-[12px] text-slate-500">Writing suggestions…</p>
          ) : error ? (
            <p className="px-3 py-3 text-[12px] text-rose-600">{error}</p>
          ) : (
            suggestions.map((item) => (
              <button
                key={item.text}
                type="button"
                onClick={() => {
                  onPick(item.text);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full flex-col items-start px-3 py-2 text-left hover:bg-slate-50",
                  item.recommended && "bg-[#F8F4FC]",
                )}
              >
                <span className="text-[12px] font-medium text-slate-800">{item.text}</span>
                {item.recommended ? (
                  <span className="mt-0.5 text-[10px] font-semibold text-[#5A32A3]">
                    Recommended{item.reason ? ` · ${item.reason}` : ""}
                  </span>
                ) : item.reason ? (
                  <span className="mt-0.5 text-[10px] text-slate-400">{item.reason}</span>
                ) : null}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

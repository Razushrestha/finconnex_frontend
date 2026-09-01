"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { suggestSubjects } from "@/lib/emails/ai-compose";

interface SubjectImproveButtonProps {
  current: string;
  recipientName?: string;
  dealTitle?: string;
  dealStage?: string;
  onPick: (subject: string) => void;
}

export function SubjectImproveButton({
  current,
  recipientName,
  dealTitle,
  dealStage,
  onPick,
}: SubjectImproveButtonProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const suggestions = suggestSubjects({
    current,
    recipientName,
    dealTitle,
    dealStage,
  });

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[12px] font-semibold text-[#5A32A3] hover:bg-violet-50"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Improve subject
      </button>
      {open ? (
        <div className="absolute top-9 right-0 z-30 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <p className="border-b border-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-500">
            AI subject suggestions
          </p>
          {suggestions.map((item) => (
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
                  Recommended · {item.reason}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

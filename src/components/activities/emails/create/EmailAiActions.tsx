"use client";

import { useEffect, useRef, useState } from "react";
import {
  Award,
  Briefcase,
  Lightbulb,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Shirt,
  Smile,
  Target,
  TextAlignStart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EmailTone } from "@/lib/emails/ai-compose";

const TONES: { id: EmailTone; label: string; icon: typeof Smile }[] = [
  { id: "friendly", label: "Friendly", icon: Smile },
  { id: "warm", label: "Casual", icon: Shirt },
  { id: "professional", label: "Informative", icon: MessageSquareText },
  { id: "persuasive", label: "Persuasive", icon: Target },
  { id: "confident", label: "Confident", icon: Award },
  { id: "formal", label: "Formal", icon: Briefcase },
];

interface EmailAiActionsProps {
  busy?: boolean;
  onTone: (tone: EmailTone) => void;
  onShorten: () => void;
  onClarity: () => void;
  onRegenerate: () => void;
}

export function EmailAiActions({
  busy,
  onTone,
  onShorten,
  onClarity,
  onRegenerate,
}: EmailAiActionsProps) {
  const [toneOpen, setToneOpen] = useState(false);
  const toneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!toneOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!toneRef.current?.contains(event.target as Node)) setToneOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [toneOpen]);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="relative" ref={toneRef}>
        <AiChip
          disabled={busy}
          active={toneOpen}
          onClick={() => setToneOpen((open) => !open)}
        >
          <Briefcase className="h-3.5 w-3.5" />
          Change tone
        </AiChip>
        {toneOpen ? (
          <div className="absolute bottom-9 left-0 z-30 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {TONES.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onTone(item.id);
                    setToneOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                >
                  <Icon className="h-3.5 w-3.5 text-slate-500" />
                  {item.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      <AiChip disabled={busy} onClick={onShorten}>
        <TextAlignStart className="h-3.5 w-3.5" />
        Shorten
      </AiChip>
      <AiChip disabled={busy} onClick={onClarity}>
        <Lightbulb className="h-3.5 w-3.5" />
        Improve clarity
      </AiChip>
      <AiChip disabled={busy} onClick={onRegenerate}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        Regenerate
      </AiChip>
    </div>
  );
}

function AiChip({
  children,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md border bg-white px-2.5 text-[12px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50",
        active ? "border-slate-400" : "border-slate-300",
      )}
    >
      {children}
    </button>
  );
}

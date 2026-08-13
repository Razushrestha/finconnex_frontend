"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface CallTranscriptProps {
  notes?: string;
  assignedTo: string;
}

export function CallTranscriptSection({
  notes,
  assignedTo,
}: CallTranscriptProps) {
  const [activeTab, setActiveTab] = useState<"transcript" | "notes">(
    "transcript",
  );

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="mb-6 flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("transcript")}
          className={cn(
            "pb-3 text-sm font-semibold transition-colors relative mr-8",
            activeTab === "transcript"
              ? "text-foreground border-b-2 border-primary -mb-px"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Transcript
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("notes")}
          className={cn(
            "pb-3 text-sm font-semibold transition-colors relative",
            activeTab === "notes"
              ? "text-foreground border-b-2 border-primary -mb-px"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Notes & Log
        </button>
      </div>

      {activeTab === "transcript" ? (
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-bold text-secondary-foreground">
              {assignedTo
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">
                  {assignedTo}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  00:00
                </span>
              </div>
              <div className="rounded-xl p-3.5 text-xs text-foreground leading-relaxed bg-accent/40 border border-border/60">
                Hi, following up regarding the scheduled call details and
                requirements discussed previously.
              </div>
            </div>
          </div>

          <div className="pt-4 text-center">
            <span className="inline-block rounded-full bg-secondary px-4 py-1 font-mono text-[11px] text-muted-foreground">
              Call Logged
            </span>
          </div>
        </div>
      ) : (
        <div className="py-8 text-xs text-foreground">
          {notes ? (
            <p>{notes}</p>
          ) : (
            <span className="text-muted-foreground">
              No custom notes logged for this call.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

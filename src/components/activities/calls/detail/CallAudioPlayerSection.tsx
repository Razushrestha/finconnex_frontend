"use client";

import { Play, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function CallAudioPlayerSection() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-white p-4 shadow-sm">
      <button
        type="button"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:opacity-90"
      >
        <Play className="h-4 w-4 fill-current ml-0.5" />
      </button>

      <div className="flex flex-1 items-center gap-1">
        {[
          30, 45, 60, 20, 80, 50, 90, 100, 70, 40, 60, 30, 50, 70, 90, 60, 40,
          30, 50, 20, 40, 60, 30, 20, 40, 50, 30, 20,
        ].map((height, i) => (
          <span
            key={i}
            style={{ height: `${height}%` }}
            className={cn(
              "w-1 rounded-full transition-all",
              i < 10 ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 text-xs font-mono text-muted-foreground min-w-[90px]">
        <span>01:12</span>
        <Volume2 className="h-4 w-4 text-muted-foreground" />
        <span>-02:30</span>
      </div>
    </div>
  );
}

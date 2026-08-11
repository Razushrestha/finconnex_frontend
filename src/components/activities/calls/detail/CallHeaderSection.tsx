"use client";

import {
  ArrowLeft,
  Share2,
  MoreVertical,
  Calendar,
  PhoneOutgoing,
} from "lucide-react";
import type { Call } from "@/lib/calls/types";

interface CallHeaderProps {
  call: Call;
  onBack: () => void;
}

export function CallHeaderSection({ call, onBack }: CallHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] font-bold tracking-wider text-sky-600 uppercase">
            <PhoneOutgoing className="h-3.5 w-3.5" />
            {call.callType} CALL
          </span>
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
            {call.status}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      <h1 className="text-xl font-bold text-foreground">{call.subject}</h1>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          {call.date}
        </span>
        {call.duration && (
          <span className="flex items-center gap-1">
            <span className="font-mono text-muted-foreground">⏱</span>
            {call.duration}
          </span>
        )}
      </div>
    </div>
  );
}

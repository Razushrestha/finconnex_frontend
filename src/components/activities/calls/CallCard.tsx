"use client";

import { Phone, Clock, User } from "lucide-react";
import type { Call } from "@/lib/calls/types";
import { initials, avatarColor } from "@/lib/activities/shared";
import { cn } from "@/lib/utils";
import { cardDragging, cardMotion } from "@/lib/motion";

interface CallCardProps {
  call: Call;
  columnId: string;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

export function CallCard({
  call,
  columnId,
  onDragStart,
  onDragEnd,
  isDragging,
}: CallCardProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-call-id={call.id}
      data-column-id={columnId}
      className={cn(
        "cursor-grab select-none rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm active:cursor-grabbing",
        cardMotion,
        isDragging && cardDragging,
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
          <Phone className="h-3 w-3" />
          {call.callType}
        </span>
      </div>

      <h4 className="mb-1 text-[13px] font-semibold text-slate-900">
        {call.subject}
      </h4>
      <p className="mb-3 truncate text-[11px] text-slate-500">
        {call.relatedTo || call.contact || "—"}
      </p>

      <div className="space-y-1.5 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 shrink-0 text-slate-400" />
          <span>{call.date}</span>
          {call.duration ? (
            <span className="text-slate-400">· {call.duration}</span>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <User className="h-3 w-3 shrink-0 text-slate-400" />
            <span>{call.assignedTo}</span>
          </div>
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${avatarColor(call.assignedTo)}`}
          >
            {initials(call.assignedTo)}
          </span>
        </div>
      </div>
    </div>
  );
}

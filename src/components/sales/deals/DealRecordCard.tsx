"use client";

import {
  Building2,
  DollarSign,
  Calendar,
  User,
  Percent,
} from "lucide-react";
import type { DealRecord } from "@/lib/deals/types";

interface DealRecordCardProps {
  deal: DealRecord;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}

export function DealRecordCard({
  deal,
  isDragging,
  onDragStart,
  onDragEnd,
}: DealRecordCardProps) {
  const weighted =
    deal.probability > 0
      ? `Weighted ${deal.probability}%`
      : "Lost";

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`w-full cursor-grab rounded-md border border-slate-200/80 bg-white p-3.5 shadow-2xs transition-all active:cursor-grabbing ${
        isDragging ? "opacity-40" : "hover:shadow-md"
      }`}
    >
      <div
        className={`mb-3 h-1.5 w-full rounded-full ${deal.accentColorClass}`}
      />

      <div className="mb-3 flex items-center gap-2.5">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${deal.avatarBgClass}`}
        >
          {deal.initials}
        </div>
        <h3 className="truncate text-[13px] font-semibold text-slate-800">
          {deal.name}
        </h3>
      </div>

      <div className="space-y-1.5 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <DollarSign className="h-3 w-3 shrink-0 text-slate-400" />
          <span className="font-medium text-slate-700">
            {deal.value} {deal.currency}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="h-3 w-3 shrink-0 text-slate-400" />
          <span className="truncate">{deal.account}</span>
        </div>
        <div className="flex items-center gap-2">
          <User className="h-3 w-3 shrink-0 text-slate-400" />
          <span>{deal.owner}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-3 w-3 shrink-0 text-slate-400" />
          <span>{deal.closeDate}</span>
        </div>
        <div className="flex items-center gap-2">
          <Percent className="h-3 w-3 shrink-0 text-slate-400" />
          <span>{weighted}</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import {
  Globe,
  Phone,
  User,
  Building2,
  DollarSign,
} from "lucide-react";
import type { CompanyCardData } from "@/lib/companies/types";
import { cn } from "@/lib/utils";
import { cardDragging, cardMotion } from "@/lib/motion";

interface CompanyCardProps {
  company: CompanyCardData;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}

export function CompanyCard({
  company,
  isDragging,
  onDragStart,
  onDragEnd,
}: CompanyCardProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "w-full cursor-grab rounded-md border border-slate-200/80 bg-white p-2.5 shadow-2xs active:cursor-grabbing",
        cardMotion,
        isDragging && cardDragging,
      )}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <div
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold ${company.avatarBgClass}`}
        >
          {company.initials}
        </div>
        <h3 className="truncate text-[13px] font-semibold leading-snug text-slate-900">
          {company.name}
        </h3>
      </div>

      <div className="space-y-0.5 text-[11px] leading-snug text-slate-500">
        <div className="flex items-center gap-2">
          <Globe className="h-3 w-3 shrink-0 text-slate-400" />
          <span className="truncate">{company.website || ""}</span>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="h-3 w-3 shrink-0 text-slate-400" />
          <span>{company.industry || ""}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="h-3 w-3 shrink-0 text-slate-400" />
          <span>{company.phone || ""}</span>
        </div>
        <div className="flex items-center gap-2">
          <User className="h-3 w-3 shrink-0 text-slate-400" />
          <span>{company.owner}</span>
        </div>
        {company.annualRevenue ? (
          <div className="flex items-center gap-2">
            <DollarSign className="h-3 w-3 shrink-0 text-slate-400" />
            <span>{company.annualRevenue}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import {
  Globe,
  Phone,
  User,
  Building2,
  DollarSign,
  MessageSquare,
  Mail,
  CalendarDays,
  CheckSquare,
  StickyNote,
  Paperclip,
} from "lucide-react";
import type { CompanyCardData } from "@/lib/companies/types";
import { cn } from "@/lib/utils";
import { cardDragging, cardMotion } from "@/lib/motion";

interface CompanyCardProps {
  company: CompanyCardData;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onQuickAction?: (kind: string) => void;
}

const QUICK_ICONS = {
  call: Phone,
  sms: MessageSquare,
  email: Mail,
  meeting: CalendarDays,
  task: CheckSquare,
  note: StickyNote,
  attachment: Paperclip,
} as const;

const QUICK_LABELS: Record<string, string> = {
  call: "Call",
  sms: "SMS",
  email: "Email",
  meeting: "Appointment",
  task: "Task",
  note: "Note",
  attachment: "Attachment",
};

export function CompanyCard({
  company,
  isDragging,
  onDragStart,
  onDragEnd,
  onQuickAction,
}: CompanyCardProps) {
  const actions = [
    { kind: "call" as const, urgency: "neutral" as const, badgeCount: 0 },
    { kind: "email" as const, urgency: "neutral" as const, badgeCount: 0 },
    { kind: "meeting" as const, urgency: "neutral" as const, badgeCount: 0 },
    { kind: "task" as const, urgency: "neutral" as const, badgeCount: 0 },
    { kind: "note" as const, urgency: "neutral" as const, badgeCount: 0 },
  ];

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "w-full cursor-grab rounded-md border border-slate-200/80 bg-white p-3.5 shadow-2xs active:cursor-grabbing",
        cardMotion,
        isDragging && cardDragging,
      )}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${company.avatarBgClass}`}
        >
          {company.initials}
        </div>
        <h3 className="truncate text-[13px] font-semibold text-slate-800">
          {company.name}
        </h3>
      </div>

      <div className="space-y-1.5 text-[11px] text-slate-500">
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

      <div
        className="mt-3 flex items-center justify-between gap-0.5 border-t border-slate-100 pt-2.5"
        role="toolbar"
        aria-label={`Quick actions for ${company.name}`}
      >
        {actions.map((action: any) => {
          const kind = typeof action === "string" ? action : action.kind;
          const Icon = QUICK_ICONS[kind as keyof typeof QUICK_ICONS];
          const label = QUICK_LABELS[kind as keyof typeof QUICK_LABELS] || kind;
          const badge =
            action.badgeCount >= 2 ? String(action.badgeCount) : null;

          if (!Icon) return null;

          return (
            <button
              key={kind}
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onQuickAction?.(kind);
              }}
              aria-label={label}
              title={label}
              className={cn(
                "relative flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1",
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {badge && (
                <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-slate-900 px-0.5 text-[8px] font-bold leading-none text-white">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

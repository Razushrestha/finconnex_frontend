"use client";

import {
  Building2,
  DollarSign,
  Calendar,
  User,
  Percent,
  Phone,
  MessageSquare,
  Mail,
  CalendarDays,
  CheckSquare,
  StickyNote,
  Paperclip,
} from "lucide-react";
import type { DealRecord } from "@/lib/deals/types";
import { cn } from "@/lib/utils";
import { cardDragging, cardMotion } from "@/lib/motion";
import Link from "next/link";

interface DealRecordCardProps {
  deal: DealRecord;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onQuickAction?: (kind: string) => void;
  isSelected?: boolean;
  onSelect?: (
    e: React.MouseEvent | React.ChangeEvent<HTMLInputElement>,
  ) => void;
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

export function DealRecordCard({
  deal,
  isDragging,
  onDragStart,
  onDragEnd,
  onQuickAction,
  isSelected = false,
  onSelect,
}: DealRecordCardProps) {
  const weighted =
    deal.probability > 0 ? `Weighted ${deal.probability}%` : "Lost";

  // Default action kinds to display in the toolbar if deal.quickActions aren't provided directly
  const actions = (deal as any).quickActions ?? [
    { kind: "call", urgency: "neutral", badgeCount: 0 },
    { kind: "email", urgency: "neutral", badgeCount: 0 },
    { kind: "meeting", urgency: "neutral", badgeCount: 0 },
    { kind: "task", urgency: "neutral", badgeCount: 0 },
    { kind: "note", urgency: "neutral", badgeCount: 0 },
  ];

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-focus-id={deal.id}
      data-deal-id={deal.id}
      className={cn(
        "group/card relative w-full cursor-grab rounded-md border bg-white p-3.5 shadow-2xs active:cursor-grabbing transition-all",
        cardMotion,
        isDragging && cardDragging,
        isSelected
          ? "border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/20"
          : "border-slate-200/80 hover:border-slate-300",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${deal.avatarBgClass}`}
          >
            {deal.initials}
          </div>
          <h3 className="truncate text-[13px] font-semibold text-slate-800">
            <Link
              href={`/sales/deals/detail/${deal.id}`}
              className="hover:underline focus-visible:underline focus-visible:outline-none"
            >
              {deal.name}
            </Link>
          </h3>
        </div>

        {onSelect && (
          <div
            className={cn(
              "shrink-0 transition-opacity",
              isSelected
                ? "opacity-100"
                : "opacity-0 group-hover/card:opacity-100",
            )}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onSelect}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Select deal ${deal.name}`}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>
        )}
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

      <div
        className="mt-3 flex items-center justify-between gap-0.5 border-t border-slate-100 pt-2.5"
        role="toolbar"
        aria-label={`Quick actions for ${deal.name}`}
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

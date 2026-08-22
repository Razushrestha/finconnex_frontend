"use client";

import {
  Building2,
  DollarSign,
  Calendar,
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
import { cardDragging, cardMotion, cardSubject, entityCardBox } from "@/lib/motion";
import Link from "next/link";
import { CardOwnerRow } from "@/components/shared/CardInitialsAvatar";

export type DealQuickActionKind =
  | "call"
  | "sms"
  | "email"
  | "meeting"
  | "task"
  | "note"
  | "attachment";

interface DealRecordCardProps {
  deal: DealRecord;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onQuickAction?: (kind: DealQuickActionKind) => void;
  isSelected?: boolean;
  onSelect?: (
    e: React.MouseEvent | React.ChangeEvent<HTMLInputElement>,
  ) => void;
}

const QUICK_ICONS: Record<
  DealQuickActionKind,
  React.ComponentType<{ className?: string }>
> = {
  call: Phone,
  sms: MessageSquare,
  email: Mail,
  meeting: CalendarDays,
  task: CheckSquare,
  note: StickyNote,
  attachment: Paperclip,
};

const QUICK_LABELS: Record<DealQuickActionKind, string> = {
  call: "Call",
  sms: "SMS",
  email: "Email",
  meeting: "Appointment",
  task: "Task",
  note: "Note",
  attachment: "Attachment",
};

const DEFAULT_DEAL_QUICK_ACTIONS: { kind: DealQuickActionKind; badgeCount: number }[] =
  [
    { kind: "call", badgeCount: 0 },
    { kind: "email", badgeCount: 0 },
    { kind: "meeting", badgeCount: 0 },
    { kind: "task", badgeCount: 0 },
    { kind: "note", badgeCount: 0 },
    { kind: "attachment", badgeCount: 0 },
  ];

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

  const actions =
    (deal as DealRecord & { quickActions?: { kind: DealQuickActionKind; badgeCount?: number }[] })
      .quickActions ?? DEFAULT_DEAL_QUICK_ACTIONS;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-focus-id={deal.id}
      data-deal-id={deal.id}
      className={cn(
        "group/card relative w-full",
        entityCardBox,
        cardMotion,
        isDragging && cardDragging,
        isSelected
          ? "border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/20"
          : "hover:border-slate-300",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2.5">
        <h3
          className={cn(
            "min-w-0 truncate text-[13px] font-semibold text-slate-800",
            cardSubject,
          )}
        >
          <Link
            href={`/sales/deals/detail/${deal.id}`}
            className="focus-visible:outline-none"
          >
            {deal.name}
          </Link>
        </h3>

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
              className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
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
        <CardOwnerRow name={deal.owner} />
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
        className="mt-auto flex items-center justify-between gap-0.5 border-t border-slate-100 pt-2.5"
        role="toolbar"
        aria-label={`Quick actions for ${deal.name}`}
      >
        {actions.map((action) => {
          const kind = typeof action === "string" ? action : action.kind;
          const Icon = QUICK_ICONS[kind];
          const label = QUICK_LABELS[kind] || kind;
          const badge =
            typeof action !== "string" &&
            action.badgeCount &&
            action.badgeCount >= 2
              ? String(action.badgeCount)
              : null;

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

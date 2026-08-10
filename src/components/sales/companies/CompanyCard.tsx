"use client";

import { useState } from "react";
import {
  Globe,
  Phone,
  Building2,
  DollarSign,
  MessageSquare,
  CalendarDays,
  CheckSquare,
  StickyNote,
  Paperclip,
  PhoneCall,
  Mail as MailIcon,
} from "lucide-react";
import type { CompanyCardData } from "@/lib/companies/types";
import { cn } from "@/lib/utils";
import { cardDragging, cardMotion, entityCardBox } from "@/lib/motion";
import Link from "next/link";
import {
  CustomizeCompanyCardDrawer,
  DEFAULT_COMPANY_CARD_SETTINGS,
  type CompanyCardCustomizationSettings,
} from "@/components/sales/companies/CustomizeCompanyCardDrawer";
import {
  QuickActionsBar,
  type QuickActionItem,
} from "@/components/sales/QuickActionsBar";
import { CardOwnerRow } from "@/components/shared/CardInitialsAvatar";

export type CompanyQuickActionKind =
  | "call"
  | "sms"
  | "email"
  | "meeting"
  | "task"
  | "note"
  | "attachment";

interface CompanyCardProps {
  company: CompanyCardData;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onQuickAction?: (kind: CompanyQuickActionKind) => void;
  /** Whether this card's checkbox is checked — driven by the board/page. */
  isSelected: boolean;
  /** Called when the checkbox is toggled — parent owns the selection list. */
  onToggleSelect: (id: string) => void;
  onSaveCardSettings?: (settings: CompanyCardCustomizationSettings) => void;
}

const QUICK_ICONS: Record<
  CompanyQuickActionKind,
  React.ComponentType<{ className?: string }>
> = {
  call: PhoneCall,
  sms: MessageSquare,
  email: MailIcon,
  meeting: CalendarDays,
  task: CheckSquare,
  note: StickyNote,
  attachment: Paperclip,
};

const QUICK_LABELS: Record<CompanyQuickActionKind, string> = {
  call: "Call",
  sms: "SMS",
  email: "Email",
  meeting: "Appointment",
  task: "Task",
  note: "Note",
  attachment: "Attachment",
};

const COMPANY_QUICK_ACTIONS: QuickActionItem<CompanyQuickActionKind>[] = [
  { kind: "call", icon: PhoneCall, label: "Call" },
  { kind: "email", icon: MailIcon, label: "Email" },
  { kind: "sms", icon: MessageSquare, label: "SMS" },
  { kind: "note", icon: StickyNote, label: "Notes" },
  { kind: "task", icon: CheckSquare, label: "Tasks" },
  { kind: "meeting", icon: CalendarDays, label: "Appointments" },
];

function normalizeQuickActions(
  raw: unknown,
): { kind: CompanyQuickActionKind; badgeCount?: number }[] {
  const source = Array.isArray(raw) ? raw : DEFAULT_QUICK_ACTION_KINDS_ARRAY;

  return source
    .map((action) =>
      typeof action === "string"
        ? { kind: action as CompanyQuickActionKind, badgeCount: undefined }
        : {
            kind: (action as { kind: string }).kind as CompanyQuickActionKind,
            badgeCount: (action as { badgeCount?: number }).badgeCount,
          },
    )
    .filter((action) => action.kind in QUICK_ICONS);
}

const DEFAULT_QUICK_ACTION_KINDS_ARRAY: CompanyQuickActionKind[] = [
  "call",
  "email",
  "meeting",
  "task",
  "note",
];

export function CompanyCard({
  company,
  isDragging,
  onDragStart,
  onDragEnd,
  onQuickAction,
  isSelected,
  onToggleSelect,
  onSaveCardSettings,
}: CompanyCardProps) {
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [customization, setCustomization] =
    useState<CompanyCardCustomizationSettings>(DEFAULT_COMPANY_CARD_SETTINGS);

  const rawQuickActions = (company as { quickActions?: unknown }).quickActions;
  const quickActionItems: QuickActionItem<CompanyQuickActionKind>[] =
    rawQuickActions !== undefined
      ? normalizeQuickActions(rawQuickActions).map(({ kind, badgeCount }) => ({
          kind,
          icon: QUICK_ICONS[kind],
          label: QUICK_LABELS[kind],
          badgeCount,
          colorClassName:
            "text-slate-400 hover:bg-slate-100 hover:text-violet-600",
          badgeClassName: "bg-slate-900 text-white",
        }))
      : COMPANY_QUICK_ACTIONS.map((item) => ({
          ...item,
          colorClassName:
            "text-slate-400 hover:bg-slate-100 hover:text-violet-600",
          badgeClassName: "bg-slate-900 text-white",
        }));

  return (
    <>
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        data-focus-id={company.id}
        data-company-id={company.id}
        className={cn(
          "group w-full shrink-0",
          entityCardBox,
          cardMotion,
          isDragging && cardDragging,
        )}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <Link
            href={`/sales/companies/detail/${company.id}`}
            className="min-w-0"
          >
            <h3 className="truncate text-[13px] font-semibold text-slate-800">
              {company.name}
            </h3>
          </Link>

          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(company.id)}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${company.name}`}
            className={cn(
              "h-3.5 w-3.5 shrink-0 rounded border-slate-300 transition-opacity",
              isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
          />
        </div>

        <div className="space-y-1.5 text-[11px] text-slate-500">
          {company.website && (
            <div className="flex items-center gap-2">
              <Globe className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="truncate">{company.website}</span>
            </div>
          )}
          {company.industry && (
            <div className="flex items-center gap-2">
              <Building2 className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="truncate font-medium text-slate-700">
                {company.industry}
              </span>
            </div>
          )}
          {company.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3 w-3 shrink-0 text-slate-400" />
              <span>{company.phone}</span>
            </div>
          )}
          {company.owner && <CardOwnerRow name={company.owner} />}
          {company.annualRevenue && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-3 w-3 shrink-0 text-slate-400" />
              <span>{company.annualRevenue}</span>
            </div>
          )}
          {company.city && (
            <div className="flex items-center gap-2">
              <Building2 className="h-3 w-3 shrink-0 text-slate-400" />
              <span>{company.city}</span>
            </div>
          )}
        </div>

        <div className="my-3 border-t border-slate-100" />

        <div className="flex items-center justify-between gap-1">
          {company.industry ? (
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
              {company.industry}
            </span>
          ) : (
            <span />
          )}

          <QuickActionsBar
            actions={quickActionItems}
            onAction={onQuickAction}
            ariaLabel={`Quick actions for ${company.name}`}
            hoverClassName="text-slate-400 hover:bg-slate-100 hover:text-violet-600"
            size="sm"
          />
        </div>
      </div>

      <CustomizeCompanyCardDrawer
        open={customizeOpen}
        value={customization}
        onClose={() => setCustomizeOpen(false)}
        onSave={(next) => {
          setCustomization(next);
          onSaveCardSettings?.(next);
          setCustomizeOpen(false);
        }}
      />
    </>
  );
}

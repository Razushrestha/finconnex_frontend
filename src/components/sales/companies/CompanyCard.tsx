"use client";

import { useState } from "react";
import {
  Globe,
  Phone,
  User,
  Building2,
  DollarSign,
  MessageSquare,
  CalendarDays,
  CheckSquare,
  StickyNote,
  Paperclip,
  PhoneCall,
  Mail as MailIcon,
  Send,
  Plus,
  Minus,
  Bell,
  FileText,
  UserCog,
  MoreHorizontal,
  Speaker,
  Trash2,
  Settings,
} from "lucide-react";
import type { CompanyCardData } from "@/lib/companies/types";
import { cn } from "@/lib/utils";
import { cardDragging, cardMotion } from "@/lib/motion";
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
  onSaveCardSettings,
}: CompanyCardProps) {
  const [selected, setSelected] = useState(false);
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

  const isCompact = customization.layout === "compact";
  const showFields =
    (customization.showWebsite && company.website) ||
    (customization.showIndustry && company.industry) ||
    (customization.showPhone && company.phone) ||
    (customization.showOwner && company.owner) ||
    (customization.showAnnualRevenue && company.annualRevenue) ||
    (customization.showCity && company.city);

  return (
    <>
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        data-focus-id={company.id}
        data-company-id={company.id}
        className={cn(
          "group w-full shrink-0 cursor-grab rounded-md border border-slate-200/80 bg-white p-3 shadow-2xs active:cursor-grabbing",
          cardMotion,
          isDragging && cardDragging,
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between gap-2",
            isCompact ? "mb-2" : "mb-3",
          )}
        >
          <Link
            href={`/sales/companies/detail/${company.id}`}
            className="flex min-w-0 items-center gap-2.5"
          >
            <div
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full font-semibold",
                isCompact ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-[11px]",
                company.avatarBgClass,
              )}
            >
              {company.initials}
            </div>
            <h3
              className={cn(
                "truncate font-semibold text-slate-800",
                isCompact ? "text-[12px]" : "text-[13px]",
              )}
            >
              {company.name}
            </h3>
          </Link>

          <div className="relative flex shrink-0 items-center">
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => setSelected(e.target.checked)}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Select ${company.name}`}
              className={cn(
                "h-3.5 w-3.5 rounded border-slate-300 transition-opacity",
                selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
            />

            {selected && (
              <CompanyCardActionsMenu
                onClose={() => setSelected(false)}
                onCustomizeCard={() => {
                  setSelected(false);
                  setCustomizeOpen(true);
                }}
              />
            )}
          </div>
        </div>

        {showFields && (
          <div
            className={cn(
              "space-y-1.5 text-slate-500",
              isCompact ? "text-[10px]" : "text-[11px]",
            )}
          >
            {customization.showWebsite && company.website && (
              <div className="flex items-center gap-2">
                <Globe className="h-3 w-3 shrink-0 text-slate-400" />
                <span className="truncate">{company.website}</span>
              </div>
            )}
            {customization.showIndustry && company.industry && (
              <div className="flex items-center gap-2">
                <Building2 className="h-3 w-3 shrink-0 text-slate-400" />
                <span className="truncate font-medium text-slate-700">
                  {company.industry}
                </span>
              </div>
            )}
            {customization.showPhone && company.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 shrink-0 text-slate-400" />
                <span>{company.phone}</span>
              </div>
            )}
            {customization.showOwner && company.owner && (
              <div className="flex items-center gap-2">
                <User className="h-3 w-3 shrink-0 text-slate-400" />
                <span>{company.owner}</span>
              </div>
            )}
            {customization.showAnnualRevenue && company.annualRevenue && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-3 w-3 shrink-0 text-slate-400" />
                <span>{company.annualRevenue}</span>
              </div>
            )}
            {customization.showCity && company.city && (
              <div className="flex items-center gap-2">
                <Building2 className="h-3 w-3 shrink-0 text-slate-400" />
                <span>{company.city}</span>
              </div>
            )}
          </div>
        )}

        {(customization.showIndustry || customization.showBottomIcons) && (
          <>
            <div
              className={cn(
                "border-t border-slate-100",
                isCompact ? "my-2" : "my-3",
              )}
            />

            <div className="flex items-center justify-between gap-1">
              {customization.showIndustry && company.industry ? (
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                  {company.industry}
                </span>
              ) : (
                <span />
              )}
              {customization.showBottomIcons && (
                <QuickActionsBar
                  actions={quickActionItems}
                  onAction={onQuickAction}
                  ariaLabel={`Quick actions for ${company.name}`}
                  hoverClassName="text-slate-400 hover:bg-slate-100 hover:text-violet-600"
                  size="sm"
                />
              )}
            </div>
          </>
        )}
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

function CompanyCardActionsMenu({
  onClose,
  onCustomizeCard,
}: {
  onClose: () => void;
  onCustomizeCard: () => void;
}) {
  return (
    <>
      <div
        className="fixed inset-0 z-20"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-md border border-slate-200 bg-white py-1.5 text-left shadow-lg"
      >
        <MenuItem icon={Send} label="Send mail" />

        <MenuDivider />
        <MenuSectionLabel>Tags</MenuSectionLabel>
        <MenuItem icon={Plus} label="Add tag" />
        <MenuItem icon={Minus} label="Remove tag" />

        <MenuDivider />
        <div className="flex items-center justify-between px-3 pb-0.5 pt-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            More
          </span>
          <MoreHorizontal className="h-3 w-3 text-slate-300" />
        </div>
        <MenuItem icon={CheckSquare} label="Create task" />
        <MenuItem icon={Bell} label="Set reminder" />
        <MenuItem icon={FileText} label="Mass update" />
        <MenuItem icon={UserCog} label="Change owner" />
        <MenuItem icon={Speaker} label="Add to campaign" />
        <MenuItem icon={Trash2} label="Delete" />
        <MenuItem
          icon={Settings}
          label="Customize Card"
          onClick={onCustomizeCard}
        />
      </div>
    </>
  );
}

function MenuSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
      {children}
    </p>
  );
}

function MenuDivider() {
  return <div className="my-1 border-t border-slate-100" />;
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
    >
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      {label}
    </button>
  );
}

"use client";

import { useState } from "react";
import {
  Building2,
  Mail,
  Phone,
  User,
  Calendar,
  PhoneCall,
  Mail as MailIcon,
  MessageSquare,
  StickyNote,
  CheckSquare,
  CalendarDays,
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
import type { ContactCardData } from "@/lib/contacts/types";
import { cn } from "@/lib/utils";
import { cardDragging, cardMotion } from "@/lib/motion";
import Link from "next/link";
import {
  CustomizeContactCardDrawer,
  DEFAULT_CONTACT_CARD_SETTINGS,
  type ContactCardCustomizationSettings,
} from "@/components/sales/contacts/CustomizeContactCardDrawer";
import {
  QuickActionsBar,
  type QuickActionItem,
} from "@/components/sales/QuickActionsBar";

interface ContactRecordCardProps {
  contact: ContactCardData;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onQuickAction?: (kind: ContactQuickActionKind) => void;
  /**
   * Called when the customize-card drawer is saved. Card display settings
   * are board-wide, so the parent board component should own the real
   * persisted value and pass it back down — this is the hook for that.
   */
  onSaveCardSettings?: (settings: ContactCardCustomizationSettings) => void;
}

export type ContactQuickActionKind =
  | "call"
  | "email"
  | "sms"
  | "note"
  | "task"
  | "appointment";

const CONTACT_QUICK_ACTIONS: QuickActionItem<ContactQuickActionKind>[] = [
  { kind: "call", icon: PhoneCall, label: "Call" },
  { kind: "email", icon: MailIcon, label: "Email" },
  { kind: "sms", icon: MessageSquare, label: "SMS" },
  { kind: "note", icon: StickyNote, label: "Notes" },
  { kind: "task", icon: CheckSquare, label: "Tasks" },
  { kind: "appointment", icon: CalendarDays, label: "Appointments" },
];

export function ContactRecordCard({
  contact,
  isDragging,
  onDragStart,
  onDragEnd,
  onQuickAction,
  onSaveCardSettings,
}: ContactRecordCardProps) {
  const [selected, setSelected] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [customization, setCustomization] =
    useState<ContactCardCustomizationSettings>(DEFAULT_CONTACT_CARD_SETTINGS);

  return (
    <>
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        data-focus-id={contact.id}
        data-contact-id={contact.id}
        className={cn(
          "group w-[272px] shrink-0 cursor-grab rounded-md border border-slate-200/80 bg-white p-3.5 shadow-2xs active:cursor-grabbing",
          cardMotion,
          isDragging && cardDragging,
        )}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <Link
            href={`/sales/contacts/detail/${contact.id}`}
            className="flex min-w-0 items-center gap-2.5"
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${contact.avatarBgClass}`}
            >
              {contact.initials}
            </div>
            <h3 className="truncate text-[13px] font-semibold text-slate-800">
              {contact.name}
            </h3>
          </Link>

          <div className="relative flex shrink-0 items-center">
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => setSelected(e.target.checked)}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Select ${contact.name}`}
              className={cn(
                "h-3.5 w-3.5 rounded border-slate-300 transition-opacity",
                selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
            />

            {selected && (
              <ContactCardActionsMenu
                onClose={() => setSelected(false)}
                onCustomizeCard={() => {
                  setSelected(false);
                  setCustomizeOpen(true);
                }}
              />
            )}
          </div>
        </div>

        <div className="space-y-1.5 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <Building2 className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="truncate font-medium text-slate-700">
              {contact.company || ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="truncate">{contact.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-3 w-3 shrink-0 text-slate-400" />
            <span>{contact.phone || ""}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-3 w-3 shrink-0 text-slate-400" />
            <span>{contact.owner}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 shrink-0 text-slate-400" />
            <span>{contact.createdDate}</span>
          </div>
        </div>

        <div className="my-3 border-t border-slate-100" />

        <div className="flex items-center justify-between gap-1">
          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
            {contact.source}
          </span>
          <QuickActionsBar
            actions={CONTACT_QUICK_ACTIONS}
            onAction={onQuickAction}
            ariaLabel={`Quick actions for ${contact.name}`}
            hoverClassName="text-slate-400 hover:bg-slate-100 hover:text-violet-600"
            size="sm"
          />
        </div>
      </div>

      <CustomizeContactCardDrawer
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

/** Bulk-action dropdown shown once a card is selected via its checkbox. */
function ContactCardActionsMenu({
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

"use client";

import { useState } from "react";
import {
  Building2,
  Mail,
  Phone,
  Calendar,
  PhoneCall,
  Mail as MailIcon,
  MessageSquare,
  StickyNote,
  CheckSquare,
  CalendarDays,
} from "lucide-react";
import type { ContactCardData } from "@/lib/contacts/types";
import { cn } from "@/lib/utils";
import { cardDragging, cardMotion, entityCardBox } from "@/lib/motion";
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
import { CardOwnerRow } from "@/components/shared/CardInitialsAvatar";

interface ContactRecordCardProps {
  contact: ContactCardData;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onQuickAction?: (kind: ContactQuickActionKind) => void;
  /** Whether this card's checkbox is checked — driven by the board/page. */
  isSelected: boolean;
  /** Called when the checkbox is toggled — parent owns the selection list. */
  onToggleSelect: (id: string) => void;
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

export { CONTACT_QUICK_ACTIONS };

export function ContactRecordCard({
  contact,
  isDragging,
  onDragStart,
  onDragEnd,
  onQuickAction,
  isSelected,
  onToggleSelect,
  onSaveCardSettings,
}: ContactRecordCardProps) {
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
          "group w-full shrink-0",
          entityCardBox,
          cardMotion,
          isDragging && cardDragging,
        )}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <Link
            href={`/sales/contacts/detail/${contact.id}`}
            className="min-w-0"
          >
            <h3 className="truncate text-[13px] font-semibold text-slate-800">
              {contact.name}
            </h3>
          </Link>

          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(contact.id)}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${contact.name}`}
            className={cn(
              "h-3.5 w-3.5 shrink-0 rounded border-slate-300 transition-opacity",
              isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
          />
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
          <CardOwnerRow name={contact.owner} />
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 shrink-0 text-slate-400" />
            <span>{contact.createdDate}</span>
          </div>
        </div>

        <div className="mt-auto border-t border-slate-100 pt-3" />

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

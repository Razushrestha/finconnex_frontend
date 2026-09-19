"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  PenTool,
  Stamp,
  Calendar,
  User,
  Mail,
  Image as ImageIcon,
  Building2,
  Clock,
  CheckSquare,
  ChevronDown,
  CircleDot,
  CreditCard,
  Paperclip,
  GripVertical,
} from "lucide-react";
import {
  PREFILL_COLOR_INDEX,
  PREFILL_RECIPIENT_ID,
  SignatureSigner,
  signerColor,
} from "@/lib/documents/signature/types";
import { cn } from "@/lib/utils";

type PaletteField = {
  type: string;
  label: string;
  icon: LucideIcon | "letter-a";
};

const LETTER_A_FIELDS = new Set(["Text", "Split text", "Job title"]);

const signerStandardFields: PaletteField[] = [
  { type: "signature", label: "Signature", icon: PenTool },
  { type: "initials", label: "Initial", icon: PenTool },
  { type: "stamp", label: "Stamp", icon: Stamp },
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "company", label: "Company", icon: Building2 },
  { type: "name", label: "Full name", icon: User },
  { type: "email", label: "Email", icon: Mail },
  { type: "sign_date", label: "Sign date", icon: Clock },
  { type: "date", label: "Date", icon: Calendar },
  { type: "text", label: "Text", icon: "letter-a" },
  { type: "text", label: "Split text", icon: "letter-a" },
  { type: "job_title", label: "Job title", icon: "letter-a" },
  { type: "checkbox", label: "Checkbox", icon: CheckSquare },
  { type: "dropdown", label: "Dropdown", icon: ChevronDown },
];

const prefillStandardFields: PaletteField[] = [
  { type: "signature", label: "Signature", icon: PenTool },
  { type: "initials", label: "Initial", icon: PenTool },
  { type: "stamp", label: "Stamp", icon: Stamp },
  { type: "company", label: "Company", icon: Building2 },
  { type: "name", label: "Full name", icon: User },
  { type: "email", label: "Email", icon: Mail },
  { type: "sign_date", label: "Sign date", icon: Clock },
  { type: "date", label: "Date", icon: Calendar },
  { type: "text", label: "Text", icon: "letter-a" },
  { type: "text", label: "Split text", icon: "letter-a" },
  { type: "job_title", label: "Job title", icon: "letter-a" },
  { type: "checkbox", label: "Checkbox", icon: CheckSquare },
  { type: "dropdown", label: "Dropdown", icon: ChevronDown },
  { type: "radio", label: "Radio", icon: CircleDot },
];

const signerCustomFields: PaletteField[] = [
  { type: "radio", label: "Radio", icon: CircleDot },
  { type: "payment", label: "Payment", icon: CreditCard },
  { type: "attachment", label: "Attachment", icon: Paperclip },
];

const prefillCustomFields: PaletteField[] = [
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "payment", label: "Payment", icon: CreditCard },
  { type: "attachment", label: "Attachment", icon: Paperclip },
];

export const standardFields = signerStandardFields;

export type StandardFieldType = {
  type: string;
  label: string;
  icon: LucideIcon | "letter-a";
};

export interface FieldRecipient {
  id: string;
  name: string;
  email: string;
  colorIndex: number;
}

interface StandardFieldsSidebarProps {
  recipients: SignatureSigner[];
  onArmField?: (field: StandardFieldType, recipient?: FieldRecipient) => void;
  onPalettePointerDown?: (
    e: React.PointerEvent<HTMLDivElement>,
    field: StandardFieldType,
    recipient?: FieldRecipient,
  ) => void;
  activeRecipientId?: string | null;
  onSelectRecipient?: (id: string) => void;
}

export function StandardFieldsSidebar({
  recipients,
  onArmField,
  onPalettePointerDown,
  activeRecipientId,
  onSelectRecipient,
}: StandardFieldsSidebarProps) {
  const [internalActiveId, setInternalActiveId] = useState<string>(
    recipients[0]?.id ?? PREFILL_RECIPIENT_ID,
  );
  const [tab, setTab] = useState<"standard" | "custom">("standard");

  const selectedId = activeRecipientId ?? internalActiveId;
  const isPrefill = selectedId === PREFILL_RECIPIENT_ID;
  const selectedRecipient = recipients.find((r) => r.id === selectedId);
  const selectedColorIndex = isPrefill
    ? PREFILL_COLOR_INDEX
    : (selectedRecipient?.colorIndex ?? 0);
  const accent = signerColor(selectedColorIndex);

  useEffect(() => {
    if (activeRecipientId) return;
    if (
      selectedId !== PREFILL_RECIPIENT_ID &&
      !recipients.some((r) => r.id === selectedId)
    ) {
      setInternalActiveId(recipients[0]?.id ?? PREFILL_RECIPIENT_ID);
    }
  }, [activeRecipientId, recipients, selectedId]);

  const handleSelect = (id: string) => {
    if (onSelectRecipient) onSelectRecipient(id);
    else setInternalActiveId(id);
    setTab("standard");
  };

  const fields = isPrefill
    ? tab === "standard"
      ? prefillStandardFields
      : prefillCustomFields
    : tab === "standard"
      ? signerStandardFields
      : signerCustomFields;

  const dragRecipient: FieldRecipient | undefined = isPrefill
    ? {
        id: PREFILL_RECIPIENT_ID,
        name: "Prefill by you",
        email: "",
        colorIndex: PREFILL_COLOR_INDEX,
      }
    : selectedRecipient
      ? {
          id: selectedRecipient.id,
          name: selectedRecipient.name,
          email: selectedRecipient.email,
          colorIndex:
            selectedRecipient.colorIndex ??
            recipients.findIndex((r) => r.id === selectedRecipient.id),
        }
      : undefined;

  return (
    <aside className="relative z-20 flex h-full w-[280px] shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-white pointer-events-auto">
      <div className="px-4 py-3">
        <h3 className="text-[15px] font-semibold text-slate-800">Recipients</h3>
      </div>

      <div className="min-h-[132px] border-b border-slate-100">
        <button
          type="button"
          onClick={() => handleSelect(PREFILL_RECIPIENT_ID)}
          className={cn(
            "flex w-full items-center gap-2.5 px-4 py-2.5 text-left",
            isPrefill ? "bg-[#dbeafe]" : "hover:bg-slate-50",
          )}
        >
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold",
              isPrefill
                ? "bg-[#1d4ed8] text-white"
                : "bg-blue-100 text-[#1d4ed8]",
            )}
          >
            P
          </span>
          <span className="text-[13px] text-slate-700">Prefill by you</span>
        </button>

        {recipients.length === 0 ? (
          <p className="px-4 py-2 text-[11px] italic text-slate-400">
            Add a signer to assign fields
          </p>
        ) : (
          recipients.map((recipient, index) => {
            const color = signerColor(recipient.colorIndex ?? index);
            const isSelected = recipient.id === selectedId;
            const initial =
              recipient.name?.trim()?.[0]?.toUpperCase() ||
              recipient.roleLabel?.trim()?.[0]?.toUpperCase() ||
              recipient.email?.trim()?.[0]?.toUpperCase() ||
              "?";
            return (
              <button
                key={recipient.id}
                type="button"
                onClick={() => handleSelect(recipient.id)}
                className={cn(
                  "relative flex w-full items-center gap-2.5 px-4 py-2.5 text-left",
                  isSelected ? `${color.bg}` : "hover:bg-slate-50",
                )}
              >
                {isSelected ? (
                  <span
                    className="absolute inset-y-0 left-0 w-[3px]"
                    style={{ backgroundColor: color.hex }}
                  />
                ) : null}
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
                  style={{ backgroundColor: color.hex }}
                >
                  {initial}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-slate-800">
                    {recipient.name ||
                      recipient.roleLabel ||
                      "Unnamed signer"}
                  </span>
                  <span className="block truncate text-[11px] text-slate-500">
                    {recipient.email || "No email yet"}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>

      <div className="flex bg-slate-100">
        <button
          type="button"
          onClick={() => setTab("standard")}
          className={cn(
            "flex-1 bg-white py-2.5 text-[13px] font-medium",
            tab === "standard"
              ? "text-slate-800"
              : "bg-transparent text-slate-500 hover:text-slate-700",
          )}
          style={
            tab === "standard"
              ? { boxShadow: `inset 0 -2px 0 ${accent.hex}` }
              : undefined
          }
        >
          Standard fields
        </button>
        <button
          type="button"
          onClick={() => setTab("custom")}
          className={cn(
            "flex-1 bg-white py-2.5 text-[13px] font-medium",
            tab === "custom"
              ? "text-slate-800"
              : "bg-slate-100 text-slate-500 hover:text-slate-700",
          )}
          style={
            tab === "custom"
              ? { boxShadow: `inset 0 -2px 0 ${accent.hex}` }
              : undefined
          }
        >
          Custom fields
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-2 gap-2">
          {fields.map((field, index) => (
            <FieldChip
              key={`${field.type}-${field.label}-${index}`}
              field={field}
              accentHex={
                isPrefill
                  ? signerColor(PREFILL_COLOR_INDEX).hex
                  : signerColor(selectedRecipient?.colorIndex ?? 0).hex
              }
              onPointerDown={(e) =>
                onPalettePointerDown?.(e, field, dragRecipient)
              }
            />
          ))}
        </div>
        <p className="mt-3 px-1 text-[11px] text-slate-400">
          Select a recipient, then drag a field onto the document.
        </p>
      </div>
    </aside>
  );
}

function FieldChip({
  field,
  accentHex,
  onPointerDown,
}: {
  field: PaletteField;
  accentHex: string;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const Icon = field.icon;
  const useLetter =
    Icon === "letter-a" || LETTER_A_FIELDS.has(field.label);

  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={onPointerDown}
      className="flex h-8 cursor-grab items-center overflow-hidden rounded-sm border border-slate-200 bg-white select-none active:cursor-grabbing"
    >
      <GripVertical className="ml-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
      <span className="min-w-0 flex-1 truncate px-1 text-[11px] text-slate-700">
        {field.label}
      </span>
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center text-white"
        style={{ backgroundColor: accentHex }}
      >
        {useLetter ? (
          <span className="text-[13px] font-bold leading-none">A</span>
        ) : (
          <Icon className="h-3.5 w-3.5" />
        )}
      </span>
    </div>
  );
}

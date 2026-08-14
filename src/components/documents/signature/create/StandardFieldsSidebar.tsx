// "use client";

// import type { DragEvent } from "react";
// import {
//   PenTool,
//   Stamp,
//   Calendar,
//   User,
//   Mail,
//   FileText,
//   Image as ImageIcon,
//   Building2,
//   Clock,
//   Briefcase,
//   CheckSquare,
//   ChevronDown,
//   CircleDot,
//   CreditCard,
//   Paperclip,
// } from "lucide-react";

// export const standardFields = [
//   { type: "signature", label: "Signature", icon: PenTool },
//   { type: "initials", label: "Initials", icon: PenTool },
//   { type: "date", label: "Date", icon: Calendar },
//   { type: "name", label: "Name", icon: User },
//   { type: "email", label: "Email", icon: Mail },
//   { type: "text", label: "Text", icon: FileText },
//   { type: "stamp", label: "Stamp", icon: Stamp },
//   { type: "image", label: "Image", icon: ImageIcon },
//   { type: "company", label: "Company", icon: Building2 },
//   { type: "sign_date", label: "Sign Date", icon: Clock },
//   { type: "job_title", label: "Job title", icon: Briefcase },
//   { type: "checkbox", label: "Checkbox", icon: CheckSquare },
//   { type: "dropdown", label: "Dropdown", icon: ChevronDown },
//   { type: "radio", label: "Radio", icon: CircleDot },
//   { type: "payment", label: "Payment", icon: CreditCard },
//   { type: "attachment", label: "Attachment", icon: Paperclip },
// ];

// export type StandardFieldType = (typeof standardFields)[number];

// interface StandardFieldsSidebarProps {
//   onDragStart: (e: DragEvent<HTMLDivElement>, field: StandardFieldType) => void;
//   onDragEnd: () => void;
// }

// export function StandardFieldsSidebar({
//   onDragStart,
//   onDragEnd,
// }: StandardFieldsSidebarProps) {
//   return (
//     <aside className="w-64 bg-white rounded-2xl border border-slate-200 p-4 flex flex-col justify-between shadow-xs shrink-0 h-full overflow-y-auto">
//       <div className="space-y-4">
//         <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
//           Standard Fields
//         </h3>

//         <div className="flex flex-col gap-2">
//           {standardFields.map((field) => {
//             const IconComponent = field.icon;
//             return (
//               <div
//                 key={field.type}
//                 draggable
//                 onDragStart={(e) => onDragStart(e, field)}
//                 onDragEnd={onDragEnd}
//                 className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all group"
//               >
//                 {IconComponent && (
//                   <IconComponent className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
//                 )}
//                 <span className="text-xs font-semibold text-slate-700">
//                   {field.label}
//                 </span>
//               </div>
//             );
//           })}
//         </div>
//       </div>

//       <div className="mt-8 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center shrink-0">
//         <p className="text-[11px] text-slate-500 font-medium">
//           Drag fields onto the document.
//         </p>
//       </div>
//     </aside>
//   );
// }

"use client";

import { useState } from "react";
import type { DragEvent } from "react";
import {
  PenTool,
  Stamp,
  Calendar,
  User,
  Mail,
  FileText,
  Image as ImageIcon,
  Building2,
  Clock,
  Briefcase,
  CheckSquare,
  ChevronDown,
  CircleDot,
  CreditCard,
  Paperclip,
} from "lucide-react";
import {
  SignatureSigner,
  SIGNER_COLORS,
} from "@/lib/documents/signature/types";

export const standardFields = [
  { type: "signature", label: "Signature", icon: PenTool },
  { type: "initials", label: "Initials", icon: PenTool },
  { type: "date", label: "Date", icon: Calendar },
  { type: "name", label: "Name", icon: User },
  { type: "email", label: "Email", icon: Mail },
  { type: "text", label: "Text", icon: FileText },
  { type: "stamp", label: "Stamp", icon: Stamp },
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "company", label: "Company", icon: Building2 },
  { type: "sign_date", label: "Sign Date", icon: Clock },
  { type: "job_title", label: "Job title", icon: Briefcase },
  { type: "checkbox", label: "Checkbox", icon: CheckSquare },
  { type: "dropdown", label: "Dropdown", icon: ChevronDown },
  { type: "radio", label: "Radio", icon: CircleDot },
  { type: "payment", label: "Payment", icon: CreditCard },
  { type: "attachment", label: "Attachment", icon: Paperclip },
];

export type StandardFieldType = (typeof standardFields)[number];

// Minimal shape a dropped field needs to know about its assigned recipient.
// Passed through onDragStart so the canvas/drop handler can tag & tint the field.
export interface FieldRecipient {
  id: string;
  name: string;
  email: string;
  colorIndex: number;
}

interface StandardFieldsSidebarProps {
  recipients: SignatureSigner[];
  onDragStart: (
    e: DragEvent<HTMLDivElement>,
    field: StandardFieldType,
    recipient?: FieldRecipient,
  ) => void;
  onDragEnd: () => void;
  activeRecipientId?: string | null;
  onSelectRecipient?: (id: string) => void;
}

export function StandardFieldsSidebar({
  recipients,
  onDragStart,
  onDragEnd,
  activeRecipientId,
  onSelectRecipient,
}: StandardFieldsSidebarProps) {
  // Fall back to internal state if the parent isn't controlling selection
  const [internalActiveId, setInternalActiveId] = useState<string | null>(
    recipients[0]?.id ?? null,
  );
  const selectedId = activeRecipientId ?? internalActiveId;

  const handleSelectRecipient = (id: string) => {
    if (onSelectRecipient) {
      onSelectRecipient(id);
    } else {
      setInternalActiveId(id);
    }
  };

  const selectedRecipient = recipients.find((r) => r.id === selectedId);

  const handleFieldDragStart = (
    e: DragEvent<HTMLDivElement>,
    field: StandardFieldType,
  ) => {
    const recipient: FieldRecipient | undefined = selectedRecipient
      ? {
          id: selectedRecipient.id,
          name: selectedRecipient.name,
          email: selectedRecipient.email,
          colorIndex:
            selectedRecipient.colorIndex ??
            recipients.findIndex((r) => r.id === selectedRecipient.id) %
              SIGNER_COLORS.length,
        }
      : undefined;

    // Stash it on the transfer too, so a drop handler that only has
    // access to the DataTransfer (not React state) can still read it.
    if (recipient) {
      e.dataTransfer.setData(
        "application/x-field-recipient",
        JSON.stringify(recipient),
      );
    }

    onDragStart(e, field, recipient);
  };

  return (
    <aside className="w-64 bg-white rounded-2xl border border-slate-200 p-4 flex flex-col justify-between shadow-xs shrink-0 h-full overflow-y-auto">
      <div className="space-y-4">
        {/* Recipients */}
        <div className="space-y-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Recipients
          </h3>

          {recipients.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic px-1">
              Add a signer to assign fields
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {recipients.map((recipient, index) => {
                const color =
                  SIGNER_COLORS[
                    recipient.colorIndex ?? index % SIGNER_COLORS.length
                  ];
                const isSelected = recipient.id === selectedId;
                const initial =
                  recipient.name?.trim()?.[0]?.toUpperCase() ||
                  recipient.email?.trim()?.[0]?.toUpperCase() ||
                  "?";

                return (
                  <button
                    key={recipient.id}
                    type="button"
                    onClick={() => handleSelectRecipient(recipient.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? `${color.bg} ${color.border} ring-1 ring-offset-1 ${color.border.replace(
                            "border-",
                            "ring-",
                          )}`
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                    title={`Assign new fields to ${recipient.name || recipient.email}`}
                  >
                    <span
                      className={`w-6 h-6 shrink-0 flex items-center justify-center rounded-full text-[10px] font-bold border ${color.bg} ${color.text} ${color.border}`}
                    >
                      {initial}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-xs font-semibold truncate ${
                          isSelected ? color.text : "text-slate-700"
                        }`}
                      >
                        {recipient.name || "Unnamed signer"}
                      </span>
                      <span className="block text-[10px] text-slate-400 truncate">
                        {recipient.email || "No email yet"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {selectedRecipient && (
            <p className="text-[10px] text-slate-400 px-1">
              New fields will be assigned to{" "}
              <span className="font-semibold text-slate-600">
                {selectedRecipient.name || selectedRecipient.email}
              </span>
              .
            </p>
          )}
        </div>

        <div className="h-px bg-slate-100" />

        {/* Standard Fields */}
        <div className="space-y-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Standard Fields
          </h3>

          <div className="flex flex-col gap-2">
            {standardFields.map((field) => {
              const IconComponent = field.icon;
              const fieldColor = selectedRecipient
                ? SIGNER_COLORS[
                    selectedRecipient.colorIndex ??
                      recipients.findIndex(
                        (r) => r.id === selectedRecipient.id,
                      ) % SIGNER_COLORS.length
                  ]
                : null;

              return (
                <div
                  key={field.type}
                  draggable
                  onDragStart={(e) => handleFieldDragStart(e, field)}
                  onDragEnd={onDragEnd}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border bg-white hover:shadow-sm cursor-grab active:cursor-grabbing transition-all group ${
                    fieldColor
                      ? `${fieldColor.border} hover:${fieldColor.border}`
                      : "border-slate-200 hover:border-indigo-300"
                  }`}
                >
                  {/* Recipient color tick so it's obvious who a dragged field belongs to */}
                  {fieldColor && (
                    <span
                      className={`w-1.5 h-6 rounded-full shrink-0 ${fieldColor.bg} border ${fieldColor.border}`}
                    />
                  )}
                  {IconComponent && (
                    <IconComponent className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
                  )}
                  <span className="text-xs font-semibold text-slate-700">
                    {field.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-8 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center shrink-0">
        <p className="text-[11px] text-slate-500 font-medium">
          Drag fields onto the document.
        </p>
      </div>
    </aside>
  );
}

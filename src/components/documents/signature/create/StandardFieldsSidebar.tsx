"use client";

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

interface StandardFieldsSidebarProps {
  onDragStart: (e: DragEvent<HTMLDivElement>, field: StandardFieldType) => void;
  onDragEnd: () => void;
}

export function StandardFieldsSidebar({
  onDragStart,
  onDragEnd,
}: StandardFieldsSidebarProps) {
  return (
    <aside className="w-64 bg-white rounded-2xl border border-slate-200 p-4 flex flex-col justify-between shadow-xs shrink-0 h-full overflow-y-auto">
      <div className="space-y-4">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Standard Fields
        </h3>

        <div className="flex flex-col gap-2">
          {standardFields.map((field) => {
            const IconComponent = field.icon;
            return (
              <div
                key={field.type}
                draggable
                onDragStart={(e) => onDragStart(e, field)}
                onDragEnd={onDragEnd}
                className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all group"
              >
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

      <div className="mt-8 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center shrink-0">
        <p className="text-[11px] text-slate-500 font-medium">
          Drag fields onto the document.
        </p>
      </div>
    </aside>
  );
}

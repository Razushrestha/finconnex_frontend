"use client";

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
} from "lucide-react";
import type { ContactCardData } from "@/lib/contacts/types";

interface ContactRecordCardProps {
  contact: ContactCardData;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}

export function ContactRecordCard({
  contact,
  isDragging,
  onDragStart,
  onDragEnd,
}: ContactRecordCardProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`w-full cursor-grab rounded-md border border-slate-200/80 bg-white p-3.5 shadow-2xs transition-all active:cursor-grabbing ${
        isDragging ? "opacity-40" : "hover:shadow-md"
      }`}
    >
      <div
        className={`mb-3 h-1.5 w-full rounded-full ${contact.accentColorClass}`}
      />

      <div className="mb-3 flex items-center gap-2.5">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${contact.avatarBgClass}`}
        >
          {contact.initials}
        </div>
        <h3 className="truncate text-[13px] font-semibold text-slate-800">
          {contact.name}
        </h3>
      </div>

      <div className="space-y-1.5 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <Building2 className="h-3 w-3 shrink-0 text-slate-400" />
          <span className="truncate font-medium text-slate-700">
            {contact.company || "—"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Mail className="h-3 w-3 shrink-0 text-slate-400" />
          <span className="truncate">{contact.email}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="h-3 w-3 shrink-0 text-slate-400" />
          <span>{contact.phone || "—"}</span>
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
        <div className="flex items-center gap-0.5">
          <QuickAction icon={PhoneCall} label="Call" />
          <QuickAction icon={MailIcon} label="Email" />
          <QuickAction icon={MessageSquare} label="SMS" />
          <QuickAction icon={StickyNote} label="Notes" />
          <QuickAction icon={CheckSquare} label="Tasks" />
          <QuickAction icon={CalendarDays} label="Appointments" />
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-violet-600"
    >
      <Icon className="h-3 w-3" />
    </button>
  );
}

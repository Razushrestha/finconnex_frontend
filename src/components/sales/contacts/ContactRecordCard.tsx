"use client";

import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  PhoneCall,
  RefreshCw,
  Layers,
} from "lucide-react";
import type { ContactRecord } from "@/lib/contacts/types";

interface ContactRecordCardProps {
  contact: ContactRecord;
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
      className={`w-full cursor-grab rounded-md border border-slate-200/80 bg-white p-4 shadow-2xs transition-all active:cursor-grabbing ${
        isDragging ? "opacity-40" : "hover:shadow-md"
      }`}
    >
      <div
        className={`mb-3.5 h-1.5 w-full rounded-full ${contact.accentColorClass}`}
      />

      <div className="mb-3.5 flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${contact.avatarBgClass}`}
        >
          {contact.initials}
        </div>
        <h3 className="text-sm font-semibold text-slate-800 truncate">
          {contact.name}
        </h3>
      </div>

      {/* Details List */}
      <div className="space-y-2 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="font-medium text-slate-700 truncate">
            {contact.company}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{contact.email}</span>
        </div>

        <div className="flex items-center gap-2">
          <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span>{contact.phone}</span>
        </div>

        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span>{contact.location}</span>
        </div>
      </div>

      <div className="my-3.5 border-t border-slate-100" />

      {/* Footer Actions */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Website"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-100 bg-slate-50 text-blue-600 shadow-2xs hover:bg-slate-100 transition-colors"
        >
          <Globe className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Call"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <PhoneCall className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            aria-label="Refresh / Sync"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            aria-label="Layers / Options"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <Layers className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

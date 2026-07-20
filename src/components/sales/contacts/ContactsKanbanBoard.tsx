"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  MoreVertical,
  Building2,
  Mail,
  Phone,
  MapPin,
  PhoneCall,
  RefreshCw,
  Layers,
  Globe,
} from "lucide-react";
import {
  CONTACT_GROUPS,
  type ContactRecord,
  type ContactGroup,
} from "@/lib/contacts/types";
import type { ContactFilters } from "./FilterContactsPanel";

interface ContactRecordCardProps {
  contact: ContactRecord;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}

function ContactRecordCard({
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

interface DragInfo {
  contactId: string;
  sourceGroupId: string;
}

interface ContactsKanbanBoardProps {
  /** When omitted (or both arrays empty), every group/card is shown. */
  filters?: ContactFilters;
}

export function ContactsKanbanBoard({ filters }: ContactsKanbanBoardProps) {
  const [groups, setGroups] = useState<ContactGroup[]>(CONTACT_GROUPS);
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [overGroupId, setOverGroupId] = useState<string | null>(null);

  const visibleGroups = useMemo(() => {
    const hasTypeFilter = !!filters?.types.length;
    const hasSourceFilter = !!filters?.sources.length;
    if (!hasTypeFilter && !hasSourceFilter) return groups;

    return groups
      .filter((g) => !hasTypeFilter || filters!.types.includes(g.title))
      .map((g) => ({
        ...g,
        contacts: hasSourceFilter
          ? g.contacts.filter((c) => filters!.sources.includes(c.source))
          : g.contacts,
      }));
  }, [groups, filters]);

  function handleDragStart(
    e: React.DragEvent<HTMLDivElement>,
    contactId: string,
    groupId: string,
  ) {
    setDragInfo({ contactId, sourceGroupId: groupId });
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd() {
    setDragInfo(null);
    setOverGroupId(null);
  }

  function handleDrop(targetGroupId: string) {
    setOverGroupId(null);
    if (!dragInfo) return;
    const { contactId, sourceGroupId } = dragInfo;

    if (sourceGroupId === targetGroupId) {
      setDragInfo(null);
      return;
    }

    setGroups((prev) => {
      const sourceGroup = prev.find((g) => g.id === sourceGroupId);
      const contact = sourceGroup?.contacts.find((c) => c.id === contactId);
      if (!contact) return prev;

      return prev.map((g) => {
        if (g.id === sourceGroupId) {
          return {
            ...g,
            contacts: g.contacts.filter((c) => c.id !== contactId),
          };
        }
        if (g.id === targetGroupId) {
          return { ...g, contacts: [contact, ...g.contacts] };
        }
        return g;
      });
    });

    setDragInfo(null);
  }

  return (
    <div className="w-full overflow-x-auto bg-slate-50/50">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-w-[1100px] items-start">
        {visibleGroups.map((group) => {
          const isOver = overGroupId === group.id;

          return (
            <div
              key={group.id}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragInfo) setOverGroupId(group.id);
              }}
              onDragLeave={() =>
                setOverGroupId((prev) => (prev === group.id ? null : prev))
              }
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(group.id);
              }}
              className={`flex flex-col rounded-sm border p-3 transition-colors ${
                isOver
                  ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-200"
                  : "border-slate-200/60 bg-slate-100/60"
              }`}
            >
              {/* Group Header */}
              <div className="mb-3 flex items-center justify-between px-1 py-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${group.dotColorClass}`}
                  />
                  <h2 className="text-sm font-semibold text-slate-800">
                    {group.title}
                  </h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500 border border-slate-200/80">
                    {group.contacts.length}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Add contact"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Column options"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 transition-colors"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Cards Stack */}
              <div className="flex flex-col gap-3">
                {group.contacts.map((contact) => (
                  <ContactRecordCard
                    key={contact.id}
                    contact={contact}
                    isDragging={dragInfo?.contactId === contact.id}
                    onDragStart={(e) =>
                      handleDragStart(e, contact.id, group.id)
                    }
                    onDragEnd={handleDragEnd}
                  />
                ))}

                {group.contacts.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 py-8 text-center text-xs text-slate-400">
                    Drop a contact here
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {visibleGroups.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white/60 py-12 text-center text-sm text-slate-400">
            No contacts match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}

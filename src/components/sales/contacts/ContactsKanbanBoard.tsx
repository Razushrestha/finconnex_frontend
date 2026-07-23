"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, MoreVertical } from "lucide-react";
import { type ContactGroup } from "@/lib/contacts/types";
import { listContactGroups, saveContactGroups } from "@/lib/contacts/store";
import type { ContactFilters } from "./FilterContactsPanel";
import { ContactRecordCard } from "./ContactRecordCard";

interface DragInfo {
  contactId: string;
  sourceGroupId: string;
}

interface ContactsKanbanBoardProps {
  filters?: ContactFilters;
}

export function ContactsKanbanBoard({ filters }: ContactsKanbanBoardProps) {
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [overGroupId, setOverGroupId] = useState<string | null>(null);

  useEffect(() => {
    setGroups(listContactGroups());
  }, []);

  function persist(next: ContactGroup[]) {
    saveContactGroups(next);
    setGroups(next);
  }

  const visibleGroups = useMemo(() => {
    const hasStatusFilter = !!filters?.statuses.length;
    const hasSourceFilter = !!filters?.sources.length;
    if (!hasStatusFilter && !hasSourceFilter) return groups;

    return groups
      .filter((g) => !hasStatusFilter || filters!.statuses.includes(g.title))
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

    const sourceGroup = groups.find((g) => g.id === sourceGroupId);
    const targetGroup = groups.find((g) => g.id === targetGroupId);
    const contact = sourceGroup?.contacts.find((c) => c.id === contactId);

    if (!contact || !targetGroup) {
      setDragInfo(null);
      return;
    }

    const updatedContact = {
      ...contact,
      accentColorClass: targetGroup.dotColorClass,
    };

    persist(
      groups.map((g) => {
        if (g.id === sourceGroupId) {
          return {
            ...g,
            contacts: g.contacts.filter((c) => c.id !== contactId),
          };
        }
        if (g.id === targetGroupId) {
          return { ...g, contacts: [updatedContact, ...g.contacts] };
        }
        return g;
      }),
    );

    setDragInfo(null);
  }

  return (
    <div className="w-full overflow-x-auto bg-slate-50/50">
      <div className="grid min-w-[900px] grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                  ? "border-violet-300 bg-violet-50 ring-2 ring-violet-200"
                  : "border-slate-200/60 bg-slate-100/60"
              }`}
            >
              <div className="mb-3 flex items-center justify-between px-1 py-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${group.dotColorClass}`}
                  />
                  <h2 className="text-sm font-semibold text-slate-800">
                    {group.title}
                  </h2>
                  <span className="rounded-full border border-slate-200/80 bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">
                    {group.contacts.length}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Add contact"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:bg-slate-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Column options"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:bg-slate-50"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

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

"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, MoreVertical } from "lucide-react";
import { type ContactGroup } from "@/lib/contacts/types";
import { listContactGroups, saveContactGroups } from "@/lib/contacts/store";
import type { ContactFilters } from "./FilterContactsPanel";
import { ContactRecordCard } from "./ContactRecordCard";
import { dropTargetActive, dropTargetIdle } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface DragInfo {
  contactId: string;
  sourceGroupId: string;
}

interface ContactsKanbanBoardProps {
  filters?: ContactFilters;
  visibleColumnIds?: string[];
  onAddLead?: (columnId: string) => void;
}

const BOARD_HEIGHT = "h-[calc(100vh-5rem)]";

export function ContactsKanbanBoard({
  filters,
  visibleColumnIds,
  onAddLead,
}: ContactsKanbanBoardProps) {
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [overGroupId, setOverGroupId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    setGroups(listContactGroups());
  }, []);

  function persist(next: ContactGroup[]) {
    saveContactGroups(next);
    setGroups(next);
  }

  function toggleCollapsed(groupId: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  const visibleGroups = useMemo(() => {
    const hasStatusFilter = !!filters?.statuses.length;
    const hasSourceFilter = !!filters?.sources.length;
    const hasColumnFilter = !!visibleColumnIds;

    const result = hasColumnFilter
      ? visibleColumnIds!
          .map((id) => groups.find((g) => g.id === id))
          .filter((g): g is ContactGroup => !!g)
      : groups;

    return result
      .filter((g) => !hasStatusFilter || filters!.statuses.includes(g.title))
      .map((g) => ({
        ...g,
        contacts: hasSourceFilter
          ? g.contacts.filter((c) => filters!.sources.includes(c.source))
          : g.contacts,
      }));
  }, [groups, filters, visibleColumnIds]);

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
    <div className="relative w-full overflow-x-auto bg-slate-50/50 no-scrollbar">
      <div className="flex min-w-[900px] items-start gap-3 p-1">
        {visibleGroups.map((group) => {
          const isOver = overGroupId === group.id;
          const isCollapsed = collapsedGroups.has(group.id);

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
              className={cn(
                "group relative flex flex-col gap-2 transition-all duration-200",
                BOARD_HEIGHT,
                isCollapsed
                  ? "w-12 min-w-[3.5rem] flex-shrink-0"
                  : "w-[272px] flex-shrink-0",
              )}
            >
              {isCollapsed ? (
                <div
                  className={cn(
                    "flex h-full flex-col rounded-sm border p-2",
                    dropTargetIdle,
                    isOver
                      ? dropTargetActive
                      : "border-slate-200/60 bg-slate-100/60",
                  )}
                >
                  <CollapsedColumn
                    group={group}
                    onExpand={() => toggleCollapsed(group.id)}
                  />
                </div>
              ) : (
                <>
                  <div className="rounded-xs border border-slate-200/60 bg-slate-100/60 p-1">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <h2 className="max-w-[15rem] text-xs font-semibold leading-snug text-slate-800 xl:text-sm">
                          {group.title}
                        </h2>
                        <span className="rounded-full border border-slate-200/80 bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">
                          {group.contacts.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "relative flex min-h-0 flex-1 flex-col rounded-sm border p-1",
                      dropTargetIdle,
                      isOver
                        ? dropTargetActive
                        : "border-slate-200/60 bg-slate-100/60",
                    )}
                  >
                    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-8 no-scrollbar">
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

                    {/* Collapse control */}
                    <div className="mt-2 flex shrink-0 items-center justify-between gap-2 px-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => onAddLead?.(group.id)}
                        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-white hover:text-slate-900"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Create Contact
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleCollapsed(group.id)}
                        aria-label={`Collapse ${group.title}`}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
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

function CollapsedColumn({
  group,
  onExpand,
}: {
  group: ContactGroup;
  onExpand: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-between py-2">
      <div className="flex flex-col items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${group.dotColorClass}`} />
        <span className="rounded-full border border-slate-200/80 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
          {group.contacts.length}
        </span>
      </div>
      <p
        className="flex-1 py-3 text-xs font-semibold text-slate-600 [writing-mode:vertical-rl]"
        title={group.title}
      >
        {group.title}
      </p>
      <button
        type="button"
        onClick={onExpand}
        aria-label={`Expand ${group.title}`}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

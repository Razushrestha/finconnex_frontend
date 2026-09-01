"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { type ContactGroup, type ContactStatus } from "@/lib/contacts/types";
import {
  listContactGroups,
  saveContactGroups,
} from "@/lib/contacts/store";
import { onRulesChange } from "@/lib/rules";
import type { ContactFilters } from "./FilterContactsPanel";
import {
  ContactRecordCard,
  type ContactQuickActionKind,
} from "./ContactRecordCard";
import {
  ContactCardPanelHost,
  type ContactPanelState,
} from "./ContactCardPanelHost";
import { KanbanColumnFooter } from "@/components/common/KanbanColumnFooter";
import { KanbanEmptyStage } from "@/components/common/KanbanEmptyStage";
import { KanbanStageScroll } from "@/components/common/KanbanStageScroll";
import { KanbanCollapsedRail } from "@/components/common/KanbanCollapsedRail";
import { dropTargetActive, dropTargetIdle } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  KANBAN_BOARD_ROW,
  KANBAN_COL,
  KANBAN_COL_COLLAPSED,
  KANBAN_DROP_GHOST,
  KANBAN_HEADER,
  KANBAN_HEADER_COUNT,
  KANBAN_HEADER_TITLE,
  KANBAN_WELL,
} from "@/lib/layout";
import { useRouter } from "next/navigation";

interface DragInfo {
  contactId: string;
  sourceGroupId: string;
}

interface DropTargetPosition {
  groupId: string;
  targetIndex: number;
}

type ContactRecord = ContactGroup["contacts"][number];

interface ContactsKanbanBoardProps {
  filters?: ContactFilters;
  visibleColumnIds?: string[];
  sortValue?: string;
  onAddContact?: (groupId: string) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
}

export function ContactsKanbanBoard({
  filters,
  visibleColumnIds,
  onAddContact,
  selectedIds = [],
  onToggleSelect,
}: ContactsKanbanBoardProps) {
  const router = useRouter();

  const [groups, setGroups] = useState<ContactGroup[]>(() =>
    listContactGroups(),
  );
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [dropTargetPos, setDropTargetPos] = useState<DropTargetPosition | null>(
    null,
  );
  const [overGroupId, setOverGroupId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(),
  );
  const [panel, setPanel] = useState<ContactPanelState | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    return onRulesChange(() => setGroups(listContactGroups()));
  }, []);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }

  function persist(next: ContactGroup[]) {
    setGroups(next);
    saveContactGroups(next);
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

  function visibleContactCount(group: ContactGroup) {
    if (dragInfo && dragInfo.sourceGroupId === group.id) {
      return group.contacts.length - 1;
    }
    return group.contacts.length;
  }

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
    setDropTargetPos(null);
    setOverGroupId(null);
  }

  /** Shared move: pulls the contact out of the source group, drops it into the target at targetIndex. */
  function moveContact(
    contact: ContactRecord,
    sourceGroup: ContactGroup,
    targetGroup: ContactGroup,
    updatedContact: ContactRecord,
    targetIndex?: number,
  ) {
    persist(
      groups.map((g) => {
        if (g.id === sourceGroup.id && g.id === targetGroup.id) {
          const filtered = g.contacts.filter((c) => c.id !== contact.id);
          const insertAt =
            targetIndex !== undefined ? targetIndex : filtered.length;
          const next = [...filtered];
          next.splice(insertAt, 0, updatedContact);
          return { ...g, contacts: next };
        }
        if (g.id === sourceGroup.id) {
          return {
            ...g,
            contacts: g.contacts.filter((c) => c.id !== contact.id),
          };
        }
        if (g.id === targetGroup.id) {
          const filtered = g.contacts.filter((c) => c.id !== contact.id);
          const insertAt =
            targetIndex !== undefined ? targetIndex : filtered.length;
          const next = [...filtered];
          next.splice(insertAt, 0, updatedContact);
          return { ...g, contacts: next };
        }
        return g;
      }),
    );
  }

  function handleDrop(targetGroupId: string, targetIndex?: number) {
    setOverGroupId(null);
    setDropTargetPos(null);
    if (!dragInfo) return;
    const { contactId, sourceGroupId } = dragInfo;

    const sourceGroup = groups.find((g) => g.id === sourceGroupId);
    const targetGroup = groups.find((g) => g.id === targetGroupId);
    const contact = sourceGroup?.contacts.find((c) => c.id === contactId);

    if (!contact || !sourceGroup || !targetGroup) {
      setDragInfo(null);
      return;
    }

    const updatedContact =
      sourceGroup.id === targetGroup.id
        ? contact
        : { ...contact, accentColorClass: targetGroup.dotColorClass };

    moveContact(contact, sourceGroup, targetGroup, updatedContact, targetIndex);
    if (sourceGroup.id !== targetGroup.id) {
      void import("@/lib/contacts/api").then(({ updateCrmContact, tryCrmContact }) => {
        void tryCrmContact(() =>
          updateCrmContact(contact.id, {
            status: targetGroup.title as ContactStatus,
          }),
        );
      });
      flash(`${contact.name} moved to ${targetGroup.title}`);
    }
    setDragInfo(null);
  }

  return (
    <div className="relative h-full w-full overflow-x-auto overflow-y-hidden bg-slate-50">
      <div className={KANBAN_BOARD_ROW}>
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
                "group/stage relative flex h-full min-h-0 flex-col gap-2 transition-all duration-200",
                isCollapsed ? KANBAN_COL_COLLAPSED : KANBAN_COL,
              )}
            >
              {isCollapsed ? (
                <KanbanCollapsedRail
                  title={group.title}
                  count={group.contacts.length}
                  onExpand={() => toggleCollapsed(group.id)}
                />
              ) : (
                <>
                  {/* Header box */}
                  <div className={KANBAN_HEADER}>
                    <div className="flex h-6 items-center justify-between gap-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <h2 className={KANBAN_HEADER_TITLE} title={group.title}>
                          {group.title}
                        </h2>
                        <span className={KANBAN_HEADER_COUNT}>
                          {group.contacts.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <KanbanStageScroll
                    footer={
                      <KanbanColumnFooter
                        createLabel="Create contact"
                        onCreate={() => router.push("/sales/contacts/create")}
                        onCollapse={() => toggleCollapsed(group.id)}
                        collapseLabel={`Collapse ${group.title}`}
                      />
                    }
                  >
                  <div
                    className={cn(
                      "relative flex min-h-full flex-col rounded-sm border p-1",
                      dropTargetIdle,
                      isOver
                        ? dropTargetActive
                        : KANBAN_WELL,
                    )}
                  >
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragInfo) {
                          setOverGroupId(group.id);
                          if (
                            !dropTargetPos ||
                            dropTargetPos.groupId !== group.id
                          ) {
                            setDropTargetPos({
                              groupId: group.id,
                              targetIndex: visibleContactCount(group),
                            });
                          }
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDrop(group.id, dropTargetPos?.targetIndex);
                      }}
                      className="flex min-h-[180px] flex-1 flex-col gap-3 pb-8"
                    >
                      {(() => {
                        let visibleIndex = 0;
                        const rendered: React.ReactNode[] = [];

                        const showPlaceholderAt = (idx: number) =>
                          dragInfo &&
                          dropTargetPos?.groupId === group.id &&
                          dropTargetPos.targetIndex === idx;

                        group.contacts.forEach((contact) => {
                          const isDraggedContact =
                            dragInfo?.contactId === contact.id;
                          const myIndex = visibleIndex;

                          if (!isDraggedContact && showPlaceholderAt(myIndex)) {
                            rendered.push(
                              <div
                                key={`placeholder-${contact.id}`}
                                className={KANBAN_DROP_GHOST}
                              />,
                            );
                          }

                          rendered.push(
                            <div
                              key={contact.id}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!dragInfo || isDraggedContact) return;

                                const rect =
                                  e.currentTarget.getBoundingClientRect();
                                const midpoint = rect.top + rect.height / 2;
                                const insertIndex =
                                  e.clientY < midpoint ? myIndex : myIndex + 1;

                                setDropTargetPos({
                                  groupId: group.id,
                                  targetIndex: insertIndex,
                                });
                              }}
                            >
                              <ContactRecordCard
                                contact={contact}
                                isDragging={isDraggedContact}
                                onDragStart={(e) =>
                                  handleDragStart(e, contact.id, group.id)
                                }
                                onDragEnd={handleDragEnd}
                                onQuickAction={(kind: ContactQuickActionKind) =>
                                  setPanel({
                                    type: "quick-action",
                                    kind,
                                    contactId: contact.id,
                                    contactName: contact.name,
                                    email: contact.email,
                                    phone: contact.phone,
                                  })
                                }
                                isSelected={selectedIds.includes(contact.id)}
                                onToggleSelect={onToggleSelect}
                              />
                            </div>,
                          );

                          if (!isDraggedContact) visibleIndex++;
                        });

                        if (showPlaceholderAt(visibleIndex)) {
                          rendered.push(
                            <div
                              key="placeholder-end"
                              className={KANBAN_DROP_GHOST}
                            />,
                          );
                        }

                        return (
                          <>
                            {rendered}
                            {group.contacts.length === 0 ? (
                              <KanbanEmptyStage entity="Contacts" />
                            ) : null}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  </KanbanStageScroll>
                </>
              )}
            </div>
          );
        })}

        {visibleGroups.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 py-12 text-center text-sm text-slate-400">
            No contacts match the current filters.
          </div>
        )}
      </div>

      <ContactCardPanelHost
        panel={panel}
        onClose={() => setPanel(null)}
        onQuickActionSuccess={(message) => flash(message)}
      />

      {toast && (
        <div className="fixed right-4 bottom-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}


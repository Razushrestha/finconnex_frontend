"use client";

import { useEffect, useMemo, useState } from "react";
import { emptyContactGroups, type ContactGroup, type ContactStatus } from "@/lib/contacts/types";
import {
  listContactGroups,
  saveContactGroups,
} from "@/lib/contacts/store";
import { onRulesChange } from "@/lib/rules";
import type { ContactFilters } from "./FilterContactsPanel";
import { contactMatchesFilters } from "@/lib/filters/records";
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
import { KanbanDragGhost } from "@/components/common/KanbanDragGhost";
import {
  KANBAN_CARD_SLOT_ATTR,
  KANBAN_DROP_COLUMN_ATTR,
  usePointerKanbanDrag,
  type PointerKanbanDrop,
} from "@/lib/kanban/use-pointer-kanban-drag";
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
import { notify } from "@/lib/notify/toast";

type ContactRecord = ContactGroup["contacts"][number];

interface ContactsKanbanBoardProps {
  filters?: ContactFilters;
  visibleColumnIds?: string[];
  /** Optional display title overrides keyed by group id. */
  columnTitles?: Record<string, string>;
  sortValue?: string;
  onAddContact?: (groupId: string) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  refreshKey?: string;
}

export function ContactsKanbanBoard({
  filters,
  visibleColumnIds,
  columnTitles,
  onAddContact,
  selectedIds = [],
  onToggleSelect,
  refreshKey,
}: ContactsKanbanBoardProps) {
  const router = useRouter();

  const [groups, setGroups] = useState<ContactGroup[]>(() => emptyContactGroups());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(),
  );
  const [panel, setPanel] = useState<ContactPanelState | null>(null);

  useEffect(() => {
    setGroups(listContactGroups());
    return onRulesChange(() => setGroups(listContactGroups()));
  }, [refreshKey]);

  function flash(msg: string) {
    notify(msg);
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
        contacts: g.contacts.filter((c) =>
          contactMatchesFilters({ ...c, statusTitle: g.title }, filters),
        ),
      }));
  }, [groups, filters, visibleColumnIds]);

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

  function commitDrop({
    itemId,
    sourceColumnId,
    targetColumnId,
    targetIndex,
  }: PointerKanbanDrop) {
    const sourceGroup = groups.find((g) => g.id === sourceColumnId);
    const targetGroup = groups.find((g) => g.id === targetColumnId);
    const contact = sourceGroup?.contacts.find((c) => c.id === itemId);

    if (!contact || !sourceGroup || !targetGroup) return;

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
  }

  const drag = usePointerKanbanDrag({ onDrop: commitDrop });

  return (
    <div className="relative h-full w-full overflow-x-auto overflow-y-hidden bg-slate-50">
      <div className={KANBAN_BOARD_ROW}>
        {visibleGroups.map((group) => {
          const isOver = drag.overColumnId === group.id;
          const isCollapsed = collapsedGroups.has(group.id);

          return (
            <div
              key={group.id}
              {...{ [KANBAN_DROP_COLUMN_ATTR]: group.id }}
              className={cn(
                "group/stage relative flex h-full min-h-0 flex-col gap-2 transition-all duration-200",
                isCollapsed ? KANBAN_COL_COLLAPSED : KANBAN_COL,
              )}
            >
              {isCollapsed ? (
                <KanbanCollapsedRail
                  title={columnTitles?.[group.id] ?? group.title}
                  count={group.contacts.length}
                  onExpand={() => toggleCollapsed(group.id)}
                />
              ) : (
                <>
                  {/* Header box */}
                  <div className={KANBAN_HEADER}>
                    <div className="flex h-6 items-center justify-between gap-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <h2
                          className={KANBAN_HEADER_TITLE}
                          title={columnTitles?.[group.id] ?? group.title}
                        >
                          {columnTitles?.[group.id] ?? group.title}
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
                        onCreate={() =>
                          onAddContact
                            ? onAddContact(group.id)
                            : router.push("/sales/contacts/create")
                        }
                        onCollapse={() => toggleCollapsed(group.id)}
                        collapseLabel={`Collapse ${columnTitles?.[group.id] ?? group.title}`}
                        inert={drag.isDragging}
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
                    <div className="flex min-h-[180px] flex-1 flex-col gap-3 pb-8">
                      {(() => {
                        let visibleIndex = 0;
                        const rendered: React.ReactNode[] = [];

                        const showPlaceholderAt = (idx: number) =>
                          drag.dragInfo &&
                          drag.dropTargetPos?.columnId === group.id &&
                          drag.dropTargetPos.targetIndex === idx;

                        group.contacts.forEach((contact) => {
                          const isDraggedContact = drag.isDraggingItem(
                            contact.id,
                          );
                          const myIndex = visibleIndex;

                          if (!isDraggedContact && showPlaceholderAt(myIndex)) {
                            rendered.push(
                              <div
                                key={`placeholder-${contact.id}`}
                                className={KANBAN_DROP_GHOST}
                              />,
                            );
                          }

                          const pointer = drag.cardPointerProps({
                            id: contact.id,
                            columnId: group.id,
                            name: contact.name,
                          });

                          rendered.push(
                            <div
                              key={contact.id}
                              {...{ [KANBAN_CARD_SLOT_ATTR]: contact.id }}
                            >
                              <ContactRecordCard
                                contact={contact}
                                isDragging={isDraggedContact}
                                onDragPointerDown={pointer.onPointerDown}
                                onDragClickCapture={pointer.onClickCapture}
                                onQuickAction={(kind: ContactQuickActionKind) => {
                                  if (kind === "call") {
                                    void import("@/lib/softphone/events").then(
                                      ({ startCrmRecordCall }) => {
                                        startCrmRecordCall({
                                          phone: contact.mobile || contact.phone,
                                          name: contact.name,
                                          relatedTo: `Contact: ${contact.name}`,
                                          relatedType: "CONTACT",
                                          relatedId: contact.id,
                                          contactId: contact.id,
                                        });
                                      },
                                    );
                                    return;
                                  }
                                  setPanel({
                                    type: "quick-action",
                                    kind,
                                    contactId: contact.id,
                                    contactName: contact.name,
                                    email: contact.email,
                                    phone: contact.phone,
                                  });
                                }}
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

      <KanbanDragGhost ghost={drag.ghost} />

      <ContactCardPanelHost
        panel={panel}
        onClose={() => setPanel(null)}
        onQuickActionSuccess={(message) => flash(message)}
      />

    </div>
  );
}


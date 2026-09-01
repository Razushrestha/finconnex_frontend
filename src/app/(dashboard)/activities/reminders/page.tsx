"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Clock,
  Link2,
  Mail,
  Smartphone,
  Monitor,
  BellRing,
  AlarmClock,
  X,
  ChevronDown,
} from "lucide-react";
import {
  EMPTY_REMINDER_FILTERS,
  reminderMatchesFilters,
  type Reminder,
  type ReminderColumn,
  type ReminderFilters,
  type ReminderStatus,
  type ReminderType,
  type NotificationMethod,
} from "@/lib/reminders/types";
import { activityExportMenuItem } from "@/lib/activities/export";
import {
  ActivityToolbar,
  TIMELINE_VIEW_TOGGLE,
  type ActivityView,
} from "@/components/activities/ActivityToolbar";
import { RemindersFilterPanel } from "@/components/activities/reminders/RemindersFilterPanel";
import { RemindersTimelineView } from "@/components/activities/reminders/RemindersTimelineView";
import { printViewItems } from "../tasks/page";
import { listReminderColumns, saveReminders } from "@/lib/reminders/store";
import {
  completeCrmReminder,
  dismissCrmReminder,
  updateCrmReminder,
  isCrmReminderId,
  persistRemoteReminder,
  snoozeCrmReminder,
  tryCrmReminder,
} from "@/lib/reminders/api";
import { useCrmReminders } from "@/lib/reminders/use-crm-reminders";
import {
  CardInitialsAvatar,
  CardOwnerRow,
} from "@/components/shared/CardInitialsAvatar";
import { FocusHighlight } from "@/components/shared/FocusHighlight";
import { cn } from "@/lib/utils";
import {
  BOARD_PAGE,
  KANBAN_BOARD_ROW,
  KANBAN_CARD,
  KANBAN_COL,
  KANBAN_DROP_GHOST,
  KANBAN_HEADER,
  KANBAN_HEADER_COUNT,
  KANBAN_WELL,
} from "@/lib/layout";
import {
  dropTargetActive,
  dropTargetIdle,
  cardSubject,
  cardMotion,
  cardDragging,
} from "@/lib/motion";
import { KanbanColumnFooter } from "@/components/common/KanbanColumnFooter";
import { KanbanEmptyStage } from "@/components/common/KanbanEmptyStage";
import { KanbanStageScroll } from "@/components/common/KanbanStageScroll";
import { KanbanCollapsedRail } from "@/components/common/KanbanCollapsedRail";
import { EntitySelectionToolbar } from "@/components/sales/EntitySelectionToolbar";
import { parseTaskDueDate } from "@/lib/dashboard/layout";

const reminderSortOptions = [
  { key: "dateTime", label: "When" },
  { key: "title", label: "Reminder" },
  { key: "type", label: "Type" },
  { key: "status", label: "Status" },
  { key: "owner", label: "Owner" },
  { key: "relatedTo", label: "Related To" },
];

function sortReminders(
  items: Reminder[],
  field?: string,
  direction: "asc" | "desc" = "asc",
): Reminder[] {
  if (!field) return items;
  const dir = direction === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    if (field === "dateTime") {
      const ta = parseTaskDueDate(a.dateTime)?.getTime() ?? 0;
      const tb = parseTaskDueDate(b.dateTime)?.getTime() ?? 0;
      return (ta - tb) * dir;
    }
    const left = String(
      field === "relatedTo" ? (a.relatedTo ?? "") : a[field as keyof Reminder] ?? "",
    ).toLowerCase();
    const right = String(
      field === "relatedTo" ? (b.relatedTo ?? "") : b[field as keyof Reminder] ?? "",
    ).toLowerCase();
    return left.localeCompare(right) * dir;
  });
}

const STATUS_META: Record<
  ReminderStatus,
  { soft: string; text: string; border: string; dot: string }
> = {
  Pending: {
    soft: "bg-sky-50",
    text: "text-sky-700",
    border: "border-l-sky-500",
    dot: "bg-sky-500",
  },
  Dismissed: {
    soft: "bg-slate-100",
    text: "text-slate-600",
    border: "border-l-slate-400",
    dot: "bg-slate-400",
  },
  Snoozed: {
    soft: "bg-amber-50",
    text: "text-amber-800",
    border: "border-l-amber-500",
    dot: "bg-amber-500",
  },
  Triggered: {
    soft: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-l-emerald-500",
    dot: "bg-emerald-500",
  },
};

const METHOD_ICON: Record<NotificationMethod, React.ElementType> = {
  "In-app": Monitor,
  Email: Mail,
  "Web Push": BellRing,
  SMS: Smartphone,
};

export default function RemindersPage() {
  const router = useRouter();
  const crm = useCrmReminders("all");
  const [view, setView] = useState<ActivityView>("kanban");
  const [columns, setColumns] = useState<ReminderColumn[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<ReminderFilters>(EMPTY_REMINDER_FILTERS);
  const [sortField, setSortField] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkFlash, setBulkFlash] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (crm.loading) return;
    setColumns(listReminderColumns());
  }, [crm.source, crm.loading]);

  const allReminders = useMemo(
    () =>
      columns.flatMap((c) =>
        c.reminders.map((r) => ({ ...r, status: c.title as ReminderStatus })),
      ),
    [columns],
  );

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const reminder of allReminders) {
      counts[reminder.status] = (counts[reminder.status] ?? 0) + 1;
      counts[reminder.type] = (counts[reminder.type] ?? 0) + 1;
      counts[reminder.notificationMethod] =
        (counts[reminder.notificationMethod] ?? 0) + 1;
      counts[reminder.owner] = (counts[reminder.owner] ?? 0) + 1;
    }
    return counts;
  }, [allReminders]);

  const visibleColumns = useMemo(() => {
    return columns
      .filter(
        (col) =>
          filters.statuses.length === 0 || filters.statuses.includes(col.title),
      )
      .map((col) => {
        const reminders = sortReminders(
          col.reminders.filter((r) =>
            reminderMatchesFilters(
              { ...r, status: col.title },
              { ...filters, statuses: [] },
            ),
          ),
          sortField,
          sortDirection,
        );
        return { ...col, reminders, count: reminders.length };
      });
  }, [columns, filters, sortField, sortDirection]);

  const visibleReminders = useMemo(
    () =>
      sortReminders(
        allReminders.filter((r) => reminderMatchesFilters(r, filters)),
        sortField,
        sortDirection,
      ),
    [allReminders, filters, sortField, sortDirection],
  );

  function toggleFilterField(
    sectionId: "status" | "type" | "method" | "owner",
    field: string,
  ) {
    setFilters((prev) => {
      if (sectionId === "status") {
        const selected = field as ReminderStatus;
        const next = prev.statuses.includes(selected)
          ? prev.statuses.filter((value) => value !== selected)
          : [...prev.statuses, selected];
        return { ...prev, statuses: next };
      }
      if (sectionId === "type") {
        const selected = field as ReminderType;
        const next = prev.types.includes(selected)
          ? prev.types.filter((value) => value !== selected)
          : [...prev.types, selected];
        return { ...prev, types: next };
      }
      if (sectionId === "method") {
        const selected = field as NotificationMethod;
        const next = prev.methods.includes(selected)
          ? prev.methods.filter((value) => value !== selected)
          : [...prev.methods, selected];
        return { ...prev, methods: next };
      }
      const next = prev.owners.includes(field)
        ? prev.owners.filter((value) => value !== field)
        : [...prev.owners, field];
      return { ...prev, owners: next };
    });
  }

  function handleSortChange(field: string, direction: "asc" | "desc") {
    setSortField(field);
    setSortDirection(direction);
  }

  const allVisibleSelected =
    visibleReminders.length > 0 &&
    visibleReminders.every((r) => selectedIds.includes(r.id));

  function persistColumns(next: ReminderColumn[]) {
    saveReminders(
      next.flatMap((col) =>
        col.reminders.map((r) => ({ ...r, status: col.title })),
      ),
    );
    setColumns(next);
  }
  function moveReminder(id: string, status: ReminderStatus) {
    setColumns((prev) => {
      let found: Reminder | undefined;
      const stripped = prev.map((col) => {
        const hit = col.reminders.find((r) => r.id === id);
        if (hit) found = hit;
        const nextReminders = col.reminders.filter((r) => r.id !== id);
        return {
          ...col,
          reminders: nextReminders,
          count: nextReminders.length,
        };
      });
      if (!found) return prev;
      const next = stripped.map((col) => {
        if (col.title !== status) return col;
        const reminders = [{ ...found!, status }, ...col.reminders];
        return { ...col, reminders, count: reminders.length };
      });
      saveReminders(
        next.flatMap((col) =>
          col.reminders.map((r) => ({ ...r, status: col.title })),
        ),
      );
      if (isCrmReminderId(id)) {
        void (async () => {
          if (status === "Snoozed") {
            persistRemoteReminder(await tryCrmReminder(() => snoozeCrmReminder(id)));
          } else if (status === "Triggered") {
            persistRemoteReminder(
              await tryCrmReminder(() => completeCrmReminder(id)),
            );
          } else if (status === "Dismissed") {
            await tryCrmReminder(() => dismissCrmReminder(id));
          } else {
            persistRemoteReminder(
              await tryCrmReminder(() =>
                updateCrmReminder(id, { status: "PENDING" }),
              ),
            );
          }
        })();
      }
      return next;
    });
  }

  function handleDrop(targetStatus: ReminderStatus) {
    if (!dragId) return;
    moveReminder(dragId, targetStatus);
    setDragId(null);
    setOverCol(null);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );
  }

  function runBulkDelete() {
    if (!selectedIds.length) return;
    const count = selectedIds.length;
    if (
      !window.confirm(
        `Delete ${count} reminder${count === 1 ? "" : "s"}? This cannot be undone.`,
      )
    ) {
      return;
    }
    const remove = new Set(selectedIds);
    for (const id of selectedIds) {
      if (isCrmReminderId(id)) {
        void tryCrmReminder(() => dismissCrmReminder(id));
      }
    }
    persistColumns(
      columns.map((col) => {
        const reminders = col.reminders.filter((r) => !remove.has(r.id));
        return { ...col, reminders, count: reminders.length };
      }),
    );
    setSelectedIds([]);
    setBulkFlash(`Deleted ${count} reminder${count === 1 ? "" : "s"}`);
    window.setTimeout(() => setBulkFlash(null), 2800);
  }

  return (
    <div className={BOARD_PAGE}>
      <FocusHighlight />

      <div className="shrink-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              crm.source === "api"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-500",
            )}
          >
            {crm.source === "api"
              ? "Live CRM"
              : crm.loading
                ? "Connecting…"
                : "Demo"}
          </span>
          {crm.error && crm.source === "demo" ? (
            <span className="text-[10px] text-slate-500">{crm.error}</span>
          ) : null}
        </div>
        <ActivityToolbar
          entityLabel="Reminder"
          createRoute="/activities/reminders/create"
          view={view}
          onViewChange={setView}
          filterOpen={filterOpen}
          onToggleFilter={() => setFilterOpen((v) => !v)}
          sortOptions={reminderSortOptions}
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          onClearSort={() => setSortField(undefined)}
          extraViewIcons={[TIMELINE_VIEW_TOGGLE]}
          moreMenuItems={[activityExportMenuItem("reminders")]}
          printViewItems={printViewItems}
        />

        {bulkFlash ? (
          <p className="mt-1 text-[12px] font-medium text-violet-700">
            {bulkFlash}
          </p>
        ) : null}

        {selectedIds.length > 0 ? (
          <EntitySelectionToolbar
            selectedCount={selectedIds.length}
            onClear={() => setSelectedIds([])}
            onDelete={runBulkDelete}
          />
        ) : null}
      </div>

      <div className="mt-2 flex min-h-0 flex-1 items-stretch gap-4 overflow-hidden">
        {filterOpen ? (
          <RemindersFilterPanel
            filters={filters}
            counts={filterCounts}
            onToggleField={toggleFilterField}
            onClose={() => setFilterOpen(false)}
          />
        ) : null}

        <div
          className={cn(
            "min-h-0 min-w-0 flex-1",
            view === "kanban" ? "overflow-hidden" : "overflow-auto",
          )}
        >
            {view === "timeline" ? (
              <RemindersTimelineView reminders={visibleReminders} />
            ) : view === "kanban" ? (
              <div className={KANBAN_BOARD_ROW}>
                {visibleColumns.map((col) => {
                  const isOver = overCol === col.id;
                  const isCollapsed = collapsed.has(col.id);
                  if (isCollapsed) {
                    return (
                      <KanbanCollapsedRail
                        key={col.id}
                        title={col.title}
                        count={col.reminders.length}
                        onExpand={() =>
                          setCollapsed((prev) => {
                            const next = new Set(prev);
                            next.delete(col.id);
                            return next;
                          })
                        }
                      />
                    );
                  }
                  return (
                    <div
                      key={col.id}
                      className={cn("group/stage flex h-full min-h-0 flex-col", KANBAN_COL)}
                    >
                      <div className={cn("mb-2 shrink-0", KANBAN_HEADER)}>
                        <div className="flex items-center justify-between gap-4">
                          <button
                            type="button"
                            onClick={() =>
                              setCollapsed((prev) => new Set(prev).add(col.id))
                            }
                            title="Collapse"
                            className="flex items-center gap-1.5 rounded-sm hover:opacity-70"
                          >
                            <ChevronDown className="h-4 w-4 shrink-0 text-slate-700" />
                            <h3 className="text-sm font-semibold text-slate-900">
                              {col.title}
                            </h3>
                          </button>
                          <span className={KANBAN_HEADER_COUNT}>
                            {col.reminders.length}
                          </span>
                        </div>
                      </div>

                      <KanbanStageScroll
                        footer={
                          <KanbanColumnFooter
                            createLabel="Create reminder"
                            onCreate={() =>
                              router.push("/activities/reminders/create")
                            }
                            onCollapse={() =>
                              setCollapsed((prev) => new Set(prev).add(col.id))
                            }
                            collapseLabel={`Collapse ${col.title}`}
                          />
                        }
                      >
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setOverCol(col.id);
                        }}
                        onDragLeave={() =>
                          setOverCol((p) => (p === col.id ? null : p))
                        }
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDrop(col.title);
                        }}
                        className={cn(
                          "flex min-h-full flex-col rounded-sm border border-transparent p-2",
                          dropTargetIdle,
                          isOver ? dropTargetActive : KANBAN_WELL,
                        )}
                      >
                        <div className="flex min-h-[180px] flex-1 flex-col space-y-3 pb-4">
                          {isOver && dragId ? (
                            <div className={KANBAN_DROP_GHOST} />
                          ) : null}
                          {col.reminders.map((r) => (
                            <ReminderCard
                              key={r.id}
                              reminder={r}
                              status={col.title}
                              isDragging={dragId === r.id}
                              isSelected={selectedIds.includes(r.id)}
                              onSelect={() => toggleSelected(r.id)}
                              onDragStart={() => setDragId(r.id)}
                              onDragEnd={() => {
                                setDragId(null);
                                setOverCol(null);
                              }}
                              onSnooze={() => moveReminder(r.id, "Snoozed")}
                              onDismiss={() => moveReminder(r.id, "Dismissed")}
                              onActivate={() => moveReminder(r.id, "Pending")}
                            />
                          ))}

                          {col.reminders.length === 0 && !isOver ? (
                            <KanbanEmptyStage entity="Reminders" />
                          ) : null}
                        </div>
                      </div>
                      </KanbanStageScroll>
                    </div>
                  );
                })}
              </div>
            ) : (
              <table className="w-full min-w-[960px] text-left text-[12px]">
                <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
                  <tr>
                    <th className="w-10 px-4 py-2.5">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                        checked={allVisibleSelected}
                        onChange={() => {
                          const ids = visibleReminders.map((r) => r.id);
                          setSelectedIds(
                            allVisibleSelected
                              ? selectedIds.filter((id) => !ids.includes(id))
                              : [...new Set([...selectedIds, ...ids])],
                          );
                        }}
                        aria-label="Select all"
                      />
                    </th>
                    <th className="px-4 py-2.5">Reminder</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5">When</th>
                    <th className="px-4 py-2.5">Method</th>
                    <th className="px-4 py-2.5">Related To</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Owner</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {visibleReminders.map((r) => {
                    const meta = STATUS_META[r.status];
                    const MethodIcon = METHOD_ICON[r.notificationMethod];
                    return (
                      <tr
                        key={r.id}
                        data-focus-id={r.id}
                        data-reminder-id={r.id}
                        className="transition-colors hover:bg-violet-50/40"
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                            checked={selectedIds.includes(r.id)}
                            onChange={() => toggleSelected(r.id)}
                            aria-label={`Select ${r.title}`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-lg",
                                meta.soft,
                                meta.text,
                              )}
                            >
                              <Bell className="h-3.5 w-3.5" />
                            </span>
                            <span className="font-semibold text-slate-900">
                              {r.title}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{r.type}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                          {r.dateTime}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-slate-600">
                            <MethodIcon className="h-3.5 w-3.5 text-slate-400" />
                            {r.notificationMethod}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {r.relatedTo || ""}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-bold",
                              meta.soft,
                              meta.text,
                            )}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <CardInitialsAvatar name={r.owner} />
                            {r.owner}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {(r.status === "Pending" ||
                            r.status === "Snoozed") && (
                            <div className="inline-flex gap-1">
                              <button
                                type="button"
                                onClick={() => moveReminder(r.id, "Snoozed")}
                                className="rounded-md px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-50"
                              >
                                Snooze
                              </button>
                              <button
                                type="button"
                                onClick={() => moveReminder(r.id, "Dismissed")}
                                className="rounded-md px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-50"
                              >
                                Dismiss
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
        </div>
      </div>
    </div>
  );
}

function ReminderCard({
  reminder,
  status,
  isDragging,
  isSelected = false,
  onSelect,
  onDragStart,
  onDragEnd,
  onSnooze,
  onDismiss,
  onActivate,
}: {
  reminder: Reminder;
  status: ReminderStatus;
  isDragging: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onSnooze: () => void;
  onDismiss: () => void;
  onActivate: () => void;
}) {
  const meta = STATUS_META[status];
  const MethodIcon = METHOD_ICON[reminder.notificationMethod];
  const canAct = status === "Pending" || status === "Snoozed";

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      data-focus-id={reminder.id}
      data-reminder-id={reminder.id}
      className={cn(
        "group/card cursor-grab rounded-md border border-slate-100 border-l-[3px] !bg-white p-3.5 shadow-sm active:cursor-grabbing",
        KANBAN_CARD,
        cardMotion,
        meta.border,
        isDragging
          ? cardDragging
          : isSelected
            ? "border-indigo-500 ring-1 ring-indigo-500"
            : "",
      )}
    >
      <div className="mb-2.5 flex items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
            meta.soft,
            meta.text,
          )}
        >
          <Bell className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-[13px] font-semibold leading-snug text-slate-900",
              cardSubject,
            )}
          >
            {reminder.title}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
              {reminder.type}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              <MethodIcon className="h-3 w-3" />
              {reminder.notificationMethod}
            </span>
          </div>
        </div>
        {onSelect ? (
          <div
            className={cn(
              "shrink-0 transition-opacity",
              isSelected
                ? "opacity-100"
                : "opacity-0 group-hover/card:opacity-100",
            )}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onSelect}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Select reminder ${reminder.title}`}
              className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
          </div>
        ) : null}
      </div>

      <div className="space-y-1.5 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 shrink-0 text-slate-400" />
          <span>{reminder.dateTime}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Link2 className="h-3 w-3 shrink-0 text-slate-400" />
          <span className="truncate">
            {reminder.relatedTo || "No related record"}
          </span>
        </div>
        <CardOwnerRow name={reminder.owner} className="pt-0.5" />
      </div>

      <div className="mt-3 flex gap-1.5 border-t border-slate-50 pt-3">
        {canAct ? (
          <>
            <button
              type="button"
              onClick={onSnooze}
              className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-600 transition-colors hover:border-amber-200 hover:bg-amber-50 hover:text-amber-800"
            >
              <AlarmClock className="h-3 w-3" />
              Snooze
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <X className="h-3 w-3" />
              Dismiss
            </button>
          </>
        ) : status === "Dismissed" ? (
          <button
            type="button"
            onClick={onActivate}
            className="inline-flex h-8 w-full items-center justify-center rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            Reactivate
          </button>
        ) : (
          <div className="flex h-8 w-full items-center justify-center rounded-lg bg-emerald-50 text-[11px] font-semibold text-emerald-700">
            Delivered
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Bell,
  Plus,
  Clock,
  Link2,
  List,
  LayoutGrid,
  Mail,
  Smartphone,
  Monitor,
  BellRing,
  AlarmClock,
  X,
  Download,
} from "lucide-react";
import {
  reminderColumns as initialColumns,
  type Reminder,
  type ReminderColumn,
  type ReminderStatus,
  type NotificationMethod,
} from "@/lib/reminders/types";
import { exportRemindersCsv } from "@/lib/activities/export";
import {
  CardInitialsAvatar,
  CardOwnerRow,
} from "@/components/shared/CardInitialsAvatar";
import { FocusHighlight } from "@/components/shared/FocusHighlight";
import { cn } from "@/lib/utils";
import { BOARD_PAGE, KANBAN_CARD, KANBAN_COL, KANBAN_HEADER, KANBAN_HEADER_COUNT, KANBAN_WELL } from "@/lib/layout";
import { dropTargetActive, cardSubject } from "@/lib/motion";
import { EntitySelectionToolbar } from "@/components/sales/EntitySelectionToolbar";

type ViewMode = "kanban" | "list";

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
  const [view, setView] = useState<ViewMode>("kanban");
  const [columns, setColumns] = useState<ReminderColumn[]>(initialColumns);
  const [tab, setTab] = useState<"all" | "pending">("all");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkFlash, setBulkFlash] = useState<string | null>(null);

  const visibleColumns = useMemo(() => {
    if (tab === "pending") {
      return columns.filter((c) => c.title === "Pending");
    }
    return columns;
  }, [columns, tab]);

  const allReminders = useMemo(
    () =>
      columns.flatMap((c) =>
        c.reminders.map((r) => ({ ...r, status: c.title as ReminderStatus })),
      ),
    [columns],
  );

  const visibleReminders = useMemo(
    () =>
      tab === "pending"
        ? allReminders.filter((r) => r.status === "Pending")
        : allReminders,
    [allReminders, tab],
  );

  const allVisibleSelected =
    visibleReminders.length > 0 &&
    visibleReminders.every((r) => selectedIds.includes(r.id));

  const pendingCount = columns.find((c) => c.title === "Pending")?.count ?? 0;

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
      return stripped.map((col) => {
        if (col.title !== status) return col;
        const reminders = [{ ...found!, status }, ...col.reminders];
        return { ...col, reminders, count: reminders.length };
      });
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
    setColumns((prev) =>
      prev.map((col) => {
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

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
              Reminders
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const n = exportRemindersCsv();
                void n;
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/activities/reminders/create?layoutid=standard&redirect=false",
                )
              }
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-md shadow-violet-600/20 transition-all hover:bg-violet-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Reminders
            </button>
          </div>
        </div>

        {/* ONE surface: toolbar + content */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-0.5 rounded-lg bg-slate-50 p-0.5">
              <TabBtn
                active={tab === "all"}
                onClick={() => setTab("all")}
                label="All Reminders"
                count={allReminders.length}
              />
              <TabBtn
                active={tab === "pending"}
                onClick={() => setTab("pending")}
                label="Pending"
                count={pendingCount}
              />
            </div>

            <div className="flex items-center gap-1.5">
              <div className="flex flex-wrap items-center gap-1">
                {columns.map((col) => {
                  const meta = STATUS_META[col.title];
                  return (
                    <span
                      key={col.id}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold text-slate-600"
                    >
                      <span
                        className={cn("h-1.5 w-1.5 rounded-full", meta.dot)}
                      />
                      {col.title}
                      <span className="tabular-nums text-slate-400">
                        {col.count}
                      </span>
                    </span>
                  );
                })}
              </div>

              <div className="flex items-center rounded-lg bg-slate-50 p-0.5">
                <button
                  type="button"
                  aria-label="List view"
                  onClick={() => setView("list")}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md transition-all",
                    view === "list"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-700",
                  )}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Board view"
                  onClick={() => setView("kanban")}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md transition-all",
                    view === "kanban"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-700",
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {bulkFlash ? (
            <p className="mb-2 text-[12px] font-medium text-violet-700">
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

          <div className="min-h-0 flex-1 overflow-auto">
            {view === "kanban" ? (
              <div className="flex h-full min-h-[420px] items-stretch gap-3 overflow-x-auto p-1">
                {visibleColumns.map((col) => {
                  const isOver = overCol === col.id;
                  return (
                    <div
                      key={col.id}
                      className={cn("flex min-h-[420px] flex-col gap-2", KANBAN_COL)}
                    >
                      <div className={KANBAN_HEADER}>
                        <div className="flex items-center justify-between px-1">
                          <h3 className="text-xs font-semibold text-slate-800 xl:text-sm">
                            {col.title}
                          </h3>
                          <span className={KANBAN_HEADER_COUNT}>
                            {col.count}
                          </span>
                        </div>
                      </div>

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
                          "flex min-h-0 flex-1 flex-col gap-2 rounded-sm border p-2",
                          isOver ? dropTargetActive : KANBAN_WELL,
                        )}
                      >
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

                        {col.reminders.length === 0 ? (
                          <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
                            <AlarmClock className="mb-1.5 h-4 w-4 text-slate-300" />
                            <p className="text-[11px] text-slate-300">Empty</p>
                          </div>
                        ) : null}
                      </div>
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
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all",
        active
          ? "bg-white text-violet-700 shadow-sm"
          : "text-slate-500 hover:text-slate-800",
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 py-px text-[9px] tabular-nums",
          active
            ? "bg-violet-100 text-violet-700"
            : "bg-slate-200/80 text-slate-600",
        )}
      >
        {count}
      </span>
    </button>
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
        "group/card cursor-grab rounded-md border border-slate-100 border-l-[3px] !bg-white p-3.5 shadow-sm transition-all active:cursor-grabbing",
        KANBAN_CARD,
        meta.border,
        isDragging
          ? "opacity-40"
          : isSelected
            ? "border-indigo-500 ring-1 ring-indigo-500"
            : "hover:border-slate-200 hover:shadow-md",
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

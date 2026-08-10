"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Priority,
  type Task,
  type TaskFilters,
  type TaskStatus,
} from "@/lib/tasks/types";
import {
  compareTaskPriority,
  listTaskColumns,
  updateTaskPriority,
  updateTaskStatus,
} from "@/lib/tasks/store";
import {
  isTaskColumnSortable,
  loadTaskListColumns,
  saveTaskListColumns,
} from "@/lib/tasks/list-columns";
import { formatRelatedTo, initials } from "@/lib/activities/shared";
import { onRulesChange } from "@/lib/rules";
import { cn } from "@/lib/utils";
import {
  ManageColumnsModal,
  type ManageColumn,
} from "@/components/work-queue/ManageColumnsModal";
import { TableDisplayOptionsMenu } from "@/components/common/TableDisplayOptionsMenu";
import { CardInitialsAvatar } from "@/components/shared/CardInitialsAvatar";

interface FlatTask extends Task {
  statusColorClass: string;
}

interface TaskListViewProps {
  filters?: TaskFilters;
  onToggleField?: (
    sectionId: "status" | "priority" | "type",
    field: string,
  ) => void;
  sortField?: string;
  sortDirection?: "asc" | "desc";
  onSortChange?: (field: string, direction: "asc" | "desc") => void;
  onClearSort?: () => void;
}

const PRIORITY_STYLE: Record<Priority, { className: string }> = {
  Critical: { className: "text-rose-700" },
  High: { className: "text-orange-600" },
  Medium: { className: "text-violet-700" },
  Low: { className: "text-slate-500" },
};

const STATUS_STYLE: Record<TaskStatus, { className: string }> = {
  "Not Started": { className: "text-slate-600" },
  "In Progress": { className: "text-sky-700" },
  Waiting: { className: "text-amber-700" },
  Review: { className: "text-violet-700" },
  Completed: { className: "text-emerald-700" },
  Cancelled: { className: "text-rose-700" },
};

function parseDueDate(dateStr: string): number {
  const [day, month, year] = dateStr.split("/").map(Number);
  if (!day || !month || !year) return 0;
  return new Date(year, month - 1, day).getTime();
}

function truncateText(value: string | undefined, max = 48): string {
  const text = value?.trim() || "";
  if (!text) return "—";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function TaskPriorityCell({ task }: { task: FlatTask }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { className } = PRIORITY_STYLE[task.priority];

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Priority ${task.priority}. Change priority`}
        className={cn(
          "rounded-md px-1.5 py-0.5 text-left text-[12px] font-semibold transition-colors hover:bg-slate-100",
          className,
          open && "bg-slate-100",
        )}
      >
        {task.priority}
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Select priority"
          className="absolute left-0 top-full z-30 mt-1 w-36 rounded-lg border border-slate-100 bg-white py-1 shadow-lg"
        >
          {TASK_PRIORITIES.map((priority) => {
            const opt = PRIORITY_STYLE[priority];
            return (
              <button
                key={priority}
                type="button"
                role="option"
                aria-selected={priority === task.priority}
                onClick={() => {
                  if (priority !== task.priority) {
                    updateTaskPriority(task.taskId, priority);
                    toast.success(`Priority changed to "${priority}"`);
                  }
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full px-3 py-1.5 text-left text-[12px] hover:bg-slate-50",
                  priority === task.priority
                    ? "font-semibold text-violet-700"
                    : opt.className,
                )}
              >
                {priority}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TaskStatusCell({ task }: { task: FlatTask }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { className } =
    STATUS_STYLE[task.status] ?? STATUS_STYLE["Not Started"];

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Status ${task.status}. Change status`}
        className={cn(
          "rounded-md px-1.5 py-0.5 text-left text-[12px] font-semibold transition-colors hover:bg-slate-100",
          className,
          open && "bg-slate-100",
        )}
      >
        {task.status}
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Select status"
          className="absolute left-0 top-full z-30 mt-1 w-40 rounded-lg border border-slate-100 bg-white py-1 shadow-lg"
        >
          {TASK_STATUSES.map((status) => {
            const opt = STATUS_STYLE[status];
            return (
              <button
                key={status}
                type="button"
                role="option"
                aria-selected={status === task.status}
                onClick={() => {
                  if (status !== task.status) {
                    updateTaskStatus(task.taskId, status);
                    toast.success(`Status changed to "${status}"`);
                  }
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full px-3 py-1.5 text-left text-[12px] hover:bg-slate-50",
                  status === task.status
                    ? "font-semibold text-violet-700"
                    : opt.className,
                )}
              >
                {status}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

type ColumnRenderer = {
  label: string;
  td: (task: FlatTask) => ReactNode;
  tdClassName?: string;
};

function buildColumnRenderers(): Record<string, ColumnRenderer> {
  return {
    title: {
      label: "Task Name",
      tdClassName: "px-3 py-2.5 font-semibold text-slate-900",
      td: (task) => task.title,
    },
    taskId: {
      label: "Task ID",
      tdClassName: "px-3 py-2.5 font-medium text-slate-500",
      td: (task) => task.taskId,
    },
    taskType: {
      label: "Type",
      tdClassName: "px-3 py-2.5",
      td: (task) => task.taskType,
    },
    priority: {
      label: "Priority",
      tdClassName: "px-3 py-2.5",
      td: (task) => <TaskPriorityCell task={task} />,
    },
    relatedTo: {
      label: "Related To",
      tdClassName: "px-3 py-2.5 text-slate-500",
      td: (task) => formatRelatedTo(task.relatedTo) || "—",
    },
    dueDate: {
      label: "Due Date",
      tdClassName: "px-3 py-2.5",
      td: (task) => (
        <span className={task.overdue ? "font-medium text-rose-500" : undefined}>
          {task.dueDate || "—"}
        </span>
      ),
    },
    status: {
      label: "Status",
      tdClassName: "px-3 py-2.5",
      td: (task) => <TaskStatusCell task={task} />,
    },
    assignedTo: {
      label: "Assigned To",
      tdClassName: "px-3 py-2.5",
      td: (task) => (
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-semibold",
              task.assignee.colorClass,
            )}
          >
            {task.assignee.initials}
          </span>
          <span>{task.assignedTo}</span>
        </div>
      ),
    },
    createdBy: {
      label: "Created By",
      tdClassName: "px-3 py-2.5 text-slate-600",
      td: (task) => task.createdBy || "—",
    },
    reminderDate: {
      label: "Reminder Date",
      tdClassName: "px-3 py-2.5 text-slate-600",
      td: (task) => task.reminderDate || "—",
    },
    completedDate: {
      label: "Completed Date",
      tdClassName: "px-3 py-2.5 text-slate-600",
      td: (task) => task.completedDate || "—",
    },
    collaborators: {
      label: "Collaborators",
      tdClassName: "px-3 py-2.5",
      td: (task) => {
        const people = task.collaborators ?? [];
        if (!people.length) return <span className="text-slate-300">—</span>;
        const shown = people.slice(0, 3);
        const extra = people.length - shown.length;
        return (
          <div className="flex items-center">
            {shown.map((name, i) => (
              <span
                key={`${task.taskId}-${name}`}
                style={{ marginLeft: i === 0 ? 0 : -6 }}
                title={name}
              >
                <CardInitialsAvatar
                  name={name}
                  initials={initials(name)}
                  className="ring-2 ring-white"
                />
              </span>
            ))}
            {extra > 0 ? (
              <span className="ml-1 text-[11px] font-semibold text-slate-400">
                +{extra}
              </span>
            ) : null}
          </div>
        );
      },
    },
    commentsCount: {
      label: "Comments",
      tdClassName: "px-3 py-2.5 tabular-nums text-slate-600",
      td: (task) => String(task.commentsCount ?? 0),
    },
    attachmentsCount: {
      label: "Attachments",
      tdClassName: "px-3 py-2.5 tabular-nums text-slate-600",
      td: (task) => String(task.attachmentsCount ?? 0),
    },
    description: {
      label: "Description",
      tdClassName: "max-w-[220px] px-3 py-2.5 text-slate-500",
      td: (task) => (
        <span className="line-clamp-2" title={task.description}>
          {truncateText(task.description)}
        </span>
      ),
    },
    notes: {
      label: "Notes",
      tdClassName: "max-w-[220px] px-3 py-2.5 text-slate-500",
      td: (task) => (
        <span className="line-clamp-2" title={task.notes}>
          {truncateText(task.notes)}
        </span>
      ),
    },
    overdue: {
      label: "Overdue",
      tdClassName: "px-3 py-2.5",
      td: (task) =>
        task.overdue ? (
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
            Overdue
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
  };
}

export function TaskListView({
  filters,
  onToggleField,
  sortField,
  sortDirection,
  onSortChange,
  onClearSort,
}: TaskListViewProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [revision, setRevision] = useState(0);
  const [manageColumnsOpen, setManageColumnsOpen] = useState(false);
  const [manageColumns, setManageColumns] = useState<ManageColumn[]>(() =>
    loadTaskListColumns(),
  );

  useEffect(() => {
    setManageColumns(loadTaskListColumns());
  }, []);

  useEffect(() => {
    return onRulesChange(() => setRevision((n) => n + 1));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filters?.priorities, filters?.statuses, filters?.types, pageSize]);

  const activePriority =
    filters?.priorities.length === 1 ? filters.priorities[0] : null;
  const activeStatus =
    filters?.statuses.length === 1 ? filters.statuses[0] : null;

  const allTasks = useMemo(() => {
    void revision;
    return listTaskColumns().flatMap((column) =>
      column.tasks.map(
        (task): FlatTask => ({
          ...task,
          status: column.title,
          statusColorClass: column.badgeColorClass,
        }),
      ),
    );
  }, [revision]);

  const processedData = useMemo(() => {
    let data = [...allTasks];

    const priorityFilter = filters?.priorities ?? [];
    const statusFilter = filters?.statuses ?? [];
    const typeFilter = filters?.types ?? [];

    if (priorityFilter.length > 0) {
      data = data.filter((t) => priorityFilter.includes(t.priority));
    }
    if (statusFilter.length > 0) {
      data = data.filter((t) => statusFilter.includes(t.status));
    }
    if (typeFilter.length > 0) {
      data = data.filter((t) => typeFilter.includes(t.taskType));
    }

    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.taskId.toLowerCase().includes(q) ||
          t.assignedTo.toLowerCase().includes(q) ||
          formatRelatedTo(t.relatedTo).toLowerCase().includes(q) ||
          (t.createdBy?.toLowerCase().includes(q) ?? false) ||
          (t.description?.toLowerCase().includes(q) ?? false),
      );
    }

    if (sortField) {
      data.sort((a, b) => {
        if (sortField === "priority") {
          const cmp = compareTaskPriority(a.priority, b.priority);
          return sortDirection === "asc" ? cmp : -cmp;
        }
        if (sortField === "dueDate" || sortField === "reminderDate") {
          const aVal =
            sortField === "dueDate" ? a.dueDate : (a.reminderDate ?? "");
          const bVal =
            sortField === "dueDate" ? b.dueDate : (b.reminderDate ?? "");
          const cmp = parseDueDate(aVal) - parseDueDate(bVal);
          return sortDirection === "asc" ? cmp : -cmp;
        }
        if (sortField === "status") {
          const cmp = a.status.localeCompare(b.status);
          return sortDirection === "asc" ? cmp : -cmp;
        }
        if (sortField === "overdue") {
          const cmp = Number(Boolean(a.overdue)) - Number(Boolean(b.overdue));
          return sortDirection === "asc" ? cmp : -cmp;
        }
        if (sortField === "commentsCount" || sortField === "attachmentsCount") {
          const av = Number(
            (a as unknown as Record<string, unknown>)[sortField] ?? 0,
          );
          const bv = Number(
            (b as unknown as Record<string, unknown>)[sortField] ?? 0,
          );
          const cmp = av - bv;
          return sortDirection === "asc" ? cmp : -cmp;
        }
        const av = String(
          (a as unknown as Record<string, unknown>)[sortField] ?? "",
        );
        const bv = String(
          (b as unknown as Record<string, unknown>)[sortField] ?? "",
        );
        if (av < bv) return sortDirection === "asc" ? -1 : 1;
        if (av > bv) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [allTasks, search, sortField, sortDirection, filters]);

  const totalPages = Math.max(1, Math.ceil(processedData.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedData = processedData.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const columnRenderers = useMemo(() => buildColumnRenderers(), []);
  const orderedVisibleColumns = useMemo(
    () => manageColumns.filter((c) => c.checked),
    [manageColumns],
  );

  const handleHeaderSort = (key: string) => {
    if (!onSortChange || !isTaskColumnSortable(key)) return;
    if (sortField === key && sortDirection === "desc") {
      onClearSort?.();
      return;
    }
    const nextDirection: "asc" | "desc" =
      sortField === key && sortDirection === "asc" ? "desc" : "asc";
    onSortChange(key, nextDirection);
  };

  function handleSaveColumns(next: ManageColumn[]) {
    const merged = next.map((c) => ({ ...c }));
    setManageColumns(merged);
    saveTaskListColumns(merged);
    setManageColumnsOpen(false);
    toast.success("Column layout saved");
  }

  return (
    <div className="flex h-full min-w-0 flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
      {onToggleField ? (
        <div className="mb-3 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
              Priority
            </span>
            <button
              type="button"
              onClick={() => {
                if (activePriority) onToggleField("priority", activePriority);
              }}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-semibold",
                !activePriority
                  ? "bg-violet-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
            >
              All
            </button>
            {TASK_PRIORITIES.map((priority) => (
              <button
                key={priority}
                type="button"
                onClick={() => onToggleField("priority", priority)}
                className={cn(
                  "rounded-md px-2 py-1 text-[11px] font-semibold",
                  activePriority === priority
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                {priority}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
              Status
            </span>
            <button
              type="button"
              onClick={() => {
                if (activeStatus) onToggleField("status", activeStatus);
              }}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-semibold",
                !activeStatus
                  ? "bg-violet-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
            >
              All
            </button>
            {TASK_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => onToggleField("status", status)}
                className={cn(
                  "rounded-md px-2 py-1 text-[11px] font-semibold",
                  activeStatus === status
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search tasks…"
            className="h-9 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-[12px] outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
          />
        </div>
        <p className="text-[11px] text-slate-400">
          {processedData.length} tasks
          {activePriority ? ` · ${activePriority} only` : ""}
          {activeStatus ? ` · ${activeStatus} only` : ""}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[900px] text-left text-[12px]">
          <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/90 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            <tr>
              {orderedVisibleColumns.map((col) => {
                const sortable = isTaskColumnSortable(col.id);
                return (
                  <th key={col.id} className="px-3 py-2.5 whitespace-nowrap">
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => handleHeaderSort(col.id)}
                        className={cn(
                          "inline-flex items-center gap-1 hover:text-slate-700",
                          sortField === col.id && "text-violet-700",
                        )}
                      >
                        {col.label}
                        {sortField === col.id ? (
                          <span className="text-[10px] font-bold" aria-hidden>
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        ) : (
                          <ArrowUpDown className="h-3 w-3" aria-hidden />
                        )}
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                );
              })}
              <th
                className={cn(
                  "sticky right-0 z-20 bg-slate-50/90 px-3 py-2.5 text-right",
                  "shadow-[-12px_0_12px_-8px_rgba(15,23,42,0.06)]",
                )}
              >
                <TableDisplayOptionsMenu
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={[8, 10, 20, 50]}
                  onManageColumns={() => setManageColumnsOpen(true)}
                  className="flex justify-end"
                />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-slate-700">
            {paginatedData.map((task) => (
              <tr
                key={`${task.taskId}-${task.status}`}
                data-focus-id={task.taskId}
                data-task-id={task.taskId}
                className="transition-colors hover:bg-slate-50/80"
              >
                {orderedVisibleColumns.map((col) => {
                  const renderer = columnRenderers[col.id];
                  return (
                    <td
                      key={col.id}
                      className={renderer?.tdClassName ?? "px-3 py-2.5"}
                    >
                      {renderer ? renderer.td(task) : "—"}
                    </td>
                  );
                })}
                <td
                  className={cn(
                    "sticky right-0 bg-white px-3 py-2.5",
                    "shadow-[-12px_0_12px_-8px_rgba(15,23,42,0.04)]",
                    "group-hover:bg-slate-50/80",
                  )}
                />
              </tr>
            ))}
            {paginatedData.length === 0 && (
              <tr>
                <td
                  colSpan={orderedVisibleColumns.length + 1}
                  className="px-3 py-12 text-center text-sm text-slate-400"
                >
                  No tasks match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <p className="text-[11px] text-slate-400">
          Page {safePage} of {totalPages}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage(1)}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage(totalPages)}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
            aria-label="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ManageColumnsModal
        open={manageColumnsOpen}
        columns={manageColumns}
        onClose={() => setManageColumnsOpen(false)}
        onSave={handleSaveColumns}
      />
    </div>
  );
}

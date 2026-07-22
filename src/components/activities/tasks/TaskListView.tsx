"use client";

import { useMemo, useState } from "react";
import {
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { taskColumns, type Task } from "@/lib/tasks/types";
import { formatRelatedTo } from "@/lib/activities/shared";

interface FlatTask extends Task {
  statusColorClass: string;
}

const flatTasks: FlatTask[] = taskColumns.flatMap((column) =>
  column.tasks.map((task) => ({
    ...task,
    status: column.title,
    statusColorClass: column.badgeColorClass,
  })),
);

const columns = [
  { key: "taskId", label: "Task ID", sortable: true },
  { key: "title", label: "Task Name", sortable: true },
  { key: "taskType", label: "Type", sortable: true },
  { key: "priority", label: "Priority", sortable: true },
  { key: "relatedTo", label: "Related To", sortable: false },
  { key: "dueDate", label: "Due Date", sortable: true },
  { key: "status", label: "Status", sortable: false },
  { key: "assignedTo", label: "Assigned To", sortable: true },
] as const;

export function TaskListView() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  const itemsPerPage = 8;

  const processedData = useMemo(() => {
    let data = [...flatTasks];

    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.taskId.toLowerCase().includes(q) ||
          t.assignedTo.toLowerCase().includes(q) ||
          formatRelatedTo(t.relatedTo).toLowerCase().includes(q),
      );
    }

    if (sortConfig) {
      data.sort((a, b) => {
        const av = String(
          (a as unknown as Record<string, unknown>)[sortConfig.key] ?? "",
        );
        const bv = String(
          (b as unknown as Record<string, unknown>)[sortConfig.key] ?? "",
        );
        if (av < bv) return sortConfig.direction === "asc" ? -1 : 1;
        if (av > bv) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [search, sortConfig]);

  const totalPages = Math.max(
    1,
    Math.ceil(processedData.length / itemsPerPage),
  );
  const paginatedData = processedData.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage,
  );

  const handleSort = (key: string) => {
    setSortConfig((current) =>
      current?.key === key && current.direction === "desc"
        ? null
        : {
            key,
            direction:
              current?.key === key && current.direction === "asc"
                ? "desc"
                : "asc",
          },
    );
  };

  return (
    <div className="flex h-full min-w-0 flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
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
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[900px] text-left text-[12px]">
          <thead className="sticky top-0 border-b border-slate-100 bg-slate-50/90 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-3 py-2.5">
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-slate-700"
                    >
                      {col.label}
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-slate-700">
            {paginatedData.map((task) => (
              <tr
                key={task.taskId}
                className="transition-colors hover:bg-slate-50/80"
              >
                <td className="px-3 py-2.5 font-medium text-slate-500">
                  {task.taskId}
                </td>
                <td className="px-3 py-2.5 font-semibold text-slate-900">
                  {task.title}
                </td>
                <td className="px-3 py-2.5">{task.taskType}</td>
                <td className="px-3 py-2.5">{task.priority}</td>
                <td className="px-3 py-2.5 text-slate-500">
                  {formatRelatedTo(task.relatedTo)}
                </td>
                <td
                  className={`px-3 py-2.5 ${task.overdue ? "font-medium text-rose-500" : ""}`}
                >
                  {task.dueDate}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${task.statusColorClass}`}
                  >
                    {task.status}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${task.assignee.colorClass}`}
                    >
                      {task.assignee.initials}
                    </span>
                    {task.assignedTo}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <p className="text-[11px] text-slate-400">
          Page {page} of {totalPages}
        </p>
        <div className="flex items-center gap-1">
          <PagerBtn
            onClick={() => setPage(1)}
            disabled={page === 1}
            icon={<ChevronsLeft className="h-3.5 w-3.5" />}
          />
          <PagerBtn
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            icon={<ChevronLeft className="h-3.5 w-3.5" />}
          />
          <PagerBtn
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            icon={<ChevronRight className="h-3.5 w-3.5" />}
          />
          <PagerBtn
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            icon={<ChevronsRight className="h-3.5 w-3.5" />}
          />
        </div>
      </div>
    </div>
  );
}

function PagerBtn({
  onClick,
  disabled,
  icon,
}: {
  onClick: () => void;
  disabled: boolean;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
    >
      {icon}
    </button>
  );
}

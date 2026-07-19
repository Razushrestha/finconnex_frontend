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

interface FlatTask extends Task {
  status: string;
  statusColorClass: string;
}

// Flattening task data for list view
const flatTasks: FlatTask[] = taskColumns.flatMap((column) =>
  column.tasks.map((task) => ({
    ...task,
    status: column.title,
    statusColorClass: column.badgeColorClass,
  })),
);

const columns = [
  { key: "taskId", label: "Task ID", sortable: true },
  { key: "title", label: "Title", sortable: true },
  { key: "category", label: "Category", sortable: false },
  { key: "project", label: "Project", sortable: true },
  { key: "dueDate", label: "Due Date", sortable: true },
  { key: "status", label: "Status", sortable: false },
  { key: "assignee", label: "Assignee", sortable: false },
] as const;

export function TaskListView() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  const itemsPerPage = 6;

  // Search and Sort Logic
  const processedData = useMemo(() => {
    let data = [...flatTasks];

    // Search
    if (search) {
      data = data.filter(
        (t) =>
          t.title.toLowerCase().includes(search.toLowerCase()) ||
          t.taskId.toLowerCase().includes(search.toLowerCase()) ||
          t.project.toLowerCase().includes(search.toLowerCase()),
      );
    }

    if (sortConfig) {
      data.sort((a: any, b: any) => {
        if (a[sortConfig.key] < b[sortConfig.key])
          return sortConfig.direction === "asc" ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key])
          return sortConfig.direction === "asc" ? 1 : -1;
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
      {/* Search Input */}
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-violet-500/20">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by title, ID, or project..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto pb-3">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500">
              {columns.map((col, idx) => (
                <th
                  key={col.key}
                  className="px-4 py-3 font-medium first:rounded-l-lg last:rounded-r-lg"
                >
                  <button
                    onClick={() => col.sortable && handleSort(col.key)}
                    className="flex items-center gap-1.5 hover:text-slate-800 transition-colors"
                  >
                    {col.label}
                    {col.sortable && (
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((task) => (
              <tr
                key={task.taskId}
                className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-slate-700">
                  {task.taskId}
                </td>
                <td className="px-4 py-3 font-medium text-slate-700">
                  {task.title}
                </td>
                <td className="px-4 py-3 text-slate-500">{task.category}</td>
                <td className="px-4 py-3 text-slate-500">{task.project}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      task.overdue
                        ? "font-medium text-rose-500"
                        : "text-slate-500"
                    }
                  >
                    {task.dueDate ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${task.statusColorClass}`}
                  >
                    {task.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold ${task.assignee.colorClass}`}
                  >
                    {task.assignee.initials}
                  </span>
                </td>
              </tr>
            ))}
            {paginatedData.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  No tasks found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="text-xs text-slate-500">
          Showing{" "}
          <span className="font-semibold text-slate-700">
            {(page - 1) * itemsPerPage + 1}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-slate-700">
            {Math.min(page * itemsPerPage, processedData.length)}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-slate-700">
            {processedData.length}
          </span>{" "}
          tasks
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-colors"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-colors"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

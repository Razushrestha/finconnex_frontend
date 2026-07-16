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
  const itemsPerPage = 6;

  const filtered = useMemo(
    () =>
      flatTasks.filter(
        (t) =>
          t.title.toLowerCase().includes(search.toLowerCase()) ||
          t.taskId.toLowerCase().includes(search.toLowerCase()) ||
          t.project.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage,
  );

  return (
    <div className="flex h-full min-w-0 flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
      {/* <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-3 sm:mb-2">
        <h3 className="text-base font-semibold text-slate-900 sm:text-md">
          All Tasks
        </h3>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search tasks"
            className="w-44 rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-56 sm:text-sm"
          />
        </div>
      </div> */}

      <div className="min-h-0 flex-1 overflow-auto pb-3 [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100">
        <table className="w-full min-w-[900px] border-collapse text-left text-xs sm:text-sm">
          <thead>
            <tr className="rounded-lg bg-slate-50 text-slate-500">
              {columns.map((col, idx) => (
                <th
                  key={col.key}
                  className={`px-4 py-2.5 font-medium ${
                    idx === 0 ? "rounded-l-lg" : ""
                  } ${idx === columns.length - 1 ? "rounded-r-lg" : ""}`}
                >
                  <span className="flex items-center gap-1.5">
                    {col.label}
                    {col.sortable && (
                      <button
                        type="button"
                        aria-label={`Sort by ${col.label}`}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {paginated.map((task) => (
              <tr
                key={task.taskId}
                className="border-b border-slate-50 last:border-b-0"
              >
                <td className="px-4 py-2 font-medium text-slate-700">
                  {task.taskId}
                </td>
                <td className="px-4 py-2 font-medium text-slate-700">
                  {task.title}
                </td>
                <td className="px-4 py-2 text-slate-500">{task.category}</td>
                <td className="px-4 py-2 text-slate-500">{task.project}</td>
                <td className="px-4 py-2">
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
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${task.statusColorClass}`}
                  >
                    {task.status}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold ${task.assignee.colorClass}`}
                  >
                    {task.assignee.initials}
                  </span>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  No tasks match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer — fixed */}
      <div className="mt-3 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500 sm:text-sm">
          Showing{" "}
          {filtered.length === 0 ? 0 : (safePage - 1) * itemsPerPage + 1} to{" "}
          {Math.min(safePage * itemsPerPage, filtered.length)} of{" "}
          {filtered.length} tasks
        </p>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            aria-label="First page"
            disabled={safePage === 1}
            onClick={() => setPage(1)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Previous page"
            disabled={safePage === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium ${
                safePage === p
                  ? "bg-indigo-500 text-white"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            type="button"
            aria-label="Next page"
            disabled={safePage === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Last page"
            disabled={safePage === totalPages}
            onClick={() => setPage(totalPages)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

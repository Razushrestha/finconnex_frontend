"use client";

import type { ReactNode } from "react";
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkQueueTask } from "@/lib/work-queue/data";

interface WorkQueueTableProps {
  tasks: WorkQueueTask[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  personName?: string;
}

const columns = [
  { key: "id", label: "Task ID", sortable: true },
  { key: "title", label: "Title", sortable: true },
  { key: "category", label: "Category", sortable: false },
  { key: "project", label: "Project", sortable: true },
  { key: "dueDate", label: "Due Date", sortable: true },
  { key: "status", label: "Status", sortable: false },
  { key: "assignee", label: "Assignee", sortable: false },
] as const;

function StatusPill({ status }: { status: WorkQueueTask["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold text-white",
        status === "Open" ? "bg-sky-500" : "bg-slate-400",
      )}
    >
      {status}
    </span>
  );
}

export function WorkQueueTable({
  tasks,
  page,
  pageSize,
  total,
  onPageChange,
  personName,
}: WorkQueueTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-100 bg-white">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[860px] border-collapse text-left text-[12px]">
          <thead>
            <tr className="border-b border-slate-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="sticky top-0 z-10 bg-white px-3 py-2 text-[11px] font-medium tracking-wide whitespace-nowrap text-slate-400 uppercase"
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable ? (
                      <ArrowDownUp className="h-2.5 w-2.5 text-slate-300" />
                    ) : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-10 text-center text-[12px] text-slate-400"
                >
                  No tasks for {personName ?? "this person"}.
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr
                  key={`${task.ownerId}-${task.id}`}
                  className="border-b border-slate-50 transition-colors hover:bg-slate-50/80"
                >
                  <td className="px-3 py-2 font-medium whitespace-nowrap text-slate-800">
                    {task.id}
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-900">
                    {task.title}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                    {task.category}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2 whitespace-nowrap",
                      task.projectHighlight
                        ? "font-medium text-rose-500"
                        : "text-slate-700",
                    )}
                  >
                    {task.project}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {task.dueDate ? (
                      <span className="flex flex-col leading-tight font-medium text-red-500">
                        <span>{task.dueDate}</span>
                        {task.dueTime ? (
                          <span className="text-[11px] font-normal">
                            {task.dueTime}
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="font-medium text-red-500">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill status={task.status} />
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold",
                        task.assignee.color,
                      )}
                      title={task.assignee.initials}
                    >
                      {task.assignee.initials}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3 py-2">
        <p className="text-[11px] text-slate-500">
          Showing {from} to {to} of {total} tasks
          {personName ? (
            <span className="text-slate-400"> · {personName}</span>
          ) : null}
        </p>

        <div className="flex items-center gap-0.5">
          <PageButton
            ariaLabel="First page"
            disabled={page <= 1}
            onClick={() => onPageChange(1)}
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </PageButton>
          <PageButton
            ariaLabel="Previous page"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </PageButton>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onPageChange(n)}
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium transition-colors",
                n === page
                  ? "bg-violet-600 text-white"
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              {n}
            </button>
          ))}

          <PageButton
            ariaLabel="Next page"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </PageButton>
          <PageButton
            ariaLabel="Last page"
            disabled={page >= totalPages}
            onClick={() => onPageChange(totalPages)}
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </PageButton>
        </div>
      </div>
    </div>
  );
}

function PageButton({
  children,
  disabled,
  onClick,
  ariaLabel,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

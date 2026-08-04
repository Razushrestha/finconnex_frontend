"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  /** Already-paginated rows for the current page. */
  rows: T[];
  getRowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  emptyState?: ReactNode;
  page: number;
  pageSize: number;
  /** Total row count across all pages (post-filter), used for the pager label. */
  totalCount: number;
  onPageChange: (page: number) => void;
}

/**
 * Generic sortable-free data table with sticky header and simple pager.
 * Each campaign surface (Email, SMS, WhatsApp, ...) supplies its own
 * `columns` and row shape `T` — the table itself has no campaign-specific logic.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  emptyState,
  page,
  pageSize,
  totalCount,
  onPageChange,
}: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col overflow-hidden rounded-md border border-slate-200/80 bg-white shadow-sm">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 text-[12px] font-semibold tracking-wide text-slate-400 uppercase">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className={cn("px-6 py-2", c.className)}>
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((row) => (
                <tr
                  key={getRowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "transition-colors hover:bg-violet-50/40",
                    onRowClick && "cursor-pointer",
                  )}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={cn("px-6 py-1.5", c.className)}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-24 text-center text-base text-slate-400"
                  >
                    {emptyState}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {totalCount > 0 ? (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3.5 text-sm text-slate-500">
            <span>
              Showing {(safePage - 1) * pageSize + 1}–
              {Math.min(safePage * pageSize, totalCount)} of {totalCount}
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={safePage === 1}
                onClick={() => onPageChange(Math.max(1, safePage - 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={safePage === totalPages}
                onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

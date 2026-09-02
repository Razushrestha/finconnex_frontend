"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PaginationBar } from "@/components/ui/pagination-bar";

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
  className?: string;
  entriesLabel?: string;
}

/**
 * Dense full-height data table shared by marketing list pages.
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
  className,
  entriesLabel = "forms",
}: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm",
        className,
      )}
    >
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[960px] text-left text-[12px]">
          <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn("px-3 py-2.5 sm:px-4", c.className)}
                >
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
                  <td
                    key={c.key}
                    className={cn("px-3 py-2.5 sm:px-4", c.className)}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-16 text-center text-sm text-slate-400"
                >
                  {emptyState}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Replaced old simple footer with the rich PaginationBar */}
      <PaginationBar
        page={safePage}
        pageSize={pageSize}
        total={totalCount}
        onPageChange={onPageChange}
        entriesLabel={entriesLabel}
      />
    </div>
  );
}

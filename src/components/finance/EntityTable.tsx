"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TableColumn } from "./types";
import { ResizableColumns } from "@/components/common/ResizableColumns";

interface EntityTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  paginationText?: string;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onPrevPage?: () => void;
  onNextPage?: () => void;
  onRowClick?: (row: T) => void;
  columnResizeKey?: string;
}

function paginationItems(currentPage: number, totalPages: number): number[] {
  if (totalPages <= 1) return [1];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const pages = new Set<number>([1, totalPages, currentPage]);
  if (currentPage > 1) pages.add(currentPage - 1);
  if (currentPage < totalPages) pages.add(currentPage + 1);
  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
  }
  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
  }
  return Array.from(pages).sort((a, b) => a - b);
}

export function EntityTable<T>({
  columns,
  data,
  paginationText = "Showing entries",
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onPrevPage,
  onNextPage,
  onRowClick,
  columnResizeKey,
}: EntityTableProps<T>) {
  const pageButtons = useMemo(
    () => paginationItems(currentPage, totalPages),
    [currentPage, totalPages],
  );

  return (
    <div className="bg-background text-card-foreground rounded-xl border border-border shadow-sm overflow-hidden">
      <ResizableColumns
        storageKey={
          columnResizeKey ??
          `finance:${columns.map((c) => String(c.accessorKey)).join("|")}`
        }
        className="overflow-x-auto"
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b border-border text-[11px] font-bold text-muted-foreground tracking-wider">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  data-col-id={String(col.accessorKey)}
                  className="py-3 px-4"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-xs">
            {data.length > 0 ? (
              data.map((row, rowIndex) => (
                <tr
                  onClick={() => onRowClick?.(row)}
                  key={rowIndex}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  {columns.map((col, colIndex) => {
                    const value = (row as any)[col.accessorKey];
                    return (
                      <td
                        key={colIndex}
                        className="py-3.5 px-4 font-medium text-foreground align-middle"
                      >
                        {col.cell ? col.cell(row) : value}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center py-6 text-muted-foreground"
                >
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ResizableColumns>

      {/* Pagination Footer matching screenshot structure */}
      <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground gap-4">
        <span>{paginationText}</span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onPrevPage}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted transition-colors disabled:opacity-40"
          >
            &lt;
          </button>

          {pageButtons.map((pageNumber, index) => {
            const prev = pageButtons[index - 1];
            const gap = prev != null && pageNumber - prev > 1;
            return (
              <span key={pageNumber} className="flex items-center gap-1.5">
                {gap ? (
                  <span className="px-1 text-muted-foreground">...</span>
                ) : null}
                <button
                  onClick={() => onPageChange?.(pageNumber)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg font-semibold transition-colors ${
                    currentPage === pageNumber
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "border border-border bg-background hover:bg-muted text-foreground"
                  }`}
                >
                  {pageNumber}
                </button>
              </span>
            );
          })}

          <button
            onClick={onNextPage}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted transition-colors"
          >
            &gt;
          </button>
        </div>
      </div>
    </div>
  );
}

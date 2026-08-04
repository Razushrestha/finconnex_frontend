import React from "react";
import { TableColumn } from "./types";

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
}

export function EntityTable<T>({
  columns,
  data,
  paginationText = "Showing entries",
  currentPage = 1,
  totalPages = 50,
  onPageChange,
  onPrevPage,
  onNextPage,
  onRowClick,
}: EntityTableProps<T>) {
  return (
    <div className="bg-background text-card-foreground rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b border-border text-[11px] font-bold text-muted-foreground tracking-wider">
              {columns.map((col, idx) => (
                <th key={idx} className="py-3 px-4">
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
      </div>

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

          <button
            onClick={() => onPageChange?.(1)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg font-semibold transition-colors ${
              currentPage === 1
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-border bg-background hover:bg-muted text-foreground"
            }`}
          >
            1
          </button>

          <button
            onClick={() => onPageChange?.(2)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg font-semibold transition-colors ${
              currentPage === 2
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-border bg-background hover:bg-muted text-foreground"
            }`}
          >
            2
          </button>

          <button
            onClick={() => onPageChange?.(3)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg font-semibold transition-colors ${
              currentPage === 3
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-border bg-background hover:bg-muted text-foreground"
            }`}
          >
            3
          </button>

          <span className="px-1 text-muted-foreground">...</span>

          <button
            onClick={() => onPageChange?.(totalPages)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg font-semibold transition-colors ${
              currentPage === totalPages
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-border bg-background hover:bg-muted text-foreground"
            }`}
          >
            {totalPages}
          </button>

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

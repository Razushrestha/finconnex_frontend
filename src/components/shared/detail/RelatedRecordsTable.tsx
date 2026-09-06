"use client";

import { useState } from "react";
import { MoreVertical } from "lucide-react";
import type { RelatedTableColumn, RelatedTableRow } from "./types";
import { cn } from "@/lib/utils";
import { ResizableColumns } from "@/components/common/ResizableColumns";

interface RelatedRecordsTableProps {
  title: string;
  screenLabel?: string;
  columns: RelatedTableColumn[];
  rows: RelatedTableRow[];
  onRowMenuClick?: (rowId: string) => void;
}

export function RelatedRecordsTable({
  title,
  screenLabel,
  columns,
  rows,
  onRowMenuClick,
}: RelatedRecordsTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="rounded-lg border border-slate-200/80 bg-white">
      <div className="flex items-center justify-between px-6 pt-4">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {onRowMenuClick && (
          <button
            type="button"
            aria-label="Table options"
            className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        )}
      </div>
      {screenLabel && (
        <p className="px-6 pt-1 text-xs font-medium text-slate-500">
          {screenLabel}
        </p>
      )}

      <ResizableColumns
        storageKey={`related:${title}`}
        className="mt-3 overflow-x-auto"
      >
        <table className="w-full border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-y border-slate-100 bg-slate-50/60">
              <th data-col-id="select" className="w-9 px-4 py-2">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-slate-300"
                  checked={rows.length > 0 && selected.size === rows.length}
                  onChange={() =>
                    setSelected(
                      selected.size === rows.length
                        ? new Set()
                        : new Set(rows.map((r) => r.id)),
                    )
                  }
                />
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  data-col-id={col.key}
                  className="px-4 py-2 font-semibold text-slate-500"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-slate-100 last:border-0",
                  selected.has(row.id) && "bg-indigo-50/40",
                )}
              >
                <td className="px-4 py-2.5">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-slate-300"
                    checked={selected.has(row.id)}
                    onChange={() => toggleRow(row.id)}
                  />
                </td>
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-2.5 text-slate-700">
                    {row.cells[col.key]}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-4 py-6 text-center text-xs text-slate-400"
                >
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ResizableColumns>
    </div>
  );
}

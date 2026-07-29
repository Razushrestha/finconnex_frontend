"use client";

import { cn } from "@/lib/utils";
import { GripVertical, Pin, Search } from "lucide-react";
import React, { useState, useEffect } from "react";

export type ManageColumn = {
  id: string;
  label: string;
  checked: boolean;
  required?: boolean;
  pinned?: boolean;
};

export const DEFAULT_MANAGE_COLUMNS: ManageColumn[] = [
  { id: "subject", label: "Subject", checked: true, required: true },
  { id: "dueDate", label: "Due Date", checked: true },
  { id: "status", label: "Status", checked: true },
  { id: "priority", label: "Priority", checked: true },
  { id: "relatedTo", label: "Related To", checked: true },
  { id: "contactName", label: "Contact Name", checked: true },
  { id: "fileHandler", label: "File Handler", checked: true },
  { id: "tag", label: "Tag", checked: true, pinned: false },
  { id: "taskOwner", label: "Task Owner", checked: true },
  { id: "createdTime", label: "Created Time", checked: false },
  { id: "modifiedBy", label: "Modified By", checked: false },
  { id: "modifiedTime", label: "Modified Time", checked: false },
  { id: "closedTime", label: "Closed Time", checked: false },
  { id: "createdBy", label: "Created By", checked: false },
  { id: "description", label: "Description", checked: false },
  { id: "lastActivityTime", label: "Last Activity Time", checked: false },
];

export function ManageColumnsModal({
  open,
  columns,
  onClose,
  onSave,
}: {
  open: boolean;
  columns: ManageColumn[];
  onClose: () => void;
  onSave: (columns: ManageColumn[]) => void;
}) {
  const [working, setWorking] = useState<ManageColumn[]>(columns);
  const [search, setSearch] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setWorking(columns);
      setSearch("");
    }
  }, [open, columns]);

  if (!open) return null;

  const filtered = working.filter((c) =>
    c.label.toLowerCase().includes(search.trim().toLowerCase()),
  );

  function toggleChecked(id: string) {
    setWorking((prev) =>
      prev.map((c) =>
        c.id === id && !c.required ? { ...c, checked: !c.checked } : c,
      ),
    );
  }

  function togglePinned(id: string) {
    setWorking((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)),
    );
  }

  function reorder(fromId: string, toId: string) {
    setWorking((prev) => {
      const next = [...prev];
      const fromIndex = next.findIndex((c) => c.id === fromId);
      const toIndex = next.findIndex((c) => c.id === toId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 pt-16 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="px-5 pt-4 pb-3">
          <h2 className="text-[15px] font-bold text-gray-900">
            Manage Columns
          </h2>
        </div>

        <div className="px-5 pb-3">
          <div className="flex h-9 items-center gap-2 rounded-lg border border-[var(--wq-line)] bg-white px-2.5">
            <Search className="h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="h-full flex-1 text-[13px] text-gray-800 outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2">
          {filtered.map((col) => (
            <div
              key={col.id}
              draggable={!col.required}
              onDragStart={() => setDragIndex(working.indexOf(col))}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex === null) return;
                const draggedCol = working[dragIndex];
                if (draggedCol && draggedCol.id !== col.id) {
                  reorder(draggedCol.id, col.id);
                }
                setDragIndex(null);
              }}
              className={cn(
                "group flex items-center gap-2 rounded-md py-1.5",
                col.pinned && "bg-blue-50/70",
              )}
            >
              <GripVertical
                className={cn(
                  "h-3.5 w-3.5 shrink-0 text-gray-300 opacity-0 transition-opacity",
                  !col.required && "cursor-grab group-hover:opacity-100",
                )}
              />

              <button
                type="button"
                onClick={() => toggleChecked(col.id)}
                disabled={col.required}
                aria-label={`Toggle ${col.label} column`}
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                  col.checked
                    ? "border-blue-600 bg-blue-600"
                    : "border-gray-300 bg-white",
                  col.required && "cursor-not-allowed opacity-90",
                )}
              >
                {col.checked ? (
                  <svg viewBox="0 0 16 16" className="h-3 w-3 text-white">
                    <path
                      d="M3 8.5l3 3 7-7"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : null}
              </button>

              <span className="flex-1 text-[13px] text-gray-700">
                {col.label}
                {col.required ? (
                  <span className="ml-0.5 text-rose-500">*</span>
                ) : null}
              </span>

              {!col.required ? (
                <button
                  type="button"
                  onClick={() => togglePinned(col.id)}
                  aria-label={`${col.pinned ? "Unpin" : "Pin"} ${col.label}`}
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 transition-opacity hover:bg-gray-100 hover:text-gray-600",
                    col.pinned
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100",
                  )}
                >
                  <Pin
                    className={cn("h-3.5 w-3.5", col.pinned && "fill-current")}
                  />
                </button>
              ) : (
                <span className="h-6 w-6 shrink-0" />
              )}
            </div>
          ))}

          {filtered.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-gray-400">
              No columns match your search.
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--wq-line)] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-1.5 text-[13px] font-semibold text-gray-500 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(working)}
            className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

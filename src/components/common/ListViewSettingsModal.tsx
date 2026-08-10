"use client";

import { useEffect, useMemo, useState } from "react";
import { HelpCircle, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ManageColumn } from "@/components/work-queue/ManageColumnsModal";

export type ListViewShareWith = "only-me" | "everyone" | "selected-users";

export interface ListViewConfig {
  id: string;
  name: string;
  sortBy: string;
  sortDirection: "asc" | "desc";
  pageSize: number;
  shareWith: ListViewShareWith;
  selectedColumnIds: string[];
}

export interface ListViewSettingsModalProps {
  open: boolean;
  view: ListViewConfig;
  availableColumns: ManageColumn[];
  sortOptions: { value: string; label: string }[];
  pageSizeOptions?: number[];
  onClose: () => void;
  onSave: (next: ListViewConfig) => void;
  onDelete?: () => void;
  onHelp?: () => void;
}

export function ListViewSettingsModal({
  open,
  view,
  availableColumns,
  sortOptions,
  pageSizeOptions = [10, 20, 50],
  onClose,
  onSave,
  onDelete,
  onHelp,
}: ListViewSettingsModalProps) {
  const [name, setName] = useState(view.name);
  const [sortBy, setSortBy] = useState(view.sortBy);
  const [sortDirection, setSortDirection] = useState(view.sortDirection);
  const [pageSize, setPageSize] = useState(view.pageSize);
  const [shareWith, setShareWith] = useState<ListViewShareWith>(view.shareWith);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    view.selectedColumnIds,
  );
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(view.name);
    setSortBy(view.sortBy);
    setSortDirection(view.sortDirection);
    setPageSize(view.pageSize);
    setShareWith(view.shareWith);
    setSelectedIds(view.selectedColumnIds);
    setSearch("");
  }, [open, view]);

  const fieldsById = useMemo(
    () => new Map(availableColumns.map((c) => [c.id, c])),
    [availableColumns],
  );

  const selectedFields = selectedIds
    .map((id) => fieldsById.get(id))
    .filter((c): c is ManageColumn => Boolean(c));

  const availableList = availableColumns.filter(
    (c) =>
      !selectedIds.includes(c.id) &&
      c.label.toLowerCase().includes(search.trim().toLowerCase()),
  );

  function addColumn(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function removeColumn(id: string) {
    const col = fieldsById.get(id);
    if (col?.required) return;
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  }

  function handleSave() {
    if (!name.trim()) return;
    // Keep required columns even if somehow missing
    const required = availableColumns
      .filter((c) => c.required)
      .map((c) => c.id);
    const merged = [
      ...required.filter((id) => !selectedIds.includes(id)),
      ...selectedIds,
    ];
    onSave({
      ...view,
      name: name.trim(),
      sortBy,
      sortDirection,
      pageSize,
      shareWith,
      selectedColumnIds: merged,
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100">
            List View - Settings
          </h2>
          <button
            type="button"
            onClick={onHelp}
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            <HelpCircle className="h-4 w-4" />
            Help
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <Field label="List View Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-blue-300 px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-500 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="Enter a view name"
            />
          </Field>

          <Field label="Sort By">
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-9 flex-1 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={sortDirection}
                onChange={(e) =>
                  setSortDirection(e.target.value as "asc" | "desc")
                }
                className="h-9 w-[110px] rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </Field>

          <Field label="Records / page">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex items-center gap-4 pt-1">
            <span className="w-28 shrink-0 text-sm text-slate-500 dark:text-zinc-400">
              Share this with:
            </span>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700 dark:text-zinc-200">
              {(
                [
                  ["only-me", "Only me"],
                  ["everyone", "Everyone"],
                  ["selected-users", "Selected users"],
                ] as [ListViewShareWith, string][]
              ).map(([value, label]) => (
                <label key={value} className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="listShareWith"
                    checked={shareWith === value}
                    onChange={() => setShareWith(value)}
                    className="accent-blue-600"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="pt-1">
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-zinc-200">
              Select Columns
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-xs text-slate-500 dark:text-zinc-400">
                  Available
                </p>
                <div className="rounded-md border border-slate-200 dark:border-zinc-700">
                  <div className="flex items-center gap-1.5 border-b border-slate-200 px-2 py-1.5 dark:border-zinc-700">
                    <Search className="h-3.5 w-3.5 text-slate-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search"
                      className="w-full text-sm outline-none dark:bg-transparent dark:text-zinc-100"
                    />
                  </div>
                  <ul className="h-40 overflow-y-auto text-sm">
                    {availableList.map((col) => (
                      <li key={col.id}>
                        <button
                          type="button"
                          onClick={() => addColumn(col.id)}
                          className="flex w-full items-center justify-between px-3 py-1.5 text-left text-slate-700 hover:bg-blue-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          {col.label}
                        </button>
                      </li>
                    ))}
                    {availableList.length === 0 && (
                      <li className="px-3 py-2 text-xs text-slate-400">
                        No matching columns
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs text-slate-500 dark:text-zinc-400">
                  Selected
                </p>
                <div className="h-[169px] overflow-y-auto rounded-md border border-slate-200 text-sm dark:border-zinc-700">
                  <ul>
                    {selectedFields.map((col) => (
                      <li
                        key={col.id}
                        className="flex items-center justify-between px-3 py-1.5 text-slate-700 dark:text-zinc-200"
                      >
                        <span>
                          {col.label}
                          {col.required ? (
                            <span className="ml-1 text-red-500">*</span>
                          ) : null}
                        </span>
                        {!col.required ? (
                          <button
                            type="button"
                            onClick={() => removeColumn(col.id)}
                            aria-label={`Remove ${col.label}`}
                            className="text-slate-300 hover:text-slate-500"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 dark:border-zinc-800">
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="text-sm font-medium text-red-500 hover:text-red-600"
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <span className="mt-1.5 w-28 shrink-0 text-sm text-slate-500 dark:text-zinc-400">
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function listConfigToManageColumns(
  available: ManageColumn[],
  selectedIds: string[],
): ManageColumn[] {
  const selectedSet = new Set(selectedIds);
  const byId = new Map(available.map((c) => [c.id, c]));
  const ordered = selectedIds
    .map((id) => byId.get(id))
    .filter((c): c is ManageColumn => Boolean(c))
    .map((c) => ({ ...c, checked: true }));
  const rest = available
    .filter((c) => !selectedSet.has(c.id))
    .map((c) => ({ ...c, checked: false }));
  return [...ordered, ...rest];
}

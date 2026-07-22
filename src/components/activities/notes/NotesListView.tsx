"use client";

import { useMemo, useState } from "react";
import {
  Search,
  ArrowUpDown,
  Pin,
  Lock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { notes as allNotes, type NoteType } from "@/lib/notes/types";

const noteTypeColorClass: Record<NoteType, string> = {
  General: "bg-slate-100 text-slate-600",
  "Call Summary": "bg-sky-50 text-sky-600",
  "Meeting Notes": "bg-indigo-50 text-indigo-600",
  "Follow-up": "bg-amber-50 text-amber-600",
  Other: "bg-emerald-50 text-emerald-600",
};

function initialsOf(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

const columns = [
  { key: "title", label: "Title", sortable: true },
  { key: "relatedTo", label: "Related To", sortable: true },
  { key: "noteType", label: "Note Type", sortable: false },
  { key: "createdBy", label: "Created By", sortable: true },
  { key: "createdAt", label: "Created At", sortable: true },
] as const;

interface NotesListViewProps {
  filterOpen?: boolean;
}

export function NotesListView({ filterOpen = false }: NotesListViewProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const filtered = useMemo(
    () =>
      allNotes.filter(
        (n) =>
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.relatedTo.toLowerCase().includes(search.toLowerCase()) ||
          n.createdBy.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  return (
    <div
      data-filter-open={filterOpen}
      className="flex h-full w-full min-w-0 flex-col rounded-2xl border border-slate-100 bg-white p-4 "
    >
      <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-3 sm:mb-6">
        <h3 className="text-base font-semibold text-slate-900 sm:text-md">
          All Notes
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
            placeholder="Search notes"
            className="w-44 rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-56 sm:text-sm"
          />
        </div>
      </div>

      {/* Scrollable table — self-contained, same pattern as CallsListTable */}
      <div className="min-h-0 flex-1 overflow-auto pb-3 [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100">
        <table className="w-full min-w-[900px] border-collapse text-left text-xs sm:text-sm">
          <thead>
            <tr className="rounded-lg bg-slate-50 text-slate-500">
              <th className="w-8 rounded-l-lg px-4 py-2.5" />
              {columns.map((col, idx) => (
                <th
                  key={col.key}
                  className={`px-4 py-2.5 font-medium ${
                    idx === columns.length - 1 ? "rounded-r-lg" : ""
                  }`}
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
            {paginated.map((note) => (
              <tr
                key={note.id}
                className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50/60"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-slate-400">
                    {note.isPinned && (
                      <Pin className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    )}
                    {note.isPrivate && <Lock className="h-3.5 w-3.5" />}
                  </div>
                </td>
                <td className="max-w-[260px] px-4 py-3">
                  <p className="truncate font-medium text-slate-700">
                    {note.title}
                  </p>
                  <p className="truncate text-[11px] text-slate-400">
                    {note.body}
                  </p>
                </td>
                <td className="px-4 py-3 text-slate-500">{note.relatedTo}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${noteTypeColorClass[note.noteType]}`}
                  >
                    {note.noteType}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-semibold text-indigo-600">
                      {initialsOf(note.createdBy)}
                    </span>
                    <span className="text-slate-600">{note.createdBy}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                  {note.createdAt}
                </td>
              </tr>
            ))}

            {paginated.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  No notes match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer — fixed */}
      <div className="mt-3 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500 sm:text-sm">
          Showing {filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1} to{" "}
          {Math.min(safePage * pageSize, filtered.length)} of {filtered.length}{" "}
          notes
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

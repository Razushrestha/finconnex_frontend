"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Pin,
  Lock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { type Note, type NoteType } from "@/lib/notes/types";
import { listNotes } from "@/lib/notes/store";
import { avatarColor, initials } from "@/lib/activities/shared";
import { cn } from "@/lib/utils";
import { RecordDetailModal } from "@/components/shared/RecordDetailModal";

const TYPE_META: Record<NoteType, { soft: string; text: string }> = {
  General: { soft: "bg-slate-100", text: "text-slate-600" },
  "Call Summary": { soft: "bg-sky-50", text: "text-sky-700" },
  "Meeting Notes": { soft: "bg-violet-50", text: "text-violet-700" },
  "Follow-up": { soft: "bg-amber-50", text: "text-amber-800" },
  Other: { soft: "bg-emerald-50", text: "text-emerald-700" },
};

interface NotesListViewProps {
  typeFilter?: NoteType | "All";
  search?: string;
  onSearchChange?: (value: string) => void;
  /** When provided, parent owns filtering (search/type/pinned). */
  notesOverride?: Note[];
  /** Sit inside a parent surface: no nested card chrome. */
  embedded?: boolean;
}

export function NotesListView({
  typeFilter = "All",
  search: controlledSearch,
  onSearchChange,
  notesOverride,
  embedded = false,
}: NotesListViewProps) {
  const [localSearch, setLocalSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const search = controlledSearch ?? localSearch;
  const setSearch = onSearchChange ?? setLocalSearch;
  const [detail, setDetail] = useState<Note | null>(null);
  const allNotes = notesOverride ?? listNotes();

  useEffect(() => {
    const focus = new URLSearchParams(window.location.search).get("focus");
    if (!focus) return;
    const hit = allNotes.find((n) => n.id === focus);
    if (hit) setDetail(hit);
  }, [allNotes]);

  const filtered = useMemo(() => {
    if (notesOverride) {
      return [...notesOverride].sort(
        (a, b) => Number(b.isPinned) - Number(a.isPinned),
      );
    }
    let data: Note[] = [...allNotes];
    if (typeFilter !== "All") {
      data = data.filter((n) => n.noteType === typeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.body.toLowerCase().includes(q) ||
          n.relatedTo.toLowerCase().includes(q) ||
          n.createdBy.toLowerCase().includes(q),
      );
    }
    data.sort((a, b) => Number(b.isPinned) - Number(a.isPinned));
    return data;
  }, [search, typeFilter, notesOverride, allNotes]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  return (
    <div
      className={cn(
        "flex h-full min-w-0 flex-col overflow-hidden",
        !embedded &&
          "rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.05)]",
      )}
    >
      {!embedded ? (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <h3 className="text-[14px] font-semibold text-slate-900">
            {typeFilter === "All" ? "All Notes" : typeFilter}
          </h3>
          <p className="text-[11px] text-slate-400">
            {filtered.length} note{filtered.length === 1 ? "" : "s"}
          </p>
        </div>
        {!onSearchChange ? (
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search notes…"
              className="h-9 w-56 rounded-xl border border-slate-200/90 bg-white pr-3 pl-9 text-[12px] shadow-sm outline-none transition-all hover:border-violet-300 focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
            />
          </div>
        ) : null}
      </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[920px] text-left text-[12px]">
          <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            <tr>
              <th className="w-12 px-4 py-2.5" />
              <th className="px-4 py-2.5">Title</th>
              <th className="px-4 py-2.5">Related To</th>
              <th className="px-4 py-2.5">Type</th>
              <th className="px-4 py-2.5">Created By</th>
              <th className="px-4 py-2.5">Created At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paginated.map((note) => {
              const meta = TYPE_META[note.noteType];
              return (
                <tr
                  key={note.id}
                  data-focus-id={note.id}
                  data-note-id={note.id}
                  className="group cursor-pointer transition-colors hover:bg-violet-50/40"
                  onClick={() => setDetail(note)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {note.isPinned ? (
                        <Pin className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                      ) : (
                        <span className="h-3.5 w-3.5" />
                      )}
                      {note.isPrivate ? (
                        <Lock className="h-3.5 w-3.5 text-slate-400" />
                      ) : null}
                    </div>
                  </td>
                  <td className="max-w-[280px] px-4 py-3">
                    <p className="truncate font-semibold text-slate-900">
                      {note.title || "Untitled note"}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">
                      {note.body}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{note.relatedTo}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        meta.soft,
                        meta.text,
                      )}
                    >
                      {note.noteType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold",
                          avatarColor(note.createdBy),
                        )}
                      >
                        {initials(note.createdBy)}
                      </span>
                      <span className="text-slate-700">{note.createdBy}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                    {note.createdAt}
                  </td>
                </tr>
              );
            })}
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-16 text-center text-sm text-slate-400"
                >
                  No notes match your filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-500">
        <span>
          Showing {(safePage - 1) * pageSize + 1} to{" "}
          {Math.min(safePage * pageSize, filtered.length)} of {filtered.length}{" "}
          notes
        </span>
        <div className="flex items-center gap-1">
          <PagerBtn
            onClick={() => setPage(1)}
            disabled={safePage === 1}
            icon={<ChevronsLeft className="h-3.5 w-3.5" />}
          />
          <PagerBtn
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            icon={<ChevronLeft className="h-3.5 w-3.5" />}
          />
          <span className="mx-1 flex h-7 min-w-7 items-center justify-center rounded-full bg-violet-600 px-2 text-[11px] font-bold text-white">
            {safePage}
          </span>
          <PagerBtn
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            icon={<ChevronRight className="h-3.5 w-3.5" />}
          />
          <PagerBtn
            onClick={() => setPage(totalPages)}
            disabled={safePage === totalPages}
            icon={<ChevronsRight className="h-3.5 w-3.5" />}
          />
        </div>
      </div>

      <RecordDetailModal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.title || "Note"}
        subtitle={detail?.noteType}
        fields={
          detail
            ? [
                { label: "Related to", value: detail.relatedTo },
                { label: "Type", value: detail.noteType },
                { label: "Created by", value: detail.createdBy },
                { label: "Created at", value: detail.createdAt },
                {
                  label: "Flags",
                  value: [
                    detail.isPinned ? "Pinned" : null,
                    detail.isPrivate ? "Private" : null,
                  ]
                    .filter(Boolean)
                    .join(", "),
                },
              ]
            : []
        }
        body={detail?.body}
      />
    </div>
  );
}

function PagerBtn({
  onClick,
  disabled,
  icon,
}: {
  onClick: () => void;
  disabled: boolean;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
    >
      {icon}
    </button>
  );
}

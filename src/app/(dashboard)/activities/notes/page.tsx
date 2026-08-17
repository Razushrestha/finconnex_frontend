"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pin, Lock, StickyNote } from "lucide-react";
import {
  NOTE_TYPES,
  type Note,
  type NoteColumn,
  type NoteType,
} from "@/lib/notes/types";
import { listNoteColumns, saveNotes } from "@/lib/notes/store";
import { NotesListView } from "@/components/activities/notes/NotesListView";
import { NotesKanbanColumn } from "@/components/activities/notes/NotesKanbanColumn";
import {
  ActivityToolbar,
  type ActivityView,
} from "@/components/activities/ActivityToolbar";
import { FocusHighlight } from "@/components/shared/FocusHighlight";
import { cn } from "@/lib/utils";
import { BOARD_PAGE } from "@/lib/layout";
import { moreMenuItems, printViewItems } from "../tasks/page";

type TypeTab = "All" | NoteType;

export default function NotesPage() {
  const router = useRouter();
  const [view, setView] = useState<ActivityView>("kanban");
  const [typeTab, setTypeTab] = useState<TypeTab>("All");
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [privateOnly, setPrivateOnly] = useState(false);
  const [sortActive, setSortActive] = useState(true);
  const [columns, setColumns] = useState<NoteColumn[]>([]);
  const [dragInfo, setDragInfo] = useState<{
    noteId: string;
    sourceColumnId: string;
  } | null>(null);

  useEffect(() => {
    setColumns(listNoteColumns());
  }, []);

  useEffect(() => {
    const focus = new URLSearchParams(window.location.search).get("focus");
    if (focus) router.replace(`/activities/notes/detail/${focus}`);
  }, [router]);

  const allNotes = useMemo(
    () =>
      columns.flatMap((c) =>
        c.notes.map((n) => ({ ...n, noteType: c.title as NoteType })),
      ),
    [columns],
  );

  const typeCounts = useMemo(() => {
    const map = Object.fromEntries(NOTE_TYPES.map((t) => [t, 0])) as Record<
      NoteType,
      number
    >;
    for (const n of allNotes) map[n.noteType] += 1;
    return map;
  }, [allNotes]);

  const filteredNotes = useMemo(() => {
    let data: Note[] = allNotes;
    if (typeTab !== "All") data = data.filter((n) => n.noteType === typeTab);
    if (pinnedOnly) data = data.filter((n) => n.isPinned);
    if (privateOnly) data = data.filter((n) => n.isPrivate);
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
    return data;
  }, [allNotes, typeTab, pinnedOnly, privateOnly, search]);

  const visibleColumns = useMemo(() => {
    if (typeTab === "All") return columns;
    return columns.filter((c) => c.title === typeTab);
  }, [columns, typeTab]);

  function handleDragStartNote(
    e: React.DragEvent<HTMLDivElement>,
    noteId: string,
    columnId: string,
  ) {
    setDragInfo({ noteId, sourceColumnId: columnId });
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDropNote(targetColumnId: string) {
    if (!dragInfo) return;
    const { noteId, sourceColumnId } = dragInfo;
    if (sourceColumnId === targetColumnId) {
      setDragInfo(null);
      return;
    }
    setColumns((prev) => {
      const source = prev.find((c) => c.id === sourceColumnId);
      const note = source?.notes.find((n) => n.id === noteId);
      if (!note) return prev;
      const next = prev.map((col) => {
        if (col.id === sourceColumnId) {
          const notes = col.notes.filter((n) => n.id !== noteId);
          return { ...col, notes, count: notes.length };
        }
        if (col.id === targetColumnId) {
          const notes = [{ ...note, noteType: col.title }, ...col.notes];
          return { ...col, notes, count: notes.length };
        }
        return col;
      });
      saveNotes(next.flatMap((c) => c.notes));
      return next;
    });
    setDragInfo(null);
  }

  const activeFilters = Number(pinnedOnly) + Number(privateOnly);

  return (
    <div className={BOARD_PAGE}>
      <FocusHighlight />
      <div className="shrink-0">
        <ActivityToolbar
          entityLabel="Note"
          createRoute="/activities/notes/create?layoutid=standard&redirect=false"
          tabs={["All", ...NOTE_TYPES]}
          activeTab={typeTab}
          onTabChange={(tab) => setTypeTab(tab as TypeTab)}
          tabCounts={{
            All: allNotes.length,
            ...typeCounts,
          }}
          view={view}
          onViewChange={setView}
          filterOpen={filterOpen}
          onToggleFilter={() => setFilterOpen((v) => !v)}
          onClearSort={() => setSortActive(false)}
          search={search}
          onSearchChange={setSearch}
          moreMenuItems={moreMenuItems}
          printViewItems={printViewItems}
        />
      </div>

      <div className="flex min-h-0 flex-1 items-stretch gap-4 overflow-hidden pt-3">
        {filterOpen && (
          <div className="flex w-64 shrink-0 flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Filter Options
            </h3>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setPinnedOnly((v) => !v)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                  pinnedOnly
                    ? "bg-violet-50 text-violet-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                <Pin className="h-3.5 w-3.5" />
                Pinned Notes
              </button>
              <button
                type="button"
                onClick={() => setPrivateOnly((v) => !v)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                  privateOnly
                    ? "bg-violet-50 text-violet-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                <Lock className="h-3.5 w-3.5" />
                Private Notes
              </button>
            </div>
          </div>
        )}

        <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-sm [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100">
          {view === "list" ? (
            <NotesListView
              typeFilter={typeTab}
              search={search}
              onSearchChange={setSearch}
              notesOverride={filteredNotes}
              embedded
            />
          ) : (
            <div className="flex h-full min-h-[420px] items-stretch gap-3 overflow-x-auto p-1">
              {visibleColumns.map((column) => {
                const notes = column.notes.filter((n) => {
                  if (pinnedOnly && !n.isPinned) return false;
                  if (privateOnly && !n.isPrivate) return false;
                  if (!search.trim()) return true;
                  const q = search.toLowerCase();
                  return (
                    n.title.toLowerCase().includes(q) ||
                    n.body.toLowerCase().includes(q) ||
                    n.relatedTo.toLowerCase().includes(q) ||
                    n.createdBy.toLowerCase().includes(q)
                  );
                });
                return (
                  <NotesKanbanColumn
                    key={column.id}
                    column={{ ...column, notes, count: notes.length }}
                    draggingNoteId={dragInfo?.noteId ?? null}
                    onDragStartNote={handleDragStartNote}
                    onDragEndNote={() => setDragInfo(null)}
                    onDropNote={handleDropNote}
                    embedded
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

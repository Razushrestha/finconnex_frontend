"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pin, Lock } from "lucide-react";
import {
  NOTE_TYPES,
  type Note,
  type NoteColumn,
  type NoteType,
} from "@/lib/notes/types";
import { listNoteColumns, saveNotes, deleteNote } from "@/lib/notes/store";
import { NotesListView } from "@/components/activities/notes/NotesListView";
import { NotesKanbanColumn } from "@/components/activities/notes/NotesKanbanColumn";
import { NotesTimelineView } from "@/components/activities/notes/NotesTimelineView";
import {
  ActivityToolbar,
  TIMELINE_VIEW_TOGGLE,
  type ActivityView,
} from "@/components/activities/ActivityToolbar";
import { EntitySelectionToolbar } from "@/components/sales/EntitySelectionToolbar";
import { FocusHighlight } from "@/components/shared/FocusHighlight";
import { cn } from "@/lib/utils";
import { BOARD_PAGE } from "@/lib/layout";
import { moreMenuItems, printViewItems } from "../tasks/page";

type TypeTab = "All" | NoteType;

export default function NotesPage() {
  const router = useRouter();
  const [view, setView] = useState<ActivityView>("kanban");
  const [typeTab, setTypeTab] = useState<TypeTab>("All");
  const [filterOpen, setFilterOpen] = useState(false);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [privateOnly, setPrivateOnly] = useState(false);
  const [sortActive, setSortActive] = useState(true);
  const [columns, setColumns] = useState<NoteColumn[]>([]);
  const [dragInfo, setDragInfo] = useState<{
    noteId: string;
    sourceColumnId: string;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkFlash, setBulkFlash] = useState<string | null>(null);

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
    return data;
  }, [allNotes, typeTab, pinnedOnly, privateOnly]);

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

  function toggleSelected(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );
  }

  function runBulkDelete() {
    if (!selectedIds.length) return;
    const count = selectedIds.length;
    if (
      !window.confirm(
        `Delete ${count} note${count === 1 ? "" : "s"}? This cannot be undone.`,
      )
    ) {
      return;
    }
    let n = 0;
    for (const id of selectedIds) {
      if (deleteNote(id)) n += 1;
    }
    setColumns(listNoteColumns());
    setSelectedIds([]);
    setBulkFlash(`Deleted ${n} note${n === 1 ? "" : "s"}`);
    window.setTimeout(() => setBulkFlash(null), 2800);
  }

  const activeFilters =
    Number(pinnedOnly) + Number(privateOnly) + Number(typeTab !== "All");

  return (
    <div className={BOARD_PAGE}>
      <FocusHighlight />
      <div className="shrink-0">
        <ActivityToolbar
          entityLabel="Note"
          createRoute="/activities/notes/create?layoutid=standard&redirect=false"
          view={view}
          onViewChange={setView}
          filterOpen={filterOpen || activeFilters > 0}
          onToggleFilter={() => setFilterOpen((v) => !v)}
          onClearSort={() => setSortActive(false)}
          extraViewIcons={[TIMELINE_VIEW_TOGGLE]}
          moreMenuItems={moreMenuItems}
          printViewItems={printViewItems}
        />

        {bulkFlash ? (
          <p className="mt-1 text-[12px] font-medium text-violet-700">
            {bulkFlash}
          </p>
        ) : null}

        {selectedIds.length > 0 ? (
          <EntitySelectionToolbar
            selectedCount={selectedIds.length}
            onClear={() => setSelectedIds([])}
            onDelete={runBulkDelete}
          />
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 items-stretch gap-4 overflow-hidden pt-3">
        {filterOpen && (
          <div className="flex w-64 shrink-0 flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Filter Options
            </h3>
            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                  Note type
                </p>
                <div className="space-y-1">
                  {(["All", ...NOTE_TYPES] as TypeTab[]).map((type) => {
                    const count =
                      type === "All" ? allNotes.length : typeCounts[type];
                    const active = typeTab === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setTypeTab(type)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                          active
                            ? "bg-violet-50 text-violet-700"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                        )}
                      >
                        <span>{type}</span>
                        <span
                          className={cn(
                            "rounded-full px-1.5 text-[10px]",
                            active
                              ? "bg-violet-100 text-violet-800"
                              : "bg-slate-100 text-slate-500",
                          )}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                  Flags
                </p>
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
            </div>
          </div>
        )}

        <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-sm [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100">
          {view === "list" ? (
            <NotesListView
              typeFilter={typeTab}
              notesOverride={filteredNotes}
              embedded
              selectedIds={selectedIds}
              onSelectedIdsChange={setSelectedIds}
            />
          ) : view === "timeline" ? (
            <NotesTimelineView notes={filteredNotes} />
          ) : (
            <div className="flex h-full min-h-[420px] items-stretch gap-3 overflow-x-auto p-1">
              {visibleColumns.map((column) => {
                const notes = column.notes.filter((n) => {
                  if (pinnedOnly && !n.isPinned) return false;
                  if (privateOnly && !n.isPrivate) return false;
                  return true;
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
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelected}
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

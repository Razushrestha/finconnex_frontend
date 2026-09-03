"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  type Note,
  type NoteColumn,
  type NoteType,
} from "@/lib/notes/types";
import { listNoteColumns, saveNotes, deleteNote } from "@/lib/notes/store";
import {
  bulkDeleteCrmNotes,
  isCrmNoteId,
  persistRemoteNote,
  tryCrmNote,
  updateCrmNote,
} from "@/lib/notes/api";
import { useCrmNotes } from "@/lib/notes/use-crm-notes";
import { NotesListView } from "@/components/activities/notes/NotesListView";
import { NotesKanbanColumn } from "@/components/activities/notes/NotesKanbanColumn";
import { NotesTimelineView } from "@/components/activities/notes/NotesTimelineView";
import {
  EMPTY_NOTE_FILTERS,
  NotesFilterPanel,
  type NoteFilters,
} from "@/components/activities/notes/NotesFilterPanel";
import { noteMatchesFilters } from "@/lib/filters/records";
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

export default function NotesPage() {
  const router = useRouter();
  const crm = useCrmNotes();
  const [view, setView] = useState<ActivityView>("kanban");
  const [filters, setFilters] = useState<NoteFilters>(EMPTY_NOTE_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortActive, setSortActive] = useState(true);
  const [columns, setColumns] = useState<NoteColumn[]>([]);
  const [dragInfo, setDragInfo] = useState<{
    noteId: string;
    sourceColumnId: string;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkFlash, setBulkFlash] = useState<string | null>(null);

  useEffect(() => {
    if (crm.loading) return;
    setColumns(listNoteColumns());
  }, [crm.source, crm.loading]);

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

  const filteredNotes = useMemo(
    () => allNotes.filter((n) => noteMatchesFilters(n, filters)),
    [allNotes, filters],
  );

  const visibleColumns = useMemo(() => {
    const cols = filters.types.length
      ? columns.filter((c) => filters.types.includes(c.title as NoteType))
      : columns;
    return cols.map((column) => {
      const notes = column.notes.filter((n) =>
        noteMatchesFilters({ ...n, noteType: column.title as NoteType }, filters),
      );
      return { ...column, notes, count: notes.length };
    });
  }, [columns, filters]);

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
      const target = next.find((c) => c.id === targetColumnId);
      if (target && isCrmNoteId(noteId)) {
        void tryCrmNote(() =>
          updateCrmNote(noteId, { noteType: target.title }),
        ).then((live) => {
          persistRemoteNote(live);
        });
      }
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
    const crmIds = selectedIds.filter(isCrmNoteId);
    if (crmIds.length) {
      void tryCrmNote(() => bulkDeleteCrmNotes(crmIds));
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
    filters.types.length +
    filters.flags.length +
    filters.systemDefined.length +
    filters.clauses.length;

  return (
    <div className={BOARD_PAGE}>
      <FocusHighlight />
      <div className="shrink-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              crm.source === "api"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-500",
            )}
          >
            {crm.source === "api"
              ? "Live CRM"
              : crm.loading
                ? "Connecting…"
                : "Demo"}
          </span>
          {crm.error && crm.source === "demo" ? (
            <span className="text-[10px] text-slate-500">{crm.error}</span>
          ) : null}
        </div>
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
          <NotesFilterPanel
            filters={filters}
            onChange={setFilters}
            onClose={() => setFilterOpen(false)}
          />
        )}

        <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-sm [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100">
          {view === "list" ? (
            <NotesListView
              typeFilter="All"
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
                return (
                  <NotesKanbanColumn
                    key={column.id}
                    column={column}
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

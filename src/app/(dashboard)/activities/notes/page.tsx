"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  Plus,
  Search,
  List,
  LayoutGrid,
  StickyNote,
  Pin,
  Lock,
  Filter,
  X,
} from "lucide-react";
import {
  NOTE_TYPES,
  notes as seedNotes,
  noteColumns as initialColumns,
  type Note,
  type NoteColumn,
  type NoteType,
} from "@/lib/notes/types";
import { NotesListView } from "@/components/activities/notes/NotesListView";
import { NotesKanbanColumn } from "@/components/activities/notes/NotesKanbanColumn";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "kanban";
type TypeTab = "All" | NoteType;

const TYPE_DOT: Record<NoteType, string> = {
  General: "bg-slate-400",
  "Call Summary": "bg-sky-500",
  "Meeting Notes": "bg-violet-500",
  "Follow-up": "bg-amber-500",
  Other: "bg-emerald-500",
};

export default function NotesPage() {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("list");
  const [typeTab, setTypeTab] = useState<TypeTab>("All");
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [privateOnly, setPrivateOnly] = useState(false);
  const [columns, setColumns] = useState<NoteColumn[]>(initialColumns);
  const [dragInfo, setDragInfo] = useState<{
    noteId: string;
    sourceColumnId: string;
  } | null>(null);

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
      return prev.map((col) => {
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
    });
    setDragInfo(null);
  }

  const activeFilters = Number(pinnedOnly) + Number(privateOnly);

  return (
    <div className="relative min-h-full overflow-hidden bg-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.11),_transparent_65%)]"
      />

      <div className="relative mx-auto flex max-w-[1400px] flex-col p-2.5 sm:p-3 lg:p-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <nav className="flex items-center gap-1 text-[10px] text-slate-400">
              <Link
                href="/"
                className="flex items-center gap-0.5 transition-colors hover:text-slate-600"
              >
                <Home className="h-3 w-3" />
                Home
              </Link>
              <span>/</span>
              <span className="text-slate-500">Activities</span>
              <span>/</span>
            </nav>
            <h1 className="text-[15px] font-bold tracking-tight text-slate-900">
              Notes
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100/80 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-violet-700 uppercase">
              <StickyNote className="h-2.5 w-2.5" />
              Capture
            </span>
            <span className="hidden text-[11px] text-slate-400 sm:inline">
              · Pin &amp; lock private notes
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/activities/notes/create?layoutid=standard&redirect=false",
              )
            }
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[11px] font-semibold text-white shadow-md shadow-violet-600/20 transition-all hover:bg-violet-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Note
          </button>
        </div>

        {/* ONE surface: toolbar + content */}
        <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 sm:px-4">
            <div className="flex flex-wrap items-center gap-0.5 rounded-lg bg-slate-50 p-0.5">
              <TabBtn
                active={typeTab === "All"}
                onClick={() => setTypeTab("All")}
                label="All"
                count={allNotes.length || seedNotes.length}
              />
              {NOTE_TYPES.map((t) => (
                <TabBtn
                  key={t}
                  active={typeTab === t}
                  onClick={() => setTypeTab(t)}
                  label={t}
                  count={typeCounts[t]}
                  compact
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="h-8 w-40 rounded-lg border border-slate-200/90 bg-white pr-2.5 pl-8 text-[11px] outline-none transition-all hover:border-violet-300 focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)] sm:w-48"
                />
              </div>

              <button
                type="button"
                onClick={() => setFilterOpen((v) => !v)}
                className={cn(
                  "inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-medium transition-colors",
                  filterOpen || activeFilters > 0
                    ? "bg-violet-50 text-violet-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                )}
              >
                <Filter className="h-3.5 w-3.5" />
                Filter
                {activeFilters > 0 ? (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[9px] font-bold text-white">
                    {activeFilters}
                  </span>
                ) : null}
              </button>

              <div className="flex items-center rounded-lg bg-slate-50 p-0.5">
                <button
                  type="button"
                  aria-label="List view"
                  onClick={() => setView("list")}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md transition-all",
                    view === "list"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-700",
                  )}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Board view"
                  onClick={() => setView("kanban")}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md transition-all",
                    view === "kanban"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-700",
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 px-3 py-1.5 sm:px-4">
            {NOTE_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeTab(typeTab === t ? "All" : t)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold transition-all",
                  typeTab === t
                    ? "bg-violet-50 text-violet-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", TYPE_DOT[t])} />
                {t}
                <span className="tabular-nums text-slate-400">
                  {typeCounts[t]}
                </span>
              </button>
            ))}

            {filterOpen ? (
              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                <FilterChip
                  active={pinnedOnly}
                  onClick={() => setPinnedOnly((v) => !v)}
                  icon={<Pin className="h-3 w-3" />}
                  label="Pinned"
                />
                <FilterChip
                  active={privateOnly}
                  onClick={() => setPrivateOnly((v) => !v)}
                  icon={<Lock className="h-3 w-3" />}
                  label="Private"
                />
                {activeFilters > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPinnedOnly(false);
                      setPrivateOnly(false);
                    }}
                    className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-medium text-slate-500 hover:text-slate-700"
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {view === "list" ? (
              <NotesListView
                typeFilter={typeTab}
                search={search}
                onSearchChange={setSearch}
                notesOverride={filteredNotes}
                embedded
              />
            ) : (
              <div className="flex h-full min-h-[420px] divide-x divide-slate-100 overflow-x-auto">
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
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  label,
  count,
  compact,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all",
        compact && "hidden lg:inline-flex",
        active
          ? "bg-white text-violet-700 shadow-sm"
          : "text-slate-500 hover:text-slate-700",
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 py-px text-[9px] font-bold tabular-nums",
          active ? "bg-violet-100 text-violet-700" : "bg-slate-200/80 text-slate-500",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function FilterChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold transition-all",
        active
          ? "border-violet-200 bg-violet-50 text-violet-700"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

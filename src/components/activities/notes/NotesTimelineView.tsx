"use client";

import { useMemo } from "react";
import { ActivityTimelineView } from "@/components/activities/ActivityTimelineView";
import { parseTaskDueDate } from "@/lib/dashboard/layout";
import type { Note } from "@/lib/notes/types";

export function NotesTimelineView({ notes }: { notes: Note[] }) {
  const rows = useMemo(
    () =>
      notes.map((note) => ({
        id: note.id,
        title: note.title || "Untitled note",
        meta: `${note.noteType} · ${note.createdBy} · ${note.createdAt}`,
        at: parseTaskDueDate(note.createdAt),
      })),
    [notes],
  );

  return (
    <ActivityTimelineView
      title="Note timeline"
      hint="Sorted by created time"
      rows={rows}
      emptyLabel="No notes match the current filters"
    />
  );
}

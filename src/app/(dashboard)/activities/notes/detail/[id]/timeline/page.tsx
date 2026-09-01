"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActivityRecordTimelinePage } from "@/components/activities/ActivityRecordTimelinePage";
import { listNoteTimeline } from "@/lib/activities/record-timeline";
import { findNoteById } from "@/lib/notes/store";
import type { Note } from "@/lib/notes/types";
import { onRulesChange } from "@/lib/rules";

export default function NoteTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);

  useEffect(() => {
    function load() {
      setNote(findNoteById(id)?.note ?? null);
    }
    load();
    return onRulesChange(load);
  }, [id]);

  if (!note) {
    return (
      <div className="flex min-h-[320px] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">Note not found</p>
          <button
            type="button"
            onClick={() => router.push("/activities/notes")}
            className="mt-3 rounded-lg bg-[#5A32A3] px-4 py-2 text-sm font-semibold text-white"
          >
            Back to Notes
          </button>
        </div>
      </div>
    );
  }

  return (
    <ActivityRecordTimelinePage
      backHref={`/activities/notes/detail/${note.id}`}
      backLabel="Back to note"
      eyebrow="Note timeline"
      title={note.title || "Untitled note"}
      description="Create, edits, and pin history for this note."
      events={listNoteTimeline(note)}
    />
  );
}

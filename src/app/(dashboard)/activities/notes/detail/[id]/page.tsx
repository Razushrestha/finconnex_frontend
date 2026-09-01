"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useModuleBack } from "@/hooks/useModuleBack";
import type { Note } from "@/lib/notes/types";
import { findNoteById } from "@/lib/notes/store";
import { NoteDetailsView } from "@/components/activities/notes/detail/NoteDetailsView";
import { onRulesChange } from "@/lib/rules";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function NoteDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const back = useModuleBack("/activities/notes", "Back to Notes");
  const [note, setNote] = useState<Note | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function loadNote() {
      setNote(findNoteById(id)?.note ?? null);
      setReady(true);
    }
    loadNote();
    return onRulesChange(loadNote);
  }, [id]);

  if (!ready) {
    return (
      <div className="flex min-h-[320px] items-center justify-center px-4">
        <p className="text-sm text-slate-500">Loading note…</p>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex min-h-[320px] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">Note not found</p>
          <button
            type="button"
            onClick={() => router.push(back.href)}
            className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            {back.label}
          </button>
        </div>
      </div>
    );
  }

  return (
    <NoteDetailsView
      note={note}
      onBack={() => router.push(back.href)}
      backLabel={back.label}
    />
  );
}

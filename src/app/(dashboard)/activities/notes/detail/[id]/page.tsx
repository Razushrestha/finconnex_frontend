"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useModuleBack } from "@/hooks/useModuleBack";
import type { Note } from "@/lib/notes/types";
import { deleteNote, findNoteById } from "@/lib/notes/store";
import {
  deleteCrmNote,
  getCrmNote,
  isCrmNoteId,
  persistRemoteNote,
  restoreCrmNote,
  tryCrmNote,
} from "@/lib/notes/api";
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
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    function loadNote() {
      setNote(findNoteById(id)?.note ?? null);
      setReady(true);
    }
    loadNote();
    const off = onRulesChange(loadNote);
    let cancelled = false;
    void (async () => {
      if (!isCrmNoteId(id)) return;
      const remote = await tryCrmNote(() => getCrmNote(id));
      if (cancelled || !remote) return;
      persistRemoteNote(remote);
      setNote(remote);
    })();
    return () => {
      cancelled = true;
      off();
    };
  }, [id]);

  function notify(msg: string) {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 2600);
  }

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

  const live = isCrmNoteId(note.id);

  return (
    <>
      {flash ? (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-medium text-white shadow-lg">
          {flash}
        </div>
      ) : null}
      <NoteDetailsView
        note={note}
        onBack={() => router.push(back.href)}
        backLabel={back.label}
        busy={busy}
        onRestore={
          live
            ? () => {
                void (async () => {
                  if (busy) return;
                  setBusy(true);
                  const remote = await tryCrmNote(() => restoreCrmNote(note.id));
                  if (remote) {
                    persistRemoteNote(remote);
                    setNote(remote);
                    notify("Restored");
                  } else {
                    notify("Restore failed");
                  }
                  setBusy(false);
                })();
              }
            : undefined
        }
        onDelete={() => {
          if (!window.confirm(`Delete ${note.title || "this note"}?`)) return;
          void (async () => {
            setBusy(true);
            if (live) await tryCrmNote(() => deleteCrmNote(note.id));
            deleteNote(note.id);
            router.push(back.href);
          })();
        }}
      />
    </>
  );
}

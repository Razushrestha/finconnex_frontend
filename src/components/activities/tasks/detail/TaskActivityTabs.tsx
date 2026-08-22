"use client";

import { useState, type ReactNode } from "react";
import { MentionTextarea } from "@/components/shared/MentionTextarea";
import { FileText } from "lucide-react";
import type { TaskActivityNote } from "@/lib/tasks/types";
import { avatarColor, initials } from "@/lib/activities/shared";
import { listMentionPeople } from "@/lib/mentions/people";

interface TaskAttachment {
  name: string;
  sizeLabel?: string;
}

interface TaskActivityTabsProps {
  notes?: TaskActivityNote[];
  attachments?: TaskAttachment[];
  onAddNote?: (body: string) => void;
}

function renderNoteBodyWithMentions(text: string) {
  const people = listMentionPeople();
  const names = people
    .map((person) => person.name)
    .sort((a, b) => b.length - a.length);
  if (!names.length) return text;

  const pattern = new RegExp(
    `@(${names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "g",
  );

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <span
        key={`${match.index}-${match[1]}`}
        className="rounded bg-violet-100 px-1 py-0.5 font-medium text-violet-800"
      >
        @{match[1]}
      </span>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length ? parts : text;
}

export function TaskActivityTabs({
  notes = [],
  attachments = [],
  onAddNote,
}: TaskActivityTabsProps) {
  const [activeTab, setActiveTab] = useState<"notes" | "attachments">("notes");
  const [newNote, setNewNote] = useState("");

  function handleSaveNote() {
    const trimmed = newNote.trim();
    if (!trimmed) return;
    onAddNote?.(trimmed);
    setNewNote("");
  }

  return (
    <section className="py-7">
      <div className="flex items-center gap-6 border-b border-slate-100 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("notes")}
          className={`relative pb-1 text-xs font-medium transition-colors ${activeTab === "notes" ? "font-semibold text-[#5A32A3]" : "text-slate-400 hover:text-slate-700"}`}
        >
          Notes ({notes.length})
          {activeTab === "notes" && (
            <span className="absolute right-0 bottom-[-13px] left-0 h-0.5 bg-[#5A32A3]" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("attachments")}
          className={`relative pb-1 text-xs font-medium transition-colors ${activeTab === "attachments" ? "font-semibold text-[#5A32A3]" : "text-slate-400 hover:text-slate-700"}`}
        >
          Attachments ({attachments.length})
          {activeTab === "attachments" && (
            <span className="absolute right-0 bottom-[-13px] left-0 h-0.5 bg-[#5A32A3]" />
          )}
        </button>
      </div>

      {activeTab === "notes" && (
        <div className="mt-5 space-y-5">
          {notes.length === 0 ? (
            <p className="py-2 text-xs text-slate-400">
              No notes yet. Add the first note below.
            </p>
          ) : (
            notes.map((note) => (
              <div key={note.id}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${avatarColor(note.author)}`}
                    >
                      {initials(note.author)}
                    </span>
                    <span className="truncate text-xs font-medium text-slate-800">
                      {note.author}
                    </span>
                  </div>
                  <time
                    dateTime={note.createdAt}
                    className="shrink-0 text-[10px] text-slate-400"
                  >
                    {note.createdAt}
                  </time>
                </div>
                <p className="whitespace-pre-wrap pl-8 text-xs leading-relaxed text-slate-700">
                  {renderNoteBodyWithMentions(note.body)}
                </p>
              </div>
            ))
          )}
          <div className="space-y-2">
            <MentionTextarea
              rows={3}
              value={newNote}
              onChange={setNewNote}
              placeholder="Add a note... Type @ to assign someone."
              className="w-full border-0 border-b border-slate-200 bg-transparent p-0 pb-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-0"
              data-task-note-input
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveNote}
                disabled={!newNote.trim()}
                className="bg-[#5A32A3] px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "attachments" && (
        <div className="mt-5 space-y-3">
          {attachments.length === 0 ? (
            <p className="py-2 text-xs text-slate-400">
              No attachments yet.
            </p>
          ) : (
            attachments.map((file) => (
              <div key={file.name} className="flex items-center gap-3 py-1">
                <FileText className="h-4 w-4 text-slate-400" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-800">
                    {file.name}
                  </p>
                  {file.sizeLabel ? (
                    <p className="text-[10px] text-slate-400">{file.sizeLabel}</p>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}

"use client";

import { useState, type ReactNode } from "react";
import { MentionTextarea } from "@/components/shared/MentionTextarea";
import { FileText } from "lucide-react";
import type { TaskActivityNote } from "@/lib/tasks/types";
import { avatarColor, initials } from "@/lib/activities/shared";
import { listMentionPeople } from "@/lib/mentions/people";

interface TaskActivityTabsProps {
  notes?: TaskActivityNote[];
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
  onAddNote,
}: TaskActivityTabsProps) {
  const [activeTab, setActiveTab] = useState<
    "notes" | "attachments" | "emails"
  >("notes");
  const [newNote, setNewNote] = useState("");

  function handleSaveNote() {
    const trimmed = newNote.trim();
    if (!trimmed) return;
    onAddNote?.(trimmed);
    setNewNote("");
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="flex items-center gap-6 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("notes")}
          className={`text-xs font-medium pb-1 relative transition-colors ${activeTab === "notes" ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"}`}
        >
          Notes ({notes.length})
          {activeTab === "notes" && (
            <span className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("attachments")}
          className={`text-xs font-medium pb-1 relative transition-colors ${activeTab === "attachments" ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"}`}
        >
          Attachments (2)
          {activeTab === "attachments" && (
            <span className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("emails")}
          className={`text-xs font-medium pb-1 relative transition-colors ${activeTab === "emails" ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"}`}
        >
          Emails
          {activeTab === "emails" && (
            <span className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      </div>

      {activeTab === "notes" && (
        <div className="mt-4 space-y-4">
          {notes.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground">
              No notes yet. Add the first note below.
            </p>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="rounded-xl border border-border bg-muted/30 p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${avatarColor(note.author)}`}
                    >
                      {initials(note.author)}
                    </span>
                    <span className="truncate text-xs font-medium text-foreground">
                      {note.author}
                    </span>
                  </div>
                  <time
                    dateTime={note.createdAt}
                    className="shrink-0 text-[10px] text-muted-foreground"
                  >
                    {note.createdAt}
                  </time>
                </div>
                <p className="whitespace-pre-wrap text-xs text-foreground">
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
              className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveNote}
                disabled={!newNote.trim()}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "attachments" && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
            <FileText className="h-5 w-5 text-primary" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">
                Financial_Model_Q3.xlsx
              </p>
              <p className="text-[10px] text-muted-foreground">
                2.4 MB • Uploaded Today
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
            <FileText className="h-5 w-5 text-primary" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">
                Strategy_Deck.pdf
              </p>
              <p className="text-[10px] text-muted-foreground">
                5.1 MB • Uploaded Yesterday
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "emails" && (
        <div className="mt-4 text-center py-6 text-xs text-muted-foreground">
          No emails linked to this task yet.
        </div>
      )}
    </div>
  );
}

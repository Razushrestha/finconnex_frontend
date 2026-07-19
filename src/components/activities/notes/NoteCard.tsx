"use client";

import { Pin, Lock, FileText } from "lucide-react";
import type { Note } from "@/lib/notes/types";

function initialsOf(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

const avatarColorClasses = [
  "bg-indigo-100 text-indigo-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
];

function avatarColorFor(name: string) {
  const index = name.length % avatarColorClasses.length;
  return avatarColorClasses[index];
}

interface NoteCardProps {
  note: Note;
  columnId: string;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

export function NoteCard({
  note,
  columnId,
  onDragStart,
  onDragEnd,
  isDragging,
}: NoteCardProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-note-id={note.id}
      data-column-id={columnId}
      className={`cursor-grab select-none rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all active:cursor-grabbing ${
        isDragging ? "opacity-40" : "hover:shadow-md"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <FileText className="h-3.5 w-3.5" />
          {note.relatedTo}
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          {note.isPinned && (
            <Pin className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          )}
          {note.isPrivate && <Lock className="h-3.5 w-3.5" />}
        </div>
      </div>

      <h4 className="mb-1.5 line-clamp-2 text-sm font-semibold text-slate-900">
        {note.title}
      </h4>
      <p className="mb-3 line-clamp-2 text-xs text-slate-500">{note.body}</p>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-400">{note.createdAt}</span>

        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${avatarColorFor(
            note.createdBy,
          )}`}
        >
          {initialsOf(note.createdBy)}
        </span>
      </div>
    </div>
  );
}

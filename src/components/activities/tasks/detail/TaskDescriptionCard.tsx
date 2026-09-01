"use client";

import { useState, type ReactNode } from "react";
import {
  TaskDescriptionEditor,
  sanitizeTaskDescriptionHtml,
} from "../TaskDescriptionEditor";
import { listMentionPeople } from "@/lib/mentions/people";
import { useTaskSectionEdit } from "./TaskEditContext";

interface TaskDescriptionCardProps {
  description?: string;
  editable?: boolean;
  onSave?: (description: string) => void;
}

function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function renderPlainDescriptionWithMentions(text: string) {
  const people = listMentionPeople();
  const names = people.map((person) => person.name).sort((a, b) => b.length - a.length);
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

export function TaskDescriptionCard({
  description,
  editable = false,
  onSave,
}: TaskDescriptionCardProps) {
  const [draft, setDraft] = useState(description ?? "");

  const editing = useTaskSectionEdit({
    start() {
      setDraft(description ?? "");
    },
    save() {
      if (editable) onSave?.(draft);
    },
    cancel() {
      setDraft(description ?? "");
    },
  });
  const isEditing = editable && editing;

  return (
    <section className="border-b border-slate-100 py-7">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
          Description
        </h2>
      </div>

      {isEditing ? (
        <TaskDescriptionEditor value={draft} onChange={setDraft} />
      ) : description && looksLikeHtml(description) ? (
        <div
          className="prose prose-sm max-w-none text-sm leading-relaxed text-slate-700 [&_.mention-tag]:rounded [&_.mention-tag]:bg-violet-100 [&_.mention-tag]:px-1 [&_.mention-tag]:py-0.5 [&_.mention-tag]:font-medium [&_.mention-tag]:text-violet-800 [&_a]:text-violet-700 [&_a]:underline"
          dangerouslySetInnerHTML={{
            __html: sanitizeTaskDescriptionHtml(description),
          }}
        />
      ) : description ? (
        <p className="text-sm leading-relaxed text-slate-700">
          {renderPlainDescriptionWithMentions(description)}
        </p>
      ) : (
        <p className="text-2xl font-light leading-none text-slate-300">—</p>
      )}
    </section>
  );
}

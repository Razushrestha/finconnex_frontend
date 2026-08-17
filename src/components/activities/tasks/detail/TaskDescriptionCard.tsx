"use client";

import { useState, type ReactNode } from "react";
import { FileText, Pencil, X, Check } from "lucide-react";
import {
  TaskDescriptionEditor,
  sanitizeTaskDescriptionHtml,
} from "../TaskDescriptionEditor";
import { listMentionPeople } from "@/lib/mentions/people";

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
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(description ?? "");

  const fallback =
    "Review and analyze the financial performance metrics across all regional enterprise accounts. This includes aggregating revenue data, identifying churn risk patterns, and comparing actuals against projected forecasts outlined in the strategy deck.";

  function startEditing() {
    setDraft(description ?? "");
    setIsEditing(true);
  }

  function cancelEditing() {
    setDraft(description ?? "");
    setIsEditing(false);
  }

  function saveEditing() {
    onSave?.(draft);
    setIsEditing(false);
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Description
        </h2>
        {editable && !isEditing ? (
          <button
            type="button"
            onClick={startEditing}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        ) : null}
        {editable && isEditing ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={cancelEditing}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
            <button
              type="button"
              onClick={saveEditing}
              className="inline-flex items-center gap-1 rounded-md bg-violet-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-violet-700"
            >
              <Check className="h-3 w-3" />
              Save
            </button>
          </div>
        ) : null}
      </div>

      {isEditing ? (
        <TaskDescriptionEditor value={draft} onChange={setDraft} />
      ) : description && looksLikeHtml(description) ? (
        <div
          className="prose prose-sm max-w-none text-sm leading-relaxed text-foreground [&_.mention-tag]:rounded [&_.mention-tag]:bg-violet-100 [&_.mention-tag]:px-1 [&_.mention-tag]:py-0.5 [&_.mention-tag]:font-medium [&_.mention-tag]:text-violet-800 [&_a]:text-violet-700 [&_a]:underline"
          dangerouslySetInnerHTML={{
            __html: sanitizeTaskDescriptionHtml(description),
          }}
        />
      ) : (
        <p className="text-sm leading-relaxed text-foreground">
          {description
            ? renderPlainDescriptionWithMentions(description)
            : renderPlainDescriptionWithMentions(fallback)}
        </p>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-muted/40 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-foreground">
              Financial_Model_Q3.xlsx
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">2.4 MB</span>
        </div>
      </div>
    </div>
  );
}

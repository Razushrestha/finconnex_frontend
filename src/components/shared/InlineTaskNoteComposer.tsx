"use client";

import { useEffect, useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";
import { MentionNotesTextarea } from "@/components/shared/MentionNotesTextarea";
import { cn } from "@/lib/utils";

export type InlineNoteAttachment = {
  id: string;
  name: string;
  url: string;
  type: string;
};

export type InlineTaskNoteValue = {
  title: string;
  body: string;
  attachments: InlineNoteAttachment[];
};

const EMPTY_NOTE: InlineTaskNoteValue = {
  title: "",
  body: "",
  attachments: [],
};

function hasNoteContent(note: InlineTaskNoteValue) {
  return Boolean(
    note.title.trim() ||
      note.body.replace(/<[^>]+>/g, "").trim() ||
      note.attachments.length,
  );
}

function plainSnippet(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function InlineTaskNoteComposer({
  value,
  onChange,
  className,
  label,
}: {
  value: InlineTaskNoteValue;
  onChange: (next: InlineTaskNoteValue) => void;
  className?: string;
  /** Optional section label above the pill/composer */
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<InlineTaskNoteValue>(value);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) setDraft(value);
  }, [value, open]);

  function openComposer() {
    setDraft(value);
    setOpen(true);
  }

  function cancelComposer() {
    setDraft(value);
    setOpen(false);
  }

  function saveComposer() {
    onChange(draft);
    setOpen(false);
  }

  const canSave = hasNoteContent(draft);
  const saved = hasNoteContent(value);

  return (
    <div className={cn(className)}>
      {label ? (
        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-gray-500">
          {label}
        </label>
      ) : null}

      {!open ? (
        saved ? (
          <button
            type="button"
            onClick={openComposer}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            {value.title.trim() ? (
              <p className="truncate text-[14px] font-semibold text-slate-900">
                {value.title.trim()}
              </p>
            ) : null}
            {plainSnippet(value.body) ? (
              <p
                className={cn(
                  "line-clamp-2 text-[13px] text-slate-600",
                  value.title.trim() && "mt-0.5",
                )}
              >
                {plainSnippet(value.body)}
              </p>
            ) : null}
            {value.attachments.length > 0 ? (
              <p className="mt-1 text-[12px] text-slate-400">
                {value.attachments.length} attachment
                {value.attachments.length === 1 ? "" : "s"}
              </p>
            ) : null}
          </button>
        ) : (
          <button
            type="button"
            onClick={openComposer}
            className="flex h-11 w-full items-center rounded-full border border-slate-200 bg-white px-4 text-left text-[14px] text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            Add a note
          </button>
        )
      ) : (
        <div className="rounded-xl border border-[#7EB6FF] bg-white shadow-[0_0_0_1px_rgba(126,182,255,0.25)]">
          <div className="px-3.5 pt-3">
            <input
              value={draft.title}
              maxLength={100}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  title: e.target.value.slice(0, 100),
                }))
              }
              placeholder="Title"
              className="w-full border-0 bg-transparent pb-2 text-[15px] font-semibold text-slate-900 outline-none placeholder:font-semibold placeholder:text-slate-400"
            />
            <div className="border-t border-slate-200" aria-hidden />
            <div className="pt-2">
              <MentionNotesTextarea
                value={draft.body}
                onChange={(body) => setDraft((prev) => ({ ...prev, body }))}
                placeholder="What's this note about? Type @ to mention someone."
                className="border-0 shadow-none"
              />
            </div>
          </div>

          {draft.attachments.length > 0 ? (
            <div className="flex flex-wrap gap-2 border-t border-slate-100 px-3.5 py-2">
              {draft.attachments.map((item) => (
                <div
                  key={item.id}
                  className="group relative flex w-14 flex-col items-center"
                >
                  <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    {item.type.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.url}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Paperclip className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${item.name}`}
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        attachments: prev.attachments.filter(
                          (entry) => entry.id !== item.id,
                        ),
                      }))
                    }
                    className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-white"
                  >
                    <X className="h-2.5 w-2.5" strokeWidth={3} />
                  </button>
                  <p
                    className="mt-1 max-w-14 truncate text-[10px] text-slate-500"
                    title={item.name}
                  >
                    {item.name}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-2.5 py-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] font-medium text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
            >
              <Paperclip className="h-3.5 w-3.5" />
              Attach
              {draft.attachments.length > 0 ? (
                <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-100 px-1 text-[10px] font-bold text-sky-700 tabular-nums">
                  {draft.attachments.length}
                </span>
              ) : null}
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
              className="hidden"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                void Promise.all(
                  files.map(
                    (file) =>
                      new Promise<InlineNoteAttachment>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () =>
                          resolve({
                            id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
                            name: file.name,
                            type: file.type || "application/octet-stream",
                            url: String(reader.result || ""),
                          });
                        reader.onerror = () =>
                          reject(reader.error ?? new Error("read failed"));
                        reader.readAsDataURL(file);
                      }),
                  ),
                ).then((next) => {
                  setDraft((prev) => ({
                    ...prev,
                    attachments: [...prev.attachments, ...next],
                  }));
                });
                event.target.value = "";
              }}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelComposer}
                className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canSave}
                onClick={saveComposer}
                className="h-8 rounded-lg bg-[#5B9BD5] px-3.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function formatInlineTaskNote(note: InlineTaskNoteValue): string {
  return [
    note.title.trim(),
    note.body.trim(),
    note.attachments.length
      ? `Attachments: ${note.attachments.map((item) => item.name).join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function emptyInlineTaskNote(): InlineTaskNoteValue {
  return { ...EMPTY_NOTE, attachments: [] };
}

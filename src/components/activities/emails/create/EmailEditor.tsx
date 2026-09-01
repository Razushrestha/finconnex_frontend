"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  Check,
  ChevronDown,
  Paperclip,
  X,
} from "lucide-react";
import { TaskDescriptionEditor } from "@/components/activities/tasks/TaskDescriptionEditor";
import { cn } from "@/lib/utils";
import type { EmailImportance } from "@/lib/emails/types";
import { emailHasDraftContent, type EmailTone } from "@/lib/emails/ai-compose";
import { stripAllSignatures } from "@/lib/emails/signature";
import { EmailAiActions } from "./EmailAiActions";

interface AttachmentChip {
  id: string;
  name: string;
  size: number;
}

interface EmailEditorProps {
  body: string;
  onChange: (value: string) => void;
  error?: string;
  submitted?: boolean;
  recipientName?: string;
  subject?: string;
  importance: EmailImportance;
  onImportanceChange: (value: EmailImportance) => void;
  attachments: AttachmentChip[];
  onAttachClick: () => void;
  onRemoveAttachment: (id: string) => void;
  onDropFiles: (files: FileList) => void;
  aiBusy?: boolean;
  onAskMeTo: () => void;
  onAiTone: (tone: EmailTone) => void;
  onAiShorten: () => void;
  onAiClarity: () => void;
  onAiRegenerate: () => void;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EmailEditor({
  body,
  onChange,
  error,
  submitted,
  recipientName,
  subject,
  importance,
  onImportanceChange,
  attachments,
  onAttachClick,
  onRemoveAttachment,
  onDropFiles,
  aiBusy,
  onAskMeTo,
  onAiTone,
  onAiShorten,
  onAiClarity,
  onAiRegenerate,
}: EmailEditorProps) {
  const [dragging, setDragging] = useState(false);
  const [importanceOpen, setImportanceOpen] = useState(false);
  const dragCount = useRef(0);
  const importanceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!importanceOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!importanceRef.current?.contains(event.target as Node)) {
        setImportanceOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [importanceOpen]);

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col px-5 py-4"
      onDragEnter={(event) => {
        event.preventDefault();
        dragCount.current += 1;
        if (event.dataTransfer.types.includes("Files")) setDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        dragCount.current = Math.max(0, dragCount.current - 1);
        if (dragCount.current === 0) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        dragCount.current = 0;
        setDragging(false);
        if (event.dataTransfer.files.length) onDropFiles(event.dataTransfer.files);
      }}
    >
      <TaskDescriptionEditor
        value={body}
        onChange={onChange}
        placeholder="Write your email…"
        fillHeight
        className="min-h-0 flex-1"
        toolbarAfterLink={
          <button
            type="button"
            title="Attach files"
            onMouseDown={(event) => event.preventDefault()}
            onClick={onAttachClick}
            className={cn(
              "relative inline-flex h-8 w-8 items-center justify-center rounded-md border text-slate-600 hover:border-slate-200 hover:bg-white",
              attachments.length
                ? "border-violet-300 bg-violet-50 text-[#5A32A3]"
                : "border-transparent",
            )}
          >
            <Paperclip className="h-4 w-4" />
            {attachments.length ? (
              <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#5A32A3] px-0.5 text-[8px] font-bold text-white">
                {attachments.length}
              </span>
            ) : null}
          </button>
        }
        toolbarTrailing={
          <div className="relative" ref={importanceRef}>
            <button
              type="button"
              title="Importance"
              onClick={() => setImportanceOpen((v) => !v)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium hover:bg-white",
                importance === "high"
                  ? "text-red-600"
                  : importance === "low"
                    ? "text-blue-600"
                    : "text-slate-600",
              )}
            >
              Importance
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
            {importanceOpen ? (
              <div className="absolute top-8 right-0 z-30 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    onImportanceChange("high");
                    setImportanceOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-slate-700 hover:bg-slate-50"
                >
                  <span className="flex w-4 justify-center">
                    {importance === "high" ? (
                      <Check className="h-3.5 w-3.5 text-slate-800" />
                    ) : (
                      <span className="text-[15px] font-bold text-red-500">!</span>
                    )}
                  </span>
                  High
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onImportanceChange("normal");
                    setImportanceOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-slate-700 hover:bg-slate-50"
                >
                  <span className="flex w-4 justify-center">
                    {importance === "normal" ? (
                      <Check className="h-3.5 w-3.5 text-slate-800" />
                    ) : null}
                  </span>
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onImportanceChange("low");
                    setImportanceOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-slate-700 hover:bg-slate-50"
                >
                  <span className="flex w-4 justify-center">
                    {importance === "low" ? (
                      <Check className="h-3.5 w-3.5 text-slate-800" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5 text-blue-500" />
                    )}
                  </span>
                  Low
                </button>
              </div>
            ) : null}
          </div>
        }
        belowEditor={
          emailHasDraftContent(stripAllSignatures(body)) ? (
            <EmailAiActions
              busy={aiBusy}
              onTone={onAiTone}
              onShorten={onAiShorten}
              onClarity={onAiClarity}
              onRegenerate={onAiRegenerate}
            />
          ) : null
        }
      />

      {attachments.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {attachments.map((item) => (
            <div
              key={item.id}
              className="group flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5"
            >
              <Paperclip className="h-3.5 w-3.5 text-slate-400" />
              <div className="leading-tight">
                <p className="max-w-[180px] truncate text-[11px] font-medium text-slate-700">
                  {item.name}
                </p>
                <p className="text-[10px] text-slate-400">{formatBytes(item.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => onRemoveAttachment(item.id)}
                className="text-slate-400 hover:text-slate-700"
                aria-label={`Remove ${item.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {submitted && error ? (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      ) : null}

      {dragging ? (
        <div className="pointer-events-none absolute inset-4 z-20 flex items-center justify-center rounded-xl border-2 border-dashed border-[#5A32A3] bg-[#5A32A3]/8">
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#5A32A3] shadow-sm">
            <Paperclip className="h-4 w-4" />
            Drop files to attach
          </p>
        </div>
      ) : null}
    </div>
  );
}

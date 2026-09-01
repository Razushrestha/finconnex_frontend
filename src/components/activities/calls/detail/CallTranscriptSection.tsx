"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials, avatarColor } from "@/lib/activities/shared";
import type { CallAttachment } from "@/lib/calls/types";
import AttachmentUpload from "@/components/activities/tasks/AttachmentUpload";
import { getUploadAdapter } from "@/lib/attachments/upload";

interface CallTranscriptProps {
  hasTranscript?: boolean;
  notes?: string;
  assignedTo: string;
  contactName?: string;
  attachments?: CallAttachment[];
  onSaveNotes: (notes: string) => boolean;
  onAddAttachments?: (files: CallAttachment[]) => boolean;
}

export function CallTranscriptSection({
  hasTranscript = true,
  notes,
  assignedTo,
  contactName,
  attachments = [],
  onSaveNotes,
  onAddAttachments,
}: CallTranscriptProps) {
  const [activeTab, setActiveTab] = useState<
    "transcript" | "notes" | "attachments"
  >(hasTranscript ? "transcript" : "notes");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState(notes ?? "");
  const [saved, setSaved] = useState(notes ?? "");

  useEffect(() => {
    if (!hasTranscript && activeTab === "transcript") setActiveTab("notes");
  }, [hasTranscript, activeTab]);

  useEffect(() => {
    const next = notes ?? "";
    setDraft((current) => (current === saved ? next : current));
    setSaved(next);
  }, [notes]);

  const other = contactName || "Contact";

  function handleSave() {
    const next = draft.trim();
    if (onSaveNotes(next)) {
      setDraft(next);
      setSaved(next);
    }
  }

  async function handleUploadAttachments() {
    if (!pendingFiles.length || !onAddAttachments) return;
    setUploading(true);
    const uploaded: CallAttachment[] = [];
    const adapter = getUploadAdapter();
    for (const file of pendingFiles) {
      const result = await adapter.upload({
        fileName: file.name,
        data: await file.arrayBuffer(),
        contentType: file.type || "application/octet-stream",
        relatedTo: "Call",
      });
      if (!result.ok) {
        setUploading(false);
        window.alert(`Failed to upload "${file.name}": ${result.message}`);
        return;
      }
      uploaded.push({
        name: result.fileName,
        sizeLabel: result.sizeLabel,
        storageUrl: result.storageUrl,
        contentType: result.contentType,
      });
    }
    const ok = onAddAttachments(uploaded);
    setUploading(false);
    if (ok) setPendingFiles([]);
  }

  return (
    <section className="py-7">
      <div className="flex items-center gap-6 border-b border-slate-100 pb-3">
        {(
          [
            ["transcript", "Transcript"],
            ["notes", `Notes${saved ? " (1)" : ""}`],
            ["attachments", `Attachments (${attachments.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={cn(
              "relative pb-1 text-xs font-medium transition-colors",
              activeTab === key
                ? "font-semibold text-[#5A32A3]"
                : "text-slate-400 hover:text-slate-700",
            )}
          >
            {label}
            {activeTab === key ? (
              <span className="absolute right-0 bottom-[-13px] left-0 h-0.5 bg-[#5A32A3]" />
            ) : null}
          </button>
        ))}
      </div>

      {activeTab === "transcript" ? (
        hasTranscript ? (
          <div className="mt-5 space-y-5">
            <Bubble
              name={assignedTo}
              time="00:00"
              text={`Hi ${other.split(" ")[0]}, following up regarding the scheduled call details and requirements discussed previously.`}
              self
            />
            {saved ? <Bubble name={other} time="00:18" text={saved} /> : null}
            <p className="pt-1 text-center text-[11px] font-medium text-slate-400">
              Call logged
            </p>
          </div>
        ) : (
          <p className="mt-5 text-2xl font-light leading-none text-slate-300">—</p>
        )
      ) : null}

      {activeTab === "notes" ? (
        <div className="mt-5 space-y-4">
          {saved ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {saved}
            </p>
          ) : (
            <p className="text-2xl font-light leading-none text-slate-300">—</p>
          )}
          <div className="space-y-2">
            <textarea
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a note…"
              className="w-full resize-none border-0 border-b border-slate-200 bg-transparent p-0 pb-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={!draft.trim() || draft.trim() === saved}
                className="bg-[#5A32A3] px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "attachments" ? (
        <div className="mt-5 space-y-3">
          {attachments.length === 0 ? (
            <p className="py-2 text-xs text-slate-400">No attachments yet.</p>
          ) : (
            attachments.map((file) => (
              <div
                key={`${file.name}-${file.storageUrl ?? ""}`}
                className="flex items-center gap-3 py-1"
              >
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
          {onAddAttachments ? (
            <div className="space-y-3 pt-2">
              <AttachmentUpload files={pendingFiles} onChange={setPendingFiles} />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!pendingFiles.length || uploading}
                  onClick={() => void handleUploadAttachments()}
                  className="bg-[#5A32A3] px-4 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {uploading ? "Uploading…" : "Add attachments"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function Bubble({
  name,
  time,
  text,
  self,
}: {
  name: string;
  time: string;
  text: string;
  self?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
          self ? "bg-[#F3ECFB] text-[#5A32A3]" : avatarColor(name),
        )}
      >
        {initials(name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-medium text-slate-800">{name}</span>
          <span className="font-mono text-[10px] text-slate-400">{time}</span>
        </div>
        <p className="text-xs leading-relaxed text-slate-700">{text}</p>
      </div>
    </div>
  );
}

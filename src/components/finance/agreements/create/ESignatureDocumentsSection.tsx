"use client";

import { useRef, useState } from "react";
import { Upload, FileText, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
const ACCEPTED_TYPE = "application/pdf";

interface AttachedFile {
  id: string;
  name: string;
  sizeLabel: string;
  file: File;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ESignatureDocumentsSection() {
  const [queueSign, setQueueSign] = useState(true);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  // Tracks nested dragenter/dragleave pairs so the highlight doesn't flicker
  // when the pointer passes over child elements inside the dropzone.
  const dragCounter = useRef(0);

  function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const accepted: AttachedFile[] = [];
    const rejected: string[] = [];

    Array.from(fileList).forEach((file) => {
      if (
        file.type !== ACCEPTED_TYPE &&
        !file.name.toLowerCase().endsWith(".pdf")
      ) {
        rejected.push(`${file.name} (only PDF files are accepted)`);
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        rejected.push(`${file.name} (exceeds 25MB)`);
        return;
      }
      accepted.push({
        id: crypto.randomUUID(),
        name: file.name,
        sizeLabel: formatBytes(file.size),
        file,
      });
    });

    if (accepted.length) {
      setAttachments((prev) => [...prev, ...accepted]);
    }
    setError(
      rejected.length ? `Couldn't attach: ${rejected.join(", ")}` : null,
    );
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  function openFileBrowser() {
    fileInputRef.current?.click();
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 font-bold text-xs">
            5
          </span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            E-Signature & Documents
          </h3>
        </div>
        <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
          🟢 Legalese-Sign Ready
        </span>
      </div>

      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={queueSign}
          onChange={(e) => setQueueSign(e.target.checked)}
          className="mt-0.5 accent-violet-600"
        />
        <span className="text-xs text-muted-foreground leading-snug">
          Queue for FinConnex E-Signature dispatch: Immediately issue an
          electronic signature invitation with biometric audit trail to{" "}
          <span className="text-violet-600 font-medium">
            m.vance@harbourloans.com
          </span>{" "}
          upon saving.
        </span>
      </label>

      {/* File Dropzone */}
      <div
        role="button"
        tabIndex={0}
        onClick={openFileBrowser}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openFileBrowser();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          dragCounter.current += 1;
          if (e.dataTransfer.types.includes("Files")) setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          dragCounter.current = Math.max(0, dragCounter.current - 1);
          if (dragCounter.current === 0) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          dragCounter.current = 0;
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer space-y-2 outline-none",
          dragging
            ? "border-violet-500 bg-violet-500/10"
            : "border-border hover:border-violet-500/50 bg-muted/20",
        )}
      >
        <div
          className={cn(
            "mx-auto w-10 h-10 flex items-center justify-center rounded-full transition-colors",
            dragging
              ? "bg-violet-500 text-white"
              : "bg-violet-500/10 text-violet-600",
          )}
        >
          <Upload className="h-4.5 w-4.5" />
        </div>
        <div>
          <p className="text-xs font-bold text-foreground">
            Attach Custom Schedule A / Scope Document{" "}
            <span className="text-violet-600 font-normal">(PDF)</span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            {dragging
              ? "Drop to attach"
              : "Drag & drop here, or click to browse files up to 25MB"}
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            addFiles(e.target.files);
            // Reset so selecting the same file again still fires onChange.
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <p className="flex items-start gap-1.5 text-[11px] text-rose-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {error}
        </p>
      )}

      {attachments.length > 0 && (
        <ul className="space-y-1.5">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-violet-600" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">
                    {a.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {a.sizeLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeAttachment(a.id)}
                className="shrink-0 text-muted-foreground hover:text-rose-600"
                aria-label={`Remove ${a.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

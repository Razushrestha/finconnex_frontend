"use client";

import { useRef, useState } from "react";
import {
  Upload,
  FileText,
  X,
  AlertCircle,
  MoreVertical,
  Edit2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

interface AttachedFile {
  id: string;
  name: string;
  displayName: string;
  extension: string;
  sizeLabel: string;
  file: File;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ESignatureDocumentsSectionProps {
  queueSign: boolean;
  onQueueChange: (val: boolean) => void;
  signatoryEmail: string;
}

export function ESignatureDocumentsSection({
  queueSign,
  onQueueChange,
  signatoryEmail,
}: ESignatureDocumentsSectionProps) {
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const accepted: AttachedFile[] = [];
    const rejected: string[] = [];

    Array.from(fileList).forEach((file) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        rejected.push(`${file.name} (exceeds 25MB)`);
        return;
      }
      const lastDot = file.name.lastIndexOf(".");
      const ext =
        lastDot !== -1
          ? file.name.substring(lastDot + 1).toUpperCase()
          : "FILE";
      const baseName =
        lastDot !== -1 ? file.name.substring(0, lastDot) : file.name;

      accepted.push({
        id: crypto.randomUUID(),
        name: file.name,
        displayName: baseName,
        extension: ext,
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

  function updateDisplayName(id: string, newName: string) {
    setAttachments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, displayName: newName } : a)),
    );
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
            Document File <span className="text-rose-500">*</span>
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
          onChange={(e) => onQueueChange(e.target.checked)}
          className="mt-0.5 accent-violet-600 cursor-pointer"
        />
        <span className="text-xs text-muted-foreground leading-snug">
          Queue for FinConnex E-Signature dispatch: Immediately issue an
          electronic signature invitation with biometric audit trail to{" "}
          <span className="text-violet-600 font-medium">
            {signatoryEmail || "recipient@client.com"}
          </span>{" "}
          upon saving.
        </span>
      </label>

      {/* Grid view showing cards and the upload dropzone box side-by-side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
        {/* Rendered Document Cards */}
        {attachments.map((a) => (
          <div
            key={a.id}
            className="flex flex-col rounded-2xl border-2 border-violet-500/40 bg-background shadow-sm overflow-hidden relative group transition-all"
          >
            {/* Top Preview Section */}
            <div className="p-4 flex flex-col items-center justify-center relative bg-muted/20 min-h-[140px]">
              <button
                type="button"
                onClick={() => removeAttachment(a.id)}
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-muted/80 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 flex items-center justify-center transition-colors cursor-pointer"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Document Thumbnail Graphic */}
              <div className="w-20 h-24 rounded-lg bg-card border border-border shadow-md flex flex-col items-center justify-center relative text-violet-600">
                <FileText className="w-8 h-8 opacity-80" />
                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-foreground text-background text-[9px] font-extrabold rounded uppercase tracking-wider">
                  {a.extension}
                </div>
              </div>
            </div>

            {/* Bottom Title & Edit Bar */}
            <div className="px-4 py-3 border-t border-border flex items-center justify-between bg-card gap-2">
              {editingId === a.id ? (
                <input
                  type="text"
                  autoFocus
                  value={a.displayName}
                  onChange={(e) => updateDisplayName(a.id, e.target.value)}
                  onBlur={() => setEditingId(null)}
                  onKeyDown={(e) => e.key === "Enter" && setEditingId(null)}
                  className="text-xs font-semibold bg-muted px-2 py-1 rounded w-full outline-none text-foreground border border-violet-500"
                />
              ) : (
                <span className="text-xs font-semibold text-foreground truncate">
                  {a.displayName}
                </span>
              )}

              <button
                type="button"
                onClick={() => setEditingId(a.id)}
                className="p-1 rounded text-muted-foreground hover:text-violet-600 transition-colors cursor-pointer shrink-0"
                title="Rename file"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {/* Drag & Drop Box to Add More Documents */}
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
            "border-2 border-dashed rounded-2xl p-6 text-center transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[195px] space-y-3 outline-none bg-muted/10",
            dragging
              ? "border-violet-500 bg-violet-500/10"
              : "border-border hover:border-violet-500/50",
          )}
        >
          <div
            className={cn(
              "w-10 h-10 flex items-center justify-center rounded-full transition-colors",
              dragging
                ? "bg-violet-500 text-white"
                : "bg-violet-500/10 text-violet-600",
            )}
          >
            <Upload className="h-5 w-5" />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold text-foreground">Drag files here</p>
            <p className="text-[11px] text-muted-foreground">or</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 text-xs font-medium bg-card text-foreground border border-border rounded-xl shadow-sm">
              Upload from computer
            </span>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {error && (
        <p className="flex items-start gap-1.5 text-[11px] text-rose-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {error}
        </p>
      )}
    </div>
  );
}

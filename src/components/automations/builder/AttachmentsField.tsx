"use client";

/**
 * File upload for an action's `attachmentKeys`.
 *
 * The field previously took a comma-separated list of raw storage keys —
 * `workspaces/<uuid>/uploads/1718700000000-a1b2c3d4-proposal.pdf` — which
 * nobody can produce without uploading the file somewhere else first. This
 * uploads through the same `POST /v1/storage/upload` the rest of the app
 * uses and keeps only the returned key, which is what the action sends.
 *
 * Keys saved before this (or through the API) still round-trip: an entry
 * whose file name cannot be recovered is shown by its key rather than
 * dropped.
 */

import { useRef, useState } from "react";
import { Loader2, Paperclip, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { uploadCrmStorageFile } from "@/lib/storage/api";

/** The tail of a storage key is `<timestamp>-<id>-<original name>`. */
function fileNameFromKey(key: string): string {
  const tail = key.split("/").pop() ?? key;
  const match = /^\d+-[0-9a-z]+-(.+)$/i.exec(tail);
  return match ? match[1] : tail;
}

export function AttachmentsField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (keys: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    const uploaded: string[] = [];
    const failed: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const stored = await uploadCrmStorageFile(file);
        uploaded.push(stored.key);
      } catch {
        // Keep going: one rejected file should not discard the others that
        // uploaded cleanly in the same batch.
        failed.push(file.name);
      }
    }
    if (uploaded.length) onChange([...value, ...uploaded]);
    if (failed.length) {
      setError(
        `Could not upload ${failed.join(", ")}. Check the file size and that storage is configured.`
      );
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="space-y-1.5">
          {value.map((key) => (
            <li
              key={key}
              className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2"
            >
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span
                className="min-w-0 flex-1 truncate text-sm text-slate-700"
                title={key}
              >
                {fileNameFromKey(key)}
              </span>
              <button
                type="button"
                onClick={() => onChange(value.filter((item) => item !== key))}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                aria-label={`Remove ${fileNameFromKey(key)}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={(event) => void onFiles(event.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="gap-1.5"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        {busy ? "Uploading..." : "Upload files"}
      </Button>

      {error && <p className="text-xs text-rose-500">{error}</p>}
      <p className="text-xs text-slate-400">
        Files are uploaded now and attached each time this step runs.
      </p>
    </div>
  );
}

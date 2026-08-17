"use client";

import { useRef, useState } from "react";
import { Paperclip, X, UploadCloud } from "lucide-react";

interface AttachmentUploadProps {
  files: File[];
  onChange: (files: File[]) => void;
  /** When set, rejects files larger than this limit. Omit for no limit. */
  maxSizeMb?: number;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function AttachmentUpload({
  files,
  onChange,
  maxSizeMb,
}: AttachmentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addFiles(incoming: FileList | File[]) {
    const list = Array.from(incoming).filter((file) => file.name || file.size > 0);
    if (!list.length) return;

    if (maxSizeMb !== undefined) {
      const tooBig = list.find((file) => file.size > maxSizeMb * 1024 * 1024);
      if (tooBig) {
        setError(`"${tooBig.name}" exceeds ${maxSizeMb}MB limit`);
        return;
      }
    }

    setError(null);
    const existingKeys = new Set(files.map((file) => `${file.name}-${file.size}`));
    const merged = [
      ...files,
      ...list.filter((file) => !existingKeys.has(`${file.name}-${file.size}`)),
    ];
    onChange(merged);
  }

  function openFilePicker() {
    inputRef.current?.click();
  }

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  function handleDragEnter(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current += 1;
    setDragActive(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setDragActive(false);
    }
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    setDragActive(true);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = 0;
    setDragActive(false);
    if (event.dataTransfer.files?.length) {
      addFiles(event.dataTransfer.files);
    }
    event.dataTransfer.clearData();
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={openFilePicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openFilePicker();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-1.5 rounded-md border border-dashed px-4 py-6 text-center cursor-pointer transition-colors ${
          dragActive
            ? "border-violet-400 bg-violet-50"
            : "border-gray-300 bg-gray-50 hover:bg-gray-100"
        }`}
      >
        <UploadCloud
          className={`h-5 w-5 ${dragActive ? "text-violet-500" : "text-gray-400"}`}
        />
        <p className="text-sm text-gray-600">
          <span className="font-medium text-violet-700">Click to upload</span> or
          drag and drop
        </p>
        <p className="text-xs text-gray-400">Any file type and size</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files?.length) {
              addFiles(event.target.files);
            }
            event.target.value = "";
          }}
        />
      </div>

      {error ? <p className="mt-1.5 text-xs text-red-500">{error}</p> : null}

      {files.length > 0 ? (
        <ul
          className="mt-2 space-y-1.5"
          onClick={(event) => event.stopPropagation()}
        >
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-1.5 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2 text-gray-700">
                <Paperclip className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                <span className="truncate">{file.name}</span>
                <span className="shrink-0 text-xs text-gray-400">
                  {formatBytes(file.size)}
                </span>
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  removeFile(index);
                }}
                className="ml-2 shrink-0 text-gray-400 hover:text-red-500"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

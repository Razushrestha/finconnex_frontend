"use client";

import { useRef, useState } from "react";
import { Paperclip, X, UploadCloud } from "lucide-react";

interface AttachmentUploadProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxSizeMb?: number;
  accept?: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentUpload({
  files,
  onChange,
  maxSizeMb = 10,
  accept,
}: AttachmentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addFiles(incoming: FileList | File[]) {
    const list = Array.from(incoming);
    const tooBig = list.find((f) => f.size > maxSizeMb * 1024 * 1024);
    if (tooBig) {
      setError(`"${tooBig.name}" exceeds ${maxSizeMb}MB limit`);
      return;
    }
    setError(null);
    // de-dupe by name+size
    const existingKeys = new Set(files.map((f) => `${f.name}-${f.size}`));
    const merged = [
      ...files,
      ...list.filter((f) => !existingKeys.has(`${f.name}-${f.size}`)),
    ];
    onChange(merged);
  }

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-1.5 rounded-md border border-dashed px-4 py-6 text-center cursor-pointer transition-colors ${
          dragActive
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 bg-gray-50 hover:bg-gray-100"
        }`}
      >
        <UploadCloud className="h-5 w-5 text-gray-400" />
        <p className="text-sm text-gray-600">
          <span className="text-blue-600 font-medium">Click to upload</span> or
          drag and drop
        </p>
        <p className="text-xs text-gray-400">Any file up to {maxSizeMb}MB</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}

      {files.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${file.size}-${i}`}
              className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-1.5 text-sm"
            >
              <span className="flex items-center gap-2 min-w-0 text-gray-700">
                <Paperclip className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                <span className="truncate">{file.name}</span>
                <span className="shrink-0 text-xs text-gray-400">
                  {formatBytes(file.size)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="ml-2 shrink-0 text-gray-400 hover:text-red-500"
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

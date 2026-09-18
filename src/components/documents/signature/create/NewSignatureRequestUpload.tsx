"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  FileStack,
  LayoutTemplate,
  Upload,
  Users,
  PenLine,
  Send,
} from "lucide-react";
import { CloudImportMenu } from "./CloudImportMenu";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const STEPS = [
  { id: 1, label: "Upload", icon: Upload },
  { id: 2, label: "Recipients", icon: Users },
  { id: 3, label: "Place fields", icon: PenLine },
  { id: 4, label: "Send", icon: Send },
] as const;

interface NewSignatureRequestUploadProps {
  mode: "send" | "self";
  onFiles: (files: File[]) => void;
  onImportFromGoogleDrive: () => void;
  onImportFromOneDrive: () => void;
  error?: string;
}

export function NewSignatureRequestUpload({
  mode,
  onFiles,
  onImportFromGoogleDrive,
  onImportFromOneDrive,
  error,
}: NewSignatureRequestUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const title = mode === "self" ? "Sign yourself" : "Send for signature";
  const subtitle =
    mode === "self"
      ? "Upload a document, place your signature fields, and sign it yourself."
      : "Upload documents, add recipients, place fields, and send for signature.";

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files ?? []).filter((file) =>
      /\.(pdf|docx?)$/i.test(file.name),
    );
    if (files.length === 0) {
      onFiles(Array.from(event.dataTransfer.files ?? []));
      return;
    }
    onFiles(files);
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          E-Signature
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="max-w-2xl text-sm text-slate-500">{subtitle}</p>
      </div>

      <ol className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const active = step.id === 1;
          return (
            <li key={step.id} className="flex items-center gap-2">
              {index > 0 ? (
                <span className="mx-1 hidden h-px w-6 bg-slate-200 sm:block" />
              ) : null}
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                  active
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-500",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Add document(s)
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Drag files here, upload from your computer, import from cloud, or
              start from a template.
            </p>
          </div>
        </div>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsDragging(false);
          }}
          onDrop={handleDrop}
          className={cn(
            "flex min-h-[360px] flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-slate-200 bg-slate-50/60 hover:border-slate-300",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            multiple
            className="hidden"
            onChange={(event) => {
              onFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />

          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <FileStack className="h-8 w-8 text-slate-400" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-medium text-slate-800">
              Drag and drop files here
            </p>
            <p className="text-xs text-slate-400">
              PDF, DOC, or DOCX · up to 25 MB per file
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary/90"
            >
              Upload from computer
            </button>
            <CloudImportMenu
              onImportFromGoogleDrive={onImportFromGoogleDrive}
              onImportFromOneDrive={onImportFromOneDrive}
            />
            <Link
              href="/signature/templates"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-50"
            >
              <LayoutTemplate className="h-3.5 w-3.5 text-primary" />
              Use template
            </Link>
          </div>
        </div>

        {error ? <p className="mt-3 text-xs text-rose-500">{error}</p> : null}
      </div>
    </div>
  );
}

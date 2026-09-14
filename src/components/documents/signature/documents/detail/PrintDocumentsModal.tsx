"use client";

import { X } from "lucide-react";
import { useState } from "react";
import type { PrintDocumentsMode } from "@/lib/documents/signature/print-documents";

const PRINT_GREEN = "#1B9E6B";

export type { PrintDocumentsMode };

export function PrintDocumentsModal({
  onClose,
  onPrint,
}: {
  onClose: () => void;
  onPrint: (mode: PrintDocumentsMode) => void;
}) {
  const [mode, setMode] = useState<PrintDocumentsMode>("documents");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div
        className="w-full max-w-[560px] overflow-hidden rounded-lg bg-white shadow-2xl"
        role="dialog"
        aria-labelledby="print-documents-title"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h2
            id="print-documents-title"
            className="text-[16px] font-medium text-slate-800"
          >
            Print documents
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-6">
          <p className="text-[15px] text-slate-800">
            Choose an option below to print the corresponding files.
          </p>
          <div className="mt-5 space-y-3">
            <PrintOption
              checked={mode === "documents"}
              label="Document(s) alone"
              onSelect={() => setMode("documents")}
            />
            <PrintOption
              checked={mode === "documents-and-certificate"}
              label="Document(s) and Certificate of completion"
              onSelect={() => setMode("documents-and-certificate")}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-9 min-w-[72px] rounded-md border border-slate-300 bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => onPrint(mode)}
            className="h-9 min-w-[72px] rounded-md px-4 text-[13px] font-medium text-white hover:opacity-90"
            style={{ backgroundColor: PRINT_GREEN }}
          >
            Print
          </button>
        </div>
      </div>
    </div>
  );
}

function PrintOption({
  checked,
  label,
  onSelect,
}: {
  checked: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-[14px] text-slate-800">
      <span
        className="relative flex h-4 w-4 shrink-0 items-center justify-center rounded-full border"
        style={{
          borderColor: checked ? PRINT_GREEN : "#94a3b8",
          backgroundColor: checked ? PRINT_GREEN : "white",
        }}
      >
        <input
          type="radio"
          name="print-documents-mode"
          checked={checked}
          onChange={onSelect}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        {checked ? (
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
        ) : null}
      </span>
      {label}
    </label>
  );
}

"use client";

import { useEffect } from "react";
import { Download, FileText, X } from "lucide-react";
import { getCachedRequestFile } from "@/lib/documents/requests/pack";
import type { RequestedDocLine } from "@/lib/documents/requests/types";

export function ViewDocumentModal({
  requestId,
  item,
  onClose,
  onDownload,
}: {
  requestId: string;
  item: RequestedDocLine;
  onClose: () => void;
  onDownload: () => void;
}) {
  const cached = getCachedRequestFile(requestId, item.id);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="view-document-title"
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div className="min-w-0">
            <h2
              id="view-document-title"
              className="truncate text-[15px] font-bold text-slate-900"
            >
              {item.title}
            </h2>
            <p className="truncate text-[12px] text-slate-500">
              {item.fileName ?? "No file"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="min-h-[320px] flex-1 bg-slate-50 p-4">
          {cached?.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cached.url}
              alt={item.fileName ?? item.title}
              className="mx-auto max-h-[60vh] rounded-lg object-contain"
            />
          ) : cached?.kind === "pdf" ? (
            <iframe
              title={item.fileName ?? item.title}
              src={cached.url}
              className="h-[60vh] w-full rounded-lg bg-white"
            />
          ) : (
            <div className="flex h-[60vh] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white text-center">
              <FileText className="h-10 w-10 text-slate-300" />
              <p className="mt-3 text-[13px] font-semibold text-slate-800">
                {item.fileName ?? item.title}
              </p>
              <p className="mt-1 max-w-sm text-[12px] text-slate-500">
                Preview is available after the file is uploaded in this session.
                You can still download the received file.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

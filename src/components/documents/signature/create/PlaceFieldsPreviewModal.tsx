"use client";

import dynamic from "next/dynamic";
import { FileText, Loader2, PenLine, Send, X } from "lucide-react";
import type { PlacedField } from "@/components/documents/signature/create/PdfFieldEditor";
import type { SignatureSigner } from "@/lib/documents/signature/types";
import { SIGNER_COLORS } from "@/lib/documents/signature/types";

const PdfFieldEditor = dynamic(
  () => import("@/components/documents/signature/create/PdfFieldEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-16 text-xs text-slate-400">
        Loading PDF…
      </div>
    ),
  },
);

type PreviewDocument = {
  id: string;
  name: string;
  file: File | null;
  fileUrl: string;
  docHtmlContent: string;
};

function pluralize(label: string, count: number) {
  if (count === 1) return label;
  if (label.toLowerCase().endsWith("s")) return label;
  return `${label}s`;
}

function countsByType(fields: PlacedField[]) {
  const map = new Map<string, { label: string; count: number }>();
  for (const field of fields) {
    const key = field.type || field.label;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, { label: field.label || field.type, count: 1 });
    }
  }
  return [...map.values()];
}

function joinFieldCounts(counts: { label: string; count: number }[]) {
  const parts = counts.map(
    (item) => `${item.count} ${pluralize(item.label, item.count)}`,
  );
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

const isPdfDocument = (file: File | null, name: string) =>
  file?.type === "application/pdf" ||
  Boolean(file?.name.endsWith(".pdf")) ||
  name.toLowerCase().endsWith(".pdf");

export function PlaceFieldsPreviewModal({
  documents,
  placedFields,
  recipients,
  isTemplate = false,
  isSubmitting = false,
  onClose,
  onConfirm,
}: {
  documents: PreviewDocument[];
  placedFields: PlacedField[];
  recipients: SignatureSigner[];
  isTemplate?: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const totals = countsByType(placedFields);
  const summary = joinFieldCounts(totals);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="flex h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <aside className="flex w-[280px] shrink-0 flex-col border-r border-slate-200 bg-slate-50">
          <div className="border-b border-slate-200 px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
              Signer preview
            </p>
            <h2 className="mt-1 text-sm font-semibold text-slate-900">
              What needs to be completed
            </h2>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <p className="text-xs leading-relaxed text-slate-600">
              {placedFields.length === 0
                ? "No signature, date, or other fields have been placed yet. Recipients will not have anything to complete."
                : `The recipient needs to complete ${summary} on ${
                    documents.length === 1
                      ? "this document"
                      : `these ${documents.length} documents`
                  }.`}
            </p>

            {totals.length > 0 ? (
              <ul className="space-y-1.5">
                {totals.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <span className="font-medium text-slate-800">
                      {pluralize(item.label, item.count)}
                    </span>
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                      {item.count}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {recipients.map((recipient, index) => {
              const theirs = placedFields.filter(
                (field) => field.recipientId === recipient.id,
              );
              const color =
                SIGNER_COLORS[recipient.colorIndex ?? index % SIGNER_COLORS.length];
              const theirsSummary = joinFieldCounts(countsByType(theirs));
              return (
                <div
                  key={recipient.id}
                  className="rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${color.bg} ${color.text}`}
                    >
                      {(recipient.name || recipient.email || "?").slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900">
                        {recipient.name || recipient.email || "Recipient"}
                      </p>
                      {recipient.email ? (
                        <p className="truncate text-[10px] text-slate-500">
                          {recipient.email}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
                    {theirs.length === 0
                      ? "No fields assigned yet."
                      : `Needs to sign / complete ${theirsSummary}.`}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="space-y-2 border-t border-slate-200 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-75"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {isTemplate ? "Saving..." : "Sending..."}
                </>
              ) : (
                <>
                  {isTemplate ? "Confirm and save" : "Confirm and send"}
                  <Send className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <PenLine className="h-4 w-4 text-indigo-600" />
              Document preview
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-slate-100 p-4">
            <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6">
              {documents.map((doc) => (
                <section
                  key={doc.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    <h3 className="truncate text-xs font-semibold text-slate-800">
                      {doc.name}
                    </h3>
                  </div>
                  <div className="p-4">
                    {doc.fileUrl && isPdfDocument(doc.file, doc.name) ? (
                      <PdfFieldEditor
                        documentId={doc.id}
                        fileUrl={doc.fileUrl}
                        placedFields={placedFields}
                        draggingFieldType={null}
                        pageWidth={680}
                        readOnly
                        onDropField={() => undefined}
                        onRepositionField={() => undefined}
                        onRemoveField={() => undefined}
                      />
                    ) : doc.docHtmlContent ? (
                      <div
                        className="prose prose-sm max-w-none text-slate-800"
                        dangerouslySetInnerHTML={{ __html: doc.docHtmlContent }}
                      />
                    ) : (
                      <p className="py-10 text-center text-xs text-slate-400">
                        Preview is not available for this file.
                      </p>
                    )}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

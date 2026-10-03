"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import type { PlacedField } from "@/components/documents/signature/create/PdfFieldEditor";
import {
  PREFILL_RECIPIENT_ID,
  type SignatureSigner,
} from "@/lib/documents/signature/types";

export function ConfirmSendDetailsModal({
  recipients,
  placedFields,
  isTemplate = false,
  isSubmitting = false,
  onCancel,
  onConfirm,
}: {
  recipients: SignatureSigner[];
  placedFields: PlacedField[];
  isTemplate?: boolean;
  isSubmitting?: boolean;
  onCancel: () => void;
  onConfirm: (signAfterSending: boolean) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [signAfterSending, setSignAfterSending] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  const rows = recipients.map((recipient) => ({
    id: recipient.id,
    label:
      recipient.email?.trim() ||
      recipient.name?.trim() ||
      "Unnamed recipient",
    fields: placedFields.filter((field) => field.recipientId === recipient.id)
      .length,
  }));

  const prefillCount = placedFields.filter(
    (field) => field.recipientId === PREFILL_RECIPIENT_ID,
  ).length;
  if (prefillCount > 0) {
    rows.unshift({
      id: PREFILL_RECIPIENT_ID,
      label: "Prefill by you",
      fields: prefillCount,
    });
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close overlay"
        className="absolute inset-0 bg-black/50"
        onClick={isSubmitting ? undefined : onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-send-title"
        className="relative z-10 w-full max-w-[640px] rounded-lg bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2
            id="confirm-send-title"
            className="text-[20px] font-semibold text-slate-800"
          >
            Confirm details
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 pb-5">
          <p className="text-[14px] text-slate-700">
            Please verify the number of fields added for each recipient and
            confirm
          </p>

          <div className="mt-5 overflow-hidden rounded-md border border-slate-200">
            <div className="grid grid-cols-[minmax(0,1fr)_96px] bg-[#eceff1] px-4 py-2.5 text-[13px] font-medium text-slate-600">
              <span>Recipient</span>
              <span className="text-right">Fields</span>
            </div>
            {rows.length === 0 ? (
              <div className="px-4 py-3 text-[13px] text-slate-500">
                No recipients added
              </div>
            ) : (
              rows.map((row, index) => (
                <div
                  key={row.id}
                  className={`grid grid-cols-[minmax(0,1fr)_96px] bg-white px-4 py-3.5 text-[13px] text-slate-800 ${
                    index > 0 ? "border-t border-slate-100" : ""
                  }`}
                >
                  <span className="truncate">{row.label}</span>
                  <span className="text-right tabular-nums">{row.fields}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-5">
          {isTemplate ? (
            <span />
          ) : (
            <label className="inline-flex items-center gap-2 text-[13px] text-slate-800">
              <input
                type="checkbox"
                checked={signAfterSending}
                onChange={(event) => setSignAfterSending(event.target.checked)}
                disabled={isSubmitting}
                className="h-4 w-4 rounded border-slate-300 accent-[#12875a]"
              />
              Sign the document right after sending
            </label>
          )}
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="h-9 rounded-md border border-slate-300 bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(signAfterSending)}
              disabled={isSubmitting}
              className="inline-flex h-9 min-w-[112px] items-center justify-center rounded-md bg-[#12875a] px-4 text-[13px] font-semibold text-white hover:bg-[#0f734d] disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : isTemplate ? (
                "Confirm and save"
              ) : (
                "Save & sign"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

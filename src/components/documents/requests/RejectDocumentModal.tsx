"use client";

import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";

export function RejectDocumentModal({
  title,
  onClose,
  onConfirm,
}: {
  title: string;
  onClose: () => void;
  onConfirm: (reason: string, notifyClient: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const [notifyClient, setNotifyClient] = useState(false);

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
        aria-labelledby="reject-document-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[440px] rounded-2xl bg-white px-6 pt-6 pb-5 shadow-xl"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
        <h2
          id="reject-document-title"
          className="pr-8 text-[18px] font-bold text-slate-900"
        >
          Reject document
        </h2>
        <p className="mt-1 text-[13px] text-slate-500">{title}</p>
        <label className="mt-4 block text-[13px] font-semibold text-slate-900">
          Reason for the client
        </label>
        <textarea
          autoFocus
          value={reason}
          rows={4}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain what is missing or what to upload instead…"
          className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-[13px] leading-relaxed text-slate-800 outline-none focus:border-[#5A32A3]/45 focus:ring-2 focus:ring-[#5A32A3]/12"
        />
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
          <input
            type="checkbox"
            checked={notifyClient}
            onChange={(e) => setNotifyClient(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-[#5A32A3]"
          />
          Notify client
          <span
            className="relative inline-flex"
            title="notify client via email"
          >
            <span className="peer flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <Info className="h-3 w-3" />
            </span>
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden w-max -translate-x-1/2 rounded-md bg-slate-800 px-2 py-1 text-[11px] font-medium text-white shadow-sm peer-hover:block">
              notify client via email
            </span>
          </span>
        </label>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-10 min-w-[96px] rounded-lg border border-slate-300 bg-white px-5 text-[13px] font-semibold text-slate-800 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason.trim(), notifyClient)}
            className="h-10 min-w-[96px] rounded-lg bg-rose-600 px-5 text-[13px] font-semibold text-white hover:bg-rose-700 disabled:opacity-40"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

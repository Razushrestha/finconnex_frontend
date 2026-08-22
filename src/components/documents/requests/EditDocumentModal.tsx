"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const DESC_MAX = 400;

export function EditDocumentModal({
  title,
  description,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: (description: string, applyToTemplates: boolean) => void;
}) {
  const [value, setValue] = useState(description);
  const [applyToTemplates, setApplyToTemplates] = useState(false);

  useEffect(() => {
    setValue(description);
    setApplyToTemplates(false);
  }, [description]);

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
        aria-labelledby="edit-document-title"
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
          id="edit-document-title"
          className="text-center text-[18px] font-bold text-slate-900"
        >
          Edit document
        </h2>
        <p className="mt-1 text-center text-[13px] text-slate-500">{title}</p>

        <label className="mt-5 block text-[13px] font-semibold text-slate-900">
          Description
        </label>
        <div className="relative mt-1.5">
          <textarea
            autoFocus
            value={value}
            maxLength={DESC_MAX}
            rows={5}
            onChange={(e) => setValue(e.target.value.slice(0, DESC_MAX))}
            className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 pb-7 text-[13px] leading-relaxed text-slate-800 outline-none focus:border-[#5A32A3]/45 focus:ring-2 focus:ring-[#5A32A3]/12"
          />
          <span className="pointer-events-none absolute right-2.5 bottom-2 text-[11px] text-slate-400">
            {value.length}/{DESC_MAX}
          </span>
        </div>

        <label className="mt-3 flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={applyToTemplates}
            onChange={(e) => setApplyToTemplates(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#5A32A3] accent-[#5A32A3]"
          />
          <span>
            <span className="block text-[13px] font-medium text-slate-800">
              Apply changes to main templates
            </span>
            <span className="mt-0.5 block text-[12px] leading-snug text-slate-500">
              Updates this document everywhere. Leave unchecked to change this
              request only.
            </span>
          </span>
        </label>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-10 min-w-[96px] rounded-lg border border-slate-300 bg-white px-5 text-[13px] font-semibold text-slate-800 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(value.trim(), applyToTemplates)}
            className="h-10 min-w-[96px] rounded-lg bg-slate-900 px-5 text-[13px] font-semibold text-white hover:bg-slate-800"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

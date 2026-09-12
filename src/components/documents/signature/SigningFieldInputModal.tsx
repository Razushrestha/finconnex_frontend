"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { SignatureField } from "@/lib/documents/signature/types";
import { fieldKindLabel } from "@/lib/documents/signature/types";
import {
  DEFAULT_CHOICE_OPTIONS,
  signingFieldAction,
} from "@/lib/documents/signature/field-kinds";

function todayInputValue() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDisplayDate(iso: string) {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function SigningFieldInputModal({
  field,
  signerName,
  signerEmail,
  onClose,
  onSave,
}: {
  field: SignatureField;
  signerName: string;
  signerEmail: string;
  onClose: () => void;
  onSave: (value: string) => void;
}) {
  const action = signingFieldAction(field.kind);
  const options = field.options?.length ? field.options : DEFAULT_CHOICE_OPTIONS;

  const initial = useMemo(() => {
    if (action === "date") {
      if (field.value && /^\d{4}-\d{2}-\d{2}$/.test(field.value)) {
        return field.value;
      }
      return todayInputValue();
    }
    if (field.value) return field.value.replace(/^file:/, "");
    if (field.kind === "name") return signerName;
    if (field.kind === "email") return signerEmail;
    return "";
  }, [action, field.kind, field.value, signerEmail, signerName]);

  const [value, setValue] = useState(initial);
  const [error, setError] = useState("");

  useEffect(() => {
    setValue(initial);
    setError("");
  }, [field.id, initial]);

  const title =
    field.label?.trim() || fieldKindLabel(field.kind) || "Complete field";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (action === "file") {
      setError("Choose a file first.");
      return;
    }
    const next = value.trim();
    if (!next) {
      setError("Enter a value to continue.");
      return;
    }
    onSave(action === "date" ? formatDisplayDate(next) : next);
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (field.kind === "image" && !file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (field.kind === "attachment") {
      onSave(`file:${file.name}`);
      return;
    }
    const dataUrl = await readFile(file);
    onSave(dataUrl);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-600">
              Field
            </p>
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {action === "date" ? (
          <input
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
          />
        ) : null}

        {action === "text" ? (
          <input
            type={field.kind === "email" ? "email" : field.kind === "payment" ? "text" : "text"}
            inputMode={field.kind === "payment" ? "decimal" : undefined}
            placeholder={
              field.kind === "payment"
                ? "Enter amount"
                : field.kind === "job_title"
                  ? "Enter job title"
                  : field.kind === "company"
                    ? "Enter company"
                    : "Enter text"
            }
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
            autoFocus
          />
        ) : null}

        {action === "choice" && field.kind === "dropdown" ? (
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
          >
            <option value="">Select an option</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : null}

        {action === "choice" && field.kind === "radio" ? (
          <div className="space-y-2">
            {options.map((opt) => (
              <label
                key={opt}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <input
                  type="radio"
                  name={`field-${field.id}`}
                  checked={value === opt}
                  onChange={() => setValue(opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        ) : null}

        {action === "file" ? (
          <input
            type="file"
            accept={field.kind === "image" ? "image/*" : undefined}
            onChange={(e) => void handleFile(e.target.files?.[0])}
            className="w-full text-sm"
          />
        ) : null}

        {error ? (
          <p className="mt-2 text-[11px] font-semibold text-rose-600">{error}</p>
        ) : null}

        {action !== "file" ? (
          <button
            type="submit"
            className="mt-4 h-11 w-full rounded-xl bg-violet-600 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Apply
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="mt-4 h-11 w-full rounded-xl border border-slate-200 text-sm font-semibold text-slate-600"
          >
            Cancel
          </button>
        )}
      </form>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, ChevronDown, Send, Trash2, Search, X } from "lucide-react";
import type { EmailStatus } from "@/lib/emails/types";

interface CreateEmailFormProps {
  layoutId: string;
  redirect: boolean;
}

interface EmailFormState {
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  relatedTo: string;
  templateUsed: string;
}

const initialState: EmailFormState = {
  from: "bishnu@nepatronix.com",
  to: [],
  cc: [],
  bcc: [],
  subject: "",
  body: "",
  relatedTo: "",
  templateUsed: "",
};

const EMAIL_TEMPLATES = [
  "-None-",
  "Follow-up Template",
  "Intro Template",
  "Meeting Recap",
];

function RecipientField({
  label,
  values,
  onChange,
  autoFocus,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  autoFocus?: boolean;
}) {
  const [draft, setDraft] = useState("");

  function commitDraft() {
    const trimmed = draft.trim().replace(/,$/, "");
    if (trimmed) {
      onChange([...values, trimmed]);
    }
    setDraft("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitDraft();
    } else if (e.key === "Backspace" && draft === "" && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 px-4 py-2">
      <span className="shrink-0 text-sm text-slate-400">{label}</span>
      {values.map((address, i) => (
        <span
          key={`${address}-${i}`}
          className="flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pl-2.5 pr-1 text-xs text-slate-700"
        >
          {address}
          <button
            type="button"
            onClick={() => onChange(values.filter((_, idx) => idx !== i))}
            aria-label={`Remove ${address}`}
            className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        autoFocus={autoFocus}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commitDraft}
        placeholder={values.length === 0 ? "Recipients, comma separated" : ""}
        className="min-w-[120px] flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-300 outline-none"
      />
    </div>
  );
}

export function CreateEmailForm({ layoutId, redirect }: CreateEmailFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<EmailFormState>(initialState);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [toTouched, setToTouched] = useState(false);

  function update<K extends keyof EmailFormState>(
    key: K,
    value: EmailFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleDiscard() {
    router.back();
  }

  function persist(status: EmailStatus) {
    // TODO: wire to your actual create-email API/mutation.
    console.log("Saving email", { layoutId, redirect, status, ...form });
    router.push("/activities/emails");
  }

  function handleSend() {
    setToTouched(true);
    if (form.to.length === 0) return;
    persist("Sent");
  }

  function handleSaveDraft() {
    persist("Draft");
  }

  const toInvalid = toTouched && form.to.length === 0;

  return (
    <div className="flex min-h-screen justify-center bg-slate-100 px-4 py-6">
      <div className="flex w-full max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-slate-50 px-5 py-3">
          <h1 className="text-sm font-semibold text-slate-900">New Email</h1>
          <button
            type="button"
            onClick={handleDiscard}
            aria-label="Discard"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Compose header fields */}
        <div>
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2">
            <span className="shrink-0 text-sm text-slate-400">From</span>
            <input
              type="text"
              value={form.from}
              onChange={(e) => update("from", e.target.value)}
              className="flex-1 bg-transparent text-sm text-slate-800 outline-none"
            />
          </div>

          <div>
            <div className="flex items-center">
              <div className="flex-1">
                <RecipientField
                  label="To"
                  values={form.to}
                  onChange={(v) => update("to", v)}
                  autoFocus
                />
              </div>
              <div className="flex shrink-0 items-center gap-2 pr-4 text-xs font-medium text-slate-400">
                {!showCc && (
                  <button
                    type="button"
                    onClick={() => setShowCc(true)}
                    className="hover:text-slate-600"
                  >
                    Cc
                  </button>
                )}
                {!showBcc && (
                  <button
                    type="button"
                    onClick={() => setShowBcc(true)}
                    className="hover:text-slate-600"
                  >
                    Bcc
                  </button>
                )}
              </div>
            </div>
            {toInvalid && (
              <p className="border-b border-slate-100 px-4 pb-1.5 text-xs text-rose-500">
                Add at least one recipient before sending.
              </p>
            )}
          </div>

          {showCc && (
            <RecipientField
              label="Cc"
              values={form.cc}
              onChange={(v) => update("cc", v)}
              autoFocus
            />
          )}
          {showBcc && (
            <RecipientField
              label="Bcc"
              values={form.bcc}
              onChange={(v) => update("bcc", v)}
              autoFocus
            />
          )}

          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2">
            <input
              type="text"
              value={form.subject}
              onChange={(e) => update("subject", e.target.value)}
              placeholder="Subject"
              className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder:font-normal placeholder:text-slate-300 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="shrink-0 text-slate-400">Related To</span>
              <input
                type="text"
                value={form.relatedTo}
                onChange={(e) => update("relatedTo", e.target.value)}
                className="w-36 bg-transparent text-slate-800 outline-none"
              />
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            </div>

            <span className="h-4 w-px bg-slate-200" />

            <div className="flex items-center gap-1.5">
              <span className="shrink-0 text-slate-400">Template</span>
              <select
                value={form.templateUsed}
                onChange={(e) => update("templateUsed", e.target.value)}
                className="bg-transparent text-slate-800 outline-none"
              >
                {EMAIL_TEMPLATES.map((tpl) => (
                  <option key={tpl} value={tpl === "-None-" ? "" : tpl}>
                    {tpl}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Body */}
        <textarea
          value={form.body}
          onChange={(e) => update("body", e.target.value)}
          placeholder="Write your message…"
          className="min-h-[280px] flex-1 resize-none px-5 py-4 text-sm text-slate-800 placeholder:text-slate-300 outline-none"
        />

        {/* Footer toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-lg bg-indigo-600">
              <button
                type="button"
                onClick={handleSend}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <Send className="h-3.5 w-3.5" />
                Send
              </button>
              <button
                type="button"
                aria-label="More send options"
                className="flex items-center border-l border-indigo-500 px-2 text-white hover:bg-indigo-700"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleSaveDraft}
              className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Save as Draft
            </button>

            <button
              type="button"
              aria-label="Attach file"
              title="Attach file (coming soon)"
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50"
            >
              <Paperclip className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleDiscard}
            aria-label="Discard email"
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-slate-400 hover:bg-slate-50 hover:text-rose-500"
          >
            <Trash2 className="h-4 w-4" />
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { MessageDirection, MessageStatus } from "@/lib/messages/types";

interface CreateMessageFormProps {
  layoutId: string;
  redirect: boolean;
}

interface MessageFormState {
  relatedTo: string;
  sender: string;
  subject: string;
  content: string;
  direction: MessageDirection;
  channel: "SMS" | "WhatsApp" | "Email" | "Chat";
  status: MessageStatus;
}

const initialState: MessageFormState = {
  relatedTo: "",
  sender: "",
  subject: "",
  content: "",
  direction: "Outgoing",
  channel: "WhatsApp",
  status: "Sent",
};

function FieldRow({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-4 border-b border-slate-100 py-3 sm:grid-cols-[180px_1fr]">
      <label className="text-sm text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      <div>{children}</div>
    </div>
  );
}

export function CreateMessageForm({
  layoutId,
  redirect,
}: CreateMessageFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<MessageFormState>(initialState);
  const [contentTouched, setContentTouched] = useState(false);

  function update<K extends keyof MessageFormState>(
    key: K,
    value: MessageFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCancel() {
    router.back();
  }

  function handleSave(createAnother: boolean) {
    setContentTouched(true);
    if (!form.content.trim()) return;

    // TODO: wire to your actual create-message API/mutation.
    console.log("Saving message", { layoutId, redirect, ...form });

    if (createAnother) {
      setForm(initialState);
      setContentTouched(false);
    } else {
      router.push("/activities/messages");
    }
  }

  const contentInvalid = contentTouched && !form.content.trim();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-slate-900">
            Create Message
          </h1>
          <button
            type="button"
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            Edit Page Layout
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-lg px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Save &amp; New
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Save
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl px-4 py-6 sm:px-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">
          Message Information
        </h2>

        <FieldRow label="Related To">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1">
            <input
              type="text"
              value={form.relatedTo}
              onChange={(e) => update("relatedTo", e.target.value)}
              className="w-full bg-transparent text-sm text-slate-800 outline-none"
            />
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
          </div>
        </FieldRow>

        <FieldRow label="Sender">
          <input
            type="text"
            value={form.sender}
            onChange={(e) => update("sender", e.target.value)}
            placeholder="Type a name"
            className="w-full border-b border-transparent bg-transparent pb-1 text-sm text-slate-800 placeholder:text-slate-300 outline-none focus:border-indigo-400"
          />
        </FieldRow>

        <FieldRow label="Channel">
          <select
            value={form.channel}
            onChange={(e) =>
              update("channel", e.target.value as MessageFormState["channel"])
            }
            className="w-full bg-transparent text-sm text-slate-800 outline-none"
          >
            <option>WhatsApp</option>
            <option>SMS</option>
            <option>Email</option>
            <option>Chat</option>
          </select>
        </FieldRow>

        <FieldRow label="Direction">
          <select
            value={form.direction}
            onChange={(e) =>
              update("direction", e.target.value as MessageDirection)
            }
            className="w-full bg-transparent text-sm text-slate-800 outline-none"
          >
            <option>Outgoing</option>
            <option>Incoming</option>
          </select>
        </FieldRow>

        <FieldRow label="Subject">
          <input
            type="text"
            value={form.subject}
            onChange={(e) => update("subject", e.target.value)}
            className="w-full border-b border-transparent bg-transparent pb-1 text-sm text-slate-800 outline-none focus:border-indigo-400"
          />
        </FieldRow>

        <FieldRow label="Status">
          <select
            value={form.status}
            onChange={(e) => update("status", e.target.value as MessageStatus)}
            className="w-full bg-transparent text-sm text-slate-800 outline-none"
          >
            <option>Sent</option>
            <option>Delivered</option>
            <option>Read</option>
            <option>Failed</option>
          </select>
        </FieldRow>

        <h2 className="mb-2 mt-8 text-sm font-semibold text-slate-900">
          Content
        </h2>

        <div className="border-b border-slate-100 py-3">
          <label className="mb-2 block text-sm text-slate-500">
            Message
            <span className="ml-0.5 text-rose-500">*</span>
          </label>
          <textarea
            value={form.content}
            onChange={(e) => update("content", e.target.value)}
            onBlur={() => setContentTouched(true)}
            rows={4}
            className={`w-full resize-y rounded-md border p-2 text-sm text-slate-800 outline-none focus:ring-2 ${
              contentInvalid
                ? "border-rose-400 focus:border-rose-400 focus:ring-rose-100"
                : "border-slate-200 focus:border-indigo-300 focus:ring-indigo-100"
            }`}
          />
          {contentInvalid && (
            <p className="mt-1 text-xs text-rose-500">
              Message content is required.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, User, Search } from "lucide-react";
import type { CallStatus } from "@/lib/calls/types";

interface CreateCallFormProps {
  layoutId: string;
  redirect: boolean;
}

interface CallFormState {
  callOwner: string;
  subject: string;
  relatedTo: string;
  callType: "Outbound" | "Inbound" | "Missed";
  callStartTime: string;
  callDuration: string;
  callPurpose: string;
  status: CallStatus;
  description: string;
}

const initialState: CallFormState = {
  callOwner: "",
  subject: "",
  relatedTo: "",
  callType: "Outbound",
  callStartTime: "",
  callDuration: "",
  callPurpose: "",
  status: "Scheduled",
  description: "",
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

export function CreateCallForm({ layoutId, redirect }: CreateCallFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<CallFormState>(initialState);
  const [subjectTouched, setSubjectTouched] = useState(false);

  function update<K extends keyof CallFormState>(
    key: K,
    value: CallFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCancel() {
    router.back();
  }

  function handleSave(createAnother: boolean) {
    setSubjectTouched(true);
    if (!form.subject.trim()) return;

    // TODO: wire to your actual create-call API/mutation.
    console.log("Saving call", { layoutId, redirect, ...form });

    if (createAnother) {
      setForm(initialState);
      setSubjectTouched(false);
    } else {
      router.push("/activities/calls");
    }
  }

  const subjectInvalid = subjectTouched && !form.subject.trim();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-slate-900">
            Create Call
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
          Call Information
        </h2>

        <FieldRow label="Call Owner">
          {/*
            TODO: replace this plain text input with an employee lookup —
            once you have an endpoint for company employees, swap this for
            a searchable dropdown/combobox (e.g. filter-as-you-type against
            GET /api/employees) that sets form.callOwner to the selected
            employee's name/id instead of freeform text.
          */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-1">
            <input
              type="text"
              value={form.callOwner}
              onChange={(e) => update("callOwner", e.target.value)}
              placeholder="Type a name"
              className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-300 outline-none"
            />
            <div className="flex items-center gap-2 text-slate-400">
              <ChevronDown className="h-4 w-4" />
              <User className="h-4 w-4" />
            </div>
          </div>
        </FieldRow>

        <FieldRow label="Subject" required>
          <input
            type="text"
            value={form.subject}
            onChange={(e) => update("subject", e.target.value)}
            onBlur={() => setSubjectTouched(true)}
            className={`w-full border-b bg-transparent pb-1 text-sm text-slate-800 outline-none ${
              subjectInvalid
                ? "border-rose-400"
                : "border-transparent focus:border-indigo-400"
            }`}
          />
          {subjectInvalid && (
            <p className="mt-1 text-xs text-rose-500">Subject is required.</p>
          )}
        </FieldRow>

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

        <FieldRow label="Call Type">
          <select
            value={form.callType}
            onChange={(e) =>
              update("callType", e.target.value as CallFormState["callType"])
            }
            className="w-full bg-transparent text-sm text-slate-800 outline-none"
          >
            <option>Outbound</option>
            <option>Inbound</option>
            <option>Missed</option>
          </select>
        </FieldRow>

        <FieldRow label="Call Start Time">
          <input
            type="text"
            placeholder="DD/MM/YYYY HH:MM AM"
            value={form.callStartTime}
            onChange={(e) => update("callStartTime", e.target.value)}
            className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-300 outline-none"
          />
        </FieldRow>

        <FieldRow label="Call Duration">
          <input
            type="text"
            placeholder="e.g. 15 mins"
            value={form.callDuration}
            onChange={(e) => update("callDuration", e.target.value)}
            className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-300 outline-none"
          />
        </FieldRow>

        <FieldRow label="Call Purpose">
          <input
            type="text"
            placeholder="e.g. Prospecting"
            value={form.callPurpose}
            onChange={(e) => update("callPurpose", e.target.value)}
            className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-300 outline-none"
          />
        </FieldRow>

        <FieldRow label="Status">
          <select
            value={form.status}
            onChange={(e) => update("status", e.target.value as CallStatus)}
            className="w-full bg-transparent text-sm text-slate-800 outline-none"
          >
            <option>Scheduled</option>
            <option>Completed</option>
            <option>Missed</option>
            <option>Cancelled</option>
          </select>
        </FieldRow>

        <h2 className="mb-2 mt-8 text-sm font-semibold text-slate-900">
          Description Information
        </h2>

        <div className="border-b border-slate-100 py-3">
          <label className="mb-2 block text-sm text-slate-500">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            rows={4}
            className="w-full resize-y rounded-md border border-slate-200 p-2 text-sm text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, User, Search } from "lucide-react";
import { ToggleSwitch } from "./ToggleSwitch";

interface CreateTaskFormProps {
  layoutId: string;
  redirect: boolean;
}

interface TaskFormState {
  taskOwner: string;
  subject: string;
  fileHandler: string;
  dueDate: string;
  contact: string;
  account: string;
  status: string;
  priority: string;
  repeat: boolean;
  notifyOwner: boolean;
  reminder: boolean;
  description: string;
}

const initialState: TaskFormState = {
  taskOwner: "",
  subject: "",
  fileHandler: "-None-",
  dueDate: "",
  contact: "",
  account: "",
  status: "Not Started",
  priority: "High",
  repeat: false,
  notifyOwner: false,
  reminder: false,
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

export function CreateTaskForm({ layoutId, redirect }: CreateTaskFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<TaskFormState>(initialState);
  const [subjectTouched, setSubjectTouched] = useState(false);

  function update<K extends keyof TaskFormState>(
    key: K,
    value: TaskFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCancel() {
    router.back();
  }

  function handleSave(createAnother: boolean) {
    setSubjectTouched(true);
    if (!form.subject.trim()) return;

    // TODO: wire to your actual create-task API/mutation.
    console.log("Saving task", { layoutId, redirect, ...form });

    if (createAnother) {
      setForm(initialState);
      setSubjectTouched(false);
    } else {
      router.push("/activities/tasks");
    }
  }

  const subjectInvalid = subjectTouched && !form.subject.trim();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-slate-900">
            Create Task
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
          Task Information
        </h2>

        <FieldRow label="Task Owner">
          {/*
            TODO: replace this plain text input with an employee lookup —
            once you have an endpoint for company employees, swap this for
            a searchable dropdown/combobox (e.g. filter-as-you-type against
            GET /api/employees) that sets form.taskOwner to the selected
            employee's name/id instead of freeform text.
          */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-1">
            <input
              type="text"
              value={form.taskOwner}
              onChange={(e) => update("taskOwner", e.target.value)}
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

        <FieldRow label="File Handler">
          <select
            value={form.fileHandler}
            onChange={(e) => update("fileHandler", e.target.value)}
            className="w-full bg-transparent text-sm text-slate-800 outline-none"
          >
            <option>-None-</option>
            <option>Handler A</option>
            <option>Handler B</option>
          </select>
        </FieldRow>

        <FieldRow label="Due Date">
          <input
            type="text"
            placeholder="DD/MM/YYYY"
            value={form.dueDate}
            onChange={(e) => update("dueDate", e.target.value)}
            className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-300 outline-none"
          />
        </FieldRow>

        <FieldRow label="Contact">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1">
            <input
              type="text"
              value={form.contact}
              onChange={(e) => update("contact", e.target.value)}
              className="w-full bg-transparent text-sm text-slate-800 outline-none"
            />
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
          </div>
        </FieldRow>

        <FieldRow label="Account">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1">
            <input
              type="text"
              value={form.account}
              onChange={(e) => update("account", e.target.value)}
              className="w-full bg-transparent text-sm text-slate-800 outline-none"
            />
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
          </div>
        </FieldRow>

        <FieldRow label="Status">
          <select
            value={form.status}
            onChange={(e) => update("status", e.target.value)}
            className="w-full bg-transparent text-sm text-slate-800 outline-none"
          >
            <option>Not Started</option>
            <option>In Progress</option>
            <option>Completed</option>
            <option>Deferred</option>
          </select>
        </FieldRow>

        <FieldRow label="Priority">
          <select
            value={form.priority}
            onChange={(e) => update("priority", e.target.value)}
            className="w-full bg-transparent text-sm text-slate-800 outline-none"
          >
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </FieldRow>

        <FieldRow label="Repeat">
          <ToggleSwitch
            checked={form.repeat}
            onChange={(v) => update("repeat", v)}
            label="Repeat"
          />
        </FieldRow>

        <FieldRow label={`Notify ${form.taskOwner}`}>
          <input
            type="checkbox"
            checked={form.notifyOwner}
            onChange={(e) => update("notifyOwner", e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-300"
          />
        </FieldRow>

        <FieldRow label="Reminder">
          <ToggleSwitch
            checked={form.reminder}
            onChange={(v) => update("reminder", v)}
            label="Reminder"
          />
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

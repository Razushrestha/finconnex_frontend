"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bold,
  Calendar,
  CheckSquare,
  ChevronLeft,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Plus,
  Repeat,
  Underline,
  User,
  Users,
  X,
} from "lucide-react";
import {
  TASK_OWNERS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  type Priority,
  type TaskStatus,
  type TaskType,
} from "@/lib/tasks/types";
import {
  RELATED_ENTITY_KINDS,
  RELATED_RECORD_OPTIONS,
  type RelatedEntityKind,
} from "@/lib/activities/shared";
import { api } from "@/lib/api";
import {
  logCreate,
  notifyOwnerAssigned,
  notifyTaskDue,
  requireAction,
  requiredFieldErrors,
} from "@/lib/rules";
import RelatedRecordCombobox from "./RelatedRecordComboBox";
import RepeatModal, { defaultRepeatConfig, RepeatConfig } from "./RepeatModal";
import {
  elevatedTextareaClass,
  Field,
  TextAreaShell,
} from "@/components/sales/CreateEntityForm";
import AttachmentUpload from "./AttachmentUpload";

interface CreateTaskFormProps {
  layoutId: string;
  redirect: boolean;
  defaults?: {
    relatedKind?: RelatedEntityKind;
    relatedName?: string;
  };
}

interface ActionItem {
  id: string;
  text: string;
  done: boolean;
}

interface FormState {
  title: string;
  relatedKind: RelatedEntityKind | "";
  relatedName: string;
  taskType: TaskType | "";
  priority: Priority | "";
  status: TaskStatus | "";
  dueDate: string;
  reminderDate: string;
  assignedTo: string;
  description: string;
  attachments: File[];
  collaborators: string[];
  actionItems: ActionItem[];
  repeatEnabled: boolean;
  repeat: RepeatConfig;
  notes: string;
}

const initialState: FormState = {
  title: "",
  relatedKind: "",
  relatedName: "",
  taskType: "Follow-up",
  priority: "Medium",
  status: "Not Started",
  dueDate: "",
  reminderDate: "",
  assignedTo: "John Smith",
  description: "",
  attachments: [],
  collaborators: [],
  actionItems: [],
  repeatEnabled: false,
  repeat: defaultRepeatConfig,
  notes: "",
};

// Fields required before the task can be saved.
const REQUIRED_FIELDS = [
  "title",
  "taskType",
  "priority",
  "status",
  "dueDate",
  "assignedTo",
] as const;

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground/90 placeholder:text-foreground/50 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100";
const selectClass = inputClass + " appearance-none";
const labelClass =
  "text-[11px] font-medium uppercase tracking-wide text-gray-500";

export function CreateTaskForm({
  layoutId,
  redirect,
  defaults,
}: CreateTaskFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    ...initialState,
    relatedKind: defaults?.relatedKind ?? "",
    relatedName: defaults?.relatedName ?? "",
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [submitted, setSubmitted] = useState(false);
  const [repeatModalOpen, setRepeatModalOpen] = useState(false);
  const [newActionItem, setNewActionItem] = useState("");
  const [addingCollaborator, setAddingCollaborator] = useState(false);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const relatedOptions = form.relatedKind
    ? RELATED_RECORD_OPTIONS.filter((r) => r.kind === form.relatedKind)
    : RELATED_RECORD_OPTIONS;

  const canEnableRepeat = Boolean(form.taskType) && Boolean(form.dueDate);

  useEffect(() => {
    if (!canEnableRepeat && form.repeatEnabled) {
      update("repeatEnabled", false);
    }
  }, [canEnableRepeat, form.repeatEnabled]);

  function validate() {
    const next: Partial<Record<keyof FormState, string>> = {
      ...requiredFieldErrors(
        form as unknown as Record<string, unknown>,
        REQUIRED_FIELDS as unknown as string[],
      ),
    };
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // Wraps the current textarea selection with markdown-style markers so the
  // toolbar buttons do something useful without pulling in a rich text lib.
  function wrapDescriptionSelection(before: string, after = before) {
    const el = descriptionRef.current;
    if (!el) return;
    const { selectionStart, selectionEnd, value } = el;
    const selected = value.slice(selectionStart, selectionEnd);
    const next =
      value.slice(0, selectionStart) +
      before +
      selected +
      after +
      value.slice(selectionEnd);
    update("description", next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(
        selectionStart + before.length,
        selectionStart + before.length + selected.length,
      );
    });
  }

  function insertLinePrefix(prefix: string) {
    const el = descriptionRef.current;
    if (!el) return;
    const { selectionStart, value } = el;
    const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    update("description", next);
    requestAnimationFrame(() => el.focus());
  }

  function addActionItem() {
    const text = newActionItem.trim();
    if (!text) return;
    update("actionItems", [
      ...form.actionItems,
      { id: crypto.randomUUID(), text, done: false },
    ]);
    setNewActionItem("");
  }

  function toggleActionItem(id: string) {
    update(
      "actionItems",
      form.actionItems.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    );
  }

  function removeActionItem(id: string) {
    update(
      "actionItems",
      form.actionItems.filter((item) => item.id !== id),
    );
  }

  function addCollaborator(name: string) {
    if (!name || form.collaborators.includes(name) || name === form.assignedTo)
      return;
    update("collaborators", [...form.collaborators, name]);
    setAddingCollaborator(false);
  }

  function removeCollaborator(name: string) {
    update(
      "collaborators",
      form.collaborators.filter((c) => c !== name),
    );
  }

  const completedCount = form.actionItems.filter((i) => i.done).length;

  async function handleSave(createAnother: boolean) {
    setSubmitted(true);
    if (!validate()) return;
    const gate = requireAction("activities.tasks.create");
    if (!gate.ok) {
      window.alert(gate.message);
      return;
    }
    const related =
      form.relatedKind && form.relatedName
        ? {
            kind: form.relatedKind as RelatedEntityKind,
            name: form.relatedName,
          }
        : undefined;
    const result = await api.tasks.create({
      title: form.title.trim(),
      taskType: form.taskType as TaskType,
      priority: form.priority as Priority,
      status: form.status as TaskStatus,
      dueDate: form.dueDate,
      assignedTo: form.assignedTo,
      relatedTo: related,
      description: form.description || undefined,
      collaborators: form.collaborators.length ? form.collaborators : undefined,
      createdBy: form.assignedTo,
      // actionItems: form.actionItems — wire this up once api.tasks.create
      // accepts a checklist payload; kept as local state for now.
    });
    if (!result.ok) {
      window.alert(result.error.message);
      return;
    }
    const task = result.data;
    logCreate("activities.tasks", form.assignedTo, task.taskId, form.title);
    notifyOwnerAssigned({
      owner: form.assignedTo,
      entityLabel: `Task ${form.title}`,
      relatedTo: form.title,
      relatedHref: "/activities/tasks",
      type: "Task Assigned",
    });
    notifyTaskDue({
      recipient: form.assignedTo,
      taskTitle: form.title,
      relatedTo: form.title,
      relatedHref: "/activities/tasks",
    });
    if (createAnother) {
      setForm({ ...initialState, assignedTo: form.assignedTo });
      setErrors({});
      setSubmitted(false);
      setNewActionItem("");
      return;
    }
    void layoutId;
    void redirect;
    router.push(`/activities/tasks?focus=${task.taskId}`);
  }

  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <CheckSquare className="h-4 w-4" />
          </span>
          <div>
            <h1 className="text-base font-semibold text-foreground">
              Create New Task
          </h1>
            <p className="text-sm text-gray-500">
              Log an action item, assign responsibilities, and link to existing
              deals or contacts to maintain a comprehensive activity trail.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/activities/tasks")}
            className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            className="flex items-center gap-1.5 rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            <ChevronLeft className="hidden h-4 w-4" />
            Save Task
          </button>
        </div>
      </div>
      <div className="mx-auto grid w-full grid-cols-1 gap-6 px-6 py-2 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Task info card */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-1">
              <label className={labelClass}>
                Task Subject <span className="text-red-500">*</span>
              </label>
            <input
                className={
                  inputClass +
                  (submitted && errors.title ? " border-red-300" : "")
                }
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="e.g., Follow up on Q3 Proposal"
              />
              {submitted && errors.title && (
                <p className="mt-1 text-xs text-red-500">{errors.title}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>
                  Task Type <span className="text-red-500">*</span>
                </label>
                <select
                  className={
                    selectClass +
                    (submitted && errors.taskType ? " border-red-300" : "")
                  }
                  value={form.taskType}
                  onChange={(e) =>
                    update("taskType", e.target.value as TaskType)
                  }
                >
                  {TASK_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Related Entity</label>
                <select
                  className={selectClass}
                  value={form.relatedKind}
                  onChange={(e) => {
                    update(
                      "relatedKind",
                      e.target.value as RelatedEntityKind | "",
                    );
                    update("relatedName", "");
                  }}
                >
                  <option value="">None</option>
                  {RELATED_ENTITY_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Related Record</label>
                <RelatedRecordCombobox
                  value={form.relatedName}
                  onChange={(v) => update("relatedName", v)}
                  options={relatedOptions}
                  disabled={!form.relatedKind}
                />
              </div>
            </div>

            <div className="mt-5">
              <label className={labelClass}>Task Description</label>
              <div className="mt-1 overflow-hidden rounded-md border border-border bg-background">
                <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
                  <button
                    type="button"
                    title="Bold"
                    onClick={() => wrapDescriptionSelection("**")}
                    className="rounded p-1 text-gray-500 hover:bg-white hover:text-gray-800"
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    title="Italic"
                    onClick={() => wrapDescriptionSelection("_")}
                    className="rounded p-1 text-gray-500 hover:bg-white hover:text-gray-800"
                  >
                    <Italic className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Underline"
                    onClick={() => wrapDescriptionSelection("<u>", "</u>")}
                    className="rounded p-1 text-gray-500 hover:bg-white hover:text-gray-800"
                  >
                    <Underline className="h-3.5 w-3.5" />
                  </button>
                  <span className="mx-1 h-4 w-px bg-blue-100" />
                  <button
                    type="button"
                    title="Bullet list"
                    onClick={() => insertLinePrefix("- ")}
                    className="rounded p-1 text-gray-500 hover:bg-white hover:text-gray-800"
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Numbered list"
                    onClick={() => insertLinePrefix("1. ")}
                    className="rounded p-1 text-gray-500 hover:bg-white hover:text-gray-800"
                  >
                    <ListOrdered className="h-3.5 w-3.5" />
                  </button>
                  <span className="mx-1 h-4 w-px bg-blue-100" />
                  <button
                    type="button"
                    title="Link"
                    onClick={() => wrapDescriptionSelection("[", "](url)")}
                    className="rounded p-1 text-gray-500 hover:bg-white hover:text-gray-800"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <textarea
                  ref={descriptionRef}
                  rows={5}
                  className="w-full resize-none bg-transparent px-3 py-2 text-sm text-foreground/90 placeholder:text-foreground/50 focus:outline-none"
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="Provide detailed context or instructions…"
                />
              </div>
            </div>
          </div>

          {/* Action items card */}
          <div className="rounded-md border border-border bg-card p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground/90">
                <ListChecks className="h-4 w-4 text-foreground/70" />
                Action Items
              </div>
              <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-foreground/75">
                {completedCount}/{form.actionItems.length} Completed
              </span>
            </div>

            <div className="space-y-1.5">
              {form.actionItems.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center gap-2.5 rounded-md border border-gray-100 bg-card/70 px-3 py-2"
                >
          <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleActionItem(item.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400"
                  />
                  <span
                    className={
                      "flex-1 text-sm " +
                      (item.done
                        ? "text-foreground/50 line-through"
                        : "text-foreground/70")
                    }
                  >
                    {item.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeActionItem(item.id)}
                    className="text-gray-300 opacity-0 hover:text-gray-500 group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              <div className="flex items-center gap-2.5 rounded-md border border-dashed border-gray-200 px-3 py-2">
          <input
                  type="checkbox"
                  disabled
                  className="h-4 w-4 rounded border-gray-300"
                />
            <input
                  value={newActionItem}
                  onChange={(e) => setNewActionItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addActionItem();
                    }
                  }}
                  placeholder="Add new action item…"
                  className="flex-1 bg-transparent text-sm text-gray-600 placeholder:text-gray-400 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={addActionItem}
              className="mt-3 flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </button>
          </div>

          <Field label="Notes" className="col-span-full">
            <TextAreaShell>
              <textarea
                className={elevatedTextareaClass}
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Internal notes…"
              />
            </TextAreaShell>
          </Field>

          <Field label="Attachments" className="col-span-full">
            <AttachmentUpload
              files={form.attachments}
              onChange={(files) => update("attachments", files)}
            />
          </Field>
          </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Status / scheduling card */}
          <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>
                  Status <span className="text-red-500">*</span>
                </label>
          <select
                  className={
                    selectClass +
                    (submitted && errors.status ? " border-red-300" : "")
                  }
            value={form.status}
                  onChange={(e) =>
                    update("status", e.target.value as TaskStatus)
                  }
                >
                  {TASK_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
          </select>
              </div>
              <div>
                <label className={labelClass}>
                  Priority <span className="text-red-500">*</span>
                </label>
          <select
                  className={
                    selectClass +
                    (submitted && errors.priority ? " border-red-300" : "")
                  }
            value={form.priority}
                  onChange={(e) =>
                    update("priority", e.target.value as Priority)
                  }
                >
                  {TASK_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
          </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>
                Due Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="datetime-local"
                  className={
                    inputClass +
                    " pl-9" +
                    (submitted && errors.dueDate ? " border-red-300" : "")
                  }
                  value={form.dueDate}
                  onChange={(e) => update("dueDate", e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Reminder Date</label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
                  type="datetime-local"
                  className={inputClass + " pl-9"}
                  value={form.reminderDate}
                  onChange={(e) => update("reminderDate", e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Repeat</label>
              <div
                className={`mt-1 flex items-center justify-between rounded-md border px-3 py-2 ${
                  canEnableRepeat
                    ? "border-blue-100 bg-blue-50/40"
                    : "border-gray-100 bg-gray-50"
                }`}
              >
                <button
                  type="button"
                  disabled={!canEnableRepeat}
                  onClick={() => {
                    const next = !form.repeatEnabled;
                    update("repeatEnabled", next);
                    if (next) setRepeatModalOpen(true);
                  }}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    form.repeatEnabled ? "bg-green-500" : "bg-gray-300"
                  } ${!canEnableRepeat ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      form.repeatEnabled ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
                {form.repeatEnabled && canEnableRepeat ? (
                  <button
                    type="button"
                    onClick={() => setRepeatModalOpen(true)}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <Repeat className="h-3.5 w-3.5" />
                    {form.repeat.type}
                  </button>
                ) : (
                  <span className="text-sm text-gray-400">Off</span>
                )}
              </div>
              {!canEnableRepeat && (
                <p className="mt-1 text-xs text-gray-400">
                  Set Task Type and Due Date to enable repeat.
                </p>
              )}
            </div>

            <RepeatModal
              open={repeatModalOpen}
              value={form.repeat}
              onCancel={() => setRepeatModalOpen(false)}
              onDone={(config) => {
                update("repeat", config);
                setRepeatModalOpen(false);
              }}
            />
          </div>

          {/* Owner / collaborators card */}
          <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div>
              <label className={labelClass}>
                Task Owner <span className="text-red-500">*</span>
          </label>
              <div className="mt-1.5">
                {form.assignedTo ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white py-1 pl-1 pr-2 text-sm text-gray-700">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[11px] font-semibold text-blue-700">
                      {initials(form.assignedTo)}
                    </span>
                    {form.assignedTo}
                    <button
                      type="button"
                      onClick={() => update("assignedTo", "")}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ) : (
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <select
                      className={inputClass + " pl-9"}
                      value=""
                      onChange={(e) => update("assignedTo", e.target.value)}
                    >
                      <option value="" disabled>
                        Select an owner
                      </option>
                      {TASK_OWNERS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              {submitted && errors.assignedTo && (
                <p className="mt-1 text-xs text-red-500">{errors.assignedTo}</p>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className={labelClass}>Collaborators</label>
                <button
                  type="button"
                  onClick={() => setAddingCollaborator((v) => !v)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Users className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {form.collaborators.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 py-1 pl-1 pr-2 text-sm text-white"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-semibold">
                      {initials(name)}
                    </span>
                    {name}
                    <button
                      type="button"
                      onClick={() => removeCollaborator(name)}
                      className="text-white/70 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {addingCollaborator && (
                  <select
                    autoFocus
                    className="rounded-full border border-gray-200 bg-white px-2 py-1 text-sm text-gray-600 focus:outline-none"
                    value=""
                    onChange={(e) => addCollaborator(e.target.value)}
                    onBlur={() => setAddingCollaborator(false)}
                  >
                    <option value="" disabled>
                      Add collaborator…
                    </option>
                    {TASK_OWNERS.filter(
                      (o) =>
                        o !== form.assignedTo &&
                        !form.collaborators.includes(o),
                    ).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

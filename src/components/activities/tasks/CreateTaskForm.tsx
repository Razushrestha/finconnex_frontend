"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Calendar,
  ChevronLeft,
  ListChecks,
  Mail,
  MessageSquare,
  MonitorSmartphone,
  Plus,
  Repeat,
  Search,
  User,
  X,
} from "lucide-react";
import {
  TASK_OWNERS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  type Priority,
  type TaskActionItem,
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
import { getRulesActor } from "@/lib/rules/actor";
import { formatTaskTimestamp } from "@/lib/tasks/types";
import RelatedRecordCombobox from "./RelatedRecordComboBox";
import RepeatModal, { defaultRepeatConfig, RepeatConfig } from "./RepeatModal";
import { TaskAuditCard } from "@/components/activities/tasks/TaskAuditCard";
import {
  elevatedTextareaClass,
  Field,
  TextAreaShell,
} from "@/components/sales/CreateEntityForm";
import { MentionNotesTextarea } from "@/components/shared/MentionNotesTextarea";
import AttachmentUpload from "./AttachmentUpload";
import { TaskDescriptionEditor } from "./TaskDescriptionEditor";
import { getUploadAdapter } from "@/lib/attachments/upload";
import { type NotificationMethod } from "@/lib/reminders/types";
import { cn } from "@/lib/utils";

interface CreateTaskFormProps {
  layoutId: string;
  redirect: boolean;
  defaults?: {
    relatedKind?: RelatedEntityKind;
    relatedName?: string;
  };
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
  actionItems: TaskActionItem[];
  repeatEnabled: boolean;
  repeat: RepeatConfig;
  notifyBy: NotificationMethod[];
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
  notifyBy: ["Email"],
  notes: "",
};

const NOTIFY_BY_OPTIONS: {
  id: NotificationMethod;
  label: string;
  icon: typeof Mail;
}[] = [
  { id: "Email", label: "Email", icon: Mail },
  { id: "SMS", label: "SMS", icon: MessageSquare },
  { id: "In-app", label: "In App", icon: Bell },
  { id: "Web Push", label: "Web push", icon: MonitorSmartphone },
];

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

function parseDatetimeLocal(value: string): Date | null {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDatetimeLocalValue(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function startOfMinute(date: Date): Date {
  const next = new Date(date);
  next.setSeconds(0, 0);
  return next;
}

function formatStoredTaskDateTime(value: string): string {
  const parsed = parseDatetimeLocal(value);
  if (!parsed) return value.trim();
  return parsed.toLocaleString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function validateTaskDates(
  dueDate: string,
  reminderDate: string,
): Partial<Record<"dueDate" | "reminderDate", string>> {
  const errors: Partial<Record<"dueDate" | "reminderDate", string>> = {};
  const now = startOfMinute(new Date());
  const due = parseDatetimeLocal(dueDate);

  if (dueDate.trim()) {
    if (!due) {
      errors.dueDate = "Enter a valid due date and time";
    } else if (due.getTime() < now.getTime()) {
      errors.dueDate = "Due date cannot be before the current date and time";
    }
  }

  if (reminderDate.trim()) {
    const reminder = parseDatetimeLocal(reminderDate);
    if (!reminder) {
      errors.reminderDate = "Enter a valid reminder date and time";
    } else if (due && reminder.getTime() > due.getTime()) {
      errors.reminderDate = "Reminder cannot be after the due date";
    } else if (reminder.getTime() <= now.getTime()) {
      errors.reminderDate =
        "Reminder must be after the current date and time";
    }
  }

  return errors;
}

function newActionItemId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

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
  const [collaboratorSearch, setCollaboratorSearch] = useState("");
  const newActionItemRef = useRef<HTMLInputElement>(null);
  const collaboratorPickerRef = useRef<HTMLDivElement>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function syncDateErrors(nextDueDate: string, nextReminderDate: string) {
    const dateErrors = validateTaskDates(nextDueDate, nextReminderDate);
    setErrors((prev) => {
      const next = { ...prev };
      if (dateErrors.dueDate) {
        next.dueDate = dateErrors.dueDate;
      } else if (nextDueDate.trim()) {
        delete next.dueDate;
      }
      if (dateErrors.reminderDate) {
        next.reminderDate = dateErrors.reminderDate;
      } else {
        delete next.reminderDate;
      }
      return next;
    });
  }

  function handleDueDateChange(value: string) {
    let nextReminder = form.reminderDate;
    if (!value.trim()) {
      nextReminder = "";
    } else {
      const due = parseDatetimeLocal(value);
      const reminder = parseDatetimeLocal(nextReminder);
      if (due && reminder && reminder.getTime() > due.getTime()) {
        nextReminder = "";
      }
    }
    setForm((prev) => ({
      ...prev,
      dueDate: value,
      reminderDate: nextReminder,
    }));
    syncDateErrors(value, nextReminder);
  }

  function handleReminderDateChange(value: string) {
    update("reminderDate", value);
    syncDateErrors(form.dueDate, value);
  }

  function toggleNotifyBy(method: NotificationMethod) {
    setForm((prev) => {
      const selected = prev.notifyBy.includes(method);
      return {
        ...prev,
        notifyBy: selected
          ? prev.notifyBy.filter((item) => item !== method)
          : [...prev.notifyBy, method],
      };
    });
  }

  const minDueDate = toDatetimeLocalValue(startOfMinute(new Date()));
  const minReminderDate = minDueDate;
  const hasDueDate = Boolean(form.dueDate.trim());

  const relatedOptions = form.relatedKind
    ? RELATED_RECORD_OPTIONS.filter((r) => r.kind === form.relatedKind)
    : RELATED_RECORD_OPTIONS;

  const actor = getRulesActor().name || form.assignedTo || "Admin";
  const auditPreviewOn = formatTaskTimestamp(new Date());

  const canEnableRepeat = Boolean(form.taskType) && Boolean(form.dueDate);

  useEffect(() => {
    if (!canEnableRepeat && form.repeatEnabled) {
      update("repeatEnabled", false);
    }
  }, [canEnableRepeat, form.repeatEnabled]);

  useEffect(() => {
    if (!addingCollaborator) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        collaboratorPickerRef.current &&
        !collaboratorPickerRef.current.contains(event.target as Node)
      ) {
        setAddingCollaborator(false);
        setCollaboratorSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [addingCollaborator]);

  const availableCollaborators = TASK_OWNERS.filter(
    (owner) =>
      owner !== form.assignedTo && !form.collaborators.includes(owner),
  );
  const filteredCollaborators = availableCollaborators.filter((owner) =>
    owner.toLowerCase().includes(collaboratorSearch.trim().toLowerCase()),
  );

  function validate() {
    const next: Partial<Record<keyof FormState, string>> = {
      ...requiredFieldErrors(
        form as unknown as Record<string, unknown>,
        REQUIRED_FIELDS as unknown as string[],
      ),
      ...validateTaskDates(form.dueDate, form.reminderDate),
    };
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function addActionItem(options?: { focusAfter?: boolean }) {
    const text = newActionItem.trim();
    if (!text) {
      if (options?.focusAfter) newActionItemRef.current?.focus();
      return;
    }
    setForm((prev) => ({
      ...prev,
      actionItems: [
        ...prev.actionItems,
        { id: newActionItemId(), text, done: false },
      ],
    }));
    setNewActionItem("");
    if (options?.focusAfter) {
      requestAnimationFrame(() => newActionItemRef.current?.focus());
    }
  }

  function toggleActionItem(id: string) {
    setForm((prev) => ({
      ...prev,
      actionItems: prev.actionItems.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    }));
  }

  function updateActionItemText(id: string, text: string) {
    setForm((prev) => ({
      ...prev,
      actionItems: prev.actionItems.map((item) =>
        item.id === id ? { ...item, text } : item,
      ),
    }));
  }

  function finalizeActionItemText(id: string) {
    setForm((prev) => ({
      ...prev,
      actionItems: prev.actionItems.filter(
        (item) => item.id !== id || item.text.trim().length > 0,
      ),
    }));
  }

  function removeActionItem(id: string) {
    setForm((prev) => ({
      ...prev,
      actionItems: prev.actionItems.filter((item) => item.id !== id),
    }));
  }

  function addCollaborator(name: string) {
    if (!name || form.collaborators.includes(name) || name === form.assignedTo)
      return;
    update("collaborators", [...form.collaborators, name]);
    setCollaboratorSearch("");
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

    let attachmentsCount = 0;
    if (form.attachments.length > 0) {
      const adapter = getUploadAdapter();
      for (const file of form.attachments) {
        const result = await adapter.upload({
          fileName: file.name,
          data: await file.arrayBuffer(),
          contentType: file.type || "application/octet-stream",
          relatedTo: form.title.trim() || "Task",
        });
        if (!result.ok) {
          window.alert(`Failed to upload "${file.name}": ${result.message}`);
          return;
        }
        attachmentsCount += 1;
      }
    }

    const result = await api.tasks.create({
      title: form.title.trim(),
      taskType: form.taskType as TaskType,
      priority: form.priority as Priority,
      status: form.status as TaskStatus,
      dueDate: formatStoredTaskDateTime(form.dueDate),
      reminderDate: form.reminderDate.trim()
        ? formatStoredTaskDateTime(form.reminderDate)
        : undefined,
      assignedTo: form.assignedTo,
      relatedTo: related,
      description: form.description || undefined,
      notes: form.notes.trim() || undefined,
      collaborators: form.collaborators.length ? form.collaborators : undefined,
      actionItems: form.actionItems.length ? form.actionItems : undefined,
      notifyBy: form.notifyBy.length ? form.notifyBy : undefined,
      attachmentsCount: attachmentsCount || undefined,
      createdBy: actor,
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
        <h1 className="text-base font-semibold text-foreground">
          Create New Task
          </h1>
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
      <div className="mx-auto grid w-full max-w-[1920px] grid-cols-1 gap-4 px-4 py-3 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)] lg:gap-6 2xl:px-8">
        {/* Left column */}
        <div className="space-y-6">
          {/* Task info card */}
          <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

            <div className="mt-5 w-full">
              <label className={labelClass}>Task Description</label>
              <div className="mt-1 w-full">
                <TaskDescriptionEditor
                  value={form.description}
                  onChange={(description) => update("description", description)}
                />
              </div>
            </div>
          </div>

          {/* Action items card */}
          <div className="rounded-md border border-border bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground/90">
                <ListChecks className="h-4 w-4 text-foreground/70" />
                Action Items
              </div>
              <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-foreground/75">
                {completedCount}/{form.actionItems.length} Completed
              </span>
            </div>

            {form.actionItems.length > 0 && (
              <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-violet-600 transition-all duration-300"
                  style={{
                    width: `${
                      form.actionItems.length
                        ? (completedCount / form.actionItems.length) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            )}

            <div className="space-y-1.5">
              {form.actionItems.length === 0 ? (
                <p className="rounded-md border border-dashed border-gray-200 px-3 py-4 text-center text-sm text-gray-400">
                  No action items yet. Add your first step below.
                </p>
              ) : (
                form.actionItems.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-2.5 rounded-md border border-gray-100 bg-white px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => toggleActionItem(item.id)}
                      className="h-4 w-4 shrink-0 rounded border-gray-300 text-violet-600 focus:ring-violet-400"
                      aria-label={`Mark "${item.text}" complete`}
                    />
          <input
            type="text"
                      value={item.text}
                      onChange={(e) =>
                        updateActionItemText(item.id, e.target.value)
                      }
                      onBlur={() => finalizeActionItemText(item.id)}
                      className={
                        "min-w-0 flex-1 bg-transparent text-sm focus:outline-none " +
                        (item.done
                          ? "text-foreground/50 line-through"
                          : "text-foreground/80")
                      }
                    />
                    <button
                      type="button"
                      onClick={() => removeActionItem(item.id)}
                      className="shrink-0 text-gray-400 opacity-100 transition-opacity hover:text-gray-600 md:opacity-0 md:group-hover:opacity-100"
                      aria-label={`Remove "${item.text}"`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}

              <div className="flex items-center gap-2.5 rounded-md border border-dashed border-gray-200 px-3 py-2 focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100">
                <Plus className="h-4 w-4 shrink-0 text-gray-400" />
            <input
                  ref={newActionItemRef}
                  value={newActionItem}
                  onChange={(e) => setNewActionItem(e.target.value)}
                  onBlur={() => addActionItem()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addActionItem({ focusAfter: true });
                    }
                  }}
                  placeholder="Add new action item…"
                  className="min-w-0 flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => addActionItem({ focusAfter: true })}
              className="mt-3 flex items-center gap-1.5 text-sm font-medium text-violet-700 transition-colors hover:text-violet-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </button>
          </div>

          <Field label="Notes" className="col-span-full">
            <MentionNotesTextarea
              value={form.notes}
              onChange={(notes) => update("notes", notes)}
              placeholder="Internal notes… Type @ to assign someone."
            />
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
          <div className="space-y-4 rounded-xl border border-border bg-white p-4 shadow-sm">
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
                  min={minDueDate}
                  className={
                    inputClass +
                    " pl-9" +
                    (submitted && errors.dueDate ? " border-red-300" : "")
                  }
                  value={form.dueDate}
                  onChange={(e) => handleDueDateChange(e.target.value)}
                />
              </div>
              {(submitted || form.dueDate) && errors.dueDate ? (
                <p className="mt-1 text-xs text-red-600">{errors.dueDate}</p>
              ) : null}
            </div>

            {hasDueDate ? (
              <div>
                <label className={labelClass}>Reminder Date</label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
                    type="datetime-local"
                    min={minReminderDate}
                    max={form.dueDate}
                    className={
                      inputClass +
                      " pl-9" +
                      (submitted && errors.reminderDate ? " border-red-300" : "")
                    }
                    value={form.reminderDate}
                    onChange={(e) => handleReminderDateChange(e.target.value)}
                  />
                </div>
                {(submitted || form.reminderDate) && errors.reminderDate ? (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.reminderDate}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">
                    Choose a time after now and no later than the due date.
                  </p>
                )}
              </div>
            ) : null}

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

            <div>
              <label className={labelClass}>Notify by</label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {NOTIFY_BY_OPTIONS.map((option) => {
                  const active = form.notifyBy.includes(option.id);
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleNotifyBy(option.id)}
                      aria-pressed={active}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors",
                        active
                          ? "border-[#5A32A3] bg-[#F3ECFB] text-[#5A32A3]"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Choose how the owner is notified for this task.
              </p>
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

          {/* Owner + collaborators — same card, separate sections */}
          <div className="space-y-4 rounded-xl border border-border bg-white p-4 shadow-sm">
            <div>
              <label className={labelClass}>
                Task Owner <span className="text-red-500">*</span>
          </label>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
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
                      aria-label={`Remove ${form.assignedTo}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ) : (
                  <div className="relative w-full">
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

            <div className="border-t border-border pt-4">
              <label className={labelClass}>Collaborators</label>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {form.collaborators.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white py-1 pl-1 pr-2 text-sm text-gray-700"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-[11px] font-semibold text-violet-700">
                      {initials(name)}
                    </span>
                    {name}
                    <button
                      type="button"
                      onClick={() => removeCollaborator(name)}
                      className="text-gray-400 hover:text-gray-600"
                      aria-label={`Remove collaborator ${name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}

                <div ref={collaboratorPickerRef} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setAddingCollaborator((open) => !open);
                      if (addingCollaborator) setCollaboratorSearch("");
                    }}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-dashed transition-colors ${
                      addingCollaborator
                        ? "border-violet-300 bg-violet-50 text-violet-700"
                        : "border-gray-300 text-gray-500 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                    }`}
                    aria-label="Add collaborator"
                    title="Add collaborator"
                    aria-expanded={addingCollaborator}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  {addingCollaborator && (
                    <div className="absolute left-0 top-full z-30 mt-1 w-56 rounded-lg border border-gray-200 bg-white shadow-lg">
                      <div className="border-b border-gray-100 p-2">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                          <input
                            autoFocus
                            type="text"
                            value={collaboratorSearch}
                            onChange={(e) =>
                              setCollaboratorSearch(e.target.value)
                            }
                            placeholder="Search collaborators…"
                            className="w-full rounded-md border border-gray-200 py-1.5 pl-8 pr-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
                          />
                        </div>
                      </div>
                      <ul className="max-h-44 overflow-y-auto py-1">
                        {filteredCollaborators.length > 0 ? (
                          filteredCollaborators.map((owner) => (
                            <li key={owner}>
                              <button
                                type="button"
                                onClick={() => addCollaborator(owner)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700"
                              >
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-700">
                                  {initials(owner)}
                                </span>
                                {owner}
                              </button>
                            </li>
                          ))
                        ) : (
                          <li className="px-3 py-2 text-sm text-gray-400">
                            {collaboratorSearch.trim()
                              ? "No collaborators match your search"
                              : "No collaborators available"}
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <TaskAuditCard
            createdBy={actor}
            createdOn={auditPreviewOn}
            modifiedBy={actor}
            modifiedOn={auditPreviewOn}
          />
        </div>
      </div>
    </div>
  );
}
